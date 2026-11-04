// The data layer (ADR-0002): the only module that touches Dexie. The UI reads
// and writes through the domain operations on DataLayer, never through tables.
import Dexie, { type EntityTable, type Transaction } from 'dexie'

export type Clock = () => Date

/** Makes record ids. Random by default, so ids carry no order. */
export type NewId = () => string

/** The fields of a Status you can edit directly. */
export interface StatusFields {
  name: string
  closed: boolean
}

export interface Status extends StatusFields {
  id: string
  order: number
  isApplied: boolean
  /** Whether Roles in this Status carry a Parked reason. */
  isParked: boolean
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

/** The fields of a Contact you can edit directly. Empty fields are null. */
export interface ContactFields {
  name: string
  /** The Contact's job title, e.g. "Senior Technical Recruiter". */
  title: string | null
  /** Their current Company, if known. */
  companyId: string | null
  howYouKnow: string | null
  email: string | null
  linkedIn: string | null
  notes: string | null
}

export interface Contact extends ContactFields {
  id: string
}

const emptyContact: Omit<ContactFields, 'name'> = {
  title: null,
  companyId: null,
  howYouKnow: null,
  email: null,
  linkedIn: null,
  notes: null,
}

/** How a Contact is involved in a Role, in the order a Role lists them. */
export const roleContactTypes = [
  'referrer',
  'recruiter',
  'hiring manager',
  'other',
] as const
export type RoleContactType = (typeof roleContactTypes)[number]

/** A link between a Contact and a Role. */
export interface RoleContact {
  id: string
  roleId: string
  contactId: string
  type: RoleContactType
}

/** A Role contact with its Contact, as a Role lists it. */
export type LinkedContact = RoleContact & { contact: Contact }

/** A Role contact with its Role, as a Contact lists it. */
export type LinkedRole = RoleContact & { role: Role }

const byRoleContactType = (a: RoleContact, b: RoleContact) =>
  roleContactTypes.indexOf(a.type) - roleContactTypes.indexOf(b.type)

/** The kinds of Interview, in the order a form offers them. */
export const interviewTypes = [
  'recruiter screen',
  'hiring manager',
  'technical',
  'panel',
  'other',
] as const
export type InterviewType = (typeof interviewTypes)[number]

/** The fields of an Interview you can edit directly. Empty fields are null. */
export interface InterviewFields {
  /** Local date and time as picked, YYYY-MM-DDTHH:mm: no time zone. */
  at: string
  type: InterviewType
  /** The Interviewers: Contacts, each once. */
  interviewerIds: string[]
  notes: string | null
  /** Whether you have sent a Follow-up. */
  followUpSent: boolean
}

export interface Interview extends InterviewFields {
  id: string
  roleId: string
}

/** An Interview with its Interviewers, by name ignoring case, as a Role lists it. */
export type ListedInterview = Interview & { interviewers: Contact[] }

// Interviews at the same moment fall back on type, not on their random ids:
// a Role has one Interview of each type at a time.
const byTimeThenType = (a: Interview, b: Interview) =>
  a.at.localeCompare(b.at) ||
  interviewTypes.indexOf(a.type) - interviewTypes.indexOf(b.type)

/** The fields of a Saved search you can edit directly. Empty fields are null. */
export interface SavedSearchFields {
  name: string
  link: string | null
  /** The job site it runs on, e.g. "LinkedIn". */
  site: string | null
}

export interface SavedSearch extends SavedSearchFields {
  id: string
  /** When it was last marked checked, from the clock. */
  lastCheckedAt: string | null
}

const workArrangements = ['on-site', 'hybrid', 'remote'] as const
export type WorkArrangement = (typeof workArrangements)[number]
const salaryPeriods = ['annual', 'hourly'] as const
export type SalaryPeriod = (typeof salaryPeriods)[number]
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

// Settings are one record, saved with every field like any other.
const settingsId = 'settings'
export interface Settings {
  id: typeof settingsId
  /** How many Applications you aim to make per day. */
  dailyTarget: number
  /** When a backup was last exported, from the clock. */
  lastBackupAt: string | null
}

const defaultSettings: Settings = {
  id: settingsId,
  dailyTarget: 2,
  lastBackupAt: null,
}

/** What restoring a backup would replace. */
export interface BackupPreview {
  currentRoles: number
  backupRoles: number
}

/** A backup ready to save as a file. */
export interface ExportedBackup {
  fileName: string
  json: string
}

const defaultStatuses: Array<
  Pick<Status, 'name' | 'closed' | 'isApplied' | 'isParked'>
> = [
  { name: 'Interested', closed: false, isApplied: false, isParked: false },
  { name: 'Parked', closed: false, isApplied: false, isParked: true },
  { name: 'Applied', closed: false, isApplied: true, isParked: false },
  {
    name: 'Recruiter Screen',
    closed: false,
    isApplied: false,
    isParked: false,
  },
  { name: 'Interviewing', closed: false, isApplied: false, isParked: false },
  { name: 'Offer', closed: false, isApplied: false, isParked: false },
  { name: 'Accepted', closed: true, isApplied: false, isParked: false },
  { name: 'Rejected', closed: true, isApplied: false, isParked: false },
  { name: 'No Response', closed: true, isApplied: false, isParked: false },
  { name: 'Withdrawn', closed: true, isApplied: false, isParked: false },
  { name: 'Passed', closed: true, isApplied: false, isParked: false },
]

/** A moment's calendar date in local time, YYYY-MM-DD. */
function localCalendarDate(moment: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${moment.getFullYear()}-${pad(moment.getMonth() + 1)}-${pad(moment.getDate())}`
}

/** A moment's position in whole local calendar days, to count days between moments. */
const localDayNumber = (moment: Date) =>
  Date.UTC(moment.getFullYear(), moment.getMonth(), moment.getDate()) /
  86_400_000

/** The text trimmed, or an error with the given message when it is blank. */
function requireText(text: string, blankMessage: string): string {
  const trimmed = text.trim()
  if (!trimmed) throw new Error(blankMessage)
  return trimmed
}

const requireTitle = (title: string) =>
  requireText(title, 'A Role needs a title')
const requireStatusName = (name: string) =>
  requireText(name, 'A Status needs a name')
const requireCompanyName = (name: string) =>
  requireText(name, 'A Company needs a name')
const requireContactName = (name: string) =>
  requireText(name, 'A Contact needs a name')
const requireSavedSearchName = (name: string) =>
  requireText(name, 'A Saved search needs a name')

/** The text trimmed, or null when it is blank or missing. */
const textOrNull = (text: string | null) => text?.trim() || null

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

const isLocalDateTime = (value: unknown) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)

const isFitRating = (fitRating: unknown) =>
  Number.isInteger(fitRating) &&
  (fitRating as number) >= 1 &&
  (fitRating as number) <= 5

const isDailyTarget = (target: unknown) =>
  Number.isInteger(target) && (target as number) >= 1

function checkFitRating(fitRating: FitRating | null): void {
  if (fitRating !== null && !isFitRating(fitRating)) {
    throw new Error('Fit rating must be a whole number from 1 to 5')
  }
}

/** An error unless the value is one of a fixed list, such as the Interview types. */
function checkIsOneOf(
  value: string,
  allowed: readonly string[],
  what: string,
): void {
  if (!allowed.includes(value)) throw new Error(`No ${what} ${value}`)
}

/** A count and its noun, with the pronoun that stands for them: "1 Role", "it". */
function counted(count: number, noun: string): [string, string] {
  return count === 1 ? [`1 ${noun}`, 'it'] : [`${count} ${noun}s`, 'them']
}

/** Why a Company with Roles can't be deleted. */
export function companyHasRolesMessage(
  companyName: string,
  roleCount: number,
): string {
  const [roles, them] = counted(roleCount, 'Role')
  return `${companyName} still has ${roles}. Link ${them} to another Company or delete ${them} first.`
}

/** What deleting a Company does to its Contacts. */
export function companyContactsKeptMessage(contactCount: number): string {
  const [contacts] = counted(contactCount, 'Contact')
  return `Its ${contacts} will be kept, with no Company.`
}

/** Why a Status with Roles in it can't be deleted. */
export function statusHasRolesMessage(
  statusName: string,
  roleCount: number,
): string {
  const [roles, them] = counted(roleCount, 'Role')
  return `${statusName} still has ${roles}. Move ${them} to another Status first.`
}

/** Why the Applied status can't be deleted. */
export function appliedStatusDeleteMessage(statusName: string): string {
  return `${statusName} is the Applied status. Choose another Applied status first.`
}

/** The question to ask before restoring a backup. */
export function replaceRolesMessage({
  currentRoles,
  backupRoles,
}: BackupPreview): string {
  const [roles] = counted(currentRoles, 'Role')
  return `Replace ${roles} with ${backupRoles} from backup?`
}

// Roles added together share a timestamp, so title breaks the tie.
const byCreatedThenTitle = (a: Role, b: Role) =>
  a.createdAt.localeCompare(b.createdAt) ||
  a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })

// Empty text sorts first.
const byTextIgnoringCase = (a: string | null, b: string | null) =>
  (a ?? '').localeCompare(b ?? '', undefined, { sensitivity: 'base' })

const byNameIgnoringCase = (a: { name: string }, b: { name: string }) =>
  byTextIgnoringCase(a.name, b.name)

// The same search can be saved on several sites, so site and link break ties.
const byNameThenSiteThenLink = (a: SavedSearch, b: SavedSearch) =>
  byNameIgnoringCase(a, b) ||
  byTextIgnoringCase(a.site, b.site) ||
  byTextIgnoringCase(a.link, b.link)

// CSV export of Roles: one row per Role with its Company's fields flattened in.
// Typed against every field, so a new Company or Role field needs a column here
// or a decision to leave it out.
const companyCsvHeaders: Record<Exclude<keyof Company, 'id'>, string> = {
  name: 'Company',
  industry: 'Company industry',
  summary: 'Company summary',
  website: 'Company website',
  size: 'Company size',
  flags: 'Company flags',
  notes: 'Company notes',
}

// Ids are left out, and Minimum salary is never exported (GLOSSARY.md).
const roleCsvHeaders: Record<
  Exclude<keyof Role, 'id' | 'statusId' | 'companyId' | 'minimumSalary'>,
  string
> = {
  title: 'Role title',
  location: 'Location',
  workArrangement: 'Work arrangement',
  salaryMin: 'Posted salary minimum',
  salaryMax: 'Posted salary maximum',
  salaryPeriod: 'Salary period',
  salaryNote: 'Salary note',
  expectedSalary: 'Expected salary',
  roleSummary: 'Role summary',
  postingLink: 'Posting link',
  hiringSiteLink: 'Hiring site link',
  postingDate: 'Posting date',
  postingCopy: 'Posting copy',
  postingCopySavedAt: 'Posting copy saved',
  fitRating: 'Fit rating',
  fitNotes: 'Fit notes',
  referralSubmitted: 'Referral submitted',
  flags: 'Role flags',
  nextAction: 'Next action',
  nextActionDate: 'Next action date',
  parkedReason: 'Parked reason',
  notes: 'Role notes',
  createdAt: 'Added',
}

const fieldsOf = <T extends object>(headers: T) =>
  Object.keys(headers) as Array<keyof T>

type CsvValue = string | number | boolean | string[] | null

/** A value as one CSV cell, quoted when it holds a comma, quote or line break (RFC 4180). */
function csvCell(value: CsvValue): string {
  const text =
    value === null
      ? ''
      : typeof value === 'boolean'
        ? value
          ? 'Yes'
          : 'No'
        : Array.isArray(value)
          ? value.join('; ')
          : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

const csvLine = (values: CsvValue[]) => values.map(csvCell).join(',') + '\r\n'

interface StoredRecords {
  statuses: Status
  roles: Role
  statusHistory: StatusHistoryEntry
  companies: Company
  contacts: Contact
  roleContacts: RoleContact
  interviews: Interview
  savedSearches: SavedSearch
  settings: Settings
}

type Database = Dexie & {
  [Table in keyof StoredRecords]: EntityTable<StoredRecords[Table], 'id'>
}

// Checking a backup before it replaces everything. Typed against every table
// and field, so a new one needs its check here.
type Check = (value: unknown) => boolean
const isText: Check = (value) => typeof value === 'string'
const isNumber: Check = (value) => typeof value === 'number'
const isBoolean: Check = (value) => typeof value === 'boolean'
const isName: Check = (value) =>
  isText(value) && (value as string).trim() !== ''
const isTextList: Check = (value) => Array.isArray(value) && value.every(isText)
const isDistinctTextList: Check = (value) =>
  isTextList(value) &&
  new Set(value as string[]).size === (value as string[]).length
// What the pages format as dates: anything else would stop them rendering.
const isCalendarDate: Check = (value) =>
  isText(value) && /^\d{4}-\d{2}-\d{2}$/.test(value as string)
const isTimestamp: Check = (value) =>
  isText(value) && !Number.isNaN(Date.parse(value as string))
const orNull =
  (check: Check): Check =>
  (value) =>
    value === null || check(value)
const isOneOf =
  (...allowed: readonly unknown[]): Check =>
  (value) =>
    allowed.includes(value)
const isTextOrNull = orNull(isText)
const isNumberOrNull = orNull(isNumber)
const isCalendarDateOrNull = orNull(isCalendarDate)
const isTimestampOrNull = orNull(isTimestamp)

const backupFields: {
  [Table in keyof StoredRecords]: Record<keyof StoredRecords[Table], Check>
} = {
  statuses: {
    id: isText,
    name: isName,
    closed: isBoolean,
    order: isNumber,
    isApplied: isBoolean,
    isParked: isBoolean,
  },
  roles: {
    id: isText,
    title: isName,
    statusId: isText,
    createdAt: isTimestamp,
    companyId: isTextOrNull,
    location: isTextOrNull,
    workArrangement: isOneOf(null, ...workArrangements),
    salaryMin: isNumberOrNull,
    salaryMax: isNumberOrNull,
    salaryPeriod: isOneOf(null, ...salaryPeriods),
    salaryNote: isTextOrNull,
    expectedSalary: isNumberOrNull,
    minimumSalary: isNumberOrNull,
    roleSummary: isTextOrNull,
    postingLink: isTextOrNull,
    hiringSiteLink: isTextOrNull,
    postingDate: isCalendarDateOrNull,
    postingCopy: isTextOrNull,
    postingCopySavedAt: isTimestampOrNull,
    fitNotes: isTextOrNull,
    fitRating: orNull(isFitRating),
    referralSubmitted: isBoolean,
    flags: isTextList,
    nextAction: isTextOrNull,
    nextActionDate: isCalendarDateOrNull,
    parkedReason: isTextOrNull,
    notes: isTextOrNull,
  },
  statusHistory: {
    id: isText,
    roleId: isText,
    fromStatusId: isTextOrNull,
    fromStatusName: isTextOrNull,
    toStatusId: isText,
    toStatusName: isText,
    at: isTimestamp,
    imported: isBoolean,
    sequence: isNumber,
  },
  companies: {
    id: isText,
    name: isName,
    industry: isTextOrNull,
    summary: isTextOrNull,
    website: isTextOrNull,
    size: isTextOrNull,
    flags: isTextList,
    notes: isTextOrNull,
  },
  contacts: {
    id: isText,
    name: isName,
    title: isTextOrNull,
    companyId: isTextOrNull,
    howYouKnow: isTextOrNull,
    email: isTextOrNull,
    linkedIn: isTextOrNull,
    notes: isTextOrNull,
  },
  roleContacts: {
    id: isText,
    roleId: isText,
    contactId: isText,
    type: isOneOf(...roleContactTypes),
  },
  interviews: {
    id: isText,
    roleId: isText,
    at: isLocalDateTime,
    type: isOneOf(...interviewTypes),
    interviewerIds: isDistinctTextList,
    notes: isTextOrNull,
    followUpSent: isBoolean,
  },
  savedSearches: {
    id: isText,
    name: isName,
    link: isTextOrNull,
    site: isTextOrNull,
    lastCheckedAt: isTimestampOrNull,
  },
  settings: {
    id: isOneOf(settingsId),
    dailyTarget: isDailyTarget,
    lastBackupAt: isTimestampOrNull,
  },
}

const backupTables = Object.keys(backupFields) as Array<keyof StoredRecords>

// Status history keeps its Status ids and names after a Status is deleted, so
// they are not references here.
const backupReferences: Array<
  [table: keyof StoredRecords, field: string, target: keyof StoredRecords]
> = [
  ['roles', 'statusId', 'statuses'],
  ['roles', 'companyId', 'companies'],
  ['contacts', 'companyId', 'companies'],
  ['statusHistory', 'roleId', 'roles'],
  ['roleContacts', 'roleId', 'roles'],
  ['roleContacts', 'contactId', 'contacts'],
  ['interviews', 'roleId', 'roles'],
  ['interviews', 'interviewerIds', 'contacts'],
]

type RawRecord = Record<string, unknown>
type BackupRecords = Record<keyof StoredRecords, RawRecord[]>

const nameIgnoringCase = (record: RawRecord) =>
  (record.name as string).toLocaleLowerCase()

// The rules that say a value is used once, as the data layer's own checks do.
const backupUniques: Array<
  [table: keyof StoredRecords, key: (record: RawRecord) => unknown]
> = [
  ['statuses', nameIgnoringCase],
  ['companies', nameIgnoringCase],
  ['roleContacts', (r) => JSON.stringify([r.roleId, r.contactId, r.type])],
  ['interviews', (r) => JSON.stringify([r.roleId, r.at, r.type])],
]

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const countTrue = (records: RawRecord[], field: string) =>
  records.filter((record) => record[field] === true).length

/** Whether every table is a list of well-formed records with their own ids. */
function hasWellFormedTables(
  file: Record<string, unknown>,
): file is BackupRecords {
  return backupTables.every((table) => {
    const records = file[table]
    const checks: Record<string, Check> = backupFields[table]
    return (
      Array.isArray(records) &&
      new Set(records.map((record) => record?.id)).size === records.length &&
      records.every(
        (record) =>
          isObject(record) &&
          Object.keys(record).length === Object.keys(checks).length &&
          Object.entries(checks).every(
            ([field, check]) => field in record && check(record[field]),
          ),
      )
    )
  })
}

/** Whether every reference in the backup is to a record it holds. */
function hasWholeReferences(records: BackupRecords): boolean {
  return backupReferences.every(([table, field, target]) => {
    const ids = new Set(records[target].map((record) => record.id))
    return records[table]
      .flatMap((record) => record[field])
      .every((id) => id === null || ids.has(id))
  })
}

const notABackupMessage = "This file isn't a Job Search Tracker backup."

/** Whether what must be used once is. */
function hasDistinctValues(records: BackupRecords): boolean {
  return backupUniques.every(([table, key]) => {
    const keys = records[table].map(key)
    return new Set(keys).size === keys.length
  })
}

/** The records of a backup, or an error saying why it can't be restored. */
function parseBackup(json: string, schemaVersion: number): BackupRecords {
  let file: unknown
  try {
    file = JSON.parse(json)
  } catch {
    throw new Error(notABackupMessage)
  }
  if (!isObject(file) || !('schemaVersion' in file)) {
    throw new Error(notABackupMessage)
  }
  if (file.schemaVersion !== schemaVersion) {
    throw new Error(
      "This backup is from a different version of the app, so it can't be restored.",
    )
  }
  if (
    !hasWellFormedTables(file) ||
    !hasWholeReferences(file) ||
    !hasDistinctValues(file) ||
    file.settings.length !== 1 ||
    countTrue(file.statuses, 'isApplied') !== 1 ||
    countTrue(file.statuses, 'isParked') > 1
  ) {
    throw new Error("This backup is damaged, so it can't be restored.")
  }
  return file
}

export interface DataLayer {
  createRole(input: { title: string }): Promise<Role>
  /** Every Role, in the order added, then by Role title ignoring case. */
  listRoles(): Promise<Role[]>
  getRole(id: string): Promise<Role | undefined>
  updateRole(id: string, changes: Partial<RoleFields>): Promise<Role>
  /**
   * Deletes the Role and everything that belongs to it, its Status history,
   * Role contacts and Interviews, in one transaction. Its Contacts are kept.
   */
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
  /** Blocked while any Role is linked to the Company. Its Contacts are kept, at no Company. */
  deleteCompany(id: string): Promise<void>
  /** The Roles linked to a Company, in the order they were created. */
  listRolesAtCompany(companyId: string): Promise<Role[]>
  createContact(input: { name: string }): Promise<Contact>
  /** Every Contact, by name ignoring case. */
  listContacts(): Promise<Contact[]>
  getContact(id: string): Promise<Contact | undefined>
  updateContact(id: string, changes: Partial<ContactFields>): Promise<Contact>
  /**
   * Deletes the Contact and its Role contacts, and takes it off every
   * Interview, in one transaction. The Interviews are kept.
   */
  deleteContact(id: string): Promise<void>
  /** The Contacts currently at a Company, by name ignoring case. */
  listContactsAtCompany(companyId: string): Promise<Contact[]>
  /** Links a Contact to a Role as one type; each type once per Contact and Role. */
  linkContact(input: Omit<RoleContact, 'id'>): Promise<RoleContact>
  unlinkContact(roleContactId: string): Promise<void>
  /** A Role's Role contacts, by type in `roleContactTypes` order, then by name ignoring case. */
  listRoleContacts(roleId: string): Promise<LinkedContact[]>
  /** The Role contacts of a Contact, by their Roles in the order added, then Role title. */
  listRolesOfContact(contactId: string): Promise<LinkedRole[]>
  /**
   * Logs an Interview for a Role, one of each type at a time. Never changes
   * the Role's Status.
   */
  createInterview(
    input: { roleId: string } & InterviewFields,
  ): Promise<Interview>
  updateInterview(
    id: string,
    changes: Partial<InterviewFields>,
  ): Promise<Interview>
  /** Deletes the Interview. Its Interviewers are kept as Contacts. */
  deleteInterview(id: string): Promise<void>
  /** A Role's Interviews, by date and time, then by type in `interviewTypes` order. */
  listInterviews(roleId: string): Promise<ListedInterview[]>
  /**
   * The Contacts on any of a Role's Interviews, each once, by name ignoring
   * case. Interviewers are known only through Interviews.
   */
  listInterviewers(roleId: string): Promise<Contact[]>
  createSavedSearch(input: SavedSearchFields): Promise<SavedSearch>
  /** Every Saved search, by name, then site, then link, ignoring case. */
  listSavedSearches(): Promise<SavedSearch[]>
  getSavedSearch(id: string): Promise<SavedSearch | undefined>
  updateSavedSearch(
    id: string,
    changes: Partial<SavedSearchFields>,
  ): Promise<SavedSearch>
  deleteSavedSearch(id: string): Promise<void>
  /** Records that you checked the Saved search now, by the clock. */
  markSavedSearchChecked(id: string): Promise<SavedSearch>
  /** Every Status, in the order chosen for them. */
  listStatuses(): Promise<Status[]>
  /** Adds a Status at the end of the list, neither Closed nor Applied. */
  createStatus(input: { name: string }): Promise<Status>
  /** Renames a Status or sets whether it is Closed. Status history keeps the old name. */
  updateStatus(id: string, changes: Partial<StatusFields>): Promise<Status>
  /** Moves a Status to a position in the list, counting from 0. */
  moveStatus(id: string, position: number): Promise<void>
  /** Blocked while any Role is in the Status, or while it is the Applied status. */
  deleteStatus(id: string): Promise<void>
  /** Makes a Status the Applied status, in place of the one that was. */
  setAppliedStatus(id: string): Promise<void>
  /** Makes a Status the Parked status, or none when null. */
  setParkedStatus(id: string | null): Promise<void>
  /** How many Applications you aim to make per day; 2 until you change it. */
  getDailyTarget(): Promise<number>
  /** Sets the Daily target: a whole number, 1 or more. */
  setDailyTarget(target: number): Promise<void>
  /**
   * How many Applications were made today, by the local calendar day: Roles
   * whose first entry into the Applied status was today, unless that entry
   * is Imported.
   */
  countApplicationsToday(): Promise<number>
  /** Every Flag used on a Role or Company, each once, by name ignoring case. */
  listFlagSuggestions(): Promise<string[]>
  /**
   * Every Role as CSV, one row each in `listRoles` order, with its Status
   * name and its Company's fields flattened in. Minimum salary is never
   * included.
   */
  exportRolesCsv(): Promise<string>
  /**
   * Everything saved, including Minimum salary, as one JSON file with its
   * schema version. Records this as the last backup, which the file holds too.
   */
  exportBackup(): Promise<ExportedBackup>
  /** What restoring this backup would replace. Changes nothing. */
  previewBackup(json: string): Promise<BackupPreview>
  /** Replaces everything saved with the backup, in one transaction. */
  restoreBackup(json: string): Promise<void>
  /** Local calendar days since the last backup; null when there hasn't been one. */
  daysSinceLastBackup(): Promise<number | null>
  /** Whether the Role's Next action date is today or past, by the local calendar day. */
  isNextActionDue(role: Role): boolean
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
  // v7 indexes Roles by Status, to block deleting a Status with Roles in it,
  // and flags the Parked status, until now known by its default name, so it
  // keeps its Parked reasons when renamed.
  db.version(7)
    .stores({ roles: 'id, createdAt, companyId, statusId' })
    .upgrade((tx) =>
      tx
        .table('statuses')
        .toCollection()
        .modify((status: Status) => {
          status.isParked = status.name === 'Parked'
        }),
    )
  // v8 adds Contacts and Role contacts.
  db.version(8).stores({
    contacts: 'id, companyId',
    roleContacts: 'id, roleId, contactId',
  })
  // v9 adds Interviews, indexed by Interviewer to take a deleted Contact off them.
  db.version(9).stores({ interviews: 'id, roleId, *interviewerIds' })
  // v10 adds Saved searches.
  db.version(10).stores({ savedSearches: 'id' })
  // v11 adds Settings, starting with the Daily target.
  db.version(11)
    .stores({ settings: 'id' })
    .upgrade((tx) => tx.table('settings').add(defaultSettings))
  // v12 adds the last backup time to Settings.
  db.version(12).upgrade(fillMissingFields('settings', defaultSettings))
  db.on('populate', (tx) => {
    tx.table('settings').add(defaultSettings)
    tx.table('statuses').bulkAdd(
      defaultStatuses.map((status, order) => ({
        id: newId(),
        order,
        ...status,
      })),
    )
  })
  await db.open()

  const rolesInOrder = async () =>
    (await db.roles.toArray()).sort(byCreatedThenTitle)

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

  async function checkCompanyExists(companyId: string | null) {
    if (companyId !== null && !(await db.companies.get(companyId))) {
      throw new Error(`No Company with id ${companyId}`)
    }
  }

  // Each Status name is used once, ignoring case.
  async function checkStatusNameIsFree({ id, name }: Status) {
    const lower = name.toLocaleLowerCase()
    const taken = await db.statuses
      .filter(
        (other) => other.id !== id && other.name.toLocaleLowerCase() === lower,
      )
      .first()
    if (taken) {
      throw new Error(`There is already a Status called ${taken.name}`)
    }
  }

  async function checkRoleExists(roleId: string) {
    if (!(await db.roles.get(roleId))) {
      throw new Error(`No Role with id ${roleId}`)
    }
  }

  /** The Contacts with these ids, in the same order; an error if any is missing. */
  async function existingContacts(contactIds: string[]): Promise<Contact[]> {
    const contacts = await db.contacts.bulkGet(contactIds)
    const missing = contactIds.find((_, i) => contacts[i] === undefined)
    if (missing !== undefined) throw new Error(`No Contact with id ${missing}`)
    return contacts as Contact[]
  }

  /** The Contacts with these ids that still exist, by name ignoring case. */
  async function contactsByName(contactIds: string[]): Promise<Contact[]> {
    return (await db.contacts.bulkGet(contactIds))
      .filter((contact) => contact !== undefined)
      .sort(byNameIgnoringCase)
  }

  // An Interview as it is saved: checked, with each Interviewer once. A Role
  // has one Interview of each type at a time, so its Interviews' order is
  // fully chosen.
  async function checkedInterview(interview: Interview): Promise<Interview> {
    await checkRoleExists(interview.roleId)
    if (!isLocalDateTime(interview.at)) {
      throw new Error('An Interview needs a date and time')
    }
    if (!interview.type) throw new Error('An Interview needs a type')
    checkIsOneOf(interview.type, interviewTypes, 'Interview type')
    const repeated = await db.interviews
      .where('roleId')
      .equals(interview.roleId)
      .filter(
        (other) =>
          other.id !== interview.id &&
          other.at === interview.at &&
          other.type === interview.type,
      )
      .first()
    if (repeated) {
      throw new Error(
        `There is already a ${interview.type} Interview at that time`,
      )
    }
    const interviewerIds = [...new Set(interview.interviewerIds)]
    await existingContacts(interviewerIds)
    return {
      ...interview,
      interviewerIds,
      notes: textOrNull(interview.notes),
    }
  }

  // Edits a Saved search, checked as it is saved.
  function changeSavedSearch(id: string, changes: Partial<SavedSearch>) {
    return db.transaction('rw', db.savedSearches, async () => {
      const search = await db.savedSearches.get(id)
      if (!search) throw new Error(`No Saved search with id ${id}`)
      const updated = checkedSavedSearch({ ...search, ...changes })
      await db.savedSearches.put(updated)
      return updated
    })
  }

  // A Saved search as it is saved: a name, and empty text as null.
  function checkedSavedSearch(search: SavedSearch): SavedSearch {
    return {
      ...search,
      name: requireSavedSearchName(search.name),
      link: textOrNull(search.link),
      site: textOrNull(search.site),
    }
  }

  // Sets a flag on one Status, or none when null, and clears it on the rest.
  function flagOnlyStatus(flag: 'isApplied' | 'isParked', id: string | null) {
    return db.transaction('rw', db.statuses, async () => {
      if (id !== null && !(await db.statuses.get(id))) {
        throw new Error(`No Status with id ${id}`)
      }
      await db.statuses.toCollection().modify((status) => {
        status[flag] = status.id === id
      })
    })
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
    listRoles: rolesInOrder,
    getRole: (id) => db.roles.get(id),
    updateRole: (id, changes) =>
      db.transaction('rw', db.roles, db.companies, async () => {
        const role = await db.roles.get(id)
        if (!role) throw new Error(`No Role with id ${id}`)
        const updated: Role = { ...role, ...changes }
        updated.title = requireTitle(updated.title)
        updated.flags = normalizeFlags(updated.flags)
        checkFitRating(updated.fitRating)
        await checkCompanyExists(updated.companyId)
        // The saved date tracks the Posting copy text, not other edits.
        if (updated.postingCopy !== role.postingCopy) {
          updated.postingCopySavedAt =
            updated.postingCopy === null ? null : options.clock().toISOString()
        }
        await db.roles.put(updated)
        return updated
      }),
    deleteRole: (id) =>
      db.transaction(
        'rw',
        db.roles,
        db.statusHistory,
        db.roleContacts,
        db.interviews,
        async () => {
          await db.statusHistory.where('roleId').equals(id).delete()
          await db.roleContacts.where('roleId').equals(id).delete()
          await db.interviews.where('roleId').equals(id).delete()
          await db.roles.delete(id)
        },
      ),
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
      db.transaction('rw', db.companies, db.roles, db.contacts, async () => {
        const company = await db.companies.get(id)
        if (!company) return
        const roleCount = await db.roles.where('companyId').equals(id).count()
        if (roleCount > 0) {
          throw new Error(companyHasRolesMessage(company.name, roleCount))
        }
        await db.contacts
          .where('companyId')
          .equals(id)
          .modify({ companyId: null })
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
    createContact: ({ name }) =>
      db.transaction('rw', db.contacts, async () => {
        const contact: Contact = {
          id: newId(),
          ...emptyContact,
          name: requireContactName(name),
        }
        await db.contacts.add(contact)
        return contact
      }),
    listContacts: async () =>
      (await db.contacts.toArray()).sort(byNameIgnoringCase),
    getContact: (id) => db.contacts.get(id),
    updateContact: (id, changes) =>
      db.transaction('rw', db.contacts, db.companies, async () => {
        const contact = await db.contacts.get(id)
        if (!contact) throw new Error(`No Contact with id ${id}`)
        const updated: Contact = { ...contact, ...changes }
        updated.name = requireContactName(updated.name)
        await checkCompanyExists(updated.companyId)
        await db.contacts.put(updated)
        return updated
      }),
    deleteContact: (id) =>
      db.transaction(
        'rw',
        db.contacts,
        db.roleContacts,
        db.interviews,
        async () => {
          await db.roleContacts.where('contactId').equals(id).delete()
          await db.interviews
            .where('interviewerIds')
            .equals(id)
            .modify((interview) => {
              interview.interviewerIds = interview.interviewerIds.filter(
                (interviewerId) => interviewerId !== id,
              )
            })
          await db.contacts.delete(id)
        },
      ),
    listContactsAtCompany: async (companyId) =>
      (await db.contacts.where('companyId').equals(companyId).toArray()).sort(
        byNameIgnoringCase,
      ),
    linkContact: ({ roleId, contactId, type }) =>
      db.transaction('rw', db.roles, db.contacts, db.roleContacts, async () => {
        await checkRoleExists(roleId)
        const [contact] = await existingContacts([contactId])
        checkIsOneOf(type, roleContactTypes, 'Role contact type')
        const repeated = await db.roleContacts
          .where('roleId')
          .equals(roleId)
          .filter((r) => r.contactId === contactId && r.type === type)
          .first()
        if (repeated) {
          throw new Error(
            `${contact.name} is already linked to this Role as ${type}`,
          )
        }
        const roleContact: RoleContact = {
          id: newId(),
          roleId,
          contactId,
          type,
        }
        await db.roleContacts.add(roleContact)
        return roleContact
      }),
    unlinkContact: (roleContactId) => db.roleContacts.delete(roleContactId),
    listRoleContacts: (roleId) =>
      db.transaction('r', db.contacts, db.roleContacts, async () => {
        const links = await db.roleContacts
          .where('roleId')
          .equals(roleId)
          .toArray()
        const contacts = await db.contacts.bulkGet(
          links.map((link) => link.contactId),
        )
        return links
          .map((link, i) => ({ ...link, contact: contacts[i]! }))
          .sort(
            (a, b) =>
              byRoleContactType(a, b) ||
              byNameIgnoringCase(a.contact, b.contact),
          )
      }),
    listRolesOfContact: (contactId) =>
      db.transaction('r', db.roles, db.roleContacts, async () => {
        const links = await db.roleContacts
          .where('contactId')
          .equals(contactId)
          .toArray()
        const roles = await db.roles.bulkGet(links.map((link) => link.roleId))
        return links
          .map((link, i) => ({ ...link, role: roles[i]! }))
          .sort(
            (a, b) =>
              byCreatedThenTitle(a.role, b.role) || byRoleContactType(a, b),
          )
      }),
    createInterview: ({ roleId, ...fields }) =>
      db.transaction('rw', db.roles, db.contacts, db.interviews, async () => {
        const interview = await checkedInterview({
          id: newId(),
          roleId,
          ...fields,
        })
        await db.interviews.add(interview)
        return interview
      }),
    updateInterview: (id, changes) =>
      db.transaction('rw', db.roles, db.contacts, db.interviews, async () => {
        const interview = await db.interviews.get(id)
        if (!interview) throw new Error(`No Interview with id ${id}`)
        const updated = await checkedInterview({ ...interview, ...changes })
        await db.interviews.put(updated)
        return updated
      }),
    deleteInterview: (id) => db.interviews.delete(id),
    listInterviews: (roleId) =>
      db.transaction('r', db.contacts, db.interviews, async () => {
        const interviews = await db.interviews
          .where('roleId')
          .equals(roleId)
          .toArray()
        return Promise.all(
          interviews.sort(byTimeThenType).map(async (interview) => ({
            ...interview,
            interviewers: await contactsByName(interview.interviewerIds),
          })),
        )
      }),
    listInterviewers: (roleId) =>
      db.transaction('r', db.contacts, db.interviews, async () => {
        const interviews = await db.interviews
          .where('roleId')
          .equals(roleId)
          .toArray()
        const ids = new Set(interviews.flatMap((i) => i.interviewerIds))
        return contactsByName([...ids])
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
    createSavedSearch: async (fields) => {
      const search = checkedSavedSearch({
        id: newId(),
        ...fields,
        lastCheckedAt: null,
      })
      await db.savedSearches.add(search)
      return search
    },
    listSavedSearches: async () =>
      (await db.savedSearches.toArray()).sort(byNameThenSiteThenLink),
    getSavedSearch: (id) => db.savedSearches.get(id),
    updateSavedSearch: (id, changes) => changeSavedSearch(id, changes),
    deleteSavedSearch: (id) => db.savedSearches.delete(id),
    markSavedSearchChecked: (id) =>
      changeSavedSearch(id, { lastCheckedAt: options.clock().toISOString() }),
    listStatuses: () => db.statuses.orderBy('order').toArray(),
    createStatus: ({ name }) =>
      db.transaction('rw', db.statuses, async () => {
        const last = await db.statuses.orderBy('order').last()
        const status: Status = {
          id: newId(),
          name: requireStatusName(name),
          order: (last?.order ?? -1) + 1,
          closed: false,
          isApplied: false,
          isParked: false,
        }
        await checkStatusNameIsFree(status)
        await db.statuses.add(status)
        return status
      }),
    updateStatus: (id, { name, closed }) =>
      db.transaction('rw', db.statuses, async () => {
        const status = await db.statuses.get(id)
        if (!status) throw new Error(`No Status with id ${id}`)
        const updated: Status = {
          ...status,
          name: requireStatusName(name ?? status.name),
          closed: closed ?? status.closed,
        }
        await checkStatusNameIsFree(updated)
        await db.statuses.put(updated)
        return updated
      }),
    moveStatus: (id, position) =>
      db.transaction('rw', db.statuses, async () => {
        const statuses = await db.statuses.orderBy('order').toArray()
        const from = statuses.findIndex((status) => status.id === id)
        if (from === -1) throw new Error(`No Status with id ${id}`)
        const [moved] = statuses.splice(from, 1)
        statuses.splice(position, 0, moved)
        await db.statuses.bulkPut(
          statuses.map((status, order) => ({ ...status, order })),
        )
      }),
    deleteStatus: (id) =>
      db.transaction('rw', db.statuses, db.roles, async () => {
        const status = await db.statuses.get(id)
        if (!status) return
        if (status.isApplied) {
          throw new Error(appliedStatusDeleteMessage(status.name))
        }
        const roleCount = await db.roles.where('statusId').equals(id).count()
        if (roleCount > 0) {
          throw new Error(statusHasRolesMessage(status.name, roleCount))
        }
        await db.statuses.delete(id)
      }),
    // Exactly one Status is the Applied status at all times.
    setAppliedStatus: (id) => flagOnlyStatus('isApplied', id),
    // At most one Status is the Parked status.
    setParkedStatus: (id) => flagOnlyStatus('isParked', id),
    exportRolesCsv: () =>
      db.transaction('r', db.roles, db.statuses, db.companies, async () => {
        const statuses = new Map(
          (await db.statuses.toArray()).map((status) => [status.id, status]),
        )
        const companies = new Map(
          (await db.companies.toArray()).map((company) => [
            company.id,
            company,
          ]),
        )
        const { title, ...otherRoleHeaders } = roleCsvHeaders
        const roleFields = fieldsOf(otherRoleHeaders)
        const companyFields = fieldsOf(companyCsvHeaders)
        const rows = (await rolesInOrder()).map((role) => {
          const company =
            role.companyId === null ? undefined : companies.get(role.companyId)
          return csvLine([
            role.title,
            statuses.get(role.statusId)?.name ?? null,
            ...companyFields.map((field) => company?.[field] ?? null),
            ...roleFields.map((field) => role[field]),
          ])
        })
        const header = csvLine([
          title,
          'Status',
          ...Object.values(companyCsvHeaders),
          ...Object.values(otherRoleHeaders),
        ])
        return header + rows.join('')
      }),
    exportBackup: () =>
      db.transaction('rw', db.tables, async () => {
        const now = options.clock()
        await db.settings.update(settingsId, {
          lastBackupAt: now.toISOString(),
        })
        const backup: Record<string, unknown> = { schemaVersion: db.verno }
        for (const table of backupTables) {
          backup[table] = await db.table(table).toArray()
        }
        return {
          fileName: `job-search-tracker-backup-${localCalendarDate(now)}.json`,
          json: JSON.stringify(backup, null, 2),
        }
      }),
    previewBackup: async (json) => ({
      currentRoles: await db.roles.count(),
      backupRoles: parseBackup(json, db.verno).roles.length,
    }),
    restoreBackup: async (json) => {
      const backup = parseBackup(json, db.verno)
      await db.transaction('rw', db.tables, async () => {
        for (const table of backupTables) {
          await db.table(table).clear()
          await db.table(table).bulkAdd(backup[table])
        }
      })
    },
    daysSinceLastBackup: async () => {
      const { lastBackupAt } = (await db.settings.get(settingsId))!
      if (lastBackupAt === null) return null
      const days =
        localDayNumber(options.clock()) - localDayNumber(new Date(lastBackupAt))
      return Math.max(days, 0)
    },
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
    // The record is added with the database, or by the v11 upgrade.
    getDailyTarget: async () =>
      (await db.settings.get(settingsId))!.dailyTarget,
    setDailyTarget: async (target) => {
      if (!isDailyTarget(target)) {
        throw new Error('A Daily target is a whole number, 1 or more')
      }
      await db.settings.update(settingsId, { dailyTarget: target })
    },
    countApplicationsToday: () =>
      db.transaction('r', db.statuses, db.statusHistory, async () => {
        const applied = await db.statuses.filter((s) => s.isApplied).first()
        // Each Role's first entry into the Applied status, by sequence.
        const firstByRole = new Map<string, StatusHistoryEntry>()
        for (const entry of await db.statusHistory.toArray()) {
          if (entry.toStatusId !== applied?.id) continue
          const first = firstByRole.get(entry.roleId)
          if (!first || entry.sequence < first.sequence) {
            firstByRole.set(entry.roleId, entry)
          }
        }
        const today = localCalendarDate(options.clock())
        // A Role first Applied by an import was Applied then, not today.
        return [...firstByRole.values()].filter(
          (entry) =>
            !entry.imported && localCalendarDate(new Date(entry.at)) === today,
        ).length
      }),
    isNextActionDue: (role) =>
      role.nextActionDate !== null &&
      role.nextActionDate <= localCalendarDate(options.clock()),
    close: () => db.close(),
  }
}
