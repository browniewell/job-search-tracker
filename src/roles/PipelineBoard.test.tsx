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

async function openBoard(data: DataLayer) {
  const user = userEvent.setup()
  render(<App data={data} />)
  await user.click(screen.getByRole('link', { name: 'Pipeline board' }))
  await screen.findByRole('heading', { level: 2, name: 'Pipeline board' })
  return user
}

function columnNames(): string[] {
  return screen
    .getAllByRole('heading', { level: 3 })
    .map((heading) => heading.textContent ?? '')
}

function column(statusName: string) {
  return screen.getByRole('region', { name: statusName })
}

describe('Pipeline board', () => {
  it('Given the default Statuses, when I open the Pipeline board, then there is a column per Status in order, with Closed statuses hidden until I show them', async () => {
    const data = await openTestDataLayer()

    const user = await openBoard(data)

    expect(columnNames()).toEqual([
      'Interested',
      'Parked',
      'Applied',
      'Recruiter Screen',
      'Interviewing',
      'Offer',
    ])

    await user.click(screen.getByLabelText('Show Closed statuses'))

    expect(columnNames()).toEqual([
      'Interested',
      'Parked',
      'Applied',
      'Recruiter Screen',
      'Interviewing',
      'Offer',
      'Accepted',
      'Rejected',
      'No Response',
      'Withdrawn',
      'Passed',
    ])
  })

  it('Given Roles in Applied, when I open the Pipeline board, then each card shows its Role title, Company or Company not disclosed, Flags and Next action date, marked when due, in the order the Roles were added', async () => {
    // A minute passes between Roles, so the order added isn't title order.
    let minutes = 0
    const data = await openTestDataLayer({
      clock: () => new Date(Date.UTC(2026, 9, 16, 14, minutes++)),
    })
    const applied = await statusId(data, 'Applied')
    const acme = await data.createCompany({ name: 'Acme' })
    await data.updateCompany(acme.id, { flags: ['data monetization'] })
    const qa = await data.createRole({ title: 'Senior QA Engineer' })
    await data.updateRole(qa.id, {
      companyId: acme.id,
      flags: ['Workday portal'],
      nextActionDate: '2026-10-16',
    })
    const sdet = await data.createRole({ title: 'SDET' })
    await data.updateRole(sdet.id, { nextActionDate: '2026-10-20' })
    await data.changeStatus(qa.id, applied)
    await data.changeStatus(sdet.id, applied)

    await openBoard(data)

    const cards = within(column('Applied')).getAllByRole('listitem', {
      name: /./,
    })
    expect(cards.map((card) => card.getAttribute('aria-label'))).toEqual([
      'Senior QA Engineer',
      'SDET',
    ])
    const [qaCard, sdetCard] = cards
    expect(
      within(qaCard).getByRole('link', { name: 'Senior QA Engineer' }),
    ).toHaveAttribute('href', `#/roles/${qa.id}`)
    expect(qaCard).toHaveTextContent('Acme')
    expect(
      within(qaCard).getByRole('note', { name: 'Flags' }),
    ).toHaveTextContent('Workday portaldata monetization (Acme)')
    expect(qaCard).toHaveTextContent('Next action date: Oct 16, 2026 (due)')
    expect(sdetCard).toHaveTextContent('Company not disclosed')
    expect(sdetCard).toHaveTextContent('Next action date: Oct 20, 2026')
    expect(sdetCard).not.toHaveTextContent('due')
    expect(
      within(column('Interested')).queryAllByRole('listitem', { name: /./ }),
    ).toEqual([])
  })
})
