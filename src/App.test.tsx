import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from './App'
import { openTestDataLayer, uniqueDatabaseName } from './test/dataLayers'

describe('Roles list', () => {
  it('Given no Roles, when I add a Role by title, then it appears in the Roles table', async () => {
    const user = userEvent.setup()
    render(<App data={await openTestDataLayer()} />)

    expect(await screen.findByText(/no roles yet/i)).toBeInTheDocument()
    await user.type(screen.getByLabelText('Role title'), 'Senior QA Engineer')
    await user.click(screen.getByRole('button', { name: 'Add Role' }))

    const list = await screen.findByRole('table', { name: 'Roles' })
    expect(list).toHaveTextContent('Senior QA Engineer')
    expect(screen.getByLabelText('Role title')).toHaveValue('')
  })

  it('Given a Role was added, when the app is opened again, then the Role is still listed', async () => {
    const name = uniqueDatabaseName()
    const user = userEvent.setup()
    const first = render(<App data={await openTestDataLayer({ name })} />)
    await user.type(
      await screen.findByLabelText('Role title'),
      'Senior QA Engineer',
    )
    await user.click(screen.getByRole('button', { name: 'Add Role' }))
    await screen.findByRole('table', { name: 'Roles' })
    first.unmount()

    render(<App data={await openTestDataLayer({ name })} />)

    expect(
      await screen.findByRole('table', { name: 'Roles' }),
    ).toHaveTextContent('Senior QA Engineer')
  })

  it('Given an empty title, when I try to add a Role, then nothing is added', async () => {
    const user = userEvent.setup()
    render(<App data={await openTestDataLayer()} />)

    await user.type(await screen.findByLabelText('Role title'), '   ')
    await user.click(screen.getByRole('button', { name: 'Add Role' }))

    expect(
      screen.queryByRole('table', { name: 'Roles' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/no roles yet/i)).toBeInTheDocument()
  })
})
