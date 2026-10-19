import { expect, test } from '@playwright/test'
import { checkPage, setWidth, widths } from './layout.ts'

test.describe.configure({ mode: 'parallel' })

for (const width of widths) {
  test(`Given the default Statuses on a ${width.device}, when I rename one and delete another in Settings, then nothing spills out of its container and axe finds no accessibility problems`, async ({
    page,
  }) => {
    await setWidth(page, width)
    await page.goto('/#/settings')
    await page.getByRole('button', { name: 'Rename Recruiter Screen' }).click()
    await expect(page.getByLabel('Status name', { exact: true })).toBeVisible()
    await checkPage(page, 'Settings, renaming a Status')
    await page.getByRole('button', { name: 'Cancel' }).click()
    await page.getByRole('button', { name: 'Delete No Response' }).click()
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await checkPage(page, 'Settings, deleting a Status')
  })
}
