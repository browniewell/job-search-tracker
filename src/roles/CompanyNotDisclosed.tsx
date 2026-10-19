import { companyNotDisclosed } from './format'

/** Shown in place of a Company's name where a Role has none linked. */
export function CompanyNotDisclosed() {
  return <span className="not-set">{companyNotDisclosed}</span>
}
