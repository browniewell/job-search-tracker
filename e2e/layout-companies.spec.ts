import { expect } from '@playwright/test'
import { checkPage, layoutTest } from './layout.ts'
import { addCompany, addContact, addFlag } from './seed.ts'

layoutTest(
  'a Flagged Company with a Contact',
  'I edit the Company and view it',
  async (page) => {
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
  },
)
