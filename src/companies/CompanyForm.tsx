import { useId, useState, type FormEvent } from 'react'
import { FormRow } from '../components/FormRow'
import type { Company, CompanyFields } from '../data/dataLayer'

type FormValues = Record<keyof CompanyFields, string>

function toFormValues(company: Company): FormValues {
  const text = (value: string | null) => value ?? ''
  return {
    name: company.name,
    industry: text(company.industry),
    summary: text(company.summary),
    website: text(company.website),
    size: text(company.size),
    notes: text(company.notes),
  }
}

function toCompanyFields(values: FormValues): CompanyFields {
  const text = (value: string) => value.trim() || null
  return {
    name: values.name,
    industry: text(values.industry),
    summary: text(values.summary),
    website: text(values.website),
    size: text(values.size),
    notes: text(values.notes),
  }
}

export function CompanyForm({
  company,
  onSave,
  onCancel,
}: {
  company: Company
  onSave: (fields: CompanyFields) => Promise<void>
  onCancel: () => void
}) {
  const [values, setValues] = useState(() => toFormValues(company))
  const [error, setError] = useState<string | null>(null)
  const idPrefix = useId()
  const idFor = (field: keyof FormValues) => `${idPrefix}-${field}`

  function set(field: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      await onSave(toCompanyFields(values))
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
    <FormRow id={idFor(field)} label={label} hint={hint}>
      <input
        id={idFor(field)}
        type={type}
        required={field === 'name'}
        value={values[field]}
        onChange={(event) => set(field, event.target.value)}
        aria-describedby={hint && `${idFor(field)}-hint`}
      />
    </FormRow>
  )

  const textArea = (field: keyof FormValues, label: string) => (
    <FormRow id={idFor(field)} label={label}>
      <textarea
        id={idFor(field)}
        rows={4}
        value={values[field]}
        onChange={(event) => set(field, event.target.value)}
      />
    </FormRow>
  )

  return (
    <form className="edit-form" onSubmit={submit} aria-label="Edit Company">
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <fieldset>
        <legend>Company</legend>
        {textInput('name', 'Company name')}
        {textInput('industry', 'Industry')}
        {textArea('summary', 'Summary')}
        {textInput('website', 'Website', 'url')}
        {textInput(
          'size',
          'Company size',
          'text',
          'e.g. 51–200 (143 on LinkedIn)',
        )}
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
