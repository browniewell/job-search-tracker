import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import {
  flagsShownOnRole,
  type Company,
  type Role,
  type RoleFields,
  type Status,
  type StatusHistoryEntry,
} from '../data/dataLayer'
import { ConfirmDelete } from '../components/ConfirmDelete'
import { FlagBadge } from '../components/FlagBadge'
import { useDataLayer } from '../dataContext'
import { ChangeStatusForm } from './ChangeStatusForm'
import { RoleContacts } from './RoleContacts'
import { RoleFieldsView } from './RoleFieldsView'
import { RoleInterviews } from './RoleInterviews'
import { RoleForm } from './RoleForm'
import { StatusTimeline } from './StatusTimeline'
import { rolesListPath } from './rolesListLocation'

type Loaded = {
  role: Role | undefined
  statuses: Status[]
  companies: Company[]
  history: StatusHistoryEntry[]
  flagSuggestions: string[]
}
type Mode = 'view' | 'edit' | 'confirm-delete'

export function RoleDetailPage() {
  const data = useDataLayer()
  const navigate = useNavigate()
  const rolesList = rolesListPath(useLocation().state)
  const { roleId = '' } = useParams()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [mode, setMode] = useState<Mode>('view')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      data.getRole(roleId),
      data.listStatuses(),
      data.listCompanies(),
      data.getStatusHistory(roleId),
      data.listFlagSuggestions(),
    ]).then(([role, statuses, companies, history, flagSuggestions]) => {
      if (!cancelled) {
        setLoaded({ role, statuses, companies, history, flagSuggestions })
      }
    })
    return () => {
      cancelled = true
    }
  }, [data, roleId])

  if (loaded === null) return null
  const { role, statuses, companies, history, flagSuggestions } = loaded
  const backLink = <Link to={rolesList}>← All Roles</Link>
  if (!role) {
    return (
      <section>
        {backLink}
        <h2>Role not found</h2>
        <p>It may have been deleted.</p>
      </section>
    )
  }
  const status = statuses.find((s) => s.id === role.statusId)
  const statusName = status?.name ?? 'Unknown'
  const company = companies.find((c) => c.id === role.companyId)

  async function save(fields: RoleFields) {
    const updated = await data.updateRole(roleId, fields)
    setLoaded({
      role: updated,
      statuses,
      companies,
      history,
      flagSuggestions: await data.listFlagSuggestions(),
    })
    setMode('view')
  }

  async function changeStatus(
    statusId: string,
    changes: Pick<Partial<Role>, 'parkedReason'>,
  ) {
    const updated = await data.changeStatus(roleId, statusId, changes)
    setLoaded({
      role: updated,
      statuses,
      companies,
      history: await data.getStatusHistory(roleId),
      flagSuggestions,
    })
  }

  async function deleteRole() {
    await data.deleteRole(roleId)
    navigate(rolesList)
  }

  return (
    <article aria-labelledby="role-heading">
      {backLink}
      <h2 id="role-heading">{role.title}</h2>
      <FlagBadge flags={flagsShownOnRole(role, company)} />
      {mode === 'edit' ? (
        <RoleForm
          role={role}
          companies={companies}
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
              onClick={() => setMode('confirm-delete')}
            >
              Delete Role
            </button>
          </div>
          {mode === 'confirm-delete' && (
            <ConfirmDelete
              heading="Delete this Role?"
              onConfirm={deleteRole}
              onCancel={() => setMode('view')}
            >
              “{role.title}”, its Status history, Role contacts and Interviews
              will be deleted. Its Contacts are kept. This can’t be undone.
            </ConfirmDelete>
          )}
          <ChangeStatusForm
            key={role.statusId}
            role={role}
            statuses={statuses}
            onChange={changeStatus}
          />
          <RoleFieldsView
            role={role}
            company={company}
            statusName={statusName}
            parked={status?.isParked ?? false}
          />
          <RoleContacts roleId={roleId} />
          <RoleInterviews roleId={roleId} />
          <StatusTimeline entries={history} />
        </>
      )}
    </article>
  )
}
