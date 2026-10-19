import { Link } from 'react-router'
import type { Contact } from '../data/dataLayer'

/** A Contact's name, linked to their page. */
export function ContactLink({ contact }: { contact: Contact }) {
  return <Link to={`/contacts/${contact.id}`}>{contact.name}</Link>
}

/** A Contact's name, linked to their page, followed by their Title if set. */
export function ContactName({ contact }: { contact: Contact }) {
  return (
    <span>
      <ContactLink contact={contact} />
      {contact.title && (
        <span className="secondary-text">, {contact.title}</span>
      )}
    </span>
  )
}
