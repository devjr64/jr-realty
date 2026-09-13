import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const mockUsePathname = vi.fn(() => '/admin/dashboard')

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { src, alt, width, height, className } = props as {
      src: string
      alt: string
      width: number
      height: number
      className?: string
    }
    return <img src={src} alt={alt} width={width} height={height} className={className} />
  },
}))

import { Sidebar } from '@/components/admin/sidebar'

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsePathname.mockReturnValue('/admin/dashboard')
  })

  it('renders aside with sidebar styling', () => {
    // Arrange & Act
    const { container } = render(<Sidebar role="SUPER_ADMIN" />)

    // Assert
    const aside = container.querySelector('aside')
    expect(aside).toBeInTheDocument()
    expect(aside).toHaveClass('hidden')
    expect(aside).toHaveClass('lg:flex')
    expect(aside).toHaveClass('bg-sidebar')
  })

  it('renders AdminBrand link to dashboard', () => {
    // Arrange & Act
    render(<Sidebar role="SUPER_ADMIN" />)

    // Assert — brand link
    const brandLink = screen.getByLabelText('JR Realty — Panel de administración')
    expect(brandLink).toBeInTheDocument()
    expect(brandLink).toHaveAttribute('href', '/admin/dashboard')
    expect(screen.getByText(/JR Realty/)).toBeInTheDocument()
  })

  it('renders all nav items for SUPER_ADMIN', () => {
    // Arrange & Act
    render(<Sidebar role="SUPER_ADMIN" />)

    // Assert — 10 admin links + Ver sitio (+ brand link)
    expect(screen.getByText('Agentes')).toBeInTheDocument()
    expect(screen.getByText('Usuarios')).toBeInTheDocument()
    expect(screen.getByText('Propiedades')).toBeInTheDocument()
    expect(screen.getByText('Configuración')).toBeInTheDocument()
  })

  it('filters nav items for AGENT — hides Agentes and Usuarios', () => {
    // Arrange & Act
    render(<Sidebar role="AGENT" />)

    // Assert
    expect(screen.queryByText('Agentes')).not.toBeInTheDocument()
    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument()
    expect(screen.getByText('Propiedades')).toBeInTheDocument()
    expect(screen.getByText('Leads')).toBeInTheDocument()
  })

  it('highlights active nav item via aria-current page', () => {
    // Arrange
    mockUsePathname.mockReturnValue('/admin/propiedades')

    // Act
    render(<Sidebar role="SUPER_ADMIN" />)

    // Assert — Propiedades link should have aria-current page
    const activeLink = screen.getByRole('link', { name: /Propiedades/ })
    expect(activeLink).toHaveAttribute('aria-current', 'page')
    expect(activeLink).toHaveClass('bg-sidebar-primary')
  })

  it('highlights nested active route (prefix match)', () => {
    // Arrange
    mockUsePathname.mockReturnValue('/admin/propiedades/123/edit')

    // Act
    render(<Sidebar role="AGENT" />)

    // Assert
    const link = screen.getByRole('link', { name: /Propiedades/ })
    expect(link).toHaveAttribute('aria-current', 'page')
  })

  it('renders Ver sitio link to homepage', () => {
    // Arrange & Act
    render(<Sidebar role="AGENT" />)

    // Assert
    const verSitio = screen.getByRole('link', { name: /Ver sitio/ })
    expect(verSitio).toBeInTheDocument()
    expect(verSitio).toHaveAttribute('href', '/')
  })

  it('nav has accessible label Navegación del panel', () => {
    // Arrange & Act
    render(<Sidebar role="SUPER_ADMIN" />)

    // Assert
    expect(screen.getByLabelText('Navegación del panel')).toBeInTheDocument()
  })

  it('applies espresso sidebar tokens to aside and nav', () => {
    // Arrange & Act
    const { container } = render(<Sidebar role="SUPER_ADMIN" />)

    // Assert — border token
    expect(container.querySelector('aside')).toHaveClass('border-sidebar-border')
    expect(container.querySelector('nav')).toHaveClass('overflow-y-auto')
  })
})
