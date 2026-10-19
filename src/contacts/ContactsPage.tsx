import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { AddByNameForm } from '../components/AddByNameForm'
import type { Company, Contact } from '../data/dataLayer'
import { useDataLayer } from '../dataContext'

type Loaded = { contacts: Contact[]; companies: Company[] }

export function ContactsPage() {
  const data = useDataLayer()
  const [loaded, setLoaded] = useState<Loaded | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([data.listContacts(), data.listCompanies()]).then(
      ([contacts, companies]) => {
        if (!cancelled) setLoaded({ contacts, companies })
      },
    )
    return () => {
      cancelled = true
    }
  }, [data])

  async function addContact(name: string) {
    await data.createContact({ name })
    setLoaded({
      contacts: await data.listContacts(),
      companies: loaded?.companies ?? [],
    })
  }

  // A Contact's Title and Company, where known, e.g. "Recruiter at Acme".
  function description(contact: Contact): string | null {
    const company = loaded?.companies.find((c) => c.id === contact.companyId)
    return (
      [contact.title, company && `at ${company.name}`]
        .filter(Boolean)
        .join(' ') || null
    )
  }

  return (
    <section aria-labelledby="contacts-heading">
      <h2 id="contacts-heading">Contacts</h2>
      <AddByNameForm
        label="Contact name"
        buttonLabel="Add Contact"
        onAdd={addContact}
      />
      {loaded === null ? null : loaded.contacts.length === 0 ? (
        <p>No Contacts yet. Add the first one above.</p>
      ) : (
        <ul aria-label="Contacts" className="item-list">
          {loaded.contacts.map((contact) => (
            <li key={contact.id}>
              <Link to={`/contacts/${contact.id}`}>{contact.name}</Link>
              <span className="secondary-text">{description(contact)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
