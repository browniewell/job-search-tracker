// The data layer (ADR-0002): the only module that touches Dexie. The UI reads
// and writes through the domain operations on DataLayer, never through tables.
import Dexie, { type EntityTable, type Transaction } from 'dexie'

export type Clock = () => Date

/** Makes record ids. Random by default, so ids carry no order. */
export type NewId = () => string

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
  /** Dealbreaker Flags, shown on every Role at the Company too. */
  flags: string[]
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
  flags: [],
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
  /** Process concerns, such as "Workday portal". */
  flags: string[]
  nextAction: string | null
  /** Calendar date, YYYY-MM-DD. */
  nextActionDate: string | null
  /** Why the Role was Parked; kept after it moves on. */
  parkedReason: string | null
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
  flags: [],
  nextAction: null,
  nextActionDate: null,
  parkedReason: null,
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
  /** Position in the Role's Status history, from 0: orders entries that share a timestamp. */
  sequence: number
}

/**
 * The Status whose Roles carry a Parked reason. Until Statuses can be
 * configured, Parked is recognised by its default name.
 */
export const parkedStatusName = 'Parked'

const defaultStatuses: Array<Pick<Status, 'name' | 'closed' | 'isApplied'>> = [
  { name: 'Interested', closed: false, isApplied: false },
  { name: parkedStatusName, closed: false, isApplied: false },
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

const flagKey = (flag: string) => flag.trim().toLocaleLowerCase()

/** Flags match ignoring case and surrounding spaces. */
export function sameFlag(a: string, b: string): boolean {
  return flagKey(a) === flagKey(b)
}

// Each Flag once, as first written.
function normalizeFlags(flags: string[]): string[] {
  const seen = new Set<string>()
  const kept: string[] = []
  for (const flag of flags.map((f) => f.trim())) {
    if (flag && !seen.has(flagKey(flag))) {
      seen.add(flagKey(flag))
      kept.push(flag)
    }
  }
  return kept
}

/** A Flag as a badge shows it, with the Company it comes from, if any. */
export interface ShownFlag {
  flag: string
  from?: string
}

/** A Role's own Flags, then its Company's dealbreakers it doesn't repeat. */
export function flagsShownOnRole(
  role: Role,
  company: Company | undefined,
): ShownFlag[] {
  const own = role.flags.map((flag) => ({ flag }))
  if (!company) return own
  const dealbreakers = company.flags.filter(
    (flag) => !role.flags.some((ownFlag) => sameFlag(ownFlag, flag)),
  )
  return [...own, ...dealbreakers.map((flag) => ({ flag, from: company.name }))]
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
  /**
   * Moves the Role to another Status and records the change in its Status
   * history, in one transaction. Changing to the Status it is already in
   * records nothing. A Parked reason given with the change is saved with it.
   */
  changeStatus(
    roleId: string,
    statusId: string,
    changes?: Pick<Partial<RoleFields>, 'parkedReason'>,
  ): Promise<Role>
  /** A Role's Status history, starting with the first entry. Read-only. */
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
  /** Every Flag used on a Role or Company, each once, by name ignoring case. */
  listFlagSuggestions(): Promise<string[]>
  close(): void
}

export async function openDataLayer(options: {
  clock: Clock
  name?: string
  newId?: NewId
}): Promise<DataLayer> {
  const newId = options.newId ?? (() => crypto.randomUUID())
  const db = new Dexie(options.name ?? 'job-search-tracker') as Database
  db.version(1).stores({
    statuses: 'id, order',
    roles: 'id, createdAt',
    statusHistory: 'id, roleId',
  })
  // Records saved before a field existed get it empty.
  const fillMissingFields =
    (table: string, empty: object) => (tx: Transaction) =>
      tx
        .table(table)
        .toCollection()
        .modify((record: Record<string, unknown>) => {
          for (const [field, value] of Object.entries(empty)) {
            if (!(field in record)) record[field] = value
          }
        })
  const fillMissingRoleFields = fillMissingFields('roles', emptyRole)
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
  // v5 adds the Parked reason, and numbers each Role's Status history
  // entries oldest first so the timeline keeps its order when timestamps tie.
  db.version(5).upgrade(async (tx) => {
    await fillMissingRoleFields(tx)
    const entries: StatusHistoryEntry[] = await tx
      .table('statusHistory')
      .toArray()
    // On a tie, the Role's first entry (from no Status) comes first.
    const oldestFirst = (a: StatusHistoryEntry, b: StatusHistoryEntry) =>
      a.at.localeCompare(b.at) ||
      Number(a.fromStatusId !== null) - Number(b.fromStatusId !== null)
    const nextSequence = new Map<string, number>()
    for (const entry of entries.sort(oldestFirst)) {
      const sequence = nextSequence.get(entry.roleId) ?? 0
      nextSequence.set(entry.roleId, sequence + 1)
      entry.sequence = sequence
    }
    await tx.table('statusHistory').bulkPut(entries)
  })
  // v6 adds Flags to Roles and Companies.
  db.version(6).upgrade(async (tx) => {
    await fillMissingRoleFields(tx)
    await fillMissingFields('companies', emptyCompany)(tx)
  })
  db.on('populate', (tx) => {
    tx.table('statuses').bulkAdd(
      defaultStatuses.map((status, order) => ({
        id: newId(),
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
            id: newId(),
            ...emptyRole,
            title: requireTitle(title),
            statusId: initial.id,
            createdAt: now,
          }
          await db.roles.add(role)
          await db.statusHistory.add({
            id: newId(),
            roleId: role.id,
            fromStatusId: null,
            fromStatusName: null,
            toStatusId: initial.id,
            toStatusName: initial.name,
            at: now,
            imported: false,
            sequence: 0,
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
        updated.flags = normalizeFlags(updated.flags)
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
          id: newId(),
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
        updated.flags = normalizeFlags(updated.flags)
        await checkCompanyNameIsFree(updated)
        await db.companies.put(updated)
        return updated
      }),
    changeStatus: (roleId, statusId, changes = {}) =>
      db.transaction(
        'rw',
        db.statuses,
        db.roles,
        db.statusHistory,
        async () => {
          const role = await db.roles.get(roleId)
          if (!role) throw new Error(`No Role with id ${roleId}`)
          const to = await db.statuses.get(statusId)
          if (!to) throw new Error(`No Status with id ${statusId}`)
          if (role.statusId === to.id) {
            const updated: Role = { ...role, ...changes }
            await db.roles.put(updated)
            return updated
          }
          const history = db.statusHistory.where('roleId').equals(roleId)
          const entryCount = await history.count()
          const from = await db.statuses.get(role.statusId)
          const updated: Role = { ...role, ...changes, statusId: to.id }
          await db.roles.put(updated)
          await db.statusHistory.add({
            id: newId(),
            roleId,
            fromStatusId: role.statusId,
            fromStatusName: from?.name ?? null,
            toStatusId: to.id,
            toStatusName: to.name,
            at: options.clock().toISOString(),
            imported: false,
            sequence: entryCount,
          })
          return updated
        },
      ),
    getStatusHistory: (roleId) =>
      db.statusHistory.where('roleId').equals(roleId).sortBy('sequence'),
    listStatuses: () => db.statuses.orderBy('order').toArray(),
    listFlagSuggestions: () =>
      db.transaction('r', db.roles, db.companies, async () => {
        const used = [
          ...(await db.roles.toArray()),
          ...(await db.companies.toArray()),
        ].flatMap((item) => item.flags)
        // Sorting before dropping repeats picks the same spelling of a Flag
        // used in different cases every time, whatever order items load in:
        // capitalised before lower case.
        return normalizeFlags(
          used.sort(
            (a, b) =>
              a.localeCompare(b, undefined, { sensitivity: 'base' }) ||
              b.localeCompare(a),
          ),
        )
      }),
    close: () => db.close(),
  }
}
