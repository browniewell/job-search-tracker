import { useId, useState, type FormEvent } from 'react'
import { FlagsInput } from '../components/FlagsInput'
import { FormRow } from '../components/FormRow'
import type { Company, CompanyFields } from '../data/dataLayer'

type FormValues = {
  [K in keyof CompanyFields]: CompanyFields[K] extends string[]
    ? string[]
    : string
}

function toFormValues(company: Company): FormValues {
  const text = (value: string | null) => value ?? ''
  return {
    name: company.name,
    industry: text(company.industry),
    summary: text(company.summary),
    website: text(company.website),
    size: text(company.size),
    flags: company.flags,
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
    flags: values.flags,
    notes: text(values.notes),
  }
}

export function CompanyForm({
  company,
  flagSuggestions,
  onSave,
  onCancel,
}: {
  company: Company
  flagSuggestions: string[]
  onSave: (fields: CompanyFields) => Promise<void>
  onCancel: () => void
}) {
  const [values, setValues] = useState(() => toFormValues(company))
  const [error, setError] = useState<string | null>(null)
  const idPrefix = useId()
  type TextField = Exclude<keyof FormValues, 'flags'>
  const idFor = (field: TextField) => `${idPrefix}-${field}`

  function set<K extends keyof FormValues>(field: K, value: FormValues[K]) {
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
    field: TextField,
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

  const textArea = (field: TextField, label: string) => (
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
      <FlagsInput
        flags={values.flags}
        suggestions={flagSuggestions}
        hint="Dealbreakers, e.g. data monetization. Shown on every Role here."
        onChange={(flags) => set('flags', flags)}
      />
      <div className="form-actions">
        <button type="submit">Save</button>
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
