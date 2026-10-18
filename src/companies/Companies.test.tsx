import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from '../App'
import { openTestDataLayer } from '../test/dataLayers'

function shownValue(label: string) {
  return within(
    screen.getByRole('region', { name: 'Company fields' }),
  ).getByText(label, { selector: 'dt' }).nextSibling
}

describe('Company pages', () => {
  it('Given no Companies, when I add one from the Companies page and open it, then I see its empty fields and that it has no Roles', async () => {
    const user = userEvent.setup()
    render(<App data={await openTestDataLayer()} />)

    await user.click(await screen.findByRole('link', { name: 'Companies' }))
    expect(await screen.findByText(/no companies yet/i)).toBeInTheDocument()
    await user.type(screen.getByLabelText('Company name'), 'Acme')
    await user.click(screen.getByRole('button', { name: 'Add Company' }))
    await user.click(
      within(await screen.findByRole('list', { name: 'Companies' })).getByRole(
        'link',
        { name: 'Acme' },
      ),
    )

    await screen.findByRole('heading', { level: 2, name: 'Acme' })
    for (const label of [
      'Industry',
      'Summary',
      'Website',
      'Company size',
      'Notes',
    ]) {
      expect(shownValue(label)).toHaveTextContent('Not set')
    }
    expect(screen.getByText('No Roles at Acme yet.')).toBeInTheDocument()
  })

  it('Given Acme, when I add "acme" from the Companies page, then I am told it already exists and nothing is added', async () => {
    const data = await openTestDataLayer()
    await data.createCompany({ name: 'Acme' })
    const user = userEvent.setup()
    render(<App data={data} />)
    await user.click(await screen.findByRole('link', { name: 'Companies' }))

    await user.type(await screen.findByLabelText('Company name'), 'acme')
    await user.click(screen.getByRole('button', { name: 'Add Company' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'There is already a Company called Acme',
    )
    expect(screen.getByLabelText('Company name')).toHaveValue('acme')
    expect(
      within(screen.getByRole('list', { name: 'Companies' })).getAllByRole(
        'listitem',
      ),
    ).toHaveLength(1)
  })

  it('Given a Company, when I edit its fields and save, then its page shows them', async () => {
    const data = await openTestDataLayer()
    await data.createCompany({ name: 'Acme' })
    const user = userEvent.setup()
    render(<App data={data} />)
    await user.click(await screen.findByRole('link', { name: 'Companies' }))
    await user.click(await screen.findByRole('link', { name: 'Acme' }))

    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    const name = screen.getByLabelText('Company name')
    await user.clear(name)
    await user.type(name, 'Acme Corp')
    await user.type(screen.getByLabelText('Industry'), 'Fintech')
    await user.type(
      screen.getByLabelText('Website'),
      'https://acme.example.com',
    )
    await user.type(screen.getByLabelText('Company size'), '51–200')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await screen.findByRole('heading', { level: 2, name: 'Acme Corp' })
    expect(shownValue('Industry')).toHaveTextContent('Fintech')
    expect(shownValue('Company size')).toHaveTextContent('51–200')
    expect(
      screen.getByRole('link', { name: 'https://acme.example.com' }),
    ).toHaveAttribute('href', 'https://acme.example.com')
  })

  it('Given a Role with no Company, when I link it to Acme from its edit form, then the Role links to Acme and Acme lists the Role', async () => {
    const data = await openTestDataLayer()
    await data.createCompany({ name: 'Acme' })
    await data.createRole({ title: 'Senior QA Engineer' })
    const user = userEvent.setup()
    render(<App data={data} />)

    const roles = await screen.findByRole('table', { name: 'Roles' })
    expect(roles).toHaveTextContent('Company not disclosed')
    await user.click(
      within(roles).getByRole('link', { name: 'Senior QA Engineer' }),
    )
    const roleFields = await screen.findByRole('region', {
      name: 'Role fields',
    })
    expect(
      within(roleFields).getByText('Company', { selector: 'dt' }).nextSibling,
    ).toHaveTextContent('Company not disclosed')

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.selectOptions(screen.getByLabelText('Company'), 'Acme')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await user.click(await screen.findByRole('link', { name: 'Acme' }))
    await screen.findByRole('heading', { level: 2, name: 'Acme' })
    expect(
      screen.getByRole('list', { name: 'Roles at Acme' }),
    ).toHaveTextContent('Senior QA Engineer')
  })

  it('Given Acme has a Role, when I try to delete Acme, then I am told why I cannot and Acme is kept', async () => {
    const data = await openTestDataLayer()
    const acme = await data.createCompany({ name: 'Acme' })
    const role = await data.createRole({ title: 'Senior QA Engineer' })
    await data.updateRole(role.id, { companyId: acme.id })
    const user = userEvent.setup()
    render(<App data={data} />)
    await user.click(await screen.findByRole('link', { name: 'Companies' }))
    await user.click(await screen.findByRole('link', { name: 'Acme' }))

    await user.click(
      await screen.findByRole('button', { name: 'Delete Company' }),
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Acme still has 1 Role. Link it to another Company or delete it first.',
    )
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(await data.getCompany(acme.id)).toBeDefined()
  })

  it('Given Acme has no Roles, when I delete it and confirm, then I am back on the Companies list and it is gone', async () => {
    const data = await openTestDataLayer()
    const acme = await data.createCompany({ name: 'Acme' })
    const user = userEvent.setup()
    render(<App data={data} />)
    await user.click(await screen.findByRole('link', { name: 'Companies' }))
    await user.click(await screen.findByRole('link', { name: 'Acme' }))

    await user.click(
      await screen.findByRole('button', { name: 'Delete Company' }),
    )
    const confirm = screen.getByRole('alertdialog', {
      name: 'Delete this Company?',
    })
    await user.click(within(confirm).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText(/no companies yet/i)).toBeInTheDocument()
    expect(await data.getCompany(acme.id)).toBeUndefined()
  })
})
