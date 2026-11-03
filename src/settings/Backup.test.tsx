import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import { openTestDataLayer } from '../test/dataLayers'

describe('The backup reminder', () => {
  it.each([
    [
      null,
      'No backup yet. Saving one keeps your search safe if browser storage is ever cleared.',
    ],
    ['2026-10-16T14:30:00.000Z', "Last backup: today. You're all set."],
    ['2026-10-15T14:30:00.000Z', 'Last backup: 1 day ago. Nicely kept.'],
    [
      '2026-10-04T14:30:00.000Z',
      'Last backup: 12 days ago. A fresh one only takes a moment.',
    ],
  ])(
    'Given a last backup at %s and a Role, when I open Roles, then I see "%s" with an export button',
    async (lastBackupAt, message) => {
      let now = lastBackupAt ? new Date(lastBackupAt) : new Date()
      const data = await openTestDataLayer({ clock: () => now })
      await data.createRole({ title: 'Senior QA Engineer' })
      if (lastBackupAt) await data.exportBackup()
      now = new Date('2026-10-16T14:30:00.000Z')

      render(<App data={data} />)

      expect(await screen.findByText(message)).toBeVisible()
      expect(
        screen.getByRole('button', { name: 'Export backup' }),
      ).toBeVisible()
    },
  )

  it('Given no Roles, when I open Roles and then Settings, then only Settings shows the reminder', async () => {
    const data = await openTestDataLayer()
    const user = userEvent.setup()
    render(<App data={data} />)
    await screen.findByText('No Roles yet. Add the first one above.')
    expect(screen.queryByText(/^No backup yet/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Settings' }))

    expect(await screen.findByText(/^No backup yet/)).toBeVisible()
  })
})

describe('Restoring a backup', () => {
  async function openSettingsWithBackupFile() {
    const data = await openTestDataLayer()
    await data.createRole({ title: 'In the backup' })
    await data.setDailyTarget(5)
    const { json } = await data.exportBackup()
    await data.createRole({ title: 'Added after the backup' })
    await data.setDailyTarget(9)
    await data.createStatus({ name: 'Added Status' })
    const user = userEvent.setup()
    render(<App data={data} />)
    await user.click(await screen.findByRole('link', { name: 'Settings' }))
    await screen.findByRole('list', { name: 'Statuses' })
    return { data, user, json }
  }

  const backupFile = (json: string) =>
    new File([json], 'backup.json', { type: 'application/json' })
  const chooseFile = () => screen.getByLabelText('Restore from a backup')

  it('Given 2 Roles and a backup of 1, when I choose the file and confirm, then everything is replaced and Settings shows the restored values', async () => {
    const { data, user, json } = await openSettingsWithBackupFile()

    await user.upload(chooseFile(), backupFile(json))
    const dialog = await screen.findByRole('alertdialog', {
      name: 'Replace 2 Roles with 1 from backup?',
    })
    expect(await data.listRoles()).toHaveLength(2)
    await user.click(within(dialog).getByRole('button', { name: 'Replace' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Restored from your backup.',
    )
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect((await data.listRoles()).map((r) => r.title)).toEqual([
      'In the backup',
    ])
    expect(
      await screen.findByRole('spinbutton', { name: 'Daily target' }),
    ).toHaveDisplayValue('5')
    expect(screen.queryByText('Added Status')).not.toBeInTheDocument()
    expect(
      screen.getByText("Last backup: today. You're all set."),
    ).toBeVisible()
  })

  it('Given the confirmation is showing, when I cancel, then nothing changes', async () => {
    const { data, user, json } = await openSettingsWithBackupFile()
    await user.upload(chooseFile(), backupFile(json))
    const dialog = await screen.findByRole('alertdialog')

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(),
    )
    expect(await data.listRoles()).toHaveLength(2)
    expect(await data.getDailyTarget()).toBe(9)
  })

  it('Given a file that is not a backup, when I choose it, then I see why and am not asked to replace anything', async () => {
    const { data, user } = await openSettingsWithBackupFile()

    await user.upload(chooseFile(), backupFile('not json'))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "This file isn't a Job Search Tracker backup.",
    )
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(await data.listRoles()).toHaveLength(2)
  })
})

describe('Persistent storage', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'storage')
  })

  function stubStorage(persisted: boolean) {
    const persist = vi.fn(async () => true)
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: { persisted: async () => persisted, persist },
    })
    return persist
  }

  it('Given storage that is not yet persistent, when the app opens, then it asks the browser to keep it', async () => {
    const persist = stubStorage(false)

    render(<App data={await openTestDataLayer()} />)

    await vi.waitFor(() => expect(persist).toHaveBeenCalledTimes(1))
  })

  it('Given storage that is already persistent, when the app opens, then it does not ask again', async () => {
    const persist = stubStorage(true)

    render(<App data={await openTestDataLayer()} />)
    await screen.findByRole('heading', { name: 'Roles' })

    expect(persist).not.toHaveBeenCalled()
  })
})
