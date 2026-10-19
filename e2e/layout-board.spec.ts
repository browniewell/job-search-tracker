import { expect, test } from '@playwright/test'
import { checkPage, setWidth, widths } from './layout.ts'
import { addCompany, addFlag, addRole } from './seed.ts'

test.describe.configure({ mode: 'parallel' })

for (const width of widths) {
  test(`Given a Flagged Role at a Flagged Company on a ${width.device}, when I open the Pipeline board with Closed statuses shown, then nothing spills out of its container and axe finds no accessibility problems`, async ({
    page,
  }) => {
    await setWidth(page, width)
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
  })
}
