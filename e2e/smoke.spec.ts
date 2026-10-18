import { expect, test } from '@playwright/test'

test('Given the production build, when I add a Role, then it is listed and survives a reload', async ({
  page,
}) => {
  await page.goto('/')

  await page.getByLabel('Role title').fill('Senior QA Engineer')
  await page.getByRole('button', { name: 'Add Role' }).click()

  const roles = page.getByRole('table', { name: 'Roles' })
  await expect(roles).toContainText('Senior QA Engineer')

  await page.reload()
  await expect(roles).toContainText('Senior QA Engineer')
})

test('Given a Role, when I edit it on its detail page and reload, then the edit is kept', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByLabel('Role title').fill('QA Engineer')
  await page.getByRole('button', { name: 'Add Role' }).click()
  await page.getByRole('link', { name: 'QA Engineer' }).click()

  await page.getByRole('button', { name: 'Edit' }).click()
  await page.getByLabel('Location').fill('Chicago, IL')
  await page.getByLabel('Posting date').fill('2026-10-01')
  await page.getByRole('button', { name: 'Save' }).click()
  const fields = page.getByRole('region', { name: 'Role fields' })
  await expect(fields).toContainText('Chicago, IL')

  await expect(page).toHaveURL(/#\/roles\/[\w-]+$/)
  await page.reload()
  await expect(fields).toContainText('Chicago, IL')
  await expect(fields).toContainText('Oct 1, 2026')
})

test('Given I filter and sort the Roles table, when I open a Role, go back and reload, then the filter and sort are kept', async ({
  page,
}) => {
  await page.goto('/')
  const roles = page.getByRole('table', { name: 'Roles' })
  for (const title of ['QA Engineer', 'SDET', 'Test Lead']) {
    await page.getByLabel('Role title').fill(title)
    await page.getByRole('button', { name: 'Add Role' }).click()
    await expect(roles.getByRole('link', { name: title })).toBeVisible()
  }
  await page.getByRole('link', { name: 'SDET' }).click()
  await page.getByRole('button', { name: 'Edit' }).click()
  await page.getByLabel('Posting date').fill('2026-10-01')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('link', { name: '← All Roles' }).click()

  await page.getByLabel('Posting date from').fill('2026-09-01')
  await expect(roles.getByRole('row')).toHaveCount(2)
  const roleTitle = roles.getByRole('columnheader', { name: 'Role title' })
  await roleTitle.getByRole('button').click()
  await roleTitle.getByRole('button').click()
  await expect(roleTitle).toHaveAttribute('aria-sort', 'descending')

  await page.getByRole('link', { name: 'SDET' }).click()
  await page.goBack()
  await page.reload()

  await expect(roles.getByRole('row')).toHaveCount(2)
  await expect(roles).toContainText('SDET')
  await expect(page.getByLabel('Posting date from')).toHaveValue('2026-09-01')
  await expect(roleTitle).toHaveAttribute('aria-sort', 'descending')
})
