import type {
  Company,
  FitRating,
  Role,
  RoleFields,
  SalaryPeriod,
  WorkArrangement,
} from '../data/dataLayer'
import { FlagsInput } from '../components/FlagsInput'
import { useEditForm } from '../components/useEditForm'
import {
  companyNotDisclosed,
  salaryPeriodLabels,
  workArrangementLabels,
} from './format'

// Text inputs hold strings, which become null on save when empty; booleans
// and Flags are held as they are.
type FormValues = {
  [K in keyof RoleFields]: RoleFields[K] extends boolean | string[]
    ? RoleFields[K]
    : string
}

function toFormValues(role: Role): FormValues {
  const text = (value: string | number | null) =>
    value === null ? '' : String(value)
  return {
    title: role.title,
    companyId: text(role.companyId),
    location: text(role.location),
    workArrangement: text(role.workArrangement),
    salaryMin: text(role.salaryMin),
    salaryMax: text(role.salaryMax),
    salaryPeriod: text(role.salaryPeriod),
    salaryNote: text(role.salaryNote),
    expectedSalary: text(role.expectedSalary),
    minimumSalary: text(role.minimumSalary),
    roleSummary: text(role.roleSummary),
    postingLink: text(role.postingLink),
    hiringSiteLink: text(role.hiringSiteLink),
    postingDate: text(role.postingDate),
    postingCopy: text(role.postingCopy),
    fitNotes: text(role.fitNotes),
    fitRating: text(role.fitRating),
    referralSubmitted: role.referralSubmitted,
    flags: role.flags,
    nextAction: text(role.nextAction),
    nextActionDate: text(role.nextActionDate),
    parkedReason: text(role.parkedReason),
    notes: text(role.notes),
  }
}

function toRoleFields(values: FormValues): RoleFields {
  const text = (value: string) => value.trim() || null
  const number = (value: string) => (value.trim() === '' ? null : Number(value))
  return {
    title: values.title,
    companyId: text(values.companyId),
    location: text(values.location),
    workArrangement: text(values.workArrangement) as WorkArrangement | null,
    salaryMin: number(values.salaryMin),
    salaryMax: number(values.salaryMax),
    salaryPeriod: text(values.salaryPeriod) as SalaryPeriod | null,
    salaryNote: text(values.salaryNote),
    expectedSalary: number(values.expectedSalary),
    minimumSalary: number(values.minimumSalary),
    roleSummary: text(values.roleSummary),
    postingLink: text(values.postingLink),
    hiringSiteLink: text(values.hiringSiteLink),
    postingDate: text(values.postingDate),
    // Kept exactly as pasted; only an all-blank copy counts as empty.
    postingCopy: values.postingCopy.trim() ? values.postingCopy : null,
    fitNotes: text(values.fitNotes),
    fitRating: number(values.fitRating) as FitRating | null,
    referralSubmitted: values.referralSubmitted,
    flags: values.flags,
    nextAction: text(values.nextAction),
    nextActionDate: text(values.nextActionDate),
    parkedReason: text(values.parkedReason),
    notes: text(values.notes),
  }
}

export function RoleForm({
  role,
  companies,
  flagSuggestions,
  onSave,
  onCancel,
}: {
  role: Role
  companies: Company[]
  flagSuggestions: string[]
  onSave: (fields: RoleFields) => Promise<void>
  onCancel: () => void
}) {
  const {
    values,
    set,
    submit,
    errorMessage,
    textInput,
    textArea,
    select,
    checkbox,
  } = useEditForm(
    () => toFormValues(role),
    (values) => onSave(toRoleFields(values)),
  )

  return (
    <form className="edit-form" onSubmit={submit} aria-label="Edit Role">
      {errorMessage}
      <fieldset>
        <legend>Overview</legend>
        {textInput('title', 'Role title', { required: true })}
        {select(
          'companyId',
          'Company',
          companyNotDisclosed,
          companies.map((company) => [company.id, company.name]),
        )}
        {textInput('location', 'Location')}
        {select(
          'workArrangement',
          'Work arrangement',
          'Not set',
          Object.entries(workArrangementLabels),
        )}
        {textArea('roleSummary', 'Role summary')}
        {textArea('parkedReason', 'Parked reason')}
      </fieldset>
      <fieldset>
        <legend>Pay (USD)</legend>
        {textInput('salaryMin', 'Posted salary minimum', { type: 'number' })}
        {textInput('salaryMax', 'Posted salary maximum', { type: 'number' })}
        {select(
          'salaryPeriod',
          'Salary period',
          'Not set',
          Object.entries(salaryPeriodLabels),
        )}
        {textInput('salaryNote', 'Salary note', { hint: 'e.g. OTE, + equity' })}
        {textInput('expectedSalary', 'Expected salary', {
          type: 'number',
          hint: 'Per year, even for an hourly Role.',
        })}
        {textInput('minimumSalary', 'Minimum salary', {
          type: 'number',
          hint: 'Per year. Private: never exported to CSV.',
        })}
      </fieldset>
      <fieldset>
        <legend>Posting</legend>
        {textInput('postingLink', 'Posting link', { type: 'url' })}
        {textInput('hiringSiteLink', 'Hiring site link', { type: 'url' })}
        {textInput('postingDate', 'Posting date', { type: 'date' })}
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
        {checkbox('referralSubmitted', 'Referral submitted')}
      </fieldset>
      <FlagsInput
        flags={values.flags}
        suggestions={flagSuggestions}
        hint="Process concerns, e.g. Workday portal."
        onChange={(flags) => set('flags', flags)}
      />
      <fieldset>
        <legend>Next action</legend>
        {textInput('nextAction', 'Next action')}
        {textInput('nextActionDate', 'Next action date', { type: 'date' })}
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
