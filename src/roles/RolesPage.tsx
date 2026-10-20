import { useEffect, useState } from 'react'
import { AddByNameForm } from '../components/AddByNameForm'
import type { Company, Role, Status } from '../data/dataLayer'
import { useDataLayer } from '../dataContext'
import { DailyPace } from './DailyPace'
import { RolesTable } from './RolesTable'

/**
 * Saves text as a file through the browser's download. The byte order mark
 * tells spreadsheets the file is UTF-8, so text such as "51–200" survives.
 */
function download(fileName: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob(['\uFEFF', text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export function RolesPage() {
  const data = useDataLayer()
  const [roles, setRoles] = useState<Role[] | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])

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

  async function addRole(title: string) {
    await data.createRole({ title })
    setRoles(await data.listRoles())
  }

  async function exportCsv() {
    download('roles.csv', await data.exportRolesCsv(), 'text/csv')
  }

  return (
    <section aria-labelledby="roles-heading">
      <h2 id="roles-heading">Roles</h2>
      <DailyPace />
      <AddByNameForm
        label="Role title"
        buttonLabel="Add Role"
        onAdd={addRole}
      />
      {roles === null ? null : roles.length === 0 ? (
        <p>No Roles yet. Add the first one above.</p>
      ) : (
        <>
          <RolesTable roles={roles} companies={companies} statuses={statuses} />
          <p>
            <button type="button" className="secondary" onClick={exportCsv}>
              Export Roles to CSV
            </button>
          </p>
        </>
      )}
    </section>
  )
}
