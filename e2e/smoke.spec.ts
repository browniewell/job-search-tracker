import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { addRole, addRoleToList, downloadFrom, exportBackup } from './seed.ts'

test('Given the production build, when I add a Role, then it is listed and survives a reload', async ({
  page,
}) => {
  await addRoleToList(page, 'Senior QA Engineer')

  const roles = page.getByRole('table', { name: 'Roles' })
  await expect(roles).toContainText('Senior QA Engineer')

  await page.reload()
  await expect(roles).toContainText('Senior QA Engineer')
})

test('Given a Role, when I edit it on its detail page and reload, then the edit is kept', async ({
  page,
}) => {
  await addRole(page, 'QA Engineer')

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
  const roles = page.getByRole('table', { name: 'Roles' })
  for (const title of ['QA Engineer', 'SDET', 'Test Lead']) {
    await addRoleToList(page, title)
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

test('Given a Role, when I export Roles to CSV, then a CSV file downloads with its row', async ({
  page,
}) => {
  await addRoleToList(page, 'QA Lead, Platform')

  const file = await downloadFrom(page, 'Export Roles to CSV')

  expect(file.suggestedFilename()).toBe('roles.csv')
  const text = await readFile(await file.path(), 'utf8')
  expect(text).toMatch(/^\uFEFFRole title,Status,Company,/)
  expect(text).toContain('\r\n"QA Lead, Platform",Interested,')
})

test('Given a backup, when I change data and restore from the downloaded file, then the data matches the backup', async ({
  page,
}) => {
  await addRole(page, 'Senior QA Engineer')
  await page.getByRole('button', { name: 'Edit' }).click()
  await page.getByLabel('Minimum salary').fill('120000')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('region', { name: 'Role fields' })).toContainText(
    '$120,000',
  )
  const backupPath = await exportBackup(page)
  await expect(page.getByText(/^Last backup: today/)).toBeVisible()
  const backup = JSON.parse(await readFile(backupPath, 'utf8'))
  expect(backup.roles[0].minimumSalary).toBe(120000)
  await addRoleToList(page, 'Added after the backup')

  await page.goto('/#/settings')
  await page.getByLabel('Restore from a backup').setInputFiles(backupPath)
  const dialog = page.getByRole('alertdialog', {
    name: 'Replace 2 Roles with 1 from backup?',
  })
  await dialog.getByRole('button', { name: 'Replace' }).click()
  await expect(page.getByRole('status')).toHaveText(
    'Restored from your backup.',
  )

  // The next backup records its own time; everything else matches.
  const restored = JSON.parse(await readFile(await exportBackup(page), 'utf8'))
  restored.settings[0].lastBackupAt = backup.settings[0].lastBackupAt
  expect(restored).toEqual(backup)
  await page.goto('/')
  await expect(
    page.getByRole('link', { name: 'Senior QA Engineer' }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Added after the backup' }),
  ).toHaveCount(0)
})
