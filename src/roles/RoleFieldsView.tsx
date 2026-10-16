import type { ReactNode } from 'react'
import type { Role } from '../data/dataLayer'
import {
  formatCalendarDate,
  formatPostedSalary,
  formatTimestampDate,
  formatYearlySalary,
  safeHref,
  workArrangementLabels,
} from './format'

const notSet = <span className="not-set">Not set</span>

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <dt>{label}</dt>
      {/* `value !== null && …` yields false for an empty field. */}
      <dd>
        {children === null || children === undefined || children === false
          ? notSet
          : children}
      </dd>
    </div>
  )
}

function Text({ value }: { value: string | null }) {
  return value === null ? notSet : <span className="multiline">{value}</span>
}

function ExternalLink({ url }: { url: string | null }) {
  if (url === null) return notSet
  const href = safeHref(url)
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {url}
    </a>
  ) : (
    url
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="field-group">
      <h3>{title}</h3>
      <dl>{children}</dl>
    </section>
  )
}

export function RoleFieldsView({
  role,
  statusName,
}: {
  role: Role
  statusName: string
}) {
  return (
    <section aria-label="Role fields" className="role-fields">
      <Group title="Overview">
        <Field label="Status">{statusName}</Field>
        <Field label="Location">{role.location}</Field>
        <Field label="Work arrangement">
          {role.workArrangement && workArrangementLabels[role.workArrangement]}
        </Field>
        <Field label="Role summary">
          <Text value={role.roleSummary} />
        </Field>
      </Group>
      <Group title="Pay">
        <Field label="Posted salary">{formatPostedSalary(role)}</Field>
        <Field label="Salary note">{role.salaryNote}</Field>
        <Field label="Expected salary">
          {role.expectedSalary !== null &&
            formatYearlySalary(role.expectedSalary)}
        </Field>
        <Field label="Minimum salary">
          {role.minimumSalary !== null &&
            formatYearlySalary(role.minimumSalary)}
        </Field>
      </Group>
      <Group title="Posting">
        <Field label="Posting link">
          <ExternalLink url={role.postingLink} />
        </Field>
        <Field label="Hiring site link">
          <ExternalLink url={role.hiringSiteLink} />
        </Field>
        <Field label="Posting date">
          {role.postingDate && formatCalendarDate(role.postingDate)}
        </Field>
        <Field label="Posting copy">
          {role.postingCopy === null ? null : (
            <>
              {role.postingCopySavedAt && (
                <span className="saved-date">
                  Saved {formatTimestampDate(role.postingCopySavedAt)}
                </span>
              )}
              <Text value={role.postingCopy} />
            </>
          )}
        </Field>
      </Group>
      <Group title="Fit">
        <Field label="Fit rating">
          {role.fitRating !== null && `${role.fitRating} of 5`}
        </Field>
        <Field label="Fit notes">
          <Text value={role.fitNotes} />
        </Field>
        <Field label="Referral submitted">
          {role.referralSubmitted ? 'Yes' : 'No'}
        </Field>
      </Group>
      <Group title="Next action">
        <Field label="Next action">{role.nextAction}</Field>
        <Field label="Next action date">
          {role.nextActionDate && formatCalendarDate(role.nextActionDate)}
        </Field>
      </Group>
      <Group title="Notes">
        <Field label="Notes">
          <Text value={role.notes} />
        </Field>
      </Group>
    </section>
  )
}
