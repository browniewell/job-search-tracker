import { expect, test, type Page } from '@playwright/test'

/** Adds a Role through the UI and moves it to Applied on its detail page. */
async function addAppliedRole(page: Page, title: string) {
  await page.goto('/')
  await page.getByLabel('Role title').fill(title)
  await page.getByRole('button', { name: 'Add Role' }).click()
  await page.getByRole('link', { name: title }).click()
  await page
    .getByRole('form', { name: 'Change Status' })
    .getByLabel('Status')
    .selectOption({ label: 'Applied' })
  await page.getByRole('button', { name: 'Change Status' }).click()
  await page.getByRole('link', { name: 'Pipeline board' }).click()
}

const column = (page: Page, statusName: string) =>
  page.getByRole('region', { name: statusName, exact: true })

/**
 * After the move: the card sits in Recruiter Screen, and Status history
 * records the change with a timestamp from when it was made.
 */
async function expectMovedToRecruiterScreen(
  page: Page,
  title: string,
  movedAfter: Date,
) {
  await expect(
    column(page, 'Recruiter Screen').getByRole('link', { name: title }),
  ).toBeVisible()
  await expect(column(page, 'Applied').getByRole('link')).toHaveCount(0)

  await page.getByRole('link', { name: title }).click()
  const history = page.getByRole('list', { name: 'Status history' })
  await expect(history.getByRole('listitem').last()).toContainText(
    'Applied → Recruiter Screen · ',
  )
  const at = await history.locator('time').last().getAttribute('datetime')
  expect(new Date(at ?? '').getTime()).toBeGreaterThanOrEqual(
    movedAfter.getTime(),
  )
  expect(new Date(at ?? '').getTime()).toBeLessThanOrEqual(Date.now())
}

test("Given a Role in Applied, when it's dragged to Recruiter Screen by mouse, then a Status history entry is recorded with a timestamp", async ({
  page,
}) => {
  await addAppliedRole(page, 'Senior QA Engineer')
  const movedAfter = new Date()
  const card = column(page, 'Applied').getByRole('listitem', {
    name: 'Senior QA Engineer',
  })
  const target = column(page, 'Recruiter Screen')

  const from = await card.boundingBox()
  const to = await target.boundingBox()
  if (!from || !to) throw new Error('Card or column is not on screen')
  await page.mouse.move(from.x + from.width / 2, from.y + 10)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width / 2, to.y + 60, { steps: 10 })
  await page.mouse.up()

  await expectMovedToRecruiterScreen(page, 'Senior QA Engineer', movedAfter)
})

test("Given a Role in Applied, when it's moved to Recruiter Screen with the keyboard, then a Status history entry is recorded with a timestamp", async ({
  page,
}) => {
  await addAppliedRole(page, 'Senior QA Engineer')
  const movedAfter = new Date()

  const announcement = page.getByRole('status').filter({ hasText: /\S/ })
  await page.getByRole('button', { name: 'Move Senior QA Engineer' }).focus()
  await page.keyboard.press('Space')
  await expect(announcement).toHaveText('Senior QA Engineer is over Applied.')
  // dnd-kit starts listening for arrow keys on a timer once a card is picked
  // up; a timer queued now runs after it.
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve)))
  await page.keyboard.press('ArrowRight')
  await expect(announcement).toHaveText(
    'Senior QA Engineer is over Recruiter Screen.',
  )
  await page.keyboard.press('Space')

  await expectMovedToRecruiterScreen(page, 'Senior QA Engineer', movedAfter)
})

test("Given a Role in Interested, when it's moved to Applied on the Pipeline board, then today's Applications count it at once", async ({
  page,
}) => {
  await page.goto('/')
  await page.getByLabel('Role title').fill('Senior QA Engineer')
  await page.getByRole('button', { name: 'Add Role' }).click()
  await page.getByRole('link', { name: 'Pipeline board' }).click()
  await expect(page.getByText('0 of 2 today, a fresh start')).toBeVisible()

  const announcement = page.getByRole('status').filter({ hasText: /\S/ })
  await page.getByRole('button', { name: 'Move Senior QA Engineer' }).focus()
  await page.keyboard.press('Space')
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve)))
  await page.keyboard.press('ArrowRight')
  await expect(announcement).toHaveText('Senior QA Engineer is over Parked.')
  await page.keyboard.press('ArrowRight')
  await expect(announcement).toHaveText('Senior QA Engineer is over Applied.')
  await page.keyboard.press('Space')

  await expect(page.getByText('1 of 2 today, good going')).toBeVisible()
})
