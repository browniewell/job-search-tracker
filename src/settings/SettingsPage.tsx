import { useEffect, useState, type FormEvent } from 'react'
import { ConfirmDelete } from '../components/ConfirmDelete'
import { FormRow } from '../components/FormRow'
import {
  appliedStatusDeleteMessage,
  statusHasRolesMessage,
  type Role,
  type Status,
} from '../data/dataLayer'
import { useDataLayer } from '../dataContext'

const noParkedStatus = ''

function RenameStatusForm({
  status,
  onSave,
  onCancel,
}: {
  status: Status
  onSave: (name: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(status.name)
  return (
    <form
      className="rename-status"
      aria-label={`Rename ${status.name}`}
      onSubmit={(event) => {
        event.preventDefault()
        onSave(name)
      }}
    >
      <FormRow id="rename-status-name" label="Status name">
        <input
          id="rename-status-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="off"
        />
      </FormRow>
      <div className="form-actions">
        <button type="submit">Save</button>
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}

export function SettingsPage() {
  const data = useDataLayer()
  const [statuses, setStatuses] = useState<Status[] | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([data.listStatuses(), data.listRoles()]).then(
      ([loadedStatuses, loadedRoles]) => {
        if (!cancelled) {
          setStatuses(loadedStatuses)
          setRoles(loadedRoles)
        }
      },
    )
    return () => {
      cancelled = true
    }
  }, [data])

  if (statuses === null) return null

  // Every change shows the data layer's own message if it is refused, then
  // the Statuses as they are now saved. Resolves to whether it was made.
  async function change(operation: () => Promise<unknown>): Promise<boolean> {
    let made = true
    try {
      await operation()
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      made = false
    }
    setStatuses(await data.listStatuses())
    return made
  }

  async function addStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (await change(() => data.createStatus({ name: newName }))) {
      setNewName('')
    }
  }

  // Explains up front why a Status can't be deleted, as the data layer would.
  function startDelete(status: Status) {
    const roleCount = roles.filter((role) => role.statusId === status.id).length
    if (status.isApplied) {
      setError(appliedStatusDeleteMessage(status.name))
    } else if (roleCount > 0) {
      setError(statusHasRolesMessage(status.name, roleCount))
    } else {
      setError(null)
      setDeletingId(status.id)
    }
  }

  async function deleteStatus(id: string) {
    await change(() => data.deleteStatus(id))
    setDeletingId(null)
  }

  const applied = statuses.find((status) => status.isApplied)
  const parked = statuses.find((status) => status.isParked)

  return (
    <section aria-labelledby="settings-heading">
      <h2 id="settings-heading">Settings</h2>
      <section aria-labelledby="statuses-heading">
        <h3 id="statuses-heading">Statuses</h3>
        <p className="hint">
          New Roles start in the first Status. Closed statuses end a pursuit and
          are hidden from the Pipeline board unless asked for.
        </p>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="status-choices">
          <FormRow
            id="applied-status"
            label="Applied status"
            hint="Moving a Role here for the first time is an Application."
          >
            <select
              id="applied-status"
              aria-describedby="applied-status-hint"
              value={applied?.id}
              onChange={(event) =>
                change(() => data.setAppliedStatus(event.target.value))
              }
            >
              {statuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </select>
          </FormRow>
          <FormRow
            id="parked-status"
            label="Parked status"
            hint="Roles moved here can be given a Parked reason."
          >
            <select
              id="parked-status"
              aria-describedby="parked-status-hint"
              value={parked?.id ?? noParkedStatus}
              onChange={(event) =>
                change(() =>
                  data.setParkedStatus(
                    event.target.value === noParkedStatus
                      ? null
                      : event.target.value,
                  ),
                )
              }
            >
              <option value={noParkedStatus}>None</option>
              {statuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </select>
          </FormRow>
        </div>
        <ol aria-label="Statuses" className="item-list status-list">
          {statuses.map((status, index) => (
            <li key={status.id}>
              <h4>{status.name}</h4>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={status.closed}
                  aria-label={`${status.name} is Closed`}
                  onChange={(event) =>
                    change(() =>
                      data.updateStatus(status.id, {
                        closed: event.target.checked,
                      }),
                    )
                  }
                />
                Closed
              </label>
              <div className="status-actions">
                <button
                  type="button"
                  className="secondary"
                  aria-label={`Move ${status.name} up`}
                  disabled={index === 0}
                  onClick={() =>
                    change(() => data.moveStatus(status.id, index - 1))
                  }
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="secondary"
                  aria-label={`Move ${status.name} down`}
                  disabled={index === statuses.length - 1}
                  onClick={() =>
                    change(() => data.moveStatus(status.id, index + 1))
                  }
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="secondary"
                  aria-label={`Rename ${status.name}`}
                  onClick={() => setRenamingId(status.id)}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className="danger"
                  aria-label={`Delete ${status.name}`}
                  onClick={() => startDelete(status)}
                >
                  Delete
                </button>
              </div>
              {deletingId === status.id && (
                <ConfirmDelete
                  heading="Delete this Status?"
                  onConfirm={() => deleteStatus(status.id)}
                  onCancel={() => setDeletingId(null)}
                >
                  “{status.name}” will be deleted. Status history keeps its
                  name.
                </ConfirmDelete>
              )}
              {renamingId === status.id && (
                <RenameStatusForm
                  status={status}
                  onSave={async (name) => {
                    if (
                      await change(() => data.updateStatus(status.id, { name }))
                    ) {
                      setRenamingId(null)
                    }
                  }}
                  onCancel={() => setRenamingId(null)}
                />
              )}
            </li>
          ))}
        </ol>
        <form className="add-form" onSubmit={addStatus}>
          <label htmlFor="new-status-name">New Status name</label>
          <input
            id="new-status-name"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            autoComplete="off"
          />
          <button type="submit">Add Status</button>
        </form>
      </section>
    </section>
  )
}
