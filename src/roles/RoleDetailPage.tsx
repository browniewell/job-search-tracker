import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  parkedStatusName,
  type Company,
  type Role,
  type RoleFields,
  type Status,
  type StatusHistoryEntry,
} from '../data/dataLayer'
import { ConfirmDelete } from '../components/ConfirmDelete'
import { useDataLayer } from '../dataContext'
import { ChangeStatusForm } from './ChangeStatusForm'
import { RoleFieldsView } from './RoleFieldsView'
import { RoleForm } from './RoleForm'
import { StatusTimeline } from './StatusTimeline'

type Loaded = {
  role: Role | undefined
  statuses: Status[]
  companies: Company[]
  history: StatusHistoryEntry[]
}
type Mode = 'view' | 'edit' | 'confirm-delete'

export function RoleDetailPage() {
  const data = useDataLayer()
  const navigate = useNavigate()
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
    ]).then(([role, statuses, companies, history]) => {
      if (!cancelled) setLoaded({ role, statuses, companies, history })
    })
    return () => {
      cancelled = true
    }
  }, [data, roleId])

  if (loaded === null) return null
  const { role, statuses, companies, history } = loaded
  const backLink = <Link to="/">← All Roles</Link>
  if (!role) {
    return (
      <section>
        {backLink}
        <h2>Role not found</h2>
        <p>It may have been deleted.</p>
      </section>
    )
  }
  const statusName =
    statuses.find((status) => status.id === role.statusId)?.name ?? 'Unknown'

  async function save(fields: RoleFields) {
    const updated = await data.updateRole(roleId, fields)
    setLoaded({ role: updated, statuses, companies, history })
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
    })
  }

  async function deleteRole() {
    await data.deleteRole(roleId)
    navigate('/')
  }

  return (
    <article aria-labelledby="role-heading">
      {backLink}
      <h2 id="role-heading">{role.title}</h2>
      {mode === 'edit' ? (
        <RoleForm
          role={role}
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
              Delete Role
            </button>
          </div>
          {mode === 'confirm-delete' && (
            <ConfirmDelete
              heading="Delete this Role?"
              onConfirm={deleteRole}
              onCancel={() => setMode('view')}
            >
              “{role.title}” and its Status history will be deleted. This can’t
              be undone.
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
            company={companies.find((c) => c.id === role.companyId)}
            statusName={statusName}
            parked={statusName === parkedStatusName}
          />
          <StatusTimeline entries={history} />
        </>
      )}
    </article>
  )
}
