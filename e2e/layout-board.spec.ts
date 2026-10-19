import { expect } from '@playwright/test'
import { checkPage, layoutTest } from './layout.ts'
import { addCompany, addFlag, addRole } from './seed.ts'

layoutTest(
  'a Flagged Role at a Flagged Company',
  'I open the Pipeline board with Closed statuses shown',
  async (page) => {
    await addCompany(page, 'Acme', 'data monetization')
    await addRole(page, 'Senior QA Engineer')
    await page.getByRole('button', { name: 'Edit' }).click()
    await page.getByLabel('Company').selectOption({ label: 'Acme' })
    await addFlag(page, 'Workday portal')
    await page.getByRole('button', { name: 'Save' }).click()

    await page.getByRole('link', { name: 'Pipeline board' }).click()
    await page.getByLabel('Show Closed statuses').check()
    await expect(page.getByRole('note', { name: 'Flags' })).toBeVisible()
    await checkPage(page, 'Pipeline board')
  },
)
