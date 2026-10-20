import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from '../App'
import type { DataLayer } from '../data/dataLayer'
import { openTestDataLayer } from '../test/dataLayers'

async function openSettings(data: DataLayer) {
  const user = userEvent.setup()
  render(<App data={data} />)
  await user.click(await screen.findByRole('link', { name: 'Settings' }))
  await screen.findByRole('list', { name: 'Statuses' })
  return user
}

/** Each listed Status's name, with "(Closed)" when it is Closed. */
function shownStatuses() {
  return within(screen.getByRole('list', { name: 'Statuses' }))
    .getAllByRole('listitem')
    .map((item) => {
      const name = within(item).getByRole('heading', { level: 4 }).textContent
      const closed = within(item).getByRole('checkbox', { name: /Closed/ })
      return (closed as HTMLInputElement).checked ? `${name} (Closed)` : name
    })
}

describe('Configuring Statuses', () => {
  it('Given the default Statuses, when I open Settings, then I see them in order with the Closed ones marked, Applied as the Applied status and Parked as the Parked status', async () => {
    await openSettings(await openTestDataLayer())

    expect(shownStatuses()).toEqual([
      'Interested',
      'Parked',
      'Applied',
      'Recruiter Screen',
      'Interviewing',
      'Offer',
      'Accepted (Closed)',
      'Rejected (Closed)',
      'No Response (Closed)',
      'Withdrawn (Closed)',
      'Passed (Closed)',
    ])
    expect(screen.getByLabelText('Applied status')).toHaveDisplayValue(
      'Applied',
    )
    expect(screen.getByLabelText('Parked status')).toHaveDisplayValue('Parked')
  })

  it('Given the default Statuses, when I mark Offer Closed, unmark Passed, make Recruiter Screen the Applied status and choose no Parked status, then the changes are saved', async () => {
    const data = await openTestDataLayer()
    const user = await openSettings(data)

    await user.click(screen.getByRole('checkbox', { name: 'Offer is Closed' }))
    await user.click(screen.getByRole('checkbox', { name: 'Passed is Closed' }))
    await user.selectOptions(
      screen.getByLabelText('Applied status'),
      'Recruiter Screen',
    )
    await user.selectOptions(screen.getByLabelText('Parked status'), 'None')

    await waitFor(() =>
      expect(screen.getByLabelText('Parked status')).toHaveDisplayValue('None'),
    )
    expect(shownStatuses().slice(5)).toEqual([
      'Offer (Closed)',
      'Accepted (Closed)',
      'Rejected (Closed)',
      'No Response (Closed)',
      'Withdrawn (Closed)',
      'Passed',
    ])
    const saved = await data.listStatuses()
    expect(saved.filter((s) => s.closed).map((s) => s.name)).toEqual([
      'Offer',
      'Accepted',
      'Rejected',
      'No Response',
      'Withdrawn',
    ])
    expect(saved.filter((s) => s.isApplied).map((s) => s.name)).toEqual([
      'Recruiter Screen',
    ])
    expect(saved.filter((s) => s.isParked)).toEqual([])
  })

  it('Given the default Statuses, when I add Final Round and then "applied", then Final Round is listed last and I am told Applied already exists', async () => {
    const user = await openSettings(await openTestDataLayer())

    await user.type(screen.getByLabelText('New Status name'), 'Final Round')
    await user.click(screen.getByRole('button', { name: 'Add Status' }))
    await waitFor(() => expect(shownStatuses().at(-1)).toBe('Final Round'))
    expect(screen.getByLabelText('New Status name')).toHaveValue('')

    await user.type(screen.getByLabelText('New Status name'), 'applied')
    await user.click(screen.getByRole('button', { name: 'Add Status' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'There is already a Status called Applied',
    )
    expect(screen.getByLabelText('New Status name')).toHaveValue('applied')
    expect(shownStatuses()).toHaveLength(12)
  })

  it('Given the default Statuses, when I rename Offer to "applied" and then to Verbal Offer, then I am told Applied already exists and then Verbal Offer is listed in its place', async () => {
    const data = await openTestDataLayer()
    const user = await openSettings(data)

    await user.click(screen.getByRole('button', { name: 'Rename Offer' }))
    const nameInput = screen.getByLabelText('Status name')
    expect(nameInput).toHaveValue('Offer')
    await user.clear(nameInput)
    await user.type(nameInput, 'applied')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'There is already a Status called Applied',
    )

    await user.clear(screen.getByLabelText('Status name'))
    await user.type(screen.getByLabelText('Status name'), 'Verbal Offer')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(shownStatuses()[5]).toBe('Verbal Offer'))
    expect(screen.queryByLabelText('Status name')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect((await data.listStatuses())[5].name).toBe('Verbal Offer')
  })

  it('Given I am renaming Offer, when I cancel, then it keeps its name', async () => {
    const user = await openSettings(await openTestDataLayer())

    await user.click(screen.getByRole('button', { name: 'Rename Offer' }))
    await user.type(screen.getByLabelText('Status name'), ' Letter')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(shownStatuses()[5]).toBe('Offer')
    expect(screen.queryByLabelText('Status name')).not.toBeInTheDocument()
  })

  it('Given the default Statuses, when I move Passed up once and Interested down once, then they are listed in that order, and the first cannot move up nor the last down', async () => {
    const data = await openTestDataLayer()
    const user = await openSettings(data)

    await user.click(screen.getByRole('button', { name: 'Move Passed up' }))
    await waitFor(() =>
      expect(shownStatuses().at(-1)).toBe('Withdrawn (Closed)'),
    )
    await user.click(
      screen.getByRole('button', { name: 'Move Interested down' }),
    )

    const expected = [
      'Parked',
      'Interested',
      'Applied',
      'Recruiter Screen',
      'Interviewing',
      'Offer',
      'Accepted',
      'Rejected',
      'No Response',
      'Passed',
      'Withdrawn',
    ]
    await waitFor(() =>
      expect(
        shownStatuses().map((shown) => shown?.replace(' (Closed)', '')),
      ).toEqual(expected),
    )
    expect((await data.listStatuses()).map((s) => s.name)).toEqual(expected)
    expect(
      screen.getByRole('button', { name: 'Move Parked up' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Move Withdrawn down' }),
    ).toBeDisabled()
  })

  it('Given two Roles in Offer, when I delete Offer, then I am told to move them first and it is kept', async () => {
    const data = await openTestDataLayer()
    const offer = (await data.listStatuses()).find((s) => s.name === 'Offer')!
    for (const title of ['QA Engineer', 'Senior QA Engineer']) {
      const role = await data.createRole({ title })
      await data.changeStatus(role.id, offer.id)
    }
    const user = await openSettings(data)

    await user.click(screen.getByRole('button', { name: 'Delete Offer' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Offer still has 2 Roles. Move them to another Status first.',
    )
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(shownStatuses()).toContain('Offer')
  })

  it('Given Applied is the Applied status, when I delete it, then I am told to choose another Applied status first', async () => {
    const user = await openSettings(await openTestDataLayer())

    await user.click(screen.getByRole('button', { name: 'Delete Applied' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Applied is the Applied status. Choose another Applied status first.',
    )
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it("Given a Role that moved through Offer and on to Accepted, when I delete Offer and confirm, then it is no longer listed and the Role's Status history still shows Offer", async () => {
    const data = await openTestDataLayer()
    const role = await data.createRole({ title: 'Senior QA Engineer' })
    const statuses = await data.listStatuses()
    const idOf = (name: string) => statuses.find((s) => s.name === name)!.id
    await data.changeStatus(role.id, idOf('Offer'))
    await data.changeStatus(role.id, idOf('Accepted'))
    const user = await openSettings(data)

    await user.click(screen.getByRole('button', { name: 'Delete Offer' }))
    const confirm = screen.getByRole('alertdialog', {
      name: 'Delete this Status?',
    })
    await user.click(within(confirm).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(shownStatuses()).not.toContain('Offer'))
    await user.click(screen.getByRole('link', { name: 'Roles' }))
    await user.click(
      await screen.findByRole('link', { name: 'Senior QA Engineer' }),
    )
    expect(
      within(await screen.findByRole('list', { name: 'Status history' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent?.split(' · ')[0]),
    ).toEqual(['Interested', 'Interested → Offer', 'Offer → Accepted'])
  })
})

describe('Daily target', () => {
  it('Given the Daily target is 2, when I set it to 3 in Settings, then Roles measures today against 3', async () => {
    const data = await openTestDataLayer()
    const user = await openSettings(data)
    const target = screen.getByRole('spinbutton', { name: 'Daily target' })
    expect(target).toHaveValue(2)

    await user.clear(target)
    await user.type(target, '3')
    await user.click(screen.getByRole('button', { name: 'Save Daily target' }))
    await user.click(screen.getByRole('link', { name: 'Roles' }))

    expect(await screen.findByText('0 of 3 today, a fresh start')).toBeVisible()
    expect(await data.getDailyTarget()).toBe(3)
  })

  it('Given the Daily target is 2, when I set it to 0 in Settings, then I see why it is refused and it stays 2', async () => {
    const data = await openTestDataLayer()
    const user = await openSettings(data)
    const target = screen.getByRole('spinbutton', { name: 'Daily target' })

    await user.clear(target)
    await user.type(target, '0')
    await user.click(screen.getByRole('button', { name: 'Save Daily target' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A Daily target is a whole number, 1 or more',
    )
    expect(await data.getDailyTarget()).toBe(2)
  })

  it('Given setting the Daily target to 0 was refused, when I set it to 3, then the refusal goes and it is 3', async () => {
    const data = await openTestDataLayer()
    const user = await openSettings(data)
    const target = screen.getByRole('spinbutton', { name: 'Daily target' })
    const save = screen.getByRole('button', { name: 'Save Daily target' })
    await user.clear(target)
    await user.type(target, '0')
    await user.click(save)
    await screen.findByRole('alert')

    await user.clear(target)
    await user.type(target, '3')
    await user.click(save)

    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument(),
    )
    expect(await data.getDailyTarget()).toBe(3)
  })
})
