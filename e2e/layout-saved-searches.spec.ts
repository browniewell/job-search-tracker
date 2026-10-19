import { expect, test } from '@playwright/test'
import { checkPage, setWidth, widths } from './layout.ts'

test.describe.configure({ mode: 'parallel' })

for (const width of widths) {
  test(`Given a Saved search with a long link on a ${width.device}, when I add it, mark it checked, edit it and start to delete it, then nothing spills out of its container and axe finds no accessibility problems`, async ({
    page,
  }) => {
    await setWidth(page, width)
    await page.goto('/#/saved-searches')
    await page.getByRole('button', { name: 'Add a Saved search' }).click()
    await page.getByLabel('Name').fill('Senior QA, remote, posted this week')
    await page
      .getByLabel('Link')
      .fill(
        'https://www.linkedin.com/jobs/search/?keywords=senior%20quality%20assurance%20engineer&f_WT=2&f_TPR=r604800',
      )
    await page.getByLabel('Site').fill('LinkedIn')
    await checkPage(page, 'Saved search add form')
    await page.getByRole('button', { name: 'Save' }).click()

    const list = page.getByRole('list', { name: 'Saved searches' })
    await list.getByRole('button', { name: /^Mark .* checked$/ }).click()
    await expect(list.getByText(/^Last checked /)).toBeVisible()
    await checkPage(page, 'Saved searches list')

    await list.getByRole('button', { name: /^Edit / }).click()
    await expect(list.getByRole('form')).toBeVisible()
    await checkPage(page, 'Saved search edit form')
    await list.getByRole('button', { name: 'Cancel' }).click()

    await list.getByRole('button', { name: /^Delete / }).click()
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await checkPage(page, 'Saved search delete confirmation')
  })
}
