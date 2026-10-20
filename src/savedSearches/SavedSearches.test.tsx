import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from '../App'
import type { DataLayer } from '../data/dataLayer'
import { fixedClock, openTestDataLayer } from '../test/dataLayers'

async function openSavedSearches(data: DataLayer) {
  const user = userEvent.setup()
  render(<App data={data} />)
  await user.click(await screen.findByRole('link', { name: 'Saved searches' }))
  await screen.findByRole('heading', { level: 2, name: 'Saved searches' })
  return user
}

describe('Saved searches page', () => {
  it('Given no Saved searches, when I add one with a name, link and site, then it is listed with its site, its link opens in a new tab, and it has not been checked yet', async () => {
    const user = await openSavedSearches(await openTestDataLayer())
    expect(await screen.findByText(/no saved searches yet/i)).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Add a Saved search' }))
    const form = screen.getByRole('form', { name: 'Add a Saved search' })
    await user.type(within(form).getByLabelText('Name'), 'QA lead')
    await user.type(
      within(form).getByLabelText('Link'),
      'https://www.linkedin.com/jobs/search?keywords=QA',
    )
    await user.type(within(form).getByLabelText('Site'), 'LinkedIn')
    await user.click(within(form).getByRole('button', { name: 'Save' }))

    const list = await screen.findByRole('list', { name: 'Saved searches' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(1)
    expect(
      within(items[0]).getByRole('heading', { name: 'QA lead' }),
    ).toBeVisible()
    expect(items[0]).toHaveTextContent('LinkedIn')
    expect(items[0]).toHaveTextContent('Not checked yet')
    const link = within(items[0]).getByRole('link', {
      name: 'https://www.linkedin.com/jobs/search?keywords=QA',
    })
    expect(link).toHaveAttribute(
      'href',
      'https://www.linkedin.com/jobs/search?keywords=QA',
    )
    expect(link).toHaveAttribute('target', '_blank')
    expect(
      screen.queryByRole('form', { name: 'Add a Saved search' }),
    ).not.toBeInTheDocument()
  })

  it('Given a Saved search never checked, when I mark it checked, then it shows its Last checked date, from the clock', async () => {
    // 2026-10-16T14:30Z, Oct 16 in the tests' time zone.
    const data = await openTestDataLayer({ clock: fixedClock })
    await data.createSavedSearch({
      name: 'QA lead',
      link: null,
      site: 'LinkedIn',
    })
    const user = await openSavedSearches(data)
    const list = await screen.findByRole('list', { name: 'Saved searches' })
    expect(list).toHaveTextContent('Not checked yet')

    await user.click(
      within(list).getByRole('button', { name: 'Mark QA lead checked' }),
    )

    expect(
      await within(list).findByText('Last checked Oct 16, 2026'),
    ).toBeVisible()
    expect(list).not.toHaveTextContent('Not checked yet')
  })

  it('Given a checked Saved search, when I edit its name and link and clear its site, then the list shows the edits and it is still checked', async () => {
    const data = await openTestDataLayer()
    const search = await data.createSavedSearch({
      name: 'QA lead',
      link: 'https://www.linkedin.com/jobs/search?keywords=QA',
      site: 'LinkedIn',
    })
    await data.markSavedSearchChecked(search.id)
    const user = await openSavedSearches(data)
    const list = await screen.findByRole('list', { name: 'Saved searches' })

    await user.click(within(list).getByRole('button', { name: 'Edit QA lead' }))
    const form = within(list).getByRole('form', { name: 'Edit QA lead' })
    await user.clear(within(form).getByLabelText('Name'))
    await user.type(within(form).getByLabelText('Name'), 'Senior QA')
    await user.clear(within(form).getByLabelText('Link'))
    await user.type(
      within(form).getByLabelText('Link'),
      'https://www.indeed.com/jobs?q=senior+qa',
    )
    await user.clear(within(form).getByLabelText('Site'))
    await user.click(within(form).getByRole('button', { name: 'Save' }))

    // The item is listed while its form is open, so wait for the edit itself.
    await within(list).findByRole('heading', { name: 'Senior QA' })
    const item = within(list).getByRole('listitem')
    expect(
      within(item).getByRole('heading', { name: 'Senior QA' }),
    ).toBeVisible()
    expect(
      within(item).getByRole('link', {
        name: 'https://www.indeed.com/jobs?q=senior+qa',
      }),
    ).toHaveAttribute('target', '_blank')
    expect(item).not.toHaveTextContent('LinkedIn')
    expect(item).toHaveTextContent('Last checked Oct 16, 2026')
  })

  it('Given two Saved searches, when I delete one and confirm, then only the other is listed', async () => {
    const data = await openTestDataLayer()
    await data.createSavedSearch({ name: 'QA lead', link: null, site: null })
    await data.createSavedSearch({ name: 'SDET', link: null, site: null })
    const user = await openSavedSearches(data)
    const list = await screen.findByRole('list', { name: 'Saved searches' })

    await user.click(
      within(list).getByRole('button', { name: 'Delete QA lead' }),
    )
    const confirm = within(list).getByRole('alertdialog', {
      name: 'Delete this Saved search?',
    })
    await user.click(within(confirm).getByRole('button', { name: 'Delete' }))

    // SDET is listed throughout, so wait for QA lead to go.
    await waitFor(() =>
      expect(
        within(list).queryByRole('heading', { name: 'QA lead' }),
      ).not.toBeInTheDocument(),
    )
    expect(within(list).getByRole('heading', { name: 'SDET' })).toBeVisible()
    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
  })

  it('Given a Saved search, when I clear its name and save, then the data layer’s error is shown and the form stays open', async () => {
    const data = await openTestDataLayer()
    await data.createSavedSearch({ name: 'QA lead', link: null, site: null })
    const user = await openSavedSearches(data)
    const list = await screen.findByRole('list', { name: 'Saved searches' })

    await user.click(within(list).getByRole('button', { name: 'Edit QA lead' }))
    const form = within(list).getByRole('form', { name: 'Edit QA lead' })
    await user.clear(within(form).getByLabelText('Name'))
    await user.type(within(form).getByLabelText('Name'), '  ')
    await user.click(within(form).getByRole('button', { name: 'Save' }))

    expect(await within(form).findByRole('alert')).toHaveTextContent(
      'A Saved search needs a name',
    )
  })
})
