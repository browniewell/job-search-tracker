import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from '../App'
import type { DataLayer } from '../data/dataLayer'
import { openTestDataLayer } from '../test/dataLayers'

function shownValue(label: string) {
  return within(
    screen.getByRole('region', { name: 'Contact fields' }),
  ).getByText(label, { selector: 'dt' }).nextSibling
}

async function openContact(data: DataLayer, name: string) {
  const user = userEvent.setup()
  render(<App data={data} />)
  await user.click(await screen.findByRole('link', { name: 'Contacts' }))
  await user.click(await screen.findByRole('link', { name }))
  await screen.findByRole('heading', { level: 2, name })
  return user
}

async function openRole(data: DataLayer, title: string) {
  const user = userEvent.setup()
  render(<App data={data} />)
  await user.click(await screen.findByRole('link', { name: title }))
  await screen.findByRole('heading', { level: 2, name: title })
  return user
}

describe('Contact pages', () => {
  it('Given no Contacts, when I add one from the Contacts page and open it, then I see its empty fields and that it is linked to no Roles', async () => {
    const user = userEvent.setup()
    render(<App data={await openTestDataLayer()} />)

    await user.click(await screen.findByRole('link', { name: 'Contacts' }))
    expect(await screen.findByText(/no contacts yet/i)).toBeInTheDocument()
    await user.type(screen.getByLabelText('Contact name'), 'Priya Shah')
    await user.click(screen.getByRole('button', { name: 'Add Contact' }))
    await user.click(
      within(await screen.findByRole('list', { name: 'Contacts' })).getByRole(
        'link',
        { name: 'Priya Shah' },
      ),
    )

    await screen.findByRole('heading', { level: 2, name: 'Priya Shah' })
    for (const label of [
      'Title',
      'Company',
      'How you know them',
      'Email',
      'LinkedIn',
      'Notes',
    ]) {
      expect(shownValue(label)).toHaveTextContent('Not set')
    }
    expect(
      screen.getByText('Priya Shah is not linked to any Roles yet.'),
    ).toBeInTheDocument()
  })

  it('Given a Contact and Acme, when I edit the Contact with a Title at Acme and save, then the Contact page shows them and Acme lists the Contact', async () => {
    const data = await openTestDataLayer()
    await data.createCompany({ name: 'Acme' })
    await data.createContact({ name: 'Priya Shah' })
    const user = await openContact(data, 'Priya Shah')

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.type(
      screen.getByLabelText('Title'),
      'Senior Technical Recruiter',
    )
    await user.selectOptions(screen.getByLabelText('Company'), 'Acme')
    await user.type(
      screen.getByLabelText('How you know them'),
      'Worked together at Initech',
    )
    await user.type(screen.getByLabelText('Email'), 'priya@example.com')
    await user.type(
      screen.getByLabelText('LinkedIn'),
      'https://www.linkedin.com/in/priya',
    )
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await screen.findByRole('region', { name: 'Contact fields' })
    expect(shownValue('Title')).toHaveTextContent('Senior Technical Recruiter')
    expect(shownValue('How you know them')).toHaveTextContent(
      'Worked together at Initech',
    )
    expect(shownValue('Email')).toHaveTextContent('priya@example.com')
    expect(
      screen.getByRole('link', { name: 'https://www.linkedin.com/in/priya' }),
    ).toHaveAttribute('href', 'https://www.linkedin.com/in/priya')

    await user.click(
      within(shownValue('Company') as HTMLElement).getByRole('link', {
        name: 'Acme',
      }),
    )
    await screen.findByRole('heading', { level: 2, name: 'Acme' })
    expect(
      screen.getByRole('list', { name: 'Contacts at Acme' }),
    ).toHaveTextContent('Priya Shah')
  })

  it('Given Priya is a recruiter on a Role, when I delete her and confirm, then I am back on the Contacts list and the Role no longer lists her', async () => {
    const data = await openTestDataLayer()
    const role = await data.createRole({ title: 'Senior QA Engineer' })
    const priya = await data.createContact({ name: 'Priya Shah' })
    await data.linkContact({
      roleId: role.id,
      contactId: priya.id,
      type: 'recruiter',
    })
    const user = await openContact(data, 'Priya Shah')

    await user.click(screen.getByRole('button', { name: 'Delete Contact' }))
    const confirm = screen.getByRole('alertdialog', {
      name: 'Delete this Contact?',
    })
    expect(confirm).toHaveTextContent(
      '“Priya Shah” will be deleted and taken off every Role.',
    )
    await user.click(within(confirm).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText(/no contacts yet/i)).toBeInTheDocument()
    expect(await data.getContact(priya.id)).toBeUndefined()
    expect(await data.listRoleContacts(role.id)).toEqual([])
  })
})

describe('Role contacts on the Role detail page', () => {
  it('Given a Role with no Role contacts, when I link Priya as its recruiter and Morgan as its hiring manager, then the Role lists them by type and Priya’s page lists the Role', async () => {
    const data = await openTestDataLayer()
    await data.createRole({ title: 'Senior QA Engineer' })
    const priya = await data.createContact({ name: 'Priya Shah' })
    await data.updateContact(priya.id, {
      title: 'Senior Technical Recruiter',
    })
    await data.createContact({ name: 'Morgan Lee' })
    const user = await openRole(data, 'Senior QA Engineer')
    const contacts = await screen.findByRole('region', { name: 'Contacts' })
    expect(contacts).toHaveTextContent('No Contacts linked to this Role yet.')

    for (const [name, type] of [
      ['Morgan Lee', 'Hiring manager'],
      ['Priya Shah', 'Recruiter'],
    ]) {
      await user.selectOptions(within(contacts).getByLabelText('Contact'), name)
      await user.selectOptions(within(contacts).getByLabelText('Type'), type)
      await user.click(
        within(contacts).getByRole('button', { name: 'Link Contact' }),
      )
      await within(contacts).findByRole('link', { name })
    }

    expect(
      within(contacts)
        .getAllByRole('heading', { level: 4 })
        .map((heading) => heading.textContent),
    ).toEqual(['Recruiter', 'Hiring manager'])
    expect(
      within(contacts).getByRole('list', { name: 'Recruiter' }),
    ).toHaveTextContent('Priya Shah, Senior Technical Recruiter')
    expect(
      within(contacts).getByRole('list', { name: 'Hiring manager' }),
    ).toHaveTextContent('Morgan Lee')

    await user.click(within(contacts).getByRole('link', { name: 'Priya Shah' }))
    await screen.findByRole('heading', { level: 2, name: 'Priya Shah' })
    expect(
      screen.getByRole('list', { name: 'Roles with Priya Shah' }),
    ).toHaveTextContent('Senior QA EngineerRecruiter')
  })

  it('Given Priya is already the recruiter on a Role, when I link her as its recruiter again, then I am told why and she is listed once', async () => {
    const data = await openTestDataLayer()
    const role = await data.createRole({ title: 'Senior QA Engineer' })
    const priya = await data.createContact({ name: 'Priya Shah' })
    await data.linkContact({
      roleId: role.id,
      contactId: priya.id,
      type: 'recruiter',
    })
    const user = await openRole(data, 'Senior QA Engineer')
    const contacts = await screen.findByRole('region', { name: 'Contacts' })

    await user.selectOptions(
      within(contacts).getByLabelText('Contact'),
      'Priya Shah',
    )
    await user.selectOptions(
      within(contacts).getByLabelText('Type'),
      'Recruiter',
    )
    await user.click(
      within(contacts).getByRole('button', { name: 'Link Contact' }),
    )

    expect(await within(contacts).findByRole('alert')).toHaveTextContent(
      'Priya Shah is already a recruiter on this Role',
    )
    expect(
      within(contacts).getAllByRole('link', { name: 'Priya Shah' }),
    ).toHaveLength(1)
  })

  it('Given Priya is the recruiter on a Role, when I remove her from it, then the Role lists no Contacts and Priya is kept', async () => {
    const data = await openTestDataLayer()
    const role = await data.createRole({ title: 'Senior QA Engineer' })
    const priya = await data.createContact({ name: 'Priya Shah' })
    await data.linkContact({
      roleId: role.id,
      contactId: priya.id,
      type: 'recruiter',
    })
    const user = await openRole(data, 'Senior QA Engineer')
    const contacts = await screen.findByRole('region', { name: 'Contacts' })

    await user.click(
      within(contacts).getByRole('button', {
        name: 'Remove Priya Shah as recruiter',
      }),
    )

    expect(
      await within(contacts).findByText('No Contacts linked to this Role yet.'),
    ).toBeInTheDocument()
    expect(await data.getContact(priya.id)).toBeDefined()
  })

  it('Given no Contacts at all, when I open a Role, then I am pointed to the Contacts page to add one', async () => {
    const data = await openTestDataLayer()
    await data.createRole({ title: 'Senior QA Engineer' })
    await openRole(data, 'Senior QA Engineer')
    const contacts = await screen.findByRole('region', { name: 'Contacts' })

    expect(
      within(contacts).getByRole('link', { name: 'Add a Contact' }),
    ).toHaveAttribute('href', '#/contacts')
    expect(
      within(contacts).queryByRole('button', { name: 'Link Contact' }),
    ).not.toBeInTheDocument()
  })
})

describe('Deleting a Company with Contacts', () => {
  it('Given Acme has a Contact and no Roles, when I delete Acme, then I am told its Contacts are kept and afterwards the Contact has no Company', async () => {
    const data = await openTestDataLayer()
    const acme = await data.createCompany({ name: 'Acme' })
    const priya = await data.createContact({ name: 'Priya Shah' })
    await data.updateContact(priya.id, { companyId: acme.id })
    const user = userEvent.setup()
    render(<App data={data} />)
    await user.click(await screen.findByRole('link', { name: 'Companies' }))
    await user.click(await screen.findByRole('link', { name: 'Acme' }))
    expect(
      await screen.findByRole('list', { name: 'Contacts at Acme' }),
    ).toHaveTextContent('Priya Shah')

    await user.click(screen.getByRole('button', { name: 'Delete Company' }))
    const confirm = screen.getByRole('alertdialog', {
      name: 'Delete this Company?',
    })
    expect(confirm).toHaveTextContent(
      'Its 1 Contact will be kept, with no Company.',
    )
    await user.click(within(confirm).getByRole('button', { name: 'Delete' }))

    await screen.findByText(/no companies yet/i)
    expect((await data.getContact(priya.id))?.companyId).toBeNull()
  })
})
