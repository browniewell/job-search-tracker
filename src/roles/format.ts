import type { Role, SalaryPeriod, WorkArrangement } from '../data/dataLayer'

// Dates and money are shown US-style: the spec assumes USD.
const locale = 'en-US'

export const workArrangementLabels: Record<WorkArrangement, string> = {
  'on-site': 'On-site',
  hybrid: 'Hybrid',
  remote: 'Remote',
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

/** A calendar date (YYYY-MM-DD), shown as written: no time zone shift. */
export function formatCalendarDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return mediumDate.format(new Date(year, month - 1, day))
}

/** A clock timestamp, shown as its date in local time. */
export function formatTimestampDate(timestamp: string): string {
  return mediumDate.format(new Date(timestamp))
}

/** Only http(s) links are rendered as links; anything else stays text. */
export function safeHref(url: string): string | null {
  try {
    const { protocol } = new URL(url)
    return protocol === 'http:' || protocol === 'https:' ? url : null
  } catch {
    return null
  }
}
