import type {
  InterviewType,
  Role,
  SalaryPeriod,
  WorkArrangement,
} from '../data/dataLayer'
import { locale } from '../format'

/** Shown wherever a Role has no Company linked. */
export const companyNotDisclosed = 'Company not disclosed'

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
