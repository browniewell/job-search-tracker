import { useEditForm } from '../components/useEditForm'
import type { Company, Contact, ContactFields } from '../data/dataLayer'

type FormValues = Record<keyof ContactFields, string>

function toFormValues(contact: Contact): FormValues {
  const text = (value: string | null) => value ?? ''
  return {
    name: contact.name,
    title: text(contact.title),
    companyId: text(contact.companyId),
    howYouKnow: text(contact.howYouKnow),
    email: text(contact.email),
    linkedIn: text(contact.linkedIn),
    notes: text(contact.notes),
  }
}

function toContactFields(values: FormValues): ContactFields {
  const text = (value: string) => value.trim() || null
  return {
    name: values.name,
    title: text(values.title),
    companyId: text(values.companyId),
    howYouKnow: text(values.howYouKnow),
    email: text(values.email),
    linkedIn: text(values.linkedIn),
    notes: text(values.notes),
  }
}

export function ContactForm({
  contact,
  companies,
  onSave,
  onCancel,
}: {
  contact: Contact
  companies: Company[]
  onSave: (fields: ContactFields) => Promise<void>
  onCancel: () => void
}) {
  const { submit, errorMessage, textInput, textArea, select } = useEditForm(
    () => toFormValues(contact),
    (values) => onSave(toContactFields(values)),
  )

  return (
    <form className="edit-form" onSubmit={submit} aria-label="Edit Contact">
      {errorMessage}
      <fieldset>
        <legend>Contact</legend>
        {textInput('name', 'Contact name', { required: true })}
        {textInput('title', 'Title', {
          hint: 'Their job title, e.g. Senior Technical Recruiter',
        })}
        {select(
          'companyId',
          'Company',
          'No Company',
          companies.map((company) => [company.id, company.name]),
        )}
        {textArea('howYouKnow', 'How you know them')}
        {textInput('email', 'Email', { type: 'email' })}
        {textInput('linkedIn', 'LinkedIn', { type: 'url' })}
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
