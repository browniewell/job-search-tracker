// Read-only field lists for detail pages: a <dl> of labelled values where
// empty values read "Not set".
import type { ReactNode } from 'react'

/** Only http(s) links are rendered as links; anything else stays text. */
function safeHref(url: string): string | null {
  try {
    const { protocol } = new URL(url)
    return protocol === 'http:' || protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

const notSet = <span className="not-set">Not set</span>

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="field">
      <dt>{label}</dt>
      {/* `value !== null && …` yields false for an empty field. */}
      <dd>
        {children === null || children === undefined || children === false
          ? notSet
          : children}
      </dd>
    </div>
  )
}

export function MultilineText({ value }: { value: string | null }) {
  return value === null ? notSet : <span className="multiline">{value}</span>
}

export function ExternalLink({ url }: { url: string | null }) {
  if (url === null) return notSet
  const href = safeHref(url)
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {url}
    </a>
  ) : (
    url
  )
}

export function FieldGroup({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="field-group">
      <h3>{title}</h3>
      <dl>{children}</dl>
    </section>
  )
}
