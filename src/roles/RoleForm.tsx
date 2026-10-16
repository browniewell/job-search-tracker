import { useId, useState, type FormEvent, type ReactNode } from 'react'
import type {
  FitRating,
  Role,
  RoleFields,
  SalaryPeriod,
  WorkArrangement,
} from '../data/dataLayer'
import { salaryPeriodLabels, workArrangementLabels } from './format'

// Form inputs hold strings; empty strings become null on save.
type FormValues = {
  [K in keyof RoleFields]: RoleFields[K] extends boolean ? boolean : string
}

function toFormValues(role: Role): FormValues {
  const text = (value: string | number | null) =>
    value === null ? '' : String(value)
  return {
    title: role.title,
    location: text(role.location),
    workArrangement: text(role.workArrangement),
    salaryMin: text(role.salaryMin),
    salaryMax: text(role.salaryMax),
    salaryPeriod: text(role.salaryPeriod),
    salaryNote: text(role.salaryNote),
    expectedSalary: text(role.expectedSalary),
    minimumSalary: text(role.minimumSalary),
    jobSummary: text(role.jobSummary),
    postingLink: text(role.postingLink),
    hiringSiteLink: text(role.hiringSiteLink),
    postingDate: text(role.postingDate),
    postingCopy: text(role.postingCopy),
    fitNotes: text(role.fitNotes),
    fitRating: text(role.fitRating),
    referralSubmitted: role.referralSubmitted,
    nextAction: text(role.nextAction),
    nextActionDate: text(role.nextActionDate),
    notes: text(role.notes),
  }
}

function toRoleFields(values: FormValues): RoleFields {
  const text = (value: string) => value.trim() || null
  const number = (value: string) => (value.trim() === '' ? null : Number(value))
  return {
    title: values.title,
    location: text(values.location),
    workArrangement: text(values.workArrangement) as WorkArrangement | null,
    salaryMin: number(values.salaryMin),
    salaryMax: number(values.salaryMax),
    salaryPeriod: text(values.salaryPeriod) as SalaryPeriod | null,
    salaryNote: text(values.salaryNote),
    expectedSalary: number(values.expectedSalary),
    minimumSalary: number(values.minimumSalary),
    jobSummary: text(values.jobSummary),
    postingLink: text(values.postingLink),
    hiringSiteLink: text(values.hiringSiteLink),
    postingDate: text(values.postingDate),
    // Kept exactly as pasted; only an all-blank copy counts as empty.
    postingCopy: values.postingCopy.trim() ? values.postingCopy : null,
    fitNotes: text(values.fitNotes),
    fitRating: number(values.fitRating) as FitRating | null,
    referralSubmitted: values.referralSubmitted,
    nextAction: text(values.nextAction),
    nextActionDate: text(values.nextActionDate),
    notes: text(values.notes),
  }
}

function Row({
  id,
  label,
  hint,
  children,
}: {
  id: string
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="form-row">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && (
        <span id={`${id}-hint`} className="hint">
          {hint}
        </span>
      )}
    </div>
  )
}

export function RoleForm({
  role,
  onSave,
  onCancel,
}: {
  role: Role
  onSave: (fields: RoleFields) => Promise<void>
  onCancel: () => void
}) {
  const [values, setValues] = useState(() => toFormValues(role))
  const [error, setError] = useState<string | null>(null)
  const idPrefix = useId()

  const idFor = (field: keyof FormValues) => `${idPrefix}-${field}`

  function set<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      await onSave(toRoleFields(values))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  const textInput = (
    field: keyof FormValues,
    label: string,
    type = 'text',
    hint?: string,
  ) => (
    <Row id={idFor(field)} label={label} hint={hint}>
      <input
        id={idFor(field)}
        type={type}
        value={values[field] as string}
        onChange={(event) => set(field, event.target.value)}
        aria-describedby={hint && `${idFor(field)}-hint`}
        {...(type === 'number' ? { min: 0, step: 'any' } : {})}
      />
    </Row>
  )

  const textArea = (field: keyof FormValues, label: string) => (
    <Row id={idFor(field)} label={label}>
      <textarea
        id={idFor(field)}
        rows={4}
        value={values[field] as string}
        onChange={(event) => set(field, event.target.value)}
      />
    </Row>
  )

  const select = (
    field: keyof FormValues,
    label: string,
    emptyLabel: string,
    options: Array<[value: string, label: string]>,
  ) => (
    <Row id={idFor(field)} label={label}>
      <select
        id={idFor(field)}
        value={values[field] as string}
        onChange={(event) => set(field, event.target.value)}
      >
        <option value="">{emptyLabel}</option>
        {options.map(([value, optionLabel]) => (
          <option key={value} value={value}>
            {optionLabel}
          </option>
        ))}
      </select>
    </Row>
  )

  return (
    <form className="role-form" onSubmit={submit} aria-label="Edit Role">
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <fieldset>
        <legend>Overview</legend>
        <Row id={idFor('title')} label="Title">
          <input
            id={idFor('title')}
            required
            value={values.title}
            onChange={(event) => set('title', event.target.value)}
          />
        </Row>
        {textInput('location', 'Location')}
        {select(
          'workArrangement',
          'Work arrangement',
          'Not set',
          Object.entries(workArrangementLabels),
        )}
        {textArea('jobSummary', 'Job summary')}
      </fieldset>
      <fieldset>
        <legend>Pay (USD)</legend>
        {textInput('salaryMin', 'Posted salary minimum', 'number')}
        {textInput('salaryMax', 'Posted salary maximum', 'number')}
        {select(
          'salaryPeriod',
          'Salary period',
          'Not set',
          Object.entries(salaryPeriodLabels),
        )}
        {textInput('salaryNote', 'Salary note', 'text', 'e.g. OTE, + equity')}
        {textInput('expectedSalary', 'Expected salary', 'number')}
        {textInput(
          'minimumSalary',
          'Minimum salary',
          'number',
          'Private: never exported to CSV.',
        )}
      </fieldset>
      <fieldset>
        <legend>Posting</legend>
        {textInput('postingLink', 'Posting link', 'url')}
        {textInput('hiringSiteLink', 'Hiring site link', 'url')}
        {textInput('postingDate', 'Posting date', 'date')}
        {textArea('postingCopy', 'Posting copy')}
      </fieldset>
      <fieldset>
        <legend>Fit</legend>
        {select('fitRating', 'Fit rating', 'Not rated', [
          ['1', '1'],
          ['2', '2'],
          ['3', '3'],
          ['4', '4'],
          ['5', '5'],
        ])}
        {textArea('fitNotes', 'Fit notes')}
        <div className="form-row checkbox-row">
          <input
            id={idFor('referralSubmitted')}
            type="checkbox"
            checked={values.referralSubmitted}
            onChange={(event) => set('referralSubmitted', event.target.checked)}
          />
          <label htmlFor={idFor('referralSubmitted')}>Referral submitted</label>
        </div>
      </fieldset>
      <fieldset>
        <legend>Next action</legend>
        {textInput('nextAction', 'Next action')}
        {textInput('nextActionDate', 'Next action date', 'date')}
      </fieldset>
      <fieldset>
        <legend>Notes</legend>
        {textArea('notes', 'Notes')}
      </fieldset>
      <div className="form-actions">
        <button type="submit">Save</button>
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
