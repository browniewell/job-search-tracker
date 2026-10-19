import { expect, test } from '@playwright/test'
import { checkPage, setWidth, widths } from './layout.ts'
import { addCompany, addContact, addFlag } from './seed.ts'

test.describe.configure({ mode: 'parallel' })

for (const width of widths) {
  test(`Given a Flagged Company with a Contact on a ${width.device}, when I edit the Company and view it, then nothing spills out of its container and axe finds no accessibility problems`, async ({
    page,
  }) => {
    await setWidth(page, width)
    await addCompany(page, 'Acme')
    await page.getByRole('button', { name: 'Edit' }).click()
    await addFlag(page, 'data monetization')
    await checkPage(page, 'Company edit form')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('note', { name: 'Flags' })).toBeVisible()
    await checkPage(page, 'Company page')

    await addContact(page, 'Priya Shah')
    await page.getByRole('link', { name: 'Priya Shah' }).click()
    await page.getByRole('button', { name: 'Edit' }).click()
    await page.getByLabel('Company').selectOption({ label: 'Acme' })
    await page.getByRole('button', { name: 'Save' }).click()
    await page.getByRole('link', { name: 'Acme' }).click()
    await expect(
      page.getByRole('list', { name: 'Contacts at Acme' }),
    ).toBeVisible()
    await checkPage(page, 'Company page with Contacts')
  })
}
