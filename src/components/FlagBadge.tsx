import type { ShownFlag } from '../data/dataLayer'

/** A warning badge listing Flags; nothing when there are none. */
export function FlagBadge({ flags }: { flags: ShownFlag[] }) {
  if (flags.length === 0) return null
  return (
    <div role="note" aria-label="Flags" className="flag-badge">
      <span aria-hidden="true" className="flag-badge-icon">
        ⚠
      </span>
      <ul>
        {flags.map(({ flag, from }) => (
          <li key={`${from ?? ''}:${flag}`}>
            {flag}
            {from && <span className="flag-from"> ({from})</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
