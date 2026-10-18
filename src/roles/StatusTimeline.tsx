import type { StatusHistoryEntry } from '../data/dataLayer'
import { formatTimestamp } from './format'

/** A Role's Status history, starting with the Status it was created in. */
export function StatusTimeline({ entries }: { entries: StatusHistoryEntry[] }) {
  return (
    <section className="field-group">
      <h3 id="status-history-heading">Status history</h3>
      <ol className="status-timeline" aria-labelledby="status-history-heading">
        {entries.map((entry) => (
          <li key={entry.id}>
            {entry.fromStatusId === null
              ? entry.toStatusName
              : `${entry.fromStatusName} → ${entry.toStatusName}`}
            {' · '}
            <time dateTime={entry.at}>{formatTimestamp(entry.at)}</time>
          </li>
        ))}
      </ol>
    </section>
  )
}
