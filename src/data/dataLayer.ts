// The data layer (ADR-0002): the only module that touches Dexie. The UI reads
// and writes through the domain operations on DataLayer, never through tables.
import Dexie, { type EntityTable, type Transaction } from 'dexie'

export type Clock = () => Date

export interface Status {
  id: string
  name: string
  order: number
  closed: boolean
  isApplied: boolean
}

/** The fields of a Company you can edit directly. Empty fields are null. */
export interface CompanyFields {
  name: string
  industry: string | null
  summary: string | null
  website: string | null
  /** Company size, free text, e.g. "51–200 (143 on LinkedIn)". */
  size: string | null
  notes: string | null
}

export interface Company extends CompanyFields {
  id: string
}

const emptyCompany: Omit<CompanyFields, 'name'> = {
  industry: null,
  summary: null,
  website: null,
  size: null,
  notes: null,
}

export type WorkArrangement = 'on-site' | 'hybrid' | 'remote'
export type SalaryPeriod = 'annual' | 'hourly'
export type FitRating = 1 | 2 | 3 | 4 | 5

/** The fields of a Role you can edit directly. Empty fields are null. */
export interface RoleFields {
  title: string
  /** Optional: null while the Company isn't disclosed. */
  companyId: string | null
  location: string | null
  workArrangement: WorkArrangement | null
  /** Posted salary range, in USD. */
  salaryMin: number | null
  salaryMax: number | null
  salaryPeriod: SalaryPeriod | null
  salaryNote: string | null
  /** Yearly, in USD, whatever the Salary period. */
  expectedSalary: number | null
  /** Yearly, in USD. Private: never exported to CSV. */
  minimumSalary: number | null
  roleSummary: string | null
  postingLink: string | null
  hiringSiteLink: string | null
  /** Calendar date, YYYY-MM-DD. */
  postingDate: string | null
  postingCopy: string | null
  fitNotes: string | null
  fitRating: FitRating | null
  referralSubmitted: boolean
  nextAction: string | null
  /** Calendar date, YYYY-MM-DD. */
  nextActionDate: string | null
  notes: string | null
}

export interface Role extends RoleFields {
  id: string
  statusId: string
  createdAt: string
  /** When the Posting copy was last saved, from the clock. */
  postingCopySavedAt: string | null
}

type EmptyRole = Omit<Role, 'id' | 'title' | 'statusId' | 'createdAt'>

const emptyRole: EmptyRole = {
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
  fitNotes: null,
  fitRating: null,
  referralSubmitted: false,
  nextAction: null,
  nextActionDate: null,
  notes: null,
  postingCopySavedAt: null,
}

// Status names are copied onto each entry so a timeline still reads correctly
// after its Statuses are renamed or deleted. Entries are never updated.
export interface StatusHistoryEntry {
  id: string
  roleId: string
  fromStatusId: string | null
  fromStatusName: string | null
  toStatusId: string
  toStatusName: string
  at: string
  imported: boolean
}

const defaultStatuses: Array<Pick<Status, 'name' | 'closed' | 'isApplied'>> = [
  { name: 'Interested', closed: false, isApplied: false },
  { name: 'Parked', closed: false, isApplied: false },
  { name: 'Applied', closed: false, isApplied: true },
  { name: 'Recruiter Screen', closed: false, isApplied: false },
  { name: 'Interviewing', closed: false, isApplied: false },
  { name: 'Offer', closed: false, isApplied: false },
  { name: 'Accepted', closed: true, isApplied: false },
  { name: 'Rejected', closed: true, isApplied: false },
  { name: 'No Response', closed: true, isApplied: false },
  { name: 'Withdrawn', closed: true, isApplied: false },
  { name: 'Passed', closed: true, isApplied: false },
]

function requireTitle(title: string): string {
  const trimmed = title.trim()
  if (!trimmed) throw new Error('A Role needs a title')
  return trimmed
}

function requireCompanyName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('A Company needs a name')
  return trimmed
}

function checkFitRating(fitRating: FitRating | null): void {
  if (
    fitRating !== null &&
    !(Number.isInteger(fitRating) && fitRating >= 1 && fitRating <= 5)
  ) {
    throw new Error('Fit rating must be a whole number from 1 to 5')
  }
}

/** Why a Company with Roles can't be deleted. */
export function companyHasRolesMessage(
  companyName: string,
  roleCount: number,
): string {
  const [roles, them] =
    roleCount === 1 ? ['1 Role', 'it'] : [`${roleCount} Roles`, 'them']
  return `${companyName} still has ${roles}. Link ${them} to another Company or delete ${them} first.`
}

const byNameIgnoringCase = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })

type Database = Dexie & {
  statuses: EntityTable<Status, 'id'>
  roles: EntityTable<Role, 'id'>
  statusHistory: EntityTable<StatusHistoryEntry, 'id'>
  companies: EntityTable<Company, 'id'>
}

export interface DataLayer {
  createRole(input: { title: string }): Promise<Role>
  listRoles(): Promise<Role[]>
  getRole(id: string): Promise<Role | undefined>
  updateRole(id: string, changes: Partial<RoleFields>): Promise<Role>
  /** Deletes the Role and everything that belongs to it, in one transaction. */
  deleteRole(id: string): Promise<void>
  getStatusHistory(roleId: string): Promise<StatusHistoryEntry[]>
  createCompany(input: { name: string }): Promise<Company>
  /** Every Company, by name ignoring case. */
  listCompanies(): Promise<Company[]>
  getCompany(id: string): Promise<Company | undefined>
  updateCompany(id: string, changes: Partial<CompanyFields>): Promise<Company>
  /** Blocked while any Role is linked to the Company. */
  deleteCompany(id: string): Promise<void>
  /** The Roles linked to a Company, in the order they were created. */
  listRolesAtCompany(companyId: string): Promise<Role[]>
  listStatuses(): Promise<Status[]>
  close(): void
}

export async function openDataLayer(options: {
  clock: Clock
  name?: string
}): Promise<DataLayer> {
  const db = new Dexie(options.name ?? 'job-search-tracker') as Database
  db.version(1).stores({
    statuses: 'id, order',
    roles: 'id, createdAt',
    statusHistory: 'id, roleId',
  })
  // Roles saved before a field existed get it empty.
  const fillMissingRoleFields = (tx: Transaction) =>
    tx
      .table('roles')
      .toCollection()
      .modify((role: Record<string, unknown>) => {
        for (const [field, empty] of Object.entries(emptyRole)) {
          if (!(field in role)) role[field] = empty
        }
      })
  // v2 adds all Role fields.
  db.version(2).upgrade(fillMissingRoleFields)
  // v3 renames Job summary to Role summary (GLOSSARY.md).
  db.version(3).upgrade((tx) =>
    tx
      .table('roles')
      .toCollection()
      .modify((role: Record<string, unknown>) => {
        if ('jobSummary' in role) {
          role.roleSummary = role.jobSummary
          delete role.jobSummary
        }
      }),
  )
  // v4 adds Companies and a Role's optional link to one.
  db.version(4)
    .stores({ companies: 'id', roles: 'id, createdAt, companyId' })
    .upgrade(fillMissingRoleFields)
  db.on('populate', (tx) => {
    tx.table('statuses').bulkAdd(
      defaultStatuses.map((status, order) => ({
        id: crypto.randomUUID(),
        order,
        ...status,
      })),
    )
  })
  await db.open()

  // Each Company appears once: names are unique, ignoring case.
  async function checkCompanyNameIsFree({ id, name }: Company) {
    const lower = name.toLocaleLowerCase()
    const taken = await db.companies
      .filter(
        (other) => other.id !== id && other.name.toLocaleLowerCase() === lower,
      )
      .first()
    if (taken) {
      throw new Error(`There is already a Company called ${taken.name}`)
    }
  }

  return {
    createRole: ({ title }) =>
      db.transaction(
        'rw',
        db.statuses,
        db.roles,
        db.statusHistory,
        async () => {
          // New Roles start in the first Status, Interested by default.
          const initial = await db.statuses.orderBy('order').first()
          if (!initial) throw new Error('No Statuses configured')
          const now = options.clock().toISOString()
          const role: Role = {
            id: crypto.randomUUID(),
            ...emptyRole,
            title: requireTitle(title),
            statusId: initial.id,
            createdAt: now,
          }
          await db.roles.add(role)
          await db.statusHistory.add({
            id: crypto.randomUUID(),
            roleId: role.id,
            fromStatusId: null,
            fromStatusName: null,
            toStatusId: initial.id,
            toStatusName: initial.name,
            at: now,
            imported: false,
          })
          return role
        },
      ),
    listRoles: () => db.roles.orderBy('createdAt').toArray(),
    getRole: (id) => db.roles.get(id),
    updateRole: (id, changes) =>
      db.transaction('rw', db.roles, db.companies, async () => {
        const role = await db.roles.get(id)
        if (!role) throw new Error(`No Role with id ${id}`)
        const updated: Role = { ...role, ...changes }
        updated.title = requireTitle(updated.title)
        checkFitRating(updated.fitRating)
        if (
          updated.companyId !== null &&
          !(await db.companies.get(updated.companyId))
        ) {
          throw new Error(`No Company with id ${updated.companyId}`)
        }
        // The saved date tracks the Posting copy text, not other edits.
        if (updated.postingCopy !== role.postingCopy) {
          updated.postingCopySavedAt =
            updated.postingCopy === null ? null : options.clock().toISOString()
        }
        await db.roles.put(updated)
        return updated
      }),
    deleteRole: (id) =>
      db.transaction('rw', db.roles, db.statusHistory, async () => {
        await db.statusHistory.where('roleId').equals(id).delete()
        await db.roles.delete(id)
      }),
    createCompany: ({ name }) =>
      db.transaction('rw', db.companies, async () => {
        const company: Company = {
          id: crypto.randomUUID(),
          ...emptyCompany,
          name: requireCompanyName(name),
        }
        await checkCompanyNameIsFree(company)
        await db.companies.add(company)
        return company
      }),
    listCompanies: async () =>
      (await db.companies.toArray()).sort(byNameIgnoringCase),
    getCompany: (id) => db.companies.get(id),
    deleteCompany: (id) =>
      db.transaction('rw', db.companies, db.roles, async () => {
        const company = await db.companies.get(id)
        if (!company) return
        const roleCount = await db.roles.where('companyId').equals(id).count()
        if (roleCount > 0) {
          throw new Error(companyHasRolesMessage(company.name, roleCount))
        }
        await db.companies.delete(id)
      }),
    listRolesAtCompany: (companyId) =>
      db.roles.where('companyId').equals(companyId).sortBy('createdAt'),
    updateCompany: (id, changes) =>
      db.transaction('rw', db.companies, async () => {
        const company = await db.companies.get(id)
        if (!company) throw new Error(`No Company with id ${id}`)
        const updated: Company = { ...company, ...changes }
        updated.name = requireCompanyName(updated.name)
        await checkCompanyNameIsFree(updated)
        await db.companies.put(updated)
        return updated
      }),
    getStatusHistory: (roleId) =>
      db.statusHistory.where('roleId').equals(roleId).sortBy('at'),
    listStatuses: () => db.statuses.orderBy('order').toArray(),
    close: () => db.close(),
  }
}
