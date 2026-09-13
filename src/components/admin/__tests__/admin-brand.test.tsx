import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: Record<string, unknown>) => {
    const { src, alt, width, height, className, priority: _p, ...rest } = props as {
      src: string
      alt: string
      width: number
      height: number
      className?: string
      priority?: boolean
    }
    return (
      // @ts-expect-error — mocked img spread
      <img src={src} alt={alt} width={width} height={height} className={className} {...rest} />
    )
  },
}))

import { AdminBrand } from '@/components/admin/admin-brand'

describe('AdminBrand', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders logo image with correct src and alt', () => {
    // Arrange & Act
    const { container } = render(<AdminBrand />)
    // Assert — alt="" is decorative (presentation), query via img element directly
    const img = container.querySelector('img') as HTMLImageElement
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', '/images/logo.svg')
    expect(img).toHaveAttribute('alt', '')
    expect(img).toHaveAttribute('width', '36')
    expect(img).toHaveAttribute('height', '36')
  })

  it('applies object-contain and chip classes to logo', () => {
    // Arrange & Act
    const { container } = render(<AdminBrand />)
    // Assert
    const img = container.querySelector('img') as HTMLImageElement
    expect(img).toHaveClass('object-contain')
    expect(img).toHaveClass('size-full')
  })

  it('renders wordmark JR Realty', () => {
    // Arrange & Act
    render(<AdminBrand />)

    // Assert — heading text split across spans but combined visible
    expect(screen.getByText(/JR Realty/)).toBeInTheDocument()
    expect(screen.getByText('Venezuela')).toBeInTheDocument()
  })

  it('has flex container with gap-3', () => {
    // Arrange & Act
    const { container } = render(<AdminBrand />)

    // Assert — root div
    const root = container.firstChild as HTMLElement
    expect(root).toHaveClass('flex')
    expect(root).toHaveClass('gap-3')
  })

  it('logo chip has cream background and rounded-md', () => {
    // Arrange & Act
    const { container } = render(<AdminBrand />)

    // Assert — chip span
    const chip = container.querySelector('span.flex.size-9')
    expect(chip).toBeInTheDocument()
    expect(chip).toHaveClass('bg-background')
    expect(chip).toHaveClass('rounded-md')
  })

  it('wordmark uses heading font and sidebar foreground', () => {
    // Arrange & Act
    const { container } = render(<AdminBrand />)
    // Assert — wordmark span itself carries font-heading (not its parent flex div)
    const wordmark = container.querySelector('span.font-heading') as HTMLElement
    expect(wordmark).toBeInTheDocument()
    expect(wordmark).toHaveClass('font-heading')
    expect(wordmark).toHaveClass('text-sidebar-foreground')
    expect(wordmark.textContent).toContain('JR Realty')
  })
})
