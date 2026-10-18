import { expect, test, type Page } from '@playwright/test'

// Elements that spill out of their container: a layout bug no unit test
// sees. Containers that clip or scroll their content are exempt.
async function overflowing(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const found: string[] = []
    for (const element of document.querySelectorAll('#root *')) {
      const parent = element.parentElement
      if (!parent || getComputedStyle(parent).overflowX !== 'visible') continue
      const box = element.getBoundingClientRect()
      const container = parent.getBoundingClientRect()
      if (box.width === 0) continue
      if (box.right > container.right + 1 || box.left < container.left - 1) {
        const name =
          element.getAttribute('aria-label') ??
          element.textContent?.trim().slice(0, 30)
        found.push(`<${element.tagName.toLowerCase()}> ${name}`)
      }
    }
    return found
  })
}

for (const [device, viewport] of [
  // Font metrics differ by OS: the narrowest phone shows locally what CI's
  // wider fonts show at 375.
  ['small phone', { width: 320, height: 640 }],
  ['phone', { width: 375, height: 812 }],
  ['desktop', { width: 1280, height: 800 }],
] as const) {
  test(`Given a Flagged Role at a Flagged Company on a ${device}, when I view and edit each and list Roles, then nothing spills out of its container`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    await page.goto('/#/companies')
    await page.getByLabel('Company name').fill('Acme')
    await page.getByRole('button', { name: 'Add Company' }).click()
    await page.getByRole('link', { name: 'Acme' }).click()
    await page.getByRole('button', { name: 'Edit' }).click()
    await page.getByLabel('Add a Flag').fill('data monetization')
    await page.getByLabel('Add a Flag').press('Enter')
    expect(await overflowing(page), 'Company edit form').toEqual([])
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('note', { name: 'Flags' })).toBeVisible()
    expect(await overflowing(page), 'Company page').toEqual([])

    await page.goto('/')
    await page.getByLabel('Role title').fill('Senior QA Engineer')
    await page.getByRole('button', { name: 'Add Role' }).click()
    await page.getByRole('link', { name: 'Senior QA Engineer' }).click()
    await page.getByRole('button', { name: 'Edit' }).click()
    await page.getByLabel('Company').selectOption({ label: 'Acme' })
    await page.getByLabel('Add a Flag').fill('Workday portal')
    await page.getByLabel('Add a Flag').press('Enter')
    expect(await overflowing(page), 'Role edit form').toEqual([])
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('note', { name: 'Flags' })).toBeVisible()
    expect(await overflowing(page), 'Role page').toEqual([])

    await page.goto('/')
    await expect(page.getByRole('table', { name: 'Roles' })).toBeVisible()
    expect(await overflowing(page), 'Roles table').toEqual([])
  })
}
