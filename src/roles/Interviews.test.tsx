import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from '../App'
import type { DataLayer } from '../data/dataLayer'
import { openTestDataLayer } from '../test/dataLayers'

async function openRole(data: DataLayer, title: string) {
  const user = userEvent.setup()
  render(<App data={data} />)
  await user.click(await screen.findByRole('link', { name: title }))
  await screen.findByRole('heading', { level: 2, name: title })
  return user
}

describe('Interviews on the Role detail page', () => {
  it('Given a Role in Interested with no Interviews, when I log a technical Interview with Priya and Morgan, then it is listed with them, they are the Role’s Interviewers, and the Role is still in Interested', async () => {
    const data = await openTestDataLayer()
    const role = await data.createRole({ title: 'Senior QA Engineer' })
    const priya = await data.createContact({ name: 'Priya Shah' })
    await data.updateContact(priya.id, { title: 'Staff Engineer' })
    await data.createContact({ name: 'Morgan Lee' })
    await data.createContact({ name: 'Sam Ortiz' })
    const user = await openRole(data, 'Senior QA Engineer')
    const interviews = await screen.findByRole('region', { name: 'Interviews' })
    expect(interviews).toHaveTextContent('No Interviews logged yet.')
    expect(
      screen.getByRole('region', { name: 'Interviewers' }),
    ).toHaveTextContent('No Interviewers yet.')

    await user.click(
      within(interviews).getByRole('button', { name: 'Log an Interview' }),
    )
    const form = within(interviews).getByRole('form', {
      name: 'Log an Interview',
    })
    await user.type(
      within(form).getByLabelText('Date and time'),
      '2026-10-20T14:00',
    )
    await user.selectOptions(
      within(form).getByLabelText('Interview type'),
      'Technical',
    )
    await user.click(within(form).getByLabelText('Priya Shah'))
    await user.click(within(form).getByLabelText('Morgan Lee'))
    await user.type(within(form).getByLabelText('Notes'), 'Live coding')
    await user.click(within(form).getByLabelText('Follow-up sent'))
    await user.click(within(form).getByRole('button', { name: 'Save' }))

    const list = await within(interviews).findByRole('list', {
      name: 'Interviews',
    })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(1)
    expect(items[0]).toHaveTextContent('Technical · Oct 20, 2026, 2:00 PM')
    expect(items[0]).toHaveTextContent('Interviewers: Morgan Lee, Priya Shah')
    expect(items[0]).toHaveTextContent('Follow-up sent')
    expect(items[0]).toHaveTextContent('Live coding')
    expect(
      within(screen.getByRole('region', { name: 'Interviewers' })).getByRole(
        'list',
        { name: 'Interviewers' },
      ),
    ).toHaveTextContent('Morgan LeePriya Shah, Staff Engineer')

    const fields = screen.getByRole('region', { name: 'Role fields' })
    expect(within(fields).getByText('Status').nextSibling).toHaveTextContent(
      'Interested',
    )
    expect(await data.getStatusHistory(role.id)).toHaveLength(1)
  })

  it('Given a recruiter screen with Priya and Morgan, when I edit it to a hiring manager Interview with only Morgan, then it is listed that way and Morgan is the only Interviewer', async () => {
    const data = await openTestDataLayer()
    const role = await data.createRole({ title: 'Senior QA Engineer' })
    const priya = await data.createContact({ name: 'Priya Shah' })
    const morgan = await data.createContact({ name: 'Morgan Lee' })
    await data.createInterview({
      roleId: role.id,
      at: '2026-10-20T14:00',
      type: 'recruiter screen',
      interviewerIds: [priya.id, morgan.id],
      notes: null,
      followUpSent: false,
    })
    const user = await openRole(data, 'Senior QA Engineer')
    const interviews = await screen.findByRole('region', { name: 'Interviews' })

    await user.click(
      within(interviews).getByRole('button', {
        name: 'Edit Recruiter screen · Oct 20, 2026, 2:00 PM',
      }),
    )
    const form = within(interviews).getByRole('form', {
      name: 'Edit Interview',
    })
    expect(within(form).getByLabelText('Date and time')).toHaveValue(
      '2026-10-20T14:00',
    )
    await user.selectOptions(
      within(form).getByLabelText('Interview type'),
      'Hiring manager',
    )
    await user.click(within(form).getByLabelText('Priya Shah'))
    await user.click(within(form).getByRole('button', { name: 'Save' }))

    // The edit form is a list item too, until the save has reloaded the list.
    const heading = await within(interviews).findByRole('heading', {
      name: 'Hiring manager · Oct 20, 2026, 2:00 PM',
    })
    const item = heading.closest('li')!
    expect(item).toHaveTextContent('Interviewers: Morgan Lee')
    expect(item).toHaveTextContent('No Follow-up sent yet')
    expect(
      screen.getByRole('list', { name: 'Interviewers' }),
    ).toHaveTextContent(/^Morgan Lee$/)
  })

  it('Given an Interview with Priya, when I delete it and confirm, then the Role has no Interviews or Interviewers and Priya is kept', async () => {
    const data = await openTestDataLayer()
    const role = await data.createRole({ title: 'Senior QA Engineer' })
    const priya = await data.createContact({ name: 'Priya Shah' })
    await data.createInterview({
      roleId: role.id,
      at: '2026-10-20T14:00',
      type: 'panel',
      interviewerIds: [priya.id],
      notes: null,
      followUpSent: false,
    })
    const user = await openRole(data, 'Senior QA Engineer')
    const interviews = await screen.findByRole('region', { name: 'Interviews' })

    await user.click(
      within(interviews).getByRole('button', {
        name: 'Delete Panel · Oct 20, 2026, 2:00 PM',
      }),
    )
    const confirm = screen.getByRole('alertdialog', {
      name: 'Delete this Interview?',
    })
    await user.click(within(confirm).getByRole('button', { name: 'Delete' }))

    expect(
      await within(interviews).findByText('No Interviews logged yet.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: 'Interviewers' }),
    ).toHaveTextContent('No Interviewers yet.')
    expect(await data.getContact(priya.id)).toBeDefined()
  })

  it('Given a Role, when I log an Interview with a date and time but no type, then I am told it needs a type and nothing is logged', async () => {
    const data = await openTestDataLayer()
    const role = await data.createRole({ title: 'Senior QA Engineer' })
    const user = await openRole(data, 'Senior QA Engineer')
    const interviews = await screen.findByRole('region', { name: 'Interviews' })

    await user.click(
      within(interviews).getByRole('button', { name: 'Log an Interview' }),
    )
    const form = within(interviews).getByRole('form', {
      name: 'Log an Interview',
    })
    await user.type(
      within(form).getByLabelText('Date and time'),
      '2026-10-20T14:00',
    )
    await user.click(within(form).getByRole('button', { name: 'Save' }))

    expect(await within(form).findByRole('alert')).toHaveTextContent(
      'An Interview needs a type',
    )
    expect(await data.listInterviews(role.id)).toEqual([])
  })
})
