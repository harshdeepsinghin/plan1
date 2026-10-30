import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const pages = [
  { name: 'landing', path: '/' },
  { name: 'sign in', path: '/auth/login' },
  { name: 'sign up', path: '/auth/signup' },
  { name: 'forgot password', path: '/auth/forgot-password' },
  { name: 'not found', path: '/this-page-does-not-exist' },
]

for (const { name, path } of pages) {
  test(`${name} page has no serious accessibility violations`, async ({ page }) => {
    await page.goto(path)
    await page.waitForLoadState('networkidle')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    const serious = results.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical'
    )

    expect(
      serious,
      serious
        .map(
          (violation) =>
            `${violation.id}: ${violation.help}\n${violation.nodes
              .map((node) => `  ${node.target.join(' ')}`)
              .join('\n')}`
        )
        .join('\n\n')
    ).toEqual([])
  })
}
