import { expect, test } from '@playwright/test'

test('Given the production build, when I add a Role, then it is listed and survives a reload', async ({
  page,
}) => {
  await page.goto('/')

  await page.getByLabel('Role title').fill('Senior QA Engineer')
  await page.getByRole('button', { name: 'Add Role' }).click()

  const roles = page.getByRole('list', { name: 'Roles' })
  await expect(roles).toContainText('Senior QA Engineer')

  await page.reload()
  await expect(roles).toContainText('Senior QA Engineer')
})
