import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import type { Company, Role } from '../data/dataLayer'
import { useDataLayer } from '../dataContext'
import { companyNotDisclosed } from './format'

export function RolesPage() {
  const data = useDataLayer()
  const [roles, setRoles] = useState<Role[] | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [title, setTitle] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([data.listRoles(), data.listCompanies()]).then(
      ([loadedRoles, loadedCompanies]) => {
        if (cancelled) return
        setRoles(loadedRoles)
        setCompanies(loadedCompanies)
      },
    )
    return () => {
      cancelled = true
    }
  }, [data])

  async function addRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    await data.createRole({ title: trimmed })
    setTitle('')
    setRoles(await data.listRoles())
  }

  return (
    <section aria-labelledby="roles-heading">
      <h2 id="roles-heading">Roles</h2>
      <form className="add-form" onSubmit={addRole}>
        <label htmlFor="role-title">Role title</label>
        <input
          id="role-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          autoComplete="off"
        />
        <button type="submit">Add Role</button>
      </form>
      {roles === null ? null : roles.length === 0 ? (
        <p>No Roles yet. Add the first one above.</p>
      ) : (
        <ul aria-label="Roles" className="item-list">
          {roles.map((role) => (
            <li key={role.id}>
              <Link to={`/roles/${role.id}`}>{role.title}</Link>
              <span className="secondary-text">
                {companies.find((c) => c.id === role.companyId)?.name ??
                  companyNotDisclosed}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
