import { expect } from '@playwright/test'
import { checkPage, layoutTest } from './layout.ts'
import { addCompany, addContact, addRole, linkHiringManager } from './seed.ts'

layoutTest(
  'a Contact at a Company, linked to a Role',
  'I edit the Contact, view it and list Contacts',
  async (page) => {
    await addCompany(page, 'Acme')
    await addContact(page, 'Priya Shah')
    await page.getByRole('link', { name: 'Priya Shah' }).click()
    await page.getByRole('button', { name: 'Edit' }).click()
    await page.getByLabel('Title').fill('Senior Technical Recruiter')
    await page.getByLabel('Company').selectOption({ label: 'Acme' })
    await page
      .getByLabel('LinkedIn')
      .fill('https://www.linkedin.com/in/priya-shah-senior-technical-recruiter')
    await checkPage(page, 'Contact edit form')
    await page.getByRole('button', { name: 'Save' }).click()

    await addRole(page, 'Senior QA Engineer')
    await linkHiringManager(page, 'Priya Shah')
    await page
      .getByRole('list', { name: 'Hiring manager' })
      .getByRole('link', { name: 'Priya Shah' })
      .click()
    await expect(
      page.getByRole('list', { name: 'Roles with Priya Shah' }),
    ).toBeVisible()
    await checkPage(page, 'Contact page')

    await page.getByRole('link', { name: 'Contacts', exact: true }).click()
    await expect(page.getByRole('list', { name: 'Contacts' })).toBeVisible()
    await checkPage(page, 'Contacts list')
  },
)
