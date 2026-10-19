import { CheckboxRow } from '../components/CheckboxRow'
import { useEditForm } from '../components/useEditForm'
import {
  interviewTypes,
  type Contact,
  type InterviewFields,
  type InterviewType,
} from '../data/dataLayer'
import { interviewTypeLabels } from './format'

// Text inputs hold strings, which become null on save when empty; the
// Interviewers and Follow-up sent are held as they are.
type FormValues = {
  at: string
  type: string
  interviewerIds: string[]
  notes: string
  followUpSent: boolean
}

const blankInterview: FormValues = {
  at: '',
  type: '',
  interviewerIds: [],
  notes: '',
  followUpSent: false,
}

function toFormValues(interview: InterviewFields): FormValues {
  return { ...interview, notes: interview.notes ?? '' }
}

function toInterviewFields(values: FormValues): InterviewFields {
  return {
    ...values,
    type: values.type as InterviewType,
    notes: values.notes.trim() || null,
  }
}

/** Logs a new Interview, or edits one when given it. */
export function InterviewForm({
  interview,
  contacts,
  onSave,
  onCancel,
}: {
  interview?: InterviewFields
  contacts: Contact[]
  onSave: (fields: InterviewFields) => Promise<void>
  onCancel: () => void
}) {
  const {
    values,
    set,
    idFor,
    submit,
    errorMessage,
    textInput,
    textArea,
    select,
    checkbox,
  } = useEditForm(
    () => (interview ? toFormValues(interview) : blankInterview),
    (values) => onSave(toInterviewFields(values)),
  )

  function setInterviewer(contactId: string, chosen: boolean) {
    set(
      'interviewerIds',
      chosen
        ? [...values.interviewerIds, contactId]
        : values.interviewerIds.filter((id) => id !== contactId),
    )
  }

  return (
    <form
      className="edit-form"
      onSubmit={submit}
      aria-label={interview ? 'Edit Interview' : 'Log an Interview'}
    >
      {errorMessage}
      <fieldset>
        <legend>Interview</legend>
        {textInput('at', 'Date and time', {
          type: 'datetime-local',
          required: true,
        })}
        {select(
          'type',
          'Interview type',
          'Choose a type',
          interviewTypes.map((type) => [type, interviewTypeLabels[type]]),
        )}
        {textArea('notes', 'Notes')}
        {checkbox('followUpSent', 'Follow-up sent')}
      </fieldset>
      <fieldset>
        <legend>Interviewers</legend>
        {contacts.length === 0 ? (
          <p>No Contacts yet to choose from.</p>
        ) : (
          contacts.map((contact) => (
            <CheckboxRow
              key={contact.id}
              id={`${idFor('interviewerIds')}-${contact.id}`}
              label={contact.name}
              checked={values.interviewerIds.includes(contact.id)}
              onChange={(chosen) => setInterviewer(contact.id, chosen)}
            />
          ))
        )}
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
