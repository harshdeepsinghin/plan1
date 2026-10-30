import { expect, test } from '@playwright/test'

test.describe('security headers', () => {
  test('sends a restrictive content security policy and hardening headers', async ({ request }) => {
    const response = await request.get('/')
    const headers = response.headers()

    expect(headers['content-security-policy']).toContain("default-src 'self'")
    expect(headers['content-security-policy']).toContain("object-src 'none'")
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'")
    expect(headers['strict-transport-security']).toContain('max-age=63072000')
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['permissions-policy']).toContain('camera=()')
    expect(headers['cross-origin-opener-policy']).toBe('same-origin')
    expect(headers['x-powered-by']).toBeUndefined()
  })

  test('applies headers to static assets', async ({ request }) => {
    const response = await request.get('/icon.svg')
    expect(response.status()).toBe(200)
    expect(response.headers()['x-content-type-options']).toBe('nosniff')
  })
})
