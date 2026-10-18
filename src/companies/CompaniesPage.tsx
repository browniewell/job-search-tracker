import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import type { Company } from '../data/dataLayer'
import { useDataLayer } from '../dataContext'

export function CompaniesPage() {
  const data = useDataLayer()
  const [companies, setCompanies] = useState<Company[] | null>(null)
  const [name, setName] = useState('')

  useEffect(() => {
    let cancelled = false
    data.listCompanies().then((loaded) => {
      if (!cancelled) setCompanies(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [data])

  async function addCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) return
    await data.createCompany({ name })
    setName('')
    setCompanies(await data.listCompanies())
  }

  return (
    <section aria-labelledby="companies-heading">
      <h2 id="companies-heading">Companies</h2>
      <form className="add-form" onSubmit={addCompany}>
        <label htmlFor="company-name">Company name</label>
        <input
          id="company-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="off"
        />
        <button type="submit">Add Company</button>
      </form>
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
