import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ConfirmDelete } from '../components/ConfirmDelete'
import {
  ExternalLink,
  Field,
  FieldGroup,
  MultilineText,
} from '../components/Fields'
import type {
  Company,
  Contact,
  ContactFields,
  Role,
  RoleContact,
} from '../data/dataLayer'
import { useDataLayer } from '../dataContext'
import { ContactForm } from './ContactForm'
import { roleContactTypeLabels } from './format'

type Loaded = {
  contact: Contact | undefined
  companies: Company[]
  roles: Array<RoleContact & { role: Role }>
}
type Mode = 'view' | 'edit' | 'confirm-delete'

export function ContactDetailPage() {
  const data = useDataLayer()
  const navigate = useNavigate()
  const { contactId = '' } = useParams()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [mode, setMode] = useState<Mode>('view')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      data.getContact(contactId),
      data.listCompanies(),
      data.listRolesOfContact(contactId),
    ]).then(([contact, companies, roles]) => {
      if (!cancelled) setLoaded({ contact, companies, roles })
    })
    return () => {
      cancelled = true
    }
  }, [data, contactId])

  if (loaded === null) return null
  const { contact, companies, roles } = loaded
  const backLink = <Link to="/contacts">← All Contacts</Link>
  if (!contact) {
    return (
      <section>
        {backLink}
        <h2>Contact not found</h2>
        <p>It may have been deleted.</p>
      </section>
    )
  }
  const company = companies.find((c) => c.id === contact.companyId)

  async function save(fields: ContactFields) {
    const updated = await data.updateContact(contactId, fields)
    setLoaded({ contact: updated, companies, roles })
    setMode('view')
  }

  async function deleteContact() {
    await data.deleteContact(contactId)
    navigate('/contacts')
  }

  return (
    <article aria-labelledby="contact-heading">
      {backLink}
      <h2 id="contact-heading">{contact.name}</h2>
      {mode === 'edit' ? (
        <ContactForm
          contact={contact}
          companies={companies}
          onSave={save}
          onCancel={() => setMode('view')}
        />
      ) : (
        <>
          <div className="page-actions">
            <button type="button" onClick={() => setMode('edit')}>
              Edit
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => setMode('confirm-delete')}
            >
              Delete Contact
            </button>
          </div>
          {mode === 'confirm-delete' && (
            <ConfirmDelete
              heading="Delete this Contact?"
              onConfirm={deleteContact}
              onCancel={() => setMode('view')}
            >
              “{contact.name}” will be deleted and taken off every Role. This
              can’t be undone.
            </ConfirmDelete>
          )}
          <section aria-label="Contact fields" className="detail-fields">
            <FieldGroup title="About">
              <Field label="Title">{contact.title}</Field>
              <Field label="Company">
                {company && (
                  <Link to={`/companies/${company.id}`}>{company.name}</Link>
                )}
              </Field>
              <Field label="How you know them">
                <MultilineText value={contact.howYouKnow} />
              </Field>
              <Field label="Email">{contact.email}</Field>
              <Field label="LinkedIn">
                <ExternalLink url={contact.linkedIn} />
              </Field>
              <Field label="Notes">
                <MultilineText value={contact.notes} />
              </Field>
            </FieldGroup>
          </section>
          <section aria-labelledby="contact-roles-heading">
            <h3 id="contact-roles-heading">Roles</h3>
            {roles.length === 0 ? (
              <p>{contact.name} is not linked to any Roles yet.</p>
            ) : (
              <ul
                aria-label={`Roles with ${contact.name}`}
                className="item-list"
              >
                {roles.map(({ id, type, role }) => (
                  <li key={id}>
                    <Link to={`/roles/${role.id}`}>{role.title}</Link>
                    <span className="secondary-text">
                      {roleContactTypeLabels[type]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </article>
  )
}
