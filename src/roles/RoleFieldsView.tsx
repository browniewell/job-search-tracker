import {
  ExternalLink,
  Field,
  FieldGroup,
  MultilineText,
} from '../components/Fields'
import { Link } from 'react-router'
import type { Company, Role } from '../data/dataLayer'
import {
  companyNotDisclosed,
  formatCalendarDate,
  formatPostedSalary,
  formatTimestampDate,
  formatYearlySalary,
  workArrangementLabels,
} from './format'

export function RoleFieldsView({
  role,
  company,
  statusName,
}: {
  role: Role
  company: Company | undefined
  statusName: string
}) {
  return (
    <section aria-label="Role fields" className="detail-fields">
      <FieldGroup title="Overview">
        <Field label="Company">
          {company ? (
            <Link to={`/companies/${company.id}`}>{company.name}</Link>
          ) : (
            <span className="not-set">{companyNotDisclosed}</span>
          )}
        </Field>
        <Field label="Status">{statusName}</Field>
        <Field label="Location">{role.location}</Field>
        <Field label="Work arrangement">
          {role.workArrangement && workArrangementLabels[role.workArrangement]}
        </Field>
        <Field label="Role summary">
          <MultilineText value={role.roleSummary} />
        </Field>
      </FieldGroup>
      <FieldGroup title="Pay">
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
      </FieldGroup>
      <FieldGroup title="Posting">
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
              <MultilineText value={role.postingCopy} />
            </>
          )}
        </Field>
      </FieldGroup>
      <FieldGroup title="Fit">
        <Field label="Fit rating">
          {role.fitRating !== null && `${role.fitRating} of 5`}
        </Field>
        <Field label="Fit notes">
          <MultilineText value={role.fitNotes} />
        </Field>
        <Field label="Referral submitted">
          {role.referralSubmitted ? 'Yes' : 'No'}
        </Field>
      </FieldGroup>
      <FieldGroup title="Next action">
        <Field label="Next action">{role.nextAction}</Field>
        <Field label="Next action date">
          {role.nextActionDate && formatCalendarDate(role.nextActionDate)}
        </Field>
      </FieldGroup>
      <FieldGroup title="Notes">
        <Field label="Notes">
          <MultilineText value={role.notes} />
        </Field>
      </FieldGroup>
    </section>
  )
}
