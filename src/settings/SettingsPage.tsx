import { useEffect, useState } from 'react'
import { AddByNameForm } from '../components/AddByNameForm'
import { ConfirmDelete } from '../components/ConfirmDelete'
import { FormRow } from '../components/FormRow'
import { StatusOptions } from '../components/StatusOptions'
import {
  appliedStatusDeleteMessage,
  statusHasRolesMessage,
  type Role,
  type Status,
} from '../data/dataLayer'
import { useDataLayer } from '../dataContext'
import { errorMessage } from '../errorMessage'

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

function DailyTargetForm({ saved }: { saved: number }) {
  const data = useDataLayer()
  const [target, setTarget] = useState(String(saved))
  const [error, setError] = useState<string | null>(null)
  return (
    <section aria-labelledby="daily-target-heading">
      <h3 id="daily-target-heading">Daily target</h3>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <form
        onSubmit={async (event) => {
          event.preventDefault()
          try {
            await data.setDailyTarget(Number(target))
            setError(null)
          } catch (cause) {
            setError(errorMessage(cause))
          }
        }}
      >
        <FormRow
          id="daily-target"
          label="Daily target"
          hint="How many Applications you aim to make per day."
        >
          <input
            id="daily-target"
            type="number"
            inputMode="numeric"
            aria-describedby="daily-target-hint"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
          />
        </FormRow>
        <div className="form-actions">
          <button type="submit">Save Daily target</button>
        </div>
      </form>
    </section>
  )
}

export function SettingsPage() {
  const data = useDataLayer()
  const [statuses, setStatuses] = useState<Status[] | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [dailyTarget, setDailyTarget] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      data.listStatuses(),
      data.listRoles(),
      data.getDailyTarget(),
    ]).then(([loadedStatuses, loadedRoles, loadedDailyTarget]) => {
      if (!cancelled) {
        setStatuses(loadedStatuses)
        setRoles(loadedRoles)
        setDailyTarget(loadedDailyTarget)
      }
    })
    return () => {
      cancelled = true
    }
  }, [data])

  if (statuses === null || dailyTarget === null) return null

  // Every change shows the data layer's own message if it is refused, then
  // the Statuses as they are now saved. Resolves to whether it was made.
  async function saveAndReload(
    operation: () => Promise<unknown>,
  ): Promise<boolean> {
    let made = true
    try {
      await operation()
      setError(null)
    } catch (cause) {
      setError(errorMessage(cause))
      made = false
    }
    setStatuses(await data.listStatuses())
    return made
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
    await saveAndReload(() => data.deleteStatus(id))
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
                saveAndReload(() => data.setAppliedStatus(event.target.value))
              }
            >
              <StatusOptions statuses={statuses} />
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
                saveAndReload(() =>
                  data.setParkedStatus(
                    event.target.value === noParkedStatus
                      ? null
                      : event.target.value,
                  ),
                )
              }
            >
              <option value={noParkedStatus}>None</option>
              <StatusOptions statuses={statuses} />
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
                    saveAndReload(() =>
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
                    saveAndReload(() => data.moveStatus(status.id, index - 1))
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
                    saveAndReload(() => data.moveStatus(status.id, index + 1))
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
                      await saveAndReload(() =>
                        data.updateStatus(status.id, { name }),
                      )
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
        <AddByNameForm
          label="New Status name"
          buttonLabel="Add Status"
          onAdd={(name) => saveAndReload(() => data.createStatus({ name }))}
        />
      </section>
      <DailyTargetForm saved={dailyTarget} />
    </section>
  )
}
