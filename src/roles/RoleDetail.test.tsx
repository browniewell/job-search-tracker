import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from '../App'
import type { DataLayer } from '../data/dataLayer'
import { openTestDataLayer, uniqueDatabaseName } from '../test/dataLayers'

async function openRoleDetail(data: DataLayer, title: string) {
  const user = userEvent.setup()
  const { unmount } = render(<App data={data} />)
  await user.click(await screen.findByRole('link', { name: title }))
  await screen.findByRole('heading', { level: 2, name: title })
  return { user, unmount }
}

describe('Role detail page', () => {
  it('Given a new Role, when I open it from the Roles list, then I see its Status and its empty fields', async () => {
    const data = await openTestDataLayer()
    await data.createRole({ title: 'Senior QA Engineer' })

    await openRoleDetail(data, 'Senior QA Engineer')

    const fields = screen.getByRole('region', { name: 'Role fields' })
    expect(within(fields).getByText('Status').nextSibling).toHaveTextContent(
      'Interested',
    )
    for (const label of [
      'Location',
      'Work arrangement',
      'Posted salary',
      'Expected salary',
      'Minimum salary',
      'Posting link',
      'Posting date',
      'Posting copy',
      'Fit rating',
      'Next action date',
      'Notes',
    ]) {
      expect(
        within(fields).getByText(label, { selector: 'dt' }).nextSibling,
      ).toHaveTextContent('Not set')
    }
    expect(
      within(fields).getByText('Referral submitted').nextSibling,
    ).toHaveTextContent('No')
  })

  it('Given a Posting link that is not http(s), when I view the Role, then it is shown as text, not a link', async () => {
    const data = await openTestDataLayer()
    const role = await data.createRole({ title: 'Senior QA Engineer' })
    await data.updateRole(role.id, { postingLink: 'javascript:alert(1)' })

    await openRoleDetail(data, 'Senior QA Engineer')

    expect(screen.getByText('javascript:alert(1)')).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'javascript:alert(1)' }),
    ).not.toBeInTheDocument()
  })

  it('Given a Role, when I edit its fields and save, then the detail page shows them, including after the app is reopened', async () => {
    const name = uniqueDatabaseName()
    const data = await openTestDataLayer({ name })
    await data.createRole({ title: 'QA Engineer' })
    const { user, unmount } = await openRoleDetail(data, 'QA Engineer')

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const title = screen.getByLabelText('Title')
    await user.clear(title)
    await user.type(title, 'Senior QA Engineer')
    await user.type(screen.getByLabelText('Location'), 'Chicago, IL')
    await user.selectOptions(
      screen.getByLabelText('Work arrangement'),
      'Hybrid',
    )
    await user.type(screen.getByLabelText('Posted salary minimum'), '120000')
    await user.type(screen.getByLabelText('Posted salary maximum'), '150000')
    await user.selectOptions(screen.getByLabelText('Salary period'), 'Annual')
    await user.type(screen.getByLabelText('Minimum salary'), '125000')
    await user.type(
      screen.getByLabelText('Posting link'),
      'https://www.linkedin.com/jobs/view/123',
    )
    await user.type(screen.getByLabelText('Posting date'), '2026-10-01')
    await user.type(
      screen.getByLabelText('Posting copy'),
      'We are hiring a QA lead',
    )
    await user.selectOptions(screen.getByLabelText('Fit rating'), '4')
    await user.click(screen.getByLabelText('Referral submitted'))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await screen.findByRole('heading', { level: 2, name: 'Senior QA Engineer' })
    const expectShown = (label: string, value: string) =>
      expect(
        within(screen.getByRole('region', { name: 'Role fields' })).getByText(
          label,
        ).nextSibling,
      ).toHaveTextContent(value)
    const expectAllShown = () => {
      expectShown('Location', 'Chicago, IL')
      expectShown('Work arrangement', 'Hybrid')
      expectShown('Posted salary', '$120,000 – $150,000 per year')
      expectShown('Minimum salary', '$125,000')
      expectShown('Posting date', 'Oct 1, 2026')
      expectShown('Posting copy', 'We are hiring a QA lead')
      expectShown('Posting copy', 'Saved Oct 16, 2026')
      expectShown('Fit rating', '4 of 5')
      expectShown('Referral submitted', 'Yes')
      expect(
        screen.getByRole('link', {
          name: 'https://www.linkedin.com/jobs/view/123',
        }),
      ).toHaveAttribute('href', 'https://www.linkedin.com/jobs/view/123')
    }
    expectAllShown()

    // Reopen the app on the same URL: a deep link to the Role.
    unmount()
    data.close()
    render(<App data={await openTestDataLayer({ name })} />)
    await screen.findByRole('heading', { level: 2, name: 'Senior QA Engineer' })
    expectAllShown()
  })

  it('Given a pasted Posting copy with indentation and blank lines, when I save it, then it is kept exactly as pasted', async () => {
    const data = await openTestDataLayer()
    const role = await data.createRole({ title: 'Senior QA Engineer' })
    const { user } = await openRoleDetail(data, 'Senior QA Engineer')
    const pasted = '  About the role\n\n  - Own test strategy\n'

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(screen.getByLabelText('Posting copy'))
    await user.paste(pasted)
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await screen.findByRole('button', { name: 'Edit' })
    expect((await data.getRole(role.id))?.postingCopy).toBe(pasted)
  })

  it('Given a Role, when I edit it and cancel, then nothing changes', async () => {
    const data = await openTestDataLayer()
    const role = await data.createRole({ title: 'Senior QA Engineer' })
    const { user } = await openRoleDetail(data, 'Senior QA Engineer')

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.type(screen.getByLabelText('Location'), 'Chicago, IL')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect((await data.getRole(role.id))?.location).toBeNull()
    expect(
      within(screen.getByRole('region', { name: 'Role fields' })).getByText(
        'Location',
      ).nextSibling,
    ).toHaveTextContent('Not set')
  })

  it('Given a Role, when I delete it and confirm, then I am back on the Roles list and it is gone', async () => {
    const data = await openTestDataLayer()
    const role = await data.createRole({ title: 'Senior QA Engineer' })
    const { user } = await openRoleDetail(data, 'Senior QA Engineer')

    await user.click(screen.getByRole('button', { name: 'Delete Role' }))
    const confirm = screen.getByRole('alertdialog', {
      name: 'Delete this Role?',
    })
    await user.click(within(confirm).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText(/no roles yet/i)).toBeInTheDocument()
    expect(await data.getRole(role.id)).toBeUndefined()
    expect(await data.getStatusHistory(role.id)).toEqual([])
  })

  it('Given a Role, when I start deleting it and cancel, then it is kept', async () => {
    const data = await openTestDataLayer()
    const role = await data.createRole({ title: 'Senior QA Engineer' })
    const { user } = await openRoleDetail(data, 'Senior QA Engineer')

    await user.click(screen.getByRole('button', { name: 'Delete Role' }))
    const confirm = screen.getByRole('alertdialog', {
      name: 'Delete this Role?',
    })
    await user.click(within(confirm).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(await data.getRole(role.id)).toBeDefined()
  })
})
