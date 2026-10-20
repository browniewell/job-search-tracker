import { expect, type Page } from '@playwright/test'

// Data the specs need before they reach the state they check, added through
// the app in as few steps as it allows. Specs add Roles, Companies and
// Contacts only through these helpers (enforced by ESLint).

/** Adds a Company, with a Flag when given one. Ends on its page. */
export async function addCompany(page: Page, name: string, flag?: string) {
  await page.goto('/#/companies')
  await page.getByLabel('Company name').fill(name)
  await page.getByRole('button', { name: 'Add Company' }).click()
  await page.getByRole('link', { name }).click()
  if (flag) {
    await page.getByRole('button', { name: 'Edit' }).click()
    await addFlag(page, flag)
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('note', { name: 'Flags' })).toBeVisible()
  }
}

/** Adds a Contact. Ends on the Contacts list. */
export async function addContact(page: Page, name: string) {
  await page.goto('/#/contacts')
  await page.getByLabel('Contact name').fill(name)
  await page.getByRole('button', { name: 'Add Contact' }).click()
  await expect(page.getByRole('link', { name })).toBeVisible()
}

/** Adds a Role, in the first Status. Ends on the Roles list, with it listed. */
export async function addRoleToList(page: Page, title: string) {
  await page.goto('/')
  await page.getByLabel('Role title').fill(title)
  await page.getByRole('button', { name: 'Add Role' }).click()
  await expect(page.getByRole('link', { name: title })).toBeVisible()
}

/** Adds a Role, in the first Status. Ends on its page. */
export async function addRole(page: Page, title: string) {
  await addRoleToList(page, title)
  await page.getByRole('link', { name: title }).click()
}

/** On a Role page, links a Contact to the Role as its hiring manager. */
export async function linkHiringManager(page: Page, contact: string) {
  await page
    .getByLabel('Contact', { exact: true })
    .selectOption({ label: contact })
  await page
    .getByLabel('Type', { exact: true })
    .selectOption({ label: 'Hiring manager' })
  await page.getByRole('button', { name: 'Link Contact' }).click()
  await expect(page.getByRole('list', { name: 'Hiring manager' })).toBeVisible()
}

/** In an open Role or Company edit form, adds a Flag. */
export async function addFlag(page: Page, flag: string) {
  await page.getByLabel('Add a Flag').fill(flag)
  await page.getByLabel('Add a Flag').press('Enter')
}
