import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import type { Role, RoleFields, Status } from '../data/dataLayer'
import { useDataLayer } from '../dataContext'
import { RoleFieldsView } from './RoleFieldsView'
import { RoleForm } from './RoleForm'

type Loaded = { role: Role | undefined; statuses: Status[] }
type Mode = 'view' | 'edit' | 'confirm-delete'

export function RoleDetailPage() {
  const data = useDataLayer()
  const navigate = useNavigate()
  const { roleId = '' } = useParams()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [mode, setMode] = useState<Mode>('view')

  useEffect(() => {
    let cancelled = false
    Promise.all([data.getRole(roleId), data.listStatuses()]).then(
      ([role, statuses]) => {
        if (!cancelled) setLoaded({ role, statuses })
      },
    )
    return () => {
      cancelled = true
    }
  }, [data, roleId])

  if (loaded === null) return null
  const { role, statuses } = loaded
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
    setLoaded({ role: updated, statuses })
    setMode('view')
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
        <RoleForm role={role} onSave={save} onCancel={() => setMode('view')} />
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
              title={role.title}
              onConfirm={deleteRole}
              onCancel={() => setMode('view')}
            />
          )}
          <RoleFieldsView role={role} statusName={statusName} />
        </>
      )}
    </article>
  )
}

function ConfirmDelete({
  title,
  onConfirm,
  onCancel,
}: {
  title: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  // Focus the safe choice so Enter doesn't delete by accident.
  useEffect(() => cancelRef.current?.focus(), [])

  return (
    <div
      role="alertdialog"
      aria-labelledby="confirm-delete-heading"
      aria-describedby="confirm-delete-description"
      className="confirm"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onCancel()
      }}
    >
      <h3 id="confirm-delete-heading">Delete this Role?</h3>
      <p id="confirm-delete-description">
        “{title}” and its Status history will be deleted. This can’t be undone.
      </p>
      <div className="form-actions">
        <button type="button" className="danger" onClick={onConfirm}>
          Delete
        </button>
        <button
          type="button"
          className="secondary"
          ref={cancelRef}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
