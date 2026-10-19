import { useEffect, useId, useState } from 'react'
import { ContactLink, ContactName } from '../components/ContactName'
import { EditableListItem } from '../components/EditableListItem'
import { MultilineText } from '../components/Fields'
import { useEditableList } from '../components/useEditableList'
import type {
  Contact,
  InterviewFields,
  ListedInterview,
} from '../data/dataLayer'
import { useDataLayer } from '../dataContext'
import { formatLocalDateTime } from '../format'
import { InterviewForm } from './InterviewForm'
import { interviewTypeLabels } from './format'

type Loaded = {
  interviews: ListedInterview[]
  interviewers: Contact[]
  contacts: Contact[]
}

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
  const list = useEditableList(async () => {
    const interviews = await data.listInterviews(roleId)
    const interviewers = await data.listInterviewers(roleId)
    setLoaded((current) => current && { ...current, interviews, interviewers })
  })

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

  return (
    <>
      <section aria-labelledby={`${id}-heading`} className="role-interviews">
        <h3 id={`${id}-heading`}>Interviews</h3>
        {interviews.length === 0 ? (
          <p>No Interviews logged yet.</p>
        ) : (
          <ol aria-label="Interviews" className="item-list">
            {interviews.map((interview) => (
              <EditableListItem
                key={interview.id}
                list={list}
                id={interview.id}
                name={interviewName(interview)}
                form={
                  <InterviewForm
                    interview={interview}
                    contacts={contacts}
                    onSave={(fields) =>
                      list.save(() =>
                        data.updateInterview(interview.id, fields),
                      )
                    }
                    onCancel={list.cancel}
                  />
                }
                deleteHeading="Delete this Interview?"
                deleteMessage={`The ${interviewName(interview)} Interview will be deleted. Its Interviewers are kept as Contacts.`}
                onDelete={() => data.deleteInterview(interview.id)}
              >
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
              </EditableListItem>
            ))}
          </ol>
        )}
        {list.adding ? (
          <InterviewForm
            contacts={contacts}
            onSave={(fields) =>
              list.save(() => data.createInterview({ roleId, ...fields }))
            }
            onCancel={list.cancel}
          />
        ) : (
          <button type="button" onClick={list.startAdding}>
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
