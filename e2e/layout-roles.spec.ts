import { expect, test, type Page } from '@playwright/test'
import { checkPage, overflowing, setWidth, widths } from './layout.ts'
import {
  addCompany,
  addContact,
  addFlag,
  addRole,
  linkHiringManager,
} from './seed.ts'

/** On a Role page, opens the Interview form filled in for a recruiter screen. */
async function fillInterviewForm(page: Page, notes: string) {
  await page.getByRole('button', { name: 'Log an Interview' }).click()
  await page.getByLabel('Date and time').fill('2026-10-20T14:00')
  await page
    .getByLabel('Interview type')
    .selectOption({ label: 'Recruiter screen' })
  await page.getByRole('checkbox', { name: 'Priya Shah' }).check()
  await page.getByLabel('Notes').fill(notes)
}

test.describe.configure({ mode: 'parallel' })

for (const width of widths) {
  test(`Given a Flagged Role at a Flagged Company on a ${width.device}, when I edit the Role, link a Contact to it, log an Interview and list Roles, then nothing spills out of its container and axe finds no accessibility problems`, async ({
    page,
  }) => {
    await setWidth(page, width)
    await addCompany(page, 'Acme', 'data monetization')
    await addContact(page, 'Priya Shah')
    await addRole(page, 'Senior QA Engineer')

    await page.getByRole('button', { name: 'Edit' }).click()
    await page.getByLabel('Company').selectOption({ label: 'Acme' })
    await addFlag(page, 'Workday portal')
    await checkPage(page, 'Role edit form')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('note', { name: 'Flags' })).toBeVisible()
    await checkPage(page, 'Role page')

    await linkHiringManager(page, 'Priya Shah')
    await checkPage(page, 'Role page with Role contacts')

    await fillInterviewForm(
      page,
      'Asked about salary expectations and the hybrid schedule',
    )
    await checkPage(page, 'Interview form')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('list', { name: 'Interviewers' })).toBeVisible()
    await checkPage(page, 'Role page with Interviews')
    await page.getByRole('button', { name: /^Delete Recruiter screen/ }).click()
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await checkPage(page, 'Role page, deleting an Interview')

    await page.goto('/')
    await expect(page.getByRole('table', { name: 'Roles' })).toBeVisible()
    await checkPage(page, 'Roles table')
  })
}

// Text kept as written wraps differently at every width, and a space that
// hangs past the edge shows at only some of them (#11): three widths miss it.
const prose =
  'Asked about salary expectations and the hybrid schedule. The team ships ' +
  'weekly, owns its own test automation, and wants someone to lead the move ' +
  'from Selenium to Playwright while mentoring two junior engineers.  \n' +
  'Follow up with the hiring manager about the take-home exercise.'

test('Given a Role whose Notes, Posting copy and Interview notes run several lines, when I view it at every width across the phone range, then no line of text spills out of its container', async ({
  page,
}) => {
  await addContact(page, 'Priya Shah')
  await addRole(page, 'Senior QA Engineer')
  await page.getByRole('button', { name: 'Edit' }).click()
  await page.getByLabel('Posting copy').fill(prose)
  await page.getByLabel('Notes', { exact: true }).fill(prose)
  await page.getByRole('button', { name: 'Save' }).click()
  await fillInterviewForm(page, prose)
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.locator('.multiline')).toHaveCount(3)

  const spills: string[] = []
  for (let width = 300; width <= 420; width++) {
    await setWidth(page, { width, height: 640 })
    for (const found of await overflowing(page, '.multiline')) {
      spills.push(`${width}px: ${found}`)
    }
  }
  expect(spills).toEqual([])
})
