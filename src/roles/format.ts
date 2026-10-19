import type {
  InterviewType,
  Role,
  SalaryPeriod,
  WorkArrangement,
} from '../data/dataLayer'

/** Shown wherever a Role has no Company linked. */
export const companyNotDisclosed = 'Company not disclosed'

// Dates and money are shown US-style: the spec assumes USD.
const locale = 'en-US'

export const workArrangementLabels: Record<WorkArrangement, string> = {
  'on-site': 'On-site',
  hybrid: 'Hybrid',
  remote: 'Remote',
}

export const interviewTypeLabels: Record<InterviewType, string> = {
  'recruiter screen': 'Recruiter screen',
  'hiring manager': 'Hiring manager',
  technical: 'Technical',
  panel: 'Panel',
  other: 'Other',
}

export const salaryPeriodLabels: Record<SalaryPeriod, string> = {
  annual: 'Annual',
  hourly: 'Hourly',
}

const salaryPeriodSuffixes: Record<SalaryPeriod, string> = {
  annual: ' per year',
  hourly: ' per hour',
}

const money = new Intl.NumberFormat(locale, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
})

const mediumDate = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })

export function formatMoney(amount: number): string {
  return money.format(amount)
}

/** Expected and Minimum salary are always yearly (GLOSSARY.md). */
export function formatYearlySalary(amount: number): string {
  return `${formatMoney(amount)} per year`
}

export function formatPostedSalary(
  role: Pick<Role, 'salaryMin' | 'salaryMax' | 'salaryPeriod'>,
): string | null {
  const { salaryMin, salaryMax, salaryPeriod } = role
  if (salaryMin === null && salaryMax === null) return null
  const range =
    salaryMin !== null && salaryMax !== null
      ? `${formatMoney(salaryMin)} – ${formatMoney(salaryMax)}`
      : salaryMin !== null
        ? `From ${formatMoney(salaryMin)}`
        : `Up to ${formatMoney(salaryMax!)}`
  return range + (salaryPeriod ? salaryPeriodSuffixes[salaryPeriod] : '')
}

/** A date picked by the user, YYYY-MM-DD or YYYY-MM-DDTHH:mm, as that moment in local time. */
function localMoment(picked: string): Date {
  const [date, time = '00:00'] = picked.split('T')
  const [year, month, day] = date.split('-').map(Number)
  const [hours, minutes] = time.split(':').map(Number)
  return new Date(year, month - 1, day, hours, minutes)
}

/** A calendar date (YYYY-MM-DD), shown as written: no time zone shift. */
export function formatCalendarDate(date: string): string {
  return mediumDate.format(localMoment(date))
}

const mediumDateTime = new Intl.DateTimeFormat(locale, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

/** A clock timestamp, shown as its date and time in local time. */
export function formatTimestamp(timestamp: string): string {
  return mediumDateTime.format(new Date(timestamp))
}

/** A clock timestamp, shown as its date in local time. */
export function formatTimestampDate(timestamp: string): string {
  return mediumDate.format(new Date(timestamp))
}

/** A local date and time (YYYY-MM-DDTHH:mm), shown as written: no time zone shift. */
export function formatLocalDateTime(dateTime: string): string {
  return mediumDateTime.format(localMoment(dateTime))
}
