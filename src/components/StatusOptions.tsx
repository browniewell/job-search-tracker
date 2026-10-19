import type { Status } from '../data/dataLayer'

/** One option per Status, in their order, for a Status select. */
export function StatusOptions({ statuses }: { statuses: Status[] }) {
  return statuses.map((status) => (
    <option key={status.id} value={status.id}>
      {status.name}
    </option>
  ))
}
