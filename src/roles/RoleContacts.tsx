import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router'
import { useEditForm } from '../components/useEditForm'
import { roleContactTypeLabels } from '../contacts/format'
import {
  roleContactTypes,
  type Contact,
  type LinkedContact,
  type RoleContactType,
} from '../data/dataLayer'
import { useDataLayer } from '../dataContext'

type Loaded = {
  roleContacts: LinkedContact[]
  contacts: Contact[]
}

function LinkContactForm({
  contacts,
  onLink,
}: {
  contacts: Contact[]
  onLink: (contactId: string, type: RoleContactType) => Promise<void>
}) {
  const { submit, errorMessage, select } = useEditForm(
    () => ({ contactId: '', type: '' }),
    async ({ contactId, type }) => {
      if (contactId && type) await onLink(contactId, type as RoleContactType)
    },
  )
  return (
    <form
      className="link-contact"
      onSubmit={submit}
      aria-label="Link a Contact"
    >
      {select(
        'contactId',
        'Contact',
        'Choose a Contact',
        contacts.map((contact) => [contact.id, contact.name]),
      )}
      {select(
        'type',
        'Type',
        'Choose a type',
        roleContactTypes.map((type) => [type, roleContactTypeLabels[type]]),
      )}
      <button type="submit">Link Contact</button>
      {errorMessage}
    </form>
  )
}

/** A Role's Role contacts by type, with a form to link another Contact. */
export function RoleContacts({ roleId }: { roleId: string }) {
  const data = useDataLayer()
  const id = useId()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  // Remounts the link form, clearing it, after each Contact is linked.
  const [linkCount, setLinkCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([data.listRoleContacts(roleId), data.listContacts()]).then(
      ([roleContacts, contacts]) => {
        if (!cancelled) setLoaded({ roleContacts, contacts })
      },
    )
    return () => {
      cancelled = true
    }
  }, [data, roleId])

  if (loaded === null) return null
  const { roleContacts, contacts } = loaded

  async function reload() {
    setLoaded({
      roleContacts: await data.listRoleContacts(roleId),
      contacts,
    })
  }

  async function link(contactId: string, type: RoleContactType) {
    await data.linkContact({ roleId, contactId, type })
    setLinkCount((count) => count + 1)
    await reload()
  }

  async function unlink(roleContactId: string) {
    await data.unlinkContact(roleContactId)
    await reload()
  }

  return (
    <section aria-labelledby={`${id}-heading`} className="role-contacts">
      <h3 id={`${id}-heading`}>Contacts</h3>
      {roleContacts.length === 0 ? (
        <p>No Contacts linked to this Role yet.</p>
      ) : (
        roleContactTypes.map((groupType) => {
          const group = roleContacts.filter((r) => r.type === groupType)
          if (group.length === 0) return null
          const label = roleContactTypeLabels[groupType]
          return (
            <div key={groupType}>
              <h4>{label}</h4>
              <ul aria-label={label} className="item-list">
                {group.map((roleContact) => (
                  <li key={roleContact.id}>
                    <span>
                      <Link to={`/contacts/${roleContact.contactId}`}>
                        {roleContact.contact.name}
                      </Link>
                      {roleContact.contact.title && (
                        <span className="secondary-text">
                          , {roleContact.contact.title}
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      className="secondary"
                      aria-label={`Remove ${roleContact.contact.name} as ${groupType}`}
                      onClick={() => unlink(roleContact.id)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )
        })
      )}
      {contacts.length === 0 ? (
        <p>
          <Link to="/contacts">Add a Contact</Link> to link them to this Role.
        </p>
      ) : (
        <LinkContactForm key={linkCount} contacts={contacts} onLink={link} />
      )}
    </section>
  )
}
