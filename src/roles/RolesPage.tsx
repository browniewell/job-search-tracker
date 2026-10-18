import { useEffect, useState, type FormEvent } from 'react'
import type { Company, Role, Status } from '../data/dataLayer'
import { useDataLayer } from '../dataContext'
import { RolesTable } from './RolesTable'

export function RolesPage() {
  const data = useDataLayer()
  const [roles, setRoles] = useState<Role[] | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [title, setTitle] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      data.listRoles(),
      data.listCompanies(),
      data.listStatuses(),
    ]).then(([loadedRoles, loadedCompanies, loadedStatuses]) => {
      if (cancelled) return
      setRoles(loadedRoles)
      setCompanies(loadedCompanies)
      setStatuses(loadedStatuses)
    })
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
        <RolesTable roles={roles} companies={companies} statuses={statuses} />
      )}
    </section>
  )
}
