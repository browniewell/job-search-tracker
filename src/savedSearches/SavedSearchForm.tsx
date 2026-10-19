import { useEditForm } from '../components/useEditForm'
import type { SavedSearchFields } from '../data/dataLayer'

// Text inputs hold strings; the data layer saves blank ones as null.
type FormValues = { name: string; link: string; site: string }

function toFormValues(search: SavedSearchFields): FormValues {
  return {
    name: search.name,
    link: search.link ?? '',
    site: search.site ?? '',
  }
}

/** Adds a new Saved search, or edits one when given it. */
export function SavedSearchForm({
  search,
  onSave,
  onCancel,
}: {
  search?: SavedSearchFields
  onSave: (fields: SavedSearchFields) => Promise<void>
  onCancel: () => void
}) {
  const { submit, errorMessage, textInput } = useEditForm(
    () => toFormValues(search ?? { name: '', link: null, site: null }),
    onSave,
  )

  return (
    <form
      className="edit-form"
      onSubmit={submit}
      aria-label={search ? `Edit ${search.name}` : 'Add a Saved search'}
    >
      {errorMessage}
      {textInput('name', 'Name', { required: true })}
      {textInput('link', 'Link', { type: 'url' })}
      {textInput('site', 'Site', { hint: 'Such as LinkedIn or Indeed' })}
      <div className="form-actions">
        <button type="submit">Save</button>
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
