import { AxeBuilder } from '@axe-core/playwright'
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

// Accessibility problems axe can see: missing labels, contrast, ARIA misuse.
async function axeViolations(page: Page): Promise<string[]> {
  const { violations } = await new AxeBuilder({ page })
    .include('#root')
    .analyze()
  return violations.map(
    ({ id, nodes }) =>
      `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`,
  )
}

/** Each page is checked for layout, and for accessibility in both themes. */
async function checkPage(page: Page, name: string) {
  expect(await overflowing(page), `${name} overflow`).toEqual([])
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme })
    expect(
      await axeViolations(page),
      `${name} accessibility, ${colorScheme}`,
    ).toEqual([])
  }
  await page.emulateMedia({ colorScheme: null })
}

// CI's Linux fonts run about 17% wider than macOS's: 320 locally lays out
// like 375 on CI. Locally each width shrinks by that much, so a layout that
// only just fits here fails here, not first on CI.
const fontScale = process.env.CI ? 1 : 320 / 375

for (const [device, viewport] of [
  ['small phone', { width: 320, height: 640 }],
  ['phone', { width: 375, height: 812 }],
  ['desktop', { width: 1280, height: 800 }],
] as const) {
  test(`Given a Flagged Role at a Flagged Company on a ${device}, when I view and edit each, link a Contact to the Role, list Roles, open the Pipeline board and configure Statuses, then nothing spills out of its container and axe finds no accessibility problems`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: Math.round(viewport.width * fontScale),
      height: viewport.height,
    })
    await page.goto('/#/companies')
    await page.getByLabel('Company name').fill('Acme')
    await page.getByRole('button', { name: 'Add Company' }).click()
    await page.getByRole('link', { name: 'Acme' }).click()
    await page.getByRole('button', { name: 'Edit' }).click()
    await page.getByLabel('Add a Flag').fill('data monetization')
    await page.getByLabel('Add a Flag').press('Enter')
    await checkPage(page, 'Company edit form')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('note', { name: 'Flags' })).toBeVisible()
    await checkPage(page, 'Company page')

    await page.goto('/')
    await page.getByLabel('Role title').fill('Senior QA Engineer')
    await page.getByRole('button', { name: 'Add Role' }).click()
    await page.getByRole('link', { name: 'Senior QA Engineer' }).click()
    await page.getByRole('button', { name: 'Edit' }).click()
    await page.getByLabel('Company').selectOption({ label: 'Acme' })
    await page.getByLabel('Add a Flag').fill('Workday portal')
    await page.getByLabel('Add a Flag').press('Enter')
    await checkPage(page, 'Role edit form')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('note', { name: 'Flags' })).toBeVisible()
    await checkPage(page, 'Role page')

    await page.getByRole('link', { name: 'Contacts', exact: true }).click()
    await page.getByLabel('Contact name').fill('Priya Shah')
    await page.getByRole('button', { name: 'Add Contact' }).click()
    await page.getByRole('link', { name: 'Priya Shah' }).click()
    await page.getByRole('button', { name: 'Edit' }).click()
    await page.getByLabel('Title').fill('Senior Technical Recruiter')
    await page.getByLabel('Company').selectOption({ label: 'Acme' })
    await page
      .getByLabel('LinkedIn')
      .fill('https://www.linkedin.com/in/priya-shah-senior-technical-recruiter')
    await checkPage(page, 'Contact edit form')
    await page.getByRole('button', { name: 'Save' }).click()
    await page.getByRole('link', { name: 'Acme' }).click()
    await expect(
      page.getByRole('list', { name: 'Contacts at Acme' }),
    ).toBeVisible()
    await checkPage(page, 'Company page with Contacts')

    await page.getByRole('link', { name: 'Senior QA Engineer' }).click()
    await page
      .getByLabel('Contact', { exact: true })
      .selectOption({ label: 'Priya Shah' })
    await page
      .getByLabel('Type', { exact: true })
      .selectOption({ label: 'Hiring manager' })
    await page.getByRole('button', { name: 'Link Contact' }).click()
    await expect(
      page.getByRole('list', { name: 'Hiring manager' }),
    ).toBeVisible()
    await checkPage(page, 'Role page with Role contacts')
    await page.getByRole('link', { name: 'Priya Shah' }).click()
    await expect(
      page.getByRole('list', { name: 'Roles with Priya Shah' }),
    ).toBeVisible()
    await checkPage(page, 'Contact page')
    await page.getByRole('link', { name: 'Contacts', exact: true }).click()
    await expect(page.getByRole('list', { name: 'Contacts' })).toBeVisible()
    await checkPage(page, 'Contacts list')

    await page.goto('/')
    await expect(page.getByRole('table', { name: 'Roles' })).toBeVisible()
    await checkPage(page, 'Roles table')

    await page.getByRole('link', { name: 'Pipeline board' }).click()
    await page.getByLabel('Show Closed statuses').check()
    await expect(page.getByRole('note', { name: 'Flags' })).toBeVisible()
    await checkPage(page, 'Pipeline board')

    await page.getByRole('link', { name: 'Settings' }).click()
    await page.getByRole('button', { name: 'Rename Recruiter Screen' }).click()
    await expect(page.getByLabel('Status name', { exact: true })).toBeVisible()
    await checkPage(page, 'Settings, renaming a Status')
    await page.getByRole('button', { name: 'Cancel' }).click()
    await page.getByRole('button', { name: 'Delete No Response' }).click()
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await checkPage(page, 'Settings, deleting a Status')
  })
}
