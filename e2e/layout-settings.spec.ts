import { expect } from '@playwright/test'
import { checkPage, layoutTest } from './layout.ts'

layoutTest(
  'the default Statuses',
  'I rename one and delete another in Settings',
  async (page) => {
    await page.goto('/#/settings')
    await page.getByRole('button', { name: 'Rename Recruiter Screen' }).click()
    await expect(page.getByLabel('Status name', { exact: true })).toBeVisible()
    await checkPage(page, 'Settings, renaming a Status')
    await page.getByRole('button', { name: 'Cancel' }).click()
    await page.getByRole('button', { name: 'Delete No Response' }).click()
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await checkPage(page, 'Settings, deleting a Status')
  },
)
