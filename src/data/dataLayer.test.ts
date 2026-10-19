import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import { openTestDataLayer, uniqueDatabaseName } from '../test/dataLayers'
import type { DataLayer, FitRating } from './dataLayer'

describe('Statuses', () => {
  it('Given a first run, then the default Statuses are seeded in order', async () => {
    const data = await openTestDataLayer()

    const statuses = await data.listStatuses()

    expect(
      statuses.map((s) => [s.name, s.closed, s.isApplied, s.isParked]),
    ).toEqual([
      ['Interested', false, false, false],
      ['Parked', false, false, true],
      ['Applied', false, true, false],
      ['Recruiter Screen', false, false, false],
      ['Interviewing', false, false, false],
      ['Offer', false, false, false],
      ['Accepted', true, false, false],
      ['Rejected', true, false, false],
      ['No Response', true, false, false],
      ['Withdrawn', true, false, false],
      ['Passed', true, false, false],
    ])
  })

  it('Given an existing database, when it is opened again, then the Statuses and Roles are kept and not reseeded', async () => {
    const name = uniqueDatabaseName()
    const first = await openTestDataLayer({ name })
    await first.createRole({ title: 'Senior QA Engineer' })
    first.close()

    const second = await openTestDataLayer({ name })

    expect(await second.listStatuses()).toHaveLength(11)
    expect((await second.listRoles()).map((r) => r.title)).toEqual([
      'Senior QA Engineer',
    ])
  })
})

describe('Configuring Statuses', () => {
  it('Given the default Statuses, when a Status is added with stray spaces, then it is listed last, trimmed, neither Closed nor the Applied status', async () => {
    const data = await openTestDataLayer()

    await data.createStatus({ name: '  Final Round ' })

    const last = (await data.listStatuses()).at(-1)
    expect(last).toMatchObject({
      name: 'Final Round',
      closed: false,
      isApplied: false,
    })
  })

  it('Given the default Statuses, when a Status is added with a blank name or the name of another ignoring case, then it is rejected', async () => {
    const data = await openTestDataLayer()

    await expect(data.createStatus({ name: '  ' })).rejects.toThrow(
      'A Status needs a name',
    )
    await expect(data.createStatus({ name: 'applied ' })).rejects.toThrow(
      'There is already a Status called Applied',
    )
    expect(await data.listStatuses()).toHaveLength(11)
  })

  it('Given a Role moved from Interested to Offer, when Offer is renamed Verbal Offer and marked Closed, then it is listed that way and the Status history still reads Interested → Offer', async () => {
    const data = await openTestDataLayer()
    const role = await data.createRole({ title: 'Senior QA Engineer' })
    const offer = (await data.listStatuses()).find((s) => s.name === 'Offer')!
    await data.changeStatus(role.id, offer.id)

    await data.updateStatus(offer.id, { name: ' Verbal Offer ', closed: true })

    expect(
      (await data.listStatuses()).find((s) => s.id === offer.id),
    ).toMatchObject({ name: 'Verbal Offer', closed: true, order: offer.order })
    expect(
      (await data.getStatusHistory(role.id)).map((e) => [
        e.fromStatusName,
        e.toStatusName,
      ]),
    ).toEqual([
      [null, 'Interested'],
      ['Interested', 'Offer'],
    ])
  })

  it('Given the default Statuses, when Offer is renamed blank or to "applied", then it is rejected and keeps its name', async () => {
    const data = await openTestDataLayer()
    const offer = (await data.listStatuses()).find((s) => s.name === 'Offer')!

    await expect(data.updateStatus(offer.id, { name: ' ' })).rejects.toThrow(
      'A Status needs a name',
    )
    await expect(
      data.updateStatus(offer.id, { name: 'applied' }),
    ).rejects.toThrow('There is already a Status called Applied')
    expect(
      (await data.listStatuses()).find((s) => s.id === offer.id)?.name,
    ).toBe('Offer')
  })

  it('Given Offer, when it is renamed OFFER, then the rename is kept', async () => {
    const data = await openTestDataLayer()
    const offer = (await data.listStatuses()).find((s) => s.name === 'Offer')!

    await data.updateStatus(offer.id, { name: 'OFFER' })

    expect(
      (await data.listStatuses()).find((s) => s.id === offer.id)?.name,
    ).toBe('OFFER')
  })

  it('Given the default Statuses, when Passed is moved second and then Interested is moved last, then they are listed in that order after the database is reopened', async () => {
    const name = uniqueDatabaseName()
    const data = await openTestDataLayer({ name })
    const idOf = async (status: string) =>
      (await data.listStatuses()).find((s) => s.name === status)!.id

    await data.moveStatus(await idOf('Passed'), 1)
    await data.moveStatus(await idOf('Interested'), 10)
    data.close()

    const reopened = await openTestDataLayer({ name })
    expect((await reopened.listStatuses()).map((s) => s.name)).toEqual([
      'Passed',
      'Parked',
      'Applied',
      'Recruiter Screen',
      'Interviewing',
      'Offer',
      'Accepted',
      'Rejected',
      'No Response',
      'Withdrawn',
      'Interested',
    ])
  })
})

describe('The Parked status', () => {
  const parkedNames = async (data: DataLayer) =>
    (await data.listStatuses()).filter((s) => s.isParked).map((s) => s.name)

  it('Given Parked is the Parked status, when Interested is made the Parked status and then none is, then first Interested is the only one and then there is none', async () => {
    const data = await openTestDataLayer()
    const interested = (await data.listStatuses())[0]

    await data.setParkedStatus(interested.id)
    expect(await parkedNames(data)).toEqual(['Interested'])

    await data.setParkedStatus(null)
    expect(await parkedNames(data)).toEqual([])
  })

  it('Given Parked is the Parked status, when no such Status is made the Parked status, then it is rejected and Parked stays the only one', async () => {
    const data = await openTestDataLayer()

    await expect(data.setParkedStatus('no-such-status')).rejects.toThrow(
      'No Status with id no-such-status',
    )

    expect(await parkedNames(data)).toEqual(['Parked'])
  })
})

describe('Deleting a Status', () => {
  it('Given two Roles in Offer, when Offer is deleted, then it is blocked with an explanation and nothing changes', async () => {
    const data = await openTestDataLayer()
    const offer = (await data.listStatuses()).find((s) => s.name === 'Offer')!
    for (const title of ['QA Engineer', 'Senior QA Engineer']) {
      const role = await data.createRole({ title })
      await data.changeStatus(role.id, offer.id)
    }

    await expect(data.deleteStatus(offer.id)).rejects.toThrow(
      'Offer still has 2 Roles. Move them to another Status first.',
    )
    expect((await data.listStatuses()).map((s) => s.id)).toContain(offer.id)
  })

  it('Given Applied is the Applied status, when it is deleted, then it is blocked with an explanation', async () => {
    const data = await openTestDataLayer()
    const applied = (await data.listStatuses()).find((s) => s.isApplied)!

    await expect(data.deleteStatus(applied.id)).rejects.toThrow(
      'Applied is the Applied status. Choose another Applied status first.',
    )
    expect(await data.listStatuses()).toHaveLength(11)
  })

  it('Given a Role moved from Offer to Accepted, when Offer is deleted, then it is no longer listed and the Status history still reads Interested → Offer → Accepted', async () => {
    const data = await openTestDataLayer()
    const role = await data.createRole({ title: 'Senior QA Engineer' })
    const statuses = await data.listStatuses()
    const idOf = (name: string) => statuses.find((s) => s.name === name)!.id
    await data.changeStatus(role.id, idOf('Offer'))
    await data.changeStatus(role.id, idOf('Accepted'))

    await data.deleteStatus(idOf('Offer'))

    expect((await data.listStatuses()).map((s) => s.name)).not.toContain(
      'Offer',
    )
    expect(
      (await data.getStatusHistory(role.id)).map((e) => e.toStatusName),
    ).toEqual(['Interested', 'Offer', 'Accepted'])
  })
})

describe('The Applied status', () => {
  const appliedNames = async (data: DataLayer) =>
    (await data.listStatuses()).filter((s) => s.isApplied).map((s) => s.name)

  it('Given Applied is the Applied status, when Recruiter Screen is made the Applied status, then it is the only one', async () => {
    const data = await openTestDataLayer()
    const screen = (await data.listStatuses()).find(
      (s) => s.name === 'Recruiter Screen',
    )!

    await data.setAppliedStatus(screen.id)

    expect(await appliedNames(data)).toEqual(['Recruiter Screen'])
  })

  it('Given Applied is the Applied status, when no such Status is made the Applied status, then it is rejected and Applied stays the only one', async () => {
    const data = await openTestDataLayer()

    await expect(data.setAppliedStatus('no-such-status')).rejects.toThrow(
      'No Status with id no-such-status',
    )

    expect(await appliedNames(data)).toEqual(['Applied'])
  })
})

describe('Roles', () => {
  it('Given no Roles, when a Role is created with a title, then it is listed in Interested', async () => {
    const data = await openTestDataLayer()

    await data.createRole({ title: 'Senior QA Engineer' })

    const roles = await data.listRoles()
    expect(roles).toHaveLength(1)
    expect(roles[0].title).toBe('Senior QA Engineer')
    const interested = (await data.listStatuses())[0]
    expect(interested.name).toBe('Interested')
    expect(roles[0].statusId).toBe(interested.id)
  })

  it('Given the clock reads 14:30 UTC, when a Role is created, then its first Status history entry is from nothing to Interested at 14:30', async () => {
    const data = await openTestDataLayer({
      clock: () => new Date('2026-10-16T14:30:00.000Z'),
    })

    const role = await data.createRole({ title: 'Senior QA Engineer' })

    const history = await data.getStatusHistory(role.id)
    expect(history).toEqual([
      {
        id: expect.any(String),
        roleId: role.id,
        fromStatusId: null,
        fromStatusName: null,
        toStatusId: role.statusId,
        toStatusName: 'Interested',
        at: '2026-10-16T14:30:00.000Z',
        imported: false,
        sequence: 0,
      },
    ])
  })

  it('Given Roles created one after another, then they are listed in the order they were created', async () => {
    let now = new Date('2026-10-16T09:00:00.000Z')
    const data = await openTestDataLayer({ clock: () => now })
    const titles = ['First', 'Second', 'Third', 'Fourth', 'Fifth']

    for (const title of titles) {
      await data.createRole({ title })
      now = new Date(now.getTime() + 60_000)
    }

    expect((await data.listRoles()).map((r) => r.title)).toEqual(titles)
  })

  it('Given Roles created at the same moment, then they are listed by Role title, ignoring case', async () => {
    const data = await openTestDataLayer()
    for (const title of ['QA Engineer', 'SDET', 'test Lead']) {
      await data.createRole({ title })
    }

    expect((await data.listRoles()).map((r) => r.title)).toEqual([
      'QA Engineer',
      'SDET',
      'test Lead',
    ])
  })
})

describe('Role fields', () => {
  it('Given a Role created with only a title, then every other field is empty and Referral submitted is false', async () => {
    const data = await openTestDataLayer()

    const created = await data.createRole({ title: 'Senior QA Engineer' })

    expect(await data.getRole(created.id)).toMatchObject({
      title: 'Senior QA Engineer',
      companyId: null,
      location: null,
      workArrangement: null,
      salaryMin: null,
      salaryMax: null,
      salaryPeriod: null,
      salaryNote: null,
      expectedSalary: null,
      minimumSalary: null,
      roleSummary: null,
      postingLink: null,
      hiringSiteLink: null,
      postingDate: null,
      postingCopy: null,
      postingCopySavedAt: null,
      fitNotes: null,
      fitRating: null,
      referralSubmitted: false,
      nextAction: null,
      nextActionDate: null,
      notes: null,
    })
  })

  it('Given a Role saved before Role fields existed (schema v1), when the database is opened, then the Role reads back with empty fields', async () => {
    const name = uniqueDatabaseName()
    // The walking skeleton's schema, as deployed to Pages.
    const v1 = new Dexie(name)
    v1.version(1).stores({
      statuses: 'id, order',
      roles: 'id, createdAt',
      statusHistory: 'id, roleId',
    })
    await v1.table('roles').add({
      id: 'role-1',
      title: 'Senior QA Engineer',
      statusId: 'status-1',
      createdAt: '2026-10-16T14:30:00.000Z',
    })
    v1.close()

    const data = await openTestDataLayer({ name })

    expect(await data.getRole('role-1')).toMatchObject({
      title: 'Senior QA Engineer',
      statusId: 'status-1',
      location: null,
      referralSubmitted: false,
      postingCopySavedAt: null,
      notes: null,
    })
  })
})

describe('Schema v4', () => {
  it('Given a Role saved before Companies existed (schema v3), when the database is opened, then the Role has no Company', async () => {
    const name = uniqueDatabaseName()
    const v3 = new Dexie(name)
    v3.version(3).stores({
      statuses: 'id, order',
      roles: 'id, createdAt',
      statusHistory: 'id, roleId',
    })
    await v3.table('roles').add({
      id: 'role-1',
      title: 'Senior QA Engineer',
      statusId: 'status-1',
      createdAt: '2026-10-16T14:30:00.000Z',
    })
    v3.close()

    const data = await openTestDataLayer({ name })

    expect((await data.getRole('role-1'))?.companyId).toBeNull()
    expect(await data.listCompanies()).toEqual([])
  })
})

describe('Schema v5', () => {
  it('Given a Role and its Status history saved before Parked reasons existed (schema v4), when the database is opened, then the Role has no Parked reason and its history reads oldest first', async () => {
    const name = uniqueDatabaseName()
    const v4 = new Dexie(name)
    v4.version(4).stores({
      statuses: 'id, order',
      roles: 'id, createdAt, companyId',
      statusHistory: 'id, roleId',
      companies: 'id',
    })
    await v4.table('roles').add({
      id: 'role-1',
      title: 'Senior QA Engineer',
      statusId: 'status-2',
      createdAt: '2026-10-16T14:30:00.000Z',
    })
    const entry = (id: string, to: string, at: string) => ({
      id,
      roleId: 'role-1',
      fromStatusId: null,
      fromStatusName: null,
      toStatusId: to,
      toStatusName: to,
      at,
      imported: false,
    })
    // Saved out of order, as random ids would leave them; the first two
    // share a timestamp, as a Role changed straight after creation can.
    await v4.table('statusHistory').bulkAdd([
      entry('c', 'Applied', '2026-10-17T09:00:00.000Z'),
      {
        ...entry('a', 'Parked', '2026-10-16T14:30:00.000Z'),
        fromStatusId: 'Interested',
        fromStatusName: 'Interested',
      },
      entry('b', 'Interested', '2026-10-16T14:30:00.000Z'),
    ])
    v4.close()

    const data = await openTestDataLayer({ name })

    expect((await data.getRole('role-1'))?.parkedReason).toBeNull()
    expect(
      (await data.getStatusHistory('role-1')).map((e) => [
        e.toStatusName,
        e.sequence,
      ]),
    ).toEqual([
      ['Interested', 0],
      ['Parked', 1],
      ['Applied', 2],
    ])
  })
})

describe('Schema v6', () => {
  it('Given a Role and Company saved before Flags existed (schema v5), when the database is opened, then neither has any Flags', async () => {
    const name = uniqueDatabaseName()
    const v5 = new Dexie(name)
    v5.version(5).stores({
      statuses: 'id, order',
      roles: 'id, createdAt, companyId',
      statusHistory: 'id, roleId',
      companies: 'id',
    })
    await v5.table('roles').add({
      id: 'role-1',
      title: 'Senior QA Engineer',
      statusId: 'status-1',
      createdAt: '2026-10-16T14:30:00.000Z',
    })
    await v5.table('companies').add({ id: 'company-1', name: 'Acme' })
    v5.close()

    const data = await openTestDataLayer({ name })

    expect((await data.getRole('role-1'))?.flags).toEqual([])
    expect((await data.getCompany('company-1'))?.flags).toEqual([])
  })
})

describe('Editing a Role', () => {
  it('Given a Role, when its fields are edited, then the edits are kept after the database is reopened', async () => {
    const name = uniqueDatabaseName()
    const first = await openTestDataLayer({ name })
    const role = await first.createRole({ title: 'QA Engineer' })

    await first.updateRole(role.id, {
      title: 'Senior QA Engineer',
      location: 'Chicago, IL',
      workArrangement: 'hybrid',
      salaryMin: 120000,
      salaryMax: 150000,
      salaryPeriod: 'annual',
      salaryNote: '+ equity',
      expectedSalary: 140000,
      minimumSalary: 125000,
      postingDate: '2026-10-01',
      fitRating: 4,
      referralSubmitted: true,
      nextAction: 'Email the recruiter',
      nextActionDate: '2026-10-20',
      roleSummary: 'Own test strategy for the payments team',
      postingLink: 'https://www.linkedin.com/jobs/view/123',
      hiringSiteLink: 'https://careers.example.com/jobs/456',
      postingCopy: 'We are hiring a QA lead',
      fitNotes: 'Strong match on automation',
      notes: 'Referred by a former colleague',
    })
    first.close()
    const second = await openTestDataLayer({ name })

    expect(await second.getRole(role.id)).toMatchObject({
      title: 'Senior QA Engineer',
      location: 'Chicago, IL',
      workArrangement: 'hybrid',
      salaryMin: 120000,
      salaryMax: 150000,
      salaryPeriod: 'annual',
      salaryNote: '+ equity',
      expectedSalary: 140000,
      minimumSalary: 125000,
      postingDate: '2026-10-01',
      fitRating: 4,
      referralSubmitted: true,
      nextAction: 'Email the recruiter',
      nextActionDate: '2026-10-20',
      roleSummary: 'Own test strategy for the payments team',
      postingLink: 'https://www.linkedin.com/jobs/view/123',
      hiringSiteLink: 'https://careers.example.com/jobs/456',
      postingCopy: 'We are hiring a QA lead',
      fitNotes: 'Strong match on automation',
      notes: 'Referred by a former colleague',
      statusId: role.statusId,
      createdAt: role.createdAt,
    })
  })

  it('Given a Role, when a Posting copy is saved at 09:00 and other fields are edited at 10:00, then the Posting copy saved date stays 09:00', async () => {
    let now = new Date('2026-10-16T09:00:00.000Z')
    const data = await openTestDataLayer({ clock: () => now })
    const role = await data.createRole({ title: 'Senior QA Engineer' })

    await data.updateRole(role.id, { postingCopy: 'We are hiring a QA lead…' })
    now = new Date('2026-10-16T10:00:00.000Z')
    await data.updateRole(role.id, {
      notes: 'Ask about the team',
      postingCopy: 'We are hiring a QA lead…',
    })

    expect(await data.getRole(role.id)).toMatchObject({
      postingCopy: 'We are hiring a QA lead…',
      postingCopySavedAt: '2026-10-16T09:00:00.000Z',
    })
  })

  it('Given a saved Posting copy, when its text is changed, then the saved date moves to now; when it is cleared, the saved date is cleared', async () => {
    let now = new Date('2026-10-16T09:00:00.000Z')
    const data = await openTestDataLayer({ clock: () => now })
    const role = await data.createRole({ title: 'Senior QA Engineer' })
    await data.updateRole(role.id, { postingCopy: 'Original text' })

    now = new Date('2026-10-17T11:15:00.000Z')
    await data.updateRole(role.id, { postingCopy: 'Updated text' })
    expect(await data.getRole(role.id)).toMatchObject({
      postingCopySavedAt: '2026-10-17T11:15:00.000Z',
    })

    await data.updateRole(role.id, { postingCopy: null })
    expect(await data.getRole(role.id)).toMatchObject({
      postingCopy: null,
      postingCopySavedAt: null,
    })
  })
})

describe('Role title', () => {
  it('Given a blank title, when a Role is created or edited, then it is rejected and nothing changes', async () => {
    const data = await openTestDataLayer()
    const role = await data.createRole({ title: 'Senior QA Engineer' })

    await expect(data.createRole({ title: '   ' })).rejects.toThrow(
      'A Role needs a title',
    )
    await expect(data.updateRole(role.id, { title: '' })).rejects.toThrow(
      'A Role needs a title',
    )

    expect((await data.listRoles()).map((r) => r.title)).toEqual([
      'Senior QA Engineer',
    ])
  })
})

describe('Fit rating', () => {
  it('Given a Fit rating outside 1–5 or not a whole number, when a Role is edited, then it is rejected', async () => {
    const data = await openTestDataLayer()
    const role = await data.createRole({ title: 'Senior QA Engineer' })

    for (const fitRating of [0, 6, 3.5]) {
      await expect(
        data.updateRole(role.id, { fitRating: fitRating as FitRating }),
      ).rejects.toThrow('Fit rating must be a whole number from 1 to 5')
    }
    expect((await data.getRole(role.id))?.fitRating).toBeNull()
  })
})

describe('Changing Status', () => {
  it('Given a Role in Interested, when its Status is changed to Applied at 15:00, then it is in Applied and its Status history gains an entry from Interested to Applied at 15:00', async () => {
    let now = new Date('2026-10-16T14:30:00.000Z')
    const data = await openTestDataLayer({ clock: () => now })
    const role = await data.createRole({ title: 'Senior QA Engineer' })
    const statuses = await data.listStatuses()
    const interested = statuses.find((s) => s.name === 'Interested')!
    const applied = statuses.find((s) => s.name === 'Applied')!

    now = new Date('2026-10-16T15:00:00.000Z')
    const changed = await data.changeStatus(role.id, applied.id)

    expect(changed.statusId).toBe(applied.id)
    expect((await data.getRole(role.id))?.statusId).toBe(applied.id)
    expect((await data.getStatusHistory(role.id)).at(-1)).toEqual({
      id: expect.any(String),
      roleId: role.id,
      fromStatusId: interested.id,
      fromStatusName: 'Interested',
      toStatusId: applied.id,
      toStatusName: 'Applied',
      at: '2026-10-16T15:00:00.000Z',
      imported: false,
      sequence: 1,
    })
  })

  it('Given a clock that never moves, when a Role is Parked, revived to Interested and then Applied, then its Status history reads in the order the changes were made', async () => {
    const data = await openTestDataLayer()
    const role = await data.createRole({ title: 'Senior QA Engineer' })
    const statuses = await data.listStatuses()
    const idOf = (name: string) => statuses.find((s) => s.name === name)!.id

    for (const name of ['Parked', 'Interested', 'Applied']) {
      await data.changeStatus(role.id, idOf(name))
    }

    expect(
      (await data.getStatusHistory(role.id)).map((entry) => [
        entry.fromStatusName,
        entry.toStatusName,
      ]),
    ).toEqual([
      [null, 'Interested'],
      ['Interested', 'Parked'],
      ['Parked', 'Interested'],
      ['Interested', 'Applied'],
    ])
  })

  it('Given a Role in Interested, when it is changed to Interested again, then nothing is added to its Status history', async () => {
    const data = await openTestDataLayer()
    const role = await data.createRole({ title: 'Senior QA Engineer' })

    await data.changeStatus(role.id, role.statusId)

    expect(await data.getStatusHistory(role.id)).toHaveLength(1)
  })

  it('Given no such Status, when a Role is changed to it, then it is rejected and neither the Role nor its Status history changes', async () => {
    const data = await openTestDataLayer()
    const role = await data.createRole({ title: 'Senior QA Engineer' })

    await expect(data.changeStatus(role.id, 'no-such-status')).rejects.toThrow(
      'No Status with id no-such-status',
    )

    expect((await data.getRole(role.id))?.statusId).toBe(role.statusId)
    expect(await data.getStatusHistory(role.id)).toHaveLength(1)
  })
})

describe('Parked reason', () => {
  it('Given a Role in Interested, when it is Parked with a Parked reason and later moved back to Interested, then the Parked reason is kept and the revival is an ordinary Status change', async () => {
    const data = await openTestDataLayer()
    const role = await data.createRole({ title: 'Senior QA Engineer' })
    expect(role.parkedReason).toBeNull()
    const statuses = await data.listStatuses()
    const idOf = (name: string) => statuses.find((s) => s.name === name)!.id

    const parked = await data.changeStatus(role.id, idOf('Parked'), {
      parkedReason: 'Hands-on expectation',
    })
    expect(parked).toMatchObject({
      statusId: idOf('Parked'),
      parkedReason: 'Hands-on expectation',
    })

    await data.changeStatus(role.id, idOf('Interested'))

    expect(await data.getRole(role.id)).toMatchObject({
      statusId: idOf('Interested'),
      parkedReason: 'Hands-on expectation',
    })
    expect((await data.getStatusHistory(role.id)).at(-1)).toMatchObject({
      fromStatusName: 'Parked',
      toStatusName: 'Interested',
      imported: false,
    })
  })

  it('Given a Parked Role, when it is changed to Parked again with a new Parked reason, then the reason is updated and nothing is added to its Status history', async () => {
    const data = await openTestDataLayer()
    const role = await data.createRole({ title: 'Senior QA Engineer' })
    const parkedId = (await data.listStatuses())[1].id
    await data.changeStatus(role.id, parkedId, { parkedReason: 'Too far' })

    await data.changeStatus(role.id, parkedId, {
      parkedReason: 'Relocation required',
    })

    expect((await data.getRole(role.id))?.parkedReason).toBe(
      'Relocation required',
    )
    expect(await data.getStatusHistory(role.id)).toHaveLength(2)
  })

  it('Given a Parked Role, when its Parked reason is edited, then the edit is kept', async () => {
    const data = await openTestDataLayer()
    const role = await data.createRole({ title: 'Senior QA Engineer' })

    await data.updateRole(role.id, { parkedReason: 'Relocation required' })

    expect((await data.getRole(role.id))?.parkedReason).toBe(
      'Relocation required',
    )
  })
})

describe('Schema v7', () => {
  it('Given Statuses saved before the Parked status was flagged (schema v6), when the database is opened, then the Status named Parked is the Parked status and no other is', async () => {
    const name = uniqueDatabaseName()
    const v6 = new Dexie(name)
    v6.version(6).stores({
      statuses: 'id, order',
      roles: 'id, createdAt, companyId',
      statusHistory: 'id, roleId',
      companies: 'id',
    })
    const status = (id: string, statusName: string, order: number) => ({
      id,
      name: statusName,
      order,
      closed: false,
      isApplied: statusName === 'Applied',
    })
    await v6
      .table('statuses')
      .bulkAdd([
        status('status-1', 'Interested', 0),
        status('status-2', 'Parked', 1),
        status('status-3', 'Applied', 2),
      ])
    v6.close()

    const data = await openTestDataLayer({ name })

    expect(
      (await data.listStatuses()).map((s) => [s.name, s.isParked]),
    ).toEqual([
      ['Interested', false],
      ['Parked', true],
      ['Applied', false],
    ])
  })
})

describe('Status history is immutable', () => {
  it('Given a Role with Status history, when the Role is edited, changes Status again and another Role is deleted, then its earlier entries are exactly as they were', async () => {
    let now = new Date('2026-10-16T09:00:00.000Z')
    const data = await openTestDataLayer({ clock: () => now })
    const role = await data.createRole({ title: 'Senior QA Engineer' })
    const other = await data.createRole({ title: 'QA Engineer' })
    const statuses = await data.listStatuses()
    const idOf = (name: string) => statuses.find((s) => s.name === name)!.id
    await data.changeStatus(role.id, idOf('Applied'))
    const before = await data.getStatusHistory(role.id)

    now = new Date('2026-10-17T09:00:00.000Z')
    await data.updateRole(role.id, { title: 'Lead QA Engineer' })
    await data.changeStatus(role.id, idOf('Recruiter Screen'))
    await data.deleteRole(other.id)

    const after = await data.getStatusHistory(role.id)
    expect(after.slice(0, 2)).toEqual(before)
    expect(after).toHaveLength(3)
  })

  it('Given a data layer, when its operations are listed, then reading is the only thing it offers for Status history', async () => {
    const data = await openTestDataLayer()

    expect(
      Object.keys(data).filter((operation) => /history/i.test(operation)),
    ).toEqual(['getStatusHistory'])
  })
})

describe('Deleting a Role', () => {
  it('Given two Roles, when one is deleted, then it and its Status history are gone and the other Role is untouched', async () => {
    const data = await openTestDataLayer()
    const deleted = await data.createRole({ title: 'QA Engineer' })
    const kept = await data.createRole({ title: 'Senior QA Engineer' })

    await data.deleteRole(deleted.id)

    expect(await data.getRole(deleted.id)).toBeUndefined()
    expect(await data.getStatusHistory(deleted.id)).toEqual([])
    expect((await data.listRoles()).map((r) => r.title)).toEqual([
      'Senior QA Engineer',
    ])
    expect(await data.getStatusHistory(kept.id)).toHaveLength(1)
  })

  it('Given a Role saved with a Job summary (schema v2), when the database is opened, then it reads back as its Role summary', async () => {
    const name = uniqueDatabaseName()
    const v2 = new Dexie(name)
    v2.version(2).stores({
      statuses: 'id, order',
      roles: 'id, createdAt',
      statusHistory: 'id, roleId',
    })
    await v2.table('roles').add({
      id: 'role-1',
      title: 'Senior QA Engineer',
      statusId: 'status-1',
      createdAt: '2026-10-16T14:30:00.000Z',
      jobSummary: 'Own test strategy for the payments team',
    })
    v2.close()

    const data = await openTestDataLayer({ name })

    const role = await data.getRole('role-1')
    expect(role?.roleSummary).toBe('Own test strategy for the payments team')
    expect(role).not.toHaveProperty('jobSummary')
  })
})

describe('Companies', () => {
  it('Given Companies created with only a name, then the other fields are empty and they are listed by name, ignoring case', async () => {
    const data = await openTestDataLayer()

    const globex = await data.createCompany({ name: 'Globex' })
    await data.createCompany({ name: 'acme' })
    await data.createCompany({ name: 'Initech' })

    expect(await data.getCompany(globex.id)).toEqual({
      id: globex.id,
      name: 'Globex',
      industry: null,
      summary: null,
      website: null,
      size: null,
      flags: [],
      notes: null,
    })
    expect((await data.listCompanies()).map((c) => c.name)).toEqual([
      'acme',
      'Globex',
      'Initech',
    ])
  })

  it('Given a blank name, when a Company is created or edited, then it is rejected', async () => {
    const data = await openTestDataLayer()
    const acme = await data.createCompany({ name: 'Acme' })

    await expect(data.createCompany({ name: '  ' })).rejects.toThrow(
      'A Company needs a name',
    )
    await expect(data.updateCompany(acme.id, { name: '' })).rejects.toThrow(
      'A Company needs a name',
    )
    expect((await data.listCompanies()).map((c) => c.name)).toEqual(['Acme'])
  })

  it('Given Acme, when another Company is created or renamed to the same name ignoring case, then it is rejected', async () => {
    const data = await openTestDataLayer()
    await data.createCompany({ name: 'Acme' })
    const globex = await data.createCompany({ name: 'Globex' })

    for (const name of ['acme', '  ACME  ']) {
      await expect(data.createCompany({ name })).rejects.toThrow(
        'There is already a Company called Acme',
      )
    }
    await expect(
      data.updateCompany(globex.id, { name: 'acme' }),
    ).rejects.toThrow('There is already a Company called Acme')

    expect((await data.listCompanies()).map((c) => c.name)).toEqual([
      'Acme',
      'Globex',
    ])
  })

  it('Given Acme, when Acme itself is renamed to ACME, then the rename is kept', async () => {
    const data = await openTestDataLayer()
    const acme = await data.createCompany({ name: 'Acme' })

    await data.updateCompany(acme.id, { name: 'ACME' })

    expect((await data.getCompany(acme.id))?.name).toBe('ACME')
  })

  it('Given a Company, when its fields are edited, then the edits are kept after the database is reopened', async () => {
    const name = uniqueDatabaseName()
    const first = await openTestDataLayer({ name })
    const company = await first.createCompany({ name: 'Acme' })

    await first.updateCompany(company.id, {
      name: 'Acme Corp',
      industry: 'Fintech',
      summary: 'Payments for small businesses',
      website: 'https://acme.example.com',
      size: '51–200 (143 on LinkedIn)',
      flags: ['data monetization'],
      notes: 'Glassdoor reviews are mixed',
    })
    first.close()
    const second = await openTestDataLayer({ name })

    expect(await second.getCompany(company.id)).toEqual({
      id: company.id,
      name: 'Acme Corp',
      industry: 'Fintech',
      summary: 'Payments for small businesses',
      website: 'https://acme.example.com',
      size: '51–200 (143 on LinkedIn)',
      flags: ['data monetization'],
      notes: 'Glassdoor reviews are mixed',
    })
  })
})

describe('Linking a Role to a Company', () => {
  it('Given a Role with no Company, when a Company is linked later, then the Company lists it; when unlinked, it no longer does', async () => {
    const data = await openTestDataLayer()
    const acme = await data.createCompany({ name: 'Acme' })
    const role = await data.createRole({ title: 'Senior QA Engineer' })
    await data.createRole({ title: 'QA Engineer' })
    expect(await data.listRolesAtCompany(acme.id)).toEqual([])

    await data.updateRole(role.id, { companyId: acme.id })
    expect(
      (await data.listRolesAtCompany(acme.id)).map((r) => r.title),
    ).toEqual(['Senior QA Engineer'])

    await data.updateRole(role.id, { companyId: null })
    expect(await data.listRolesAtCompany(acme.id)).toEqual([])
    expect((await data.getRole(role.id))?.companyId).toBeNull()
  })

  it('Given no such Company, when a Role is linked to it, then it is rejected', async () => {
    const data = await openTestDataLayer()
    const role = await data.createRole({ title: 'Senior QA Engineer' })

    await expect(
      data.updateRole(role.id, { companyId: 'no-such-company' }),
    ).rejects.toThrow('No Company with id no-such-company')
    expect((await data.getRole(role.id))?.companyId).toBeNull()
  })
})

describe('Flags', () => {
  it('Given a new Role and Company with no Flags, when Flags are saved with stray spaces, blanks and repeats ignoring case, then each Flag is kept once as first written', async () => {
    const data = await openTestDataLayer()
    const role = await data.createRole({ title: 'Senior QA Engineer' })
    const acme = await data.createCompany({ name: 'Acme' })
    expect(role.flags).toEqual([])
    expect(acme.flags).toEqual([])

    await data.updateRole(role.id, {
      flags: [' Workday portal ', '', 'workday PORTAL', 'Unpaid take-home'],
    })
    await data.updateCompany(acme.id, {
      flags: ['data monetization', '  ', 'Data monetization'],
    })

    expect((await data.getRole(role.id))?.flags).toEqual([
      'Workday portal',
      'Unpaid take-home',
    ])
    expect((await data.getCompany(acme.id))?.flags).toEqual([
      'data monetization',
    ])
  })

  it('Given Flags used on two Roles and a Company, then the Flag suggestions are every Flag used, each once ignoring case, by name ignoring case', async () => {
    // Which spelling of a repeated Flag is suggested must not depend on
    // the order Roles load in, which follows their random ids.
    const data = await openTestDataLayer()
    expect(await data.listFlagSuggestions()).toEqual([])
    const first = await data.createRole({ title: 'QA Engineer' })
    const second = await data.createRole({ title: 'Senior QA Engineer' })
    const acme = await data.createCompany({ name: 'Acme' })

    await data.updateRole(first.id, { flags: ['Workday portal'] })
    await data.updateRole(second.id, {
      flags: ['workday portal', 'Unpaid take-home'],
    })
    await data.updateCompany(acme.id, { flags: ['data monetization'] })

    expect(await data.listFlagSuggestions()).toEqual([
      'data monetization',
      'Unpaid take-home',
      'Workday portal',
    ])
  })
})

describe('Deleting a Company', () => {
  it('Given a Company with two Roles, when it is deleted, then it is blocked with an explanation and nothing changes', async () => {
    const data = await openTestDataLayer()
    const acme = await data.createCompany({ name: 'Acme' })
    for (const title of ['QA Engineer', 'Senior QA Engineer']) {
      const role = await data.createRole({ title })
      await data.updateRole(role.id, { companyId: acme.id })
    }

    await expect(data.deleteCompany(acme.id)).rejects.toThrow(
      'Acme still has 2 Roles. Link them to another Company or delete them first.',
    )
    expect(await data.getCompany(acme.id)).toBeDefined()
    expect(await data.listRolesAtCompany(acme.id)).toHaveLength(2)
  })

  it('Given a Company with no Roles, when it is deleted, then it is gone', async () => {
    const data = await openTestDataLayer()
    const acme = await data.createCompany({ name: 'Acme' })
    await data.createRole({ title: 'Senior QA Engineer' })

    await data.deleteCompany(acme.id)

    expect(await data.getCompany(acme.id)).toBeUndefined()
    expect(await data.listRoles()).toHaveLength(1)
  })
})

describe('Next action due', () => {
  // 10pm on Oct 16 in Chicago, where tests run: already Oct 17 in UTC.
  const lateOnOct16 = () => new Date('2026-10-17T03:00:00.000Z')

  it('Given Roles with Next action dates before, on and after the local calendar day, then only those on or before it are due', async () => {
    const data = await openTestDataLayer({ clock: lateOnOct16 })
    const role = await data.createRole({ title: 'Senior QA Engineer' })
    const dated = (nextActionDate: string | null) => ({
      ...role,
      nextActionDate,
    })

    expect(data.isNextActionDue(dated('2026-10-15'))).toBe(true)
    expect(data.isNextActionDue(dated('2026-10-16'))).toBe(true)
    expect(data.isNextActionDue(dated('2026-10-17'))).toBe(false)
    expect(data.isNextActionDue(dated(null))).toBe(false)
  })
})
