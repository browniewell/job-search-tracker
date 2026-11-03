import { useEffect, useState } from 'react'
import { AddByNameForm } from '../components/AddByNameForm'
import { BackupReminder } from '../components/BackupReminder'
import { download } from '../components/download'
import type { Company, Role, Status } from '../data/dataLayer'
import { useDataLayer } from '../dataContext'
import { DailyPace } from './DailyPace'
import { RolesTable } from './RolesTable'

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
    // The byte order mark tells spreadsheets the file is UTF-8, so text such
    // as "51–200" survives.
    const csv = await data.exportRolesCsv()
    download('roles.csv', `\uFEFF${csv}`, 'text/csv')
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
          <BackupReminder />
        </>
      )}
    </section>
  )
}
