import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ConfirmDelete } from '../components/ConfirmDelete'
import { FlagBadge } from '../components/FlagBadge'
import {
  ExternalLink,
  Field,
  FieldGroup,
  MultilineText,
} from '../components/Fields'
import {
  companyHasRolesMessage,
  type Company,
  type CompanyFields,
  type Contact,
  type Role,
} from '../data/dataLayer'
import { useDataLayer } from '../dataContext'
import { CompanyForm } from './CompanyForm'

type Loaded = {
  company: Company | undefined
  roles: Role[]
  contacts: Contact[]
  flagSuggestions: string[]
}
type Mode = 'view' | 'edit' | 'confirm-delete'

function keptContactsMessage(contactCount: number): string {
  const contacts = contactCount === 1 ? '1 Contact' : `${contactCount} Contacts`
  return `Its ${contacts} will be kept, with no Company.`
}

export function CompanyDetailPage() {
  const data = useDataLayer()
  const navigate = useNavigate()
  const { companyId = '' } = useParams()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [mode, setMode] = useState<Mode>('view')
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      data.getCompany(companyId),
      data.listRolesAtCompany(companyId),
      data.listContactsAtCompany(companyId),
      data.listFlagSuggestions(),
    ]).then(([company, roles, contacts, flagSuggestions]) => {
      if (!cancelled) setLoaded({ company, roles, contacts, flagSuggestions })
    })
    return () => {
      cancelled = true
    }
  }, [data, companyId])

  if (loaded === null) return null
  const { company, roles, contacts, flagSuggestions } = loaded
  const backLink = <Link to="/companies">← All Companies</Link>
  if (!company) {
    return (
      <section>
        {backLink}
        <h2>Company not found</h2>
        <p>It may have been deleted.</p>
      </section>
    )
  }

  async function save(fields: CompanyFields) {
    const updated = await data.updateCompany(companyId, fields)
    setLoaded({
      company: updated,
      roles,
      contacts,
      flagSuggestions: await data.listFlagSuggestions(),
    })
    setMode('view')
  }

  function startDelete(companyName: string) {
    if (roles.length > 0) {
      setDeleteError(companyHasRolesMessage(companyName, roles.length))
    } else {
      setDeleteError(null)
      setMode('confirm-delete')
    }
  }

  async function deleteCompany() {
    try {
      await data.deleteCompany(companyId)
      navigate('/companies')
    } catch (cause) {
      setMode('view')
      setDeleteError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  return (
    <article aria-labelledby="company-heading">
      {backLink}
      <h2 id="company-heading">{company.name}</h2>
      <FlagBadge flags={company.flags.map((flag) => ({ flag }))} />
      {mode === 'edit' ? (
        <CompanyForm
          company={company}
          flagSuggestions={flagSuggestions}
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
              onClick={() => startDelete(company.name)}
            >
              Delete Company
            </button>
          </div>
          {deleteError && (
            <p role="alert" className="form-error">
              {deleteError}
            </p>
          )}
          {mode === 'confirm-delete' && (
            <ConfirmDelete
              heading="Delete this Company?"
              onConfirm={deleteCompany}
              onCancel={() => setMode('view')}
            >
              “{company.name}” will be deleted.
              {contacts.length > 0 &&
                ` ${keptContactsMessage(contacts.length)}`}{' '}
              This can’t be undone.
            </ConfirmDelete>
          )}
          <section aria-label="Company fields" className="detail-fields">
            <FieldGroup title="About">
              <Field label="Industry">{company.industry}</Field>
              <Field label="Summary">
                <MultilineText value={company.summary} />
              </Field>
              <Field label="Website">
                <ExternalLink url={company.website} />
              </Field>
              <Field label="Company size">{company.size}</Field>
              <Field label="Notes">
                <MultilineText value={company.notes} />
              </Field>
            </FieldGroup>
          </section>
          <section aria-labelledby="company-roles-heading">
            <h3 id="company-roles-heading">Roles</h3>
            {roles.length === 0 ? (
              <p>No Roles at {company.name} yet.</p>
            ) : (
              <ul aria-label={`Roles at ${company.name}`} className="item-list">
                {roles.map((role) => (
                  <li key={role.id}>
                    <Link to={`/roles/${role.id}`}>{role.title}</Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="company-contacts-heading">
            <h3 id="company-contacts-heading">Contacts</h3>
            {contacts.length === 0 ? (
              <p>No Contacts at {company.name} yet.</p>
            ) : (
              <ul
                aria-label={`Contacts at ${company.name}`}
                className="item-list"
              >
                {contacts.map((contact) => (
                  <li key={contact.id}>
                    <Link to={`/contacts/${contact.id}`}>{contact.name}</Link>
                    <span className="secondary-text">{contact.title}</span>
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
