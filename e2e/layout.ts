import { AxeBuilder } from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

// Shared by the layout-*.spec.ts files, one per area, so a ticket that
// touches one area edits, and repeats on CI, only that area's spec. Each spec
// calls test() itself: --only-changed picks tests by the file that defines
// them, so a test defined here would never count as changed.

/**
 * Elements that spill out of their container: a layout bug no unit test
 * sees. Containers that clip or scroll their content are exempt.
 */
export async function overflowing(
  page: Page,
  selector = '#root *',
): Promise<string[]> {
  return page.evaluate((selector) => {
    const found: string[] = []
    for (const element of document.querySelectorAll(selector)) {
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
  }, selector)
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
export async function checkPage(page: Page, name: string) {
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

export const widths = [
  { device: 'small phone', width: 320, height: 640 },
  { device: 'phone', width: 375, height: 812 },
  { device: 'desktop', width: 1280, height: 800 },
] as const

/** Sizes the page to a width, scaled by fontScale. */
export async function setWidth(
  page: Page,
  { width, height }: { width: number; height: number },
) {
  await page.setViewportSize({ width: Math.round(width * fontScale), height })
}
