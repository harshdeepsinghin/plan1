import { expect, test } from '@playwright/test'

test.describe('public pages', () => {
  test('landing page presents the product and primary actions', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveTitle(/plan1/)
    await expect(
      page.getByRole('heading', { level: 1, name: 'One plan for the whole event.' })
    ).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Create an account' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Sign in', exact: true }).first()).toBeVisible()
  })

  test('skip link is the first keyboard stop and targets main content', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Tab')

    const skipLink = page.getByRole('link', { name: 'Skip to content' })
    await expect(skipLink).toBeFocused()
    await expect(skipLink).toHaveAttribute('href', '#main-content')
    await expect(page.locator('main#main-content')).toHaveCount(1)
  })

  test('sign in page exposes labelled fields', async ({ page }) => {
    await page.goto('/auth/login')

    await expect(page.getByRole('heading', { name: 'Sign in to plan1' })).toBeAttached()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeEnabled()
  })

  test('sign up page exposes labelled fields', async ({ page }) => {
    await page.goto('/auth/signup')

    await expect(page.getByLabel('Full name')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByLabel('Confirm')).toBeVisible()
  })

  test('forgot password page exposes a reset form', async ({ page }) => {
    await page.goto('/auth/forgot-password')

    await expect(page.getByRole('heading', { name: 'Reset your plan1 password' })).toBeAttached()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByRole('button', { name: /send|reset/i })).toBeEnabled()
  })

  test('unknown routes render the not-found page', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist')
    expect(response?.status()).toBe(404)

    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Go to dashboard' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Back home' })).toBeVisible()
  })

  test('protected pages redirect anonymous visitors to sign in', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})
