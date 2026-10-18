import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from '../App'
import type { DataLayer } from '../data/dataLayer'
import { openTestDataLayer } from '../test/dataLayers'

async function statusId(data: DataLayer, name: string): Promise<string> {
  const status = (await data.listStatuses()).find((s) => s.name === name)
  if (!status) throw new Error(`No Status called ${name}`)
  return status.id
}

function rolesTable() {
  return screen.findByRole('table', { name: 'Roles' })
}

/** Each body row's cells, as text. */
function rowTexts(table: HTMLElement): string[][] {
  const [, ...bodyRows] = within(table).getAllByRole('row')
  return bodyRows.map((row) =>
    within(row)
      .getAllByRole('cell')
      .map((cell) => cell.textContent ?? ''),
  )
}

describe('Roles table', () => {
  it('Given a Role at Acme and a Rejected Role with no Company, when I open Roles, then the table shows both with their fields, by Role title as they were added together', async () => {
    const data = await openTestDataLayer()
    const acme = await data.createCompany({ name: 'Acme' })
    const qa = await data.createRole({ title: 'Senior QA Engineer' })
    await data.updateRole(qa.id, {
      companyId: acme.id,
      workArrangement: 'remote',
      salaryMin: 120000,
      salaryMax: 150000,
      salaryPeriod: 'annual',
      fitRating: 4,
      postingDate: '2026-10-01',
      nextActionDate: '2026-10-20',
    })
    const sdet = await data.createRole({ title: 'SDET' })
    await data.changeStatus(sdet.id, await statusId(data, 'Rejected'))
    render(<App data={data} />)

    const table = await rolesTable()
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual([
      'Role title',
      'Company',
      'Status',
      'Work arrangement',
      'Posted salary',
      'Fit rating',
      'Posting date',
      'Next action date',
      'Flags',
    ])
    expect(rowTexts(table)).toEqual([
      ['SDET', 'Company not disclosed', 'Rejected', '', '', '', '', '', ''],
      [
        'Senior QA Engineer',
        'Acme',
        'Interested',
        'Remote',
        '$120,000 – $150,000 per year',
        '4',
        'Oct 1, 2026',
        'Oct 20, 2026',
        '',
      ],
    ])
  })
})

/** A focused control's label, or a button's or link's text. */
function accessibleName(element: Element | null): string | null {
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement
  ) {
    return element.labels?.[0]?.textContent ?? null
  }
  return element?.textContent ?? null
}

/** Role titles in the order the table shows them. */
function titleOrder(table: HTMLElement): string[] {
  return rowTexts(table).map(([title]) => title)
}

// Each column puts these four Roles in a different order. Delta has every
// field empty.
async function openWithFourRoles() {
  const data = await openTestDataLayer()
  const acme = await data.createCompany({ name: 'Acme' })
  await data.updateCompany(acme.id, { flags: ['data monetization'] })
  const globex = await data.createCompany({ name: 'Globex' })
  const zeta = await data.createCompany({ name: 'Zeta' })
  const alpha = await data.createRole({ title: 'Alpha' })
  await data.updateRole(alpha.id, {
    companyId: zeta.id,
    workArrangement: 'remote',
    salaryMin: 100000,
    salaryMax: 150000,
    salaryPeriod: 'annual',
    fitRating: 2,
    postingDate: '2026-09-15',
    nextActionDate: '2026-10-25',
    flags: ['Workday portal', 'Unpaid take-home'],
  })
  await data.changeStatus(alpha.id, await statusId(data, 'Offer'))
  const bravo = await data.createRole({ title: 'Bravo' })
  await data.updateRole(bravo.id, {
    companyId: globex.id,
    workArrangement: 'hybrid',
    salaryMin: 60,
    salaryMax: 80,
    salaryPeriod: 'hourly',
    fitRating: 5,
    postingDate: '2026-10-01',
    nextActionDate: '2026-10-19',
    flags: ['Workday portal'],
  })
  await data.changeStatus(bravo.id, await statusId(data, 'Applied'))
  const charlie = await data.createRole({ title: 'Charlie' })
  await data.updateRole(charlie.id, {
    companyId: acme.id,
    workArrangement: 'on-site',
    salaryMin: 120000,
    salaryMax: 140000,
    salaryPeriod: 'annual',
    fitRating: 3,
    postingDate: '2026-08-30',
    nextActionDate: '2026-11-02',
    flags: ['Workday portal', 'Unpaid take-home'],
  })
  await data.changeStatus(charlie.id, await statusId(data, 'Rejected'))
  await data.createRole({ title: 'Delta' })
  render(<App data={data} />)
  return rolesTable()
}

describe('Sorting the Roles table', () => {
  it.each([
    {
      column: 'Role title',
      first: 'ascending',
      firstOrder: ['Alpha', 'Bravo', 'Charlie', 'Delta'],
      secondOrder: ['Delta', 'Charlie', 'Bravo', 'Alpha'],
    },
    {
      column: 'Company',
      first: 'ascending',
      firstOrder: ['Charlie', 'Bravo', 'Alpha', 'Delta'],
      secondOrder: ['Alpha', 'Bravo', 'Charlie', 'Delta'],
    },
    {
      // Pipeline order: Interested, Applied, Offer, Rejected.
      column: 'Status',
      first: 'ascending',
      firstOrder: ['Delta', 'Bravo', 'Alpha', 'Charlie'],
      secondOrder: ['Charlie', 'Alpha', 'Bravo', 'Delta'],
    },
    {
      // On-site, hybrid, remote.
      column: 'Work arrangement',
      first: 'ascending',
      firstOrder: ['Charlie', 'Bravo', 'Alpha', 'Delta'],
      secondOrder: ['Alpha', 'Bravo', 'Charlie', 'Delta'],
    },
    {
      // By the top of the range, $80 an hour being $166,400 a year.
      column: 'Posted salary',
      first: 'descending',
      firstOrder: ['Bravo', 'Alpha', 'Charlie', 'Delta'],
      secondOrder: ['Charlie', 'Alpha', 'Bravo', 'Delta'],
    },
    {
      column: 'Fit rating',
      first: 'descending',
      firstOrder: ['Bravo', 'Charlie', 'Alpha', 'Delta'],
      secondOrder: ['Alpha', 'Charlie', 'Bravo', 'Delta'],
    },
    {
      column: 'Posting date',
      first: 'ascending',
      firstOrder: ['Charlie', 'Alpha', 'Bravo', 'Delta'],
      secondOrder: ['Bravo', 'Alpha', 'Charlie', 'Delta'],
    },
    {
      column: 'Next action date',
      first: 'ascending',
      firstOrder: ['Bravo', 'Alpha', 'Charlie', 'Delta'],
      secondOrder: ['Charlie', 'Alpha', 'Bravo', 'Delta'],
    },
    {
      // Counting Acme's dealbreaker on Charlie.
      column: 'Flags',
      first: 'descending',
      firstOrder: ['Charlie', 'Alpha', 'Bravo', 'Delta'],
      secondOrder: ['Bravo', 'Alpha', 'Charlie', 'Delta'],
    },
  ])(
    'Given four Roles, one with every field empty, when I sort by $column and then sort again, then they are $first and then reversed, with the empty one last both times',
    async ({ column, first, firstOrder, secondOrder }) => {
      const user = userEvent.setup()
      const table = await openWithFourRoles()
      const header = within(table).getByRole('columnheader', { name: column })

      await user.click(within(header).getByRole('button'))
      expect(header).toHaveAttribute('aria-sort', first)
      expect(titleOrder(table)).toEqual(firstOrder)

      await user.click(within(header).getByRole('button'))
      expect(header).toHaveAttribute(
        'aria-sort',
        first === 'ascending' ? 'descending' : 'ascending',
      )
      expect(titleOrder(table)).toEqual(secondOrder)
    },
  )
})

describe('Filtering the Roles table', () => {
  it('Given four Roles, when I filter by the Rejected Status, then only the Rejected Role shows, and Any shows them all again', async () => {
    const user = userEvent.setup()
    const table = await openWithFourRoles()

    await user.selectOptions(screen.getByLabelText('Status'), 'Rejected')
    expect(titleOrder(table)).toEqual(['Charlie'])

    await user.selectOptions(screen.getByLabelText('Status'), 'Any')
    expect(titleOrder(table)).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta'])
  })

  it('Given four Roles, when I filter by Company, then only Roles at Acme show, or only the one with no Company', async () => {
    const user = userEvent.setup()
    const table = await openWithFourRoles()

    await user.selectOptions(screen.getByLabelText('Company'), 'Acme')
    expect(titleOrder(table)).toEqual(['Charlie'])

    await user.selectOptions(
      screen.getByLabelText('Company'),
      'Company not disclosed',
    )
    expect(titleOrder(table)).toEqual(['Delta'])
  })

  it('Given four Roles, when I filter by the hybrid Work arrangement, then only the hybrid Role shows', async () => {
    const user = userEvent.setup()
    const table = await openWithFourRoles()

    await user.selectOptions(
      screen.getByLabelText('Work arrangement'),
      'Hybrid',
    )
    expect(titleOrder(table)).toEqual(['Bravo'])
  })

  it('Given four Roles, when I filter by posting date, then only Roles posted within the range show, counting its first and last days', async () => {
    const user = userEvent.setup()
    const table = await openWithFourRoles()

    await user.type(screen.getByLabelText('Posting date from'), '2026-09-15')
    expect(titleOrder(table)).toEqual(['Alpha', 'Bravo'])

    await user.type(screen.getByLabelText('Posting date to'), '2026-09-30')
    expect(titleOrder(table)).toEqual(['Alpha'])

    await user.clear(screen.getByLabelText('Posting date from'))
    expect(titleOrder(table)).toEqual(['Alpha', 'Charlie'])
  })

  it('Given four Roles, when I filter by Company and Status together, then only Roles matching both show, or a note when none do', async () => {
    const user = userEvent.setup()
    const table = await openWithFourRoles()

    await user.selectOptions(screen.getByLabelText('Company'), 'Acme')
    await user.selectOptions(screen.getByLabelText('Status'), 'Rejected')
    expect(titleOrder(table)).toEqual(['Charlie'])

    await user.selectOptions(screen.getByLabelText('Status'), 'Applied')
    expect(titleOrder(table)).toEqual([])
    expect(screen.getByText('No Roles match these filters.')).toBeVisible()
  })
})

describe('Roles table rows', () => {
  it('Given a Flagged Role at a Flagged Company, when I open Roles, then its row warns of both Flags, and its title opens the Role', async () => {
    const data = await openTestDataLayer()
    const acme = await data.createCompany({ name: 'Acme' })
    await data.updateCompany(acme.id, { flags: ['data monetization'] })
    const role = await data.createRole({ title: 'Senior QA Engineer' })
    await data.updateRole(role.id, {
      companyId: acme.id,
      flags: ['Workday portal'],
    })
    const user = userEvent.setup()
    render(<App data={data} />)

    const row = within(await rolesTable()).getAllByRole('row')[1]
    expect(
      within(within(row).getByRole('note', { name: 'Flags' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Workday portal', 'data monetization (Acme)'])

    await user.click(
      within(row).getByRole('link', { name: 'Senior QA Engineer' }),
    )
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Senior QA Engineer',
      }),
    ).toBeVisible()
  })

  it('Given four Roles, when I Tab through the Roles table, then I reach each filter, sort with Enter and open a Role with Enter', async () => {
    const user = userEvent.setup()
    const table = await openWithFourRoles()

    screen.getByLabelText('Status').focus()
    const tabStops = [document.activeElement]
    for (let stop = 0; stop < 14; stop++) {
      await user.tab()
      tabStops.push(document.activeElement)
    }
    expect(tabStops.map((element) => accessibleName(element))).toEqual([
      'Status',
      'Company',
      'Work arrangement',
      'Posting date from',
      'Posting date to',
      'Role title',
      'Company',
      'Status',
      'Work arrangement',
      'Posted salary',
      'Fit rating',
      'Posting date',
      'Next action date',
      'Flags',
      'Alpha',
    ])

    within(table).getByRole('button', { name: 'Role title' }).focus()
    await user.keyboard('{Enter}')
    await user.keyboard('{Enter}')
    expect(titleOrder(table)).toEqual(['Delta', 'Charlie', 'Bravo', 'Alpha'])

    within(table).getByRole('link', { name: 'Delta' }).focus()
    await user.keyboard('{Enter}')
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Delta' }),
    ).toBeVisible()
  })
})

describe("Keeping the Roles table's filters and sort", () => {
  async function filterAndSort() {
    const user = userEvent.setup()
    const table = await openWithFourRoles()
    await user.type(screen.getByLabelText('Posting date from'), '2026-09-15')
    const header = within(table).getByRole('columnheader', {
      name: 'Posting date',
    })
    await user.click(within(header).getByRole('button'))
    await user.click(within(header).getByRole('button'))
    expect(titleOrder(table)).toEqual(['Bravo', 'Alpha'])
    await user.click(within(table).getByRole('link', { name: 'Alpha' }))
    await screen.findByRole('heading', { level: 2, name: 'Alpha' })
    return user
  }

  async function expectFilteredAndSorted() {
    const table = await rolesTable()
    expect(titleOrder(table)).toEqual(['Bravo', 'Alpha'])
    expect(screen.getByLabelText('Posting date from')).toHaveValue('2026-09-15')
    expect(
      within(table).getByRole('columnheader', { name: 'Posting date' }),
    ).toHaveAttribute('aria-sort', 'descending')
  }

  it('Given I filter by Posting date and sort by Posting date, when I open a Role and go back, then the filter and sort are kept', async () => {
    await filterAndSort()

    window.history.back()

    await expectFilteredAndSorted()
  })

  it('Given I filter by Posting date and sort by Posting date, when I open a Role and follow All Roles, then the filter and sort are kept', async () => {
    const user = await filterAndSort()

    await user.click(screen.getByRole('link', { name: '← All Roles' }))

    await expectFilteredAndSorted()
  })

  it('Given I filter by Rejected and Acme, when I open a Role and go back, then the Status and Company filters are kept', async () => {
    const user = userEvent.setup()
    const table = await openWithFourRoles()
    await user.selectOptions(screen.getByLabelText('Status'), 'Rejected')
    await user.selectOptions(screen.getByLabelText('Company'), 'Acme')
    await user.click(within(table).getByRole('link', { name: 'Charlie' }))
    await screen.findByRole('heading', { level: 2, name: 'Charlie' })

    window.history.back()

    expect(titleOrder(await rolesTable())).toEqual(['Charlie'])
    expect(screen.getByLabelText('Status')).toHaveDisplayValue('Rejected')
    expect(screen.getByLabelText('Company')).toHaveDisplayValue('Acme')
  })
})
