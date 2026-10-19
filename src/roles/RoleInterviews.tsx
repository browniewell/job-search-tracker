import { useEffect, useId, useState } from 'react'
import { ConfirmDelete } from '../components/ConfirmDelete'
import { ContactLink, ContactName } from '../components/ContactName'
import { MultilineText } from '../components/Fields'
import type {
  Contact,
  InterviewFields,
  ListedInterview,
} from '../data/dataLayer'
import { useDataLayer } from '../dataContext'
import { InterviewForm } from './InterviewForm'
import { formatLocalDateTime, interviewTypeLabels } from './format'

type Loaded = {
  interviews: ListedInterview[]
  interviewers: Contact[]
  contacts: Contact[]
}

type Mode =
  | { kind: 'view' }
  | { kind: 'log' }
  | { kind: 'edit'; id: string }
  | { kind: 'confirm-delete'; id: string }

/** How an Interview is named: its type, then when it is. */
function interviewName(interview: InterviewFields): string {
  return `${interviewTypeLabels[interview.type]} · ${formatLocalDateTime(interview.at)}`
}

/**
 * A Role's Interviews, with forms to log, edit and delete them, and the
 * Interviewers they name.
 */
export function RoleInterviews({ roleId }: { roleId: string }) {
  const data = useDataLayer()
  const id = useId()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [mode, setMode] = useState<Mode>({ kind: 'view' })

  useEffect(() => {
    let cancelled = false
    Promise.all([
      data.listInterviews(roleId),
      data.listInterviewers(roleId),
      data.listContacts(),
    ]).then(([interviews, interviewers, contacts]) => {
      if (!cancelled) setLoaded({ interviews, interviewers, contacts })
    })
    return () => {
      cancelled = true
    }
  }, [data, roleId])

  if (loaded === null) return null
  const { interviews, interviewers, contacts } = loaded

  async function reload() {
    setLoaded({
      interviews: await data.listInterviews(roleId),
      interviewers: await data.listInterviewers(roleId),
      contacts,
    })
    setMode({ kind: 'view' })
  }

  async function log(fields: InterviewFields) {
    await data.createInterview({ roleId, ...fields })
    await reload()
  }

  async function edit(interviewId: string, fields: InterviewFields) {
    await data.updateInterview(interviewId, fields)
    await reload()
  }

  async function remove(interviewId: string) {
    await data.deleteInterview(interviewId)
    await reload()
  }

  const cancel = () => setMode({ kind: 'view' })

  return (
    <>
      <section aria-labelledby={`${id}-heading`} className="role-interviews">
        <h3 id={`${id}-heading`}>Interviews</h3>
        {interviews.length === 0 ? (
          <p>No Interviews logged yet.</p>
        ) : (
          <ol aria-label="Interviews" className="item-list">
            {interviews.map((interview) =>
              mode.kind === 'edit' && mode.id === interview.id ? (
                <li key={interview.id} className="stacked">
                  <InterviewForm
                    interview={interview}
                    contacts={contacts}
                    onSave={(fields) => edit(interview.id, fields)}
                    onCancel={cancel}
                  />
                </li>
              ) : (
                <li key={interview.id} className="stacked">
                  <h4>{interviewName(interview)}</h4>
                  <p>
                    Interviewers:{' '}
                    {interview.interviewers.length === 0
                      ? 'none named'
                      : interview.interviewers.map((contact, i) => (
                          <span key={contact.id}>
                            {i > 0 && ', '}
                            <ContactLink contact={contact} />
                          </span>
                        ))}
                  </p>
                  <p>
                    {interview.followUpSent
                      ? 'Follow-up sent'
                      : 'No Follow-up sent yet'}
                  </p>
                  {interview.notes !== null && (
                    <p>
                      <MultilineText value={interview.notes} />
                    </p>
                  )}
                  <div className="page-actions">
                    <button
                      type="button"
                      className="secondary"
                      aria-label={`Edit ${interviewName(interview)}`}
                      onClick={() =>
                        setMode({ kind: 'edit', id: interview.id })
                      }
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="danger"
                      aria-label={`Delete ${interviewName(interview)}`}
                      onClick={() =>
                        setMode({ kind: 'confirm-delete', id: interview.id })
                      }
                    >
                      Delete
                    </button>
                  </div>
                  {mode.kind === 'confirm-delete' &&
                    mode.id === interview.id && (
                      <ConfirmDelete
                        heading="Delete this Interview?"
                        onConfirm={() => remove(interview.id)}
                        onCancel={cancel}
                      >
                        The {interviewName(interview)} Interview will be
                        deleted. Its Interviewers are kept as Contacts. This
                        can’t be undone.
                      </ConfirmDelete>
                    )}
                </li>
              ),
            )}
          </ol>
        )}
        {mode.kind === 'log' ? (
          <InterviewForm contacts={contacts} onSave={log} onCancel={cancel} />
        ) : (
          <button type="button" onClick={() => setMode({ kind: 'log' })}>
            Log an Interview
          </button>
        )}
      </section>
      <section aria-labelledby={`${id}-interviewers`}>
        <h3 id={`${id}-interviewers`}>Interviewers</h3>
        {interviewers.length === 0 ? (
          <p>No Interviewers yet.</p>
        ) : (
          <ul aria-label="Interviewers" className="item-list">
            {interviewers.map((contact) => (
              <li key={contact.id}>
                <ContactName contact={contact} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
