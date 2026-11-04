import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import {
  openDataLayer,
  type Clock,
  type DataLayer,
  type NewId,
} from '../data/dataLayer'

export const fixedClock: Clock = () => new Date('2026-10-16T14:30:00.000Z')

const openDataLayers: DataLayer[] = []

afterEach(() => {
  // Unmounted first, which runs any effect still pending while its database is
  // open: a read that starts after the close rejects with nothing to catch it.
  // Hooks run last-registered first, so setup.ts's cleanup would come too late.
  cleanup()
  openDataLayers.splice(0).forEach((data) => data.close())
})

export function uniqueDatabaseName(): string {
  return `test-${crypto.randomUUID()}`
}

/**
 * Ids that sort in the reverse of the order they are made. IndexedDB returns
 * records in id order, so anything listed in inherited rather than chosen
 * order (CODING_STANDARDS.md) comes out backwards every time, not just
 * sometimes as with random ids. One count serves every data layer, so a
 * database reopened by name never gets an id it already holds.
 */
let idsLeft = 1_000_000_000
export const reverseOrderId: NewId = () =>
  `id-${String(--idsLeft).padStart(10, '0')}`

/** Opens a data layer on fake-indexeddb, closed automatically after the test. */
export async function openTestDataLayer({
  clock = fixedClock,
  name = uniqueDatabaseName(),
}: { clock?: Clock; name?: string } = {}): Promise<DataLayer> {
  const data = await openDataLayer({ clock, name, newId: reverseOrderId })
  openDataLayers.push(data)
  return data
}
