import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BrandLogo } from './logo'

describe('BrandLogo', () => {
  it('renders a labelled home link with the wordmark', () => {
    render(<BrandLogo href="/dashboard" />)

    const link = screen.getByRole('link', { name: 'plan1 home' })
    expect(link).toHaveAttribute('href', '/dashboard')
    expect(link).toHaveTextContent('plan1')
  })

  it('can render without a link or wordmark', () => {
    const { container } = render(<BrandLogo href={null} showWordmark={false} />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(container.querySelector('[aria-label="plan1"]')).toBeInTheDocument()
  })
})
