import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import { openTestDataLayer, uniqueDatabaseName } from '../test/dataLayers'
import type { FitRating } from './dataLayer'

describe('Statuses', () => {
  it('Given a first run, then the default Statuses are seeded in order', async () => {
    const data = await openTestDataLayer()

    const statuses = await data.listStatuses()

    expect(statuses.map((s) => [s.name, s.closed, s.isApplied])).toEqual([
      ['Interested', false, false],
      ['Parked', false, false],
      ['Applied', false, true],
      ['Recruiter Screen', false, false],
      ['Interviewing', false, false],
      ['Offer', false, false],
      ['Accepted', true, false],
      ['Rejected', true, false],
      ['No Response', true, false],
      ['Withdrawn', true, false],
      ['Passed', true, false],
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
})

describe('Role fields', () => {
  it('Given a Role created with only a title, then every other field is empty and Referral submitted is false', async () => {
    const data = await openTestDataLayer()

    const created = await data.createRole({ title: 'Senior QA Engineer' })

    expect(await data.getRole(created.id)).toMatchObject({
      title: 'Senior QA Engineer',
      location: null,
      workArrangement: null,
      salaryMin: null,
      salaryMax: null,
      salaryPeriod: null,
      salaryNote: null,
      expectedSalary: null,
      minimumSalary: null,
      jobSummary: null,
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
      jobSummary: 'Own test strategy for the payments team',
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
      jobSummary: 'Own test strategy for the payments team',
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
})
