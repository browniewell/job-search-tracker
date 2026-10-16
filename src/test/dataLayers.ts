import { afterEach } from 'vitest'
import { openDataLayer, type Clock, type DataLayer } from '../data/dataLayer'

export const fixedClock: Clock = () => new Date('2026-10-16T14:30:00.000Z')

const openDataLayers: DataLayer[] = []

afterEach(() => {
  openDataLayers.splice(0).forEach((data) => data.close())
})

export function uniqueDatabaseName(): string {
  return `test-${crypto.randomUUID()}`
}

/** Opens a data layer on fake-indexeddb, closed automatically after the test. */
export async function openTestDataLayer({
  clock = fixedClock,
  name = uniqueDatabaseName(),
}: { clock?: Clock; name?: string } = {}): Promise<DataLayer> {
  const data = await openDataLayer({ clock, name })
  openDataLayers.push(data)
  return data
}
