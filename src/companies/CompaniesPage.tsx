import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { AddByNameForm } from '../components/AddByNameForm'
import type { Company } from '../data/dataLayer'
import { useDataLayer } from '../dataContext'

export function CompaniesPage() {
  const data = useDataLayer()
  const [companies, setCompanies] = useState<Company[] | null>(null)

  useEffect(() => {
    let cancelled = false
    data.listCompanies().then((loaded) => {
      if (!cancelled) setCompanies(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [data])

  async function addCompany(name: string) {
    await data.createCompany({ name })
    setCompanies(await data.listCompanies())
  }

  return (
    <section aria-labelledby="companies-heading">
      <h2 id="companies-heading">Companies</h2>
      <AddByNameForm
        label="Company name"
        buttonLabel="Add Company"
        onAdd={addCompany}
      />
      {companies === null ? null : companies.length === 0 ? (
        <p>No Companies yet. Add the first one above.</p>
      ) : (
        <ul aria-label="Companies" className="item-list">
          {companies.map((company) => (
            <li key={company.id}>
              <Link to={`/companies/${company.id}`}>{company.name}</Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
