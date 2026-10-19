import { FlagsInput } from '../components/FlagsInput'
import { useEditForm } from '../components/useEditForm'
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
  const { values, set, submit, errorMessage, textInput, textArea } =
    useEditForm(
      () => toFormValues(company),
      (values) => onSave(toCompanyFields(values)),
    )

  return (
    <form className="edit-form" onSubmit={submit} aria-label="Edit Company">
      {errorMessage}
      <fieldset>
        <legend>Company</legend>
        {textInput('name', 'Company name', { required: true })}
        {textInput('industry', 'Industry')}
        {textArea('summary', 'Summary')}
        {textInput('website', 'Website', { type: 'url' })}
        {textInput('size', 'Company size', {
          hint: 'e.g. 51–200 (143 on LinkedIn)',
        })}
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
