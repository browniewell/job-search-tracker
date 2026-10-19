import { useId, useState, type FormEvent } from 'react'
import type { Role, Status } from '../data/dataLayer'
import { FormRow } from '../components/FormRow'
import { StatusOptions } from '../components/StatusOptions'
import { errorMessage } from '../errorMessage'

export function ChangeStatusForm({
  role,
  statuses,
  onChange,
}: {
  role: Role
  statuses: Status[]
  onChange: (
    statusId: string,
    changes: Pick<Partial<Role>, 'parkedReason'>,
  ) => Promise<void>
}) {
  const [statusId, setStatusId] = useState(role.statusId)
  const [parkedReason, setParkedReason] = useState(role.parkedReason ?? '')
  const [error, setError] = useState<string | null>(null)
  const idPrefix = useId()
  const parking =
    statuses.find((status) => status.id === statusId)?.isParked ?? false

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      await onChange(
        statusId,
        parking ? { parkedReason: parkedReason.trim() || null } : {},
      )
      setError(null)
    } catch (cause) {
      setError(errorMessage(cause))
    }
  }

  return (
    <form
      className="change-status"
      onSubmit={submit}
      aria-label="Change Status"
    >
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <FormRow id={`${idPrefix}-status`} label="Status">
        <select
          id={`${idPrefix}-status`}
          value={statusId}
          onChange={(event) => setStatusId(event.target.value)}
        >
          <StatusOptions statuses={statuses} />
        </select>
      </FormRow>
      {parking && (
        <FormRow id={`${idPrefix}-parked-reason`} label="Parked reason">
          <textarea
            id={`${idPrefix}-parked-reason`}
            rows={2}
            value={parkedReason}
            onChange={(event) => setParkedReason(event.target.value)}
          />
        </FormRow>
      )}
      <div className="form-actions">
        <button type="submit" disabled={statusId === role.statusId}>
          Change Status
        </button>
      </div>
    </form>
  )
}
