// The data layer (ADR-0002): the only module that touches Dexie. The UI reads
// and writes through the domain operations on DataLayer, never through tables.
import Dexie, { type EntityTable } from 'dexie'

export type Clock = () => Date

export interface Status {
  id: string
  name: string
  order: number
  closed: boolean
  isApplied: boolean
}

export interface Role {
  id: string
  title: string
  statusId: string
  createdAt: string
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

type Database = Dexie & {
  statuses: EntityTable<Status, 'id'>
  roles: EntityTable<Role, 'id'>
  statusHistory: EntityTable<StatusHistoryEntry, 'id'>
}

export interface DataLayer {
  createRole(input: { title: string }): Promise<Role>
  listRoles(): Promise<Role[]>
  getStatusHistory(roleId: string): Promise<StatusHistoryEntry[]>
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
            title,
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
    getStatusHistory: (roleId) =>
      db.statusHistory.where('roleId').equals(roleId).sortBy('at'),
    listStatuses: () => db.statuses.orderBy('order').toArray(),
    close: () => db.close(),
  }
}
