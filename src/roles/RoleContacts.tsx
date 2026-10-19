import { useEffect, useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { FormRow } from '../components/FormRow'
import { roleContactTypeLabels } from '../contacts/format'
import {
  roleContactTypes,
  type Contact,
  type RoleContact,
  type RoleContactType,
} from '../data/dataLayer'
import { useDataLayer } from '../dataContext'

type Loaded = {
  roleContacts: Array<RoleContact & { contact: Contact }>
  contacts: Contact[]
}

/** A Role's Role contacts by type, with a form to link another Contact. */
export function RoleContacts({ roleId }: { roleId: string }) {
  const data = useDataLayer()
  const id = useId()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [contactId, setContactId] = useState('')
  const [type, setType] = useState<RoleContactType | ''>('')
  const [error, setError] = useState<string | null>(null)

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

  async function link(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!contactId || !type) return
    try {
      await data.linkContact({ roleId, contactId, type })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      return
    }
    setError(null)
    setContactId('')
    setType('')
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
        <form className="link-contact" onSubmit={link}>
          <FormRow id={`${id}-contact`} label="Contact">
            <select
              id={`${id}-contact`}
              required
              value={contactId}
              onChange={(event) => setContactId(event.target.value)}
            >
              <option value="">Choose a Contact</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name}
                </option>
              ))}
            </select>
          </FormRow>
          <FormRow id={`${id}-type`} label="Type">
            <select
              id={`${id}-type`}
              required
              value={type}
              onChange={(event) =>
                setType(event.target.value as RoleContactType | '')
              }
            >
              <option value="">Choose a type</option>
              {roleContactTypes.map((option) => (
                <option key={option} value={option}>
                  {roleContactTypeLabels[option]}
                </option>
              ))}
            </select>
          </FormRow>
          <button type="submit">Link Contact</button>
        </form>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </section>
  )
}
