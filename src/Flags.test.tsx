import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from './App'
import { openTestDataLayer } from './test/dataLayers'

function badgeFlags() {
  return within(screen.getByRole('note', { name: 'Flags' }))
    .getAllByRole('listitem')
    .map((item) => item.textContent)
}

describe('Flag badges', () => {
  it('Given Acme with dealbreaker Flags and a Role there with its own Flag, one Acme also has, when I open the Role and then Acme, then the Role warns of each Flag once and Acme of its own', async () => {
    const data = await openTestDataLayer()
    const acme = await data.createCompany({ name: 'Acme' })
    await data.updateCompany(acme.id, {
      flags: ['data monetization', 'Workday portal'],
    })
    const role = await data.createRole({ title: 'Senior QA Engineer' })
    await data.updateRole(role.id, {
      companyId: acme.id,
      flags: ['Workday portal'],
    })
    const user = userEvent.setup()
    render(<App data={data} />)

    await user.click(
      await screen.findByRole('link', { name: 'Senior QA Engineer' }),
    )
    await screen.findByRole('heading', { level: 2, name: 'Senior QA Engineer' })
    expect(badgeFlags()).toEqual(['Workday portal', 'data monetization (Acme)'])

    await user.click(screen.getByRole('link', { name: 'Acme' }))
    await screen.findByRole('heading', { level: 2, name: 'Acme' })
    expect(badgeFlags()).toEqual(['data monetization', 'Workday portal'])
  })

  it('Given a Role with no Flags at a Company with none, when I open it, then there is no Flag badge', async () => {
    const data = await openTestDataLayer()
    const acme = await data.createCompany({ name: 'Acme' })
    const role = await data.createRole({ title: 'Senior QA Engineer' })
    await data.updateRole(role.id, { companyId: acme.id })
    const user = userEvent.setup()
    render(<App data={data} />)

    await user.click(
      await screen.findByRole('link', { name: 'Senior QA Engineer' }),
    )
    await screen.findByRole('heading', { level: 2, name: 'Senior QA Engineer' })
    expect(
      screen.queryByRole('note', { name: 'Flags' }),
    ).not.toBeInTheDocument()
  })
})

function suggestionsFor(input: HTMLElement) {
  const list = document.getElementById(input.getAttribute('list') ?? '')
  return [...(list?.querySelectorAll('option') ?? [])].map(
    (option) => option.value,
  )
}

describe('Adding Flags', () => {
  it('Given a Role Flagged "Workday portal", when I edit another Role, then that Flag is suggested; I add it and a new one, remove the new one, and save', async () => {
    const data = await openTestDataLayer()
    const flagged = await data.createRole({ title: 'QA Engineer' })
    await data.updateRole(flagged.id, { flags: ['Workday portal'] })
    const role = await data.createRole({ title: 'Senior QA Engineer' })
    const user = userEvent.setup()
    render(<App data={data} />)
    await user.click(
      await screen.findByRole('link', { name: 'Senior QA Engineer' }),
    )
    await user.click(await screen.findByRole('button', { name: 'Edit' }))

    const flagInput = screen.getByLabelText('Add a Flag')
    expect(suggestionsFor(flagInput)).toEqual(['Workday portal'])
    await user.type(flagInput, 'Workday portal')
    await user.click(screen.getByRole('button', { name: 'Add Flag' }))
    await user.type(flagInput, 'Unpaid take-home{Enter}')
    expect(flagInput).toHaveValue('')
    expect(suggestionsFor(flagInput)).toEqual([])
    await user.click(
      screen.getByRole('button', { name: 'Remove Flag Unpaid take-home' }),
    )
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await screen.findByRole('button', { name: 'Edit' })
    expect(badgeFlags()).toEqual(['Workday portal'])
    expect((await data.getRole(role.id))?.flags).toEqual(['Workday portal'])
  })

  it('Given a Role Flagged "Workday portal", when I edit Acme, then that Flag is suggested and a dealbreaker I add is saved', async () => {
    const data = await openTestDataLayer()
    const role = await data.createRole({ title: 'QA Engineer' })
    await data.updateRole(role.id, { flags: ['Workday portal'] })
    const acme = await data.createCompany({ name: 'Acme' })
    const user = userEvent.setup()
    render(<App data={data} />)
    await user.click(await screen.findByRole('link', { name: 'Companies' }))
    await user.click(await screen.findByRole('link', { name: 'Acme' }))
    await user.click(await screen.findByRole('button', { name: 'Edit' }))

    const flagInput = screen.getByLabelText('Add a Flag')
    expect(suggestionsFor(flagInput)).toEqual(['Workday portal'])
    await user.type(flagInput, 'data monetization{Enter}')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await screen.findByRole('button', { name: 'Edit' })
    expect(badgeFlags()).toEqual(['data monetization'])
    expect((await data.getCompany(acme.id))?.flags).toEqual([
      'data monetization',
    ])
  })
})
