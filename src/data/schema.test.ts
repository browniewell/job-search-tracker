import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import { openTestDataLayer, uniqueDatabaseName } from '../test/dataLayers'

// Tripwire: the fields each entity is stored with, per schema version.
// Browsers hold data in every shape that has shipped, so a field change
// ships with a new schema version, an upgrade and a test that opens the
// previous version (CODING_STANDARDS.md). Add an entry for the new version;
// an entry that has reached main stays as it is.
// Status history entries are recorded from v5 on.
const storedFields: Record<
  number,
  { role: string[]; company: string[]; statusHistoryEntry?: string[] }
> = {
  4: {
    role: [
      'companyId',
      'createdAt',
      'expectedSalary',
      'fitNotes',
      'fitRating',
      'hiringSiteLink',
      'id',
      'location',
      'minimumSalary',
      'nextAction',
      'nextActionDate',
      'notes',
      'postingCopy',
      'postingCopySavedAt',
      'postingDate',
      'postingLink',
      'referralSubmitted',
      'roleSummary',
      'salaryMax',
      'salaryMin',
      'salaryNote',
      'salaryPeriod',
      'statusId',
      'title',
      'workArrangement',
    ],
    company: ['id', 'industry', 'name', 'notes', 'size', 'summary', 'website'],
  },
  5: {
    role: [
      'companyId',
      'createdAt',
      'expectedSalary',
      'fitNotes',
      'fitRating',
      'hiringSiteLink',
      'id',
      'location',
      'minimumSalary',
      'nextAction',
      'nextActionDate',
      'notes',
      'parkedReason',
      'postingCopy',
      'postingCopySavedAt',
      'postingDate',
      'postingLink',
      'referralSubmitted',
      'roleSummary',
      'salaryMax',
      'salaryMin',
      'salaryNote',
      'salaryPeriod',
      'statusId',
      'title',
      'workArrangement',
    ],
    company: ['id', 'industry', 'name', 'notes', 'size', 'summary', 'website'],
    statusHistoryEntry: [
      'at',
      'fromStatusId',
      'fromStatusName',
      'id',
      'imported',
      'roleId',
      'sequence',
      'toStatusId',
      'toStatusName',
    ],
  },
}

describe('Schema tripwire', () => {
  it('Given the current schema version, then Roles, Companies and Status history entries are stored with exactly the fields recorded for that version', async () => {
    const name = uniqueDatabaseName()
    const data = await openTestDataLayer({ name })
    const created = await data.createRole({ title: 'Senior QA Engineer' })
    const acme = await data.createCompany({ name: 'Acme' })
    const raw = await new Dexie(name).open()
    const version = raw.verno
    raw.close()

    expect(
      storedFields,
      `No stored fields recorded for schema v${version}`,
    ).toHaveProperty(String(version))
    expect({
      role: Object.keys((await data.getRole(created.id))!).sort(),
      company: Object.keys((await data.getCompany(acme.id))!).sort(),
      statusHistoryEntry: Object.keys(
        (await data.getStatusHistory(created.id))[0],
      ).sort(),
    }).toEqual(storedFields[version])
  })
})
