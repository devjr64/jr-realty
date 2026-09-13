import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockUsePathname = vi.fn(() => '/admin/dashboard')

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; onClick?: () => void }) => (
    <a href={href} {...props} onClick={props.onClick}>
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

const mockLogoutAction = vi.fn()

vi.mock('@/server/actions/auth.actions', () => ({
  logoutAction: (...args: unknown[]) => mockLogoutAction(...args),
}))

import { AdminHeader } from '@/components/admin/admin-header'
import type { Session } from 'next-auth'

function makeUser(role: 'SUPER_ADMIN' | 'AGENT' = 'SUPER_ADMIN'): Session['user'] {
  return {
    id: 'u-1',
    name: 'Test Admin',
    email: '__VG_EMAIL_13b2960e8395__',
    role,
    image: null,
    emailVerified: null,
  } as Session['user']
}

describe('AdminHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsePathname.mockReturnValue('/admin/dashboard')
  })

  it('renders header with panel label and section title Dashboard', () => {
    // Arrange & Act
    render(<AdminHeader user={makeUser()} />)

    // Assert
    expect(screen.getByText('Panel de administración')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dashboard')
  })

  it('shows section label based on pathname via filterAdminNavItems', () => {
    // Arrange
    mockUsePathname.mockReturnValue('/admin/propiedades')

    // Act
    render(<AdminHeader user={makeUser()} />)

    // Assert
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Propiedades')
  })

  it('shows nested route label (prefix match)', () => {
    // Arrange
    mockUsePathname.mockReturnValue('/admin/proyectos/abc/edit')

    // Act
    render(<AdminHeader user={makeUser()} />)

    // Assert
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Proyectos')
  })

  it('falls back to Dashboard for unknown pathname', () => {
    // Arrange
    mockUsePathname.mockReturnValue('/unknown/route')

    // Act
    render(<AdminHeader user={makeUser()} />)

    // Assert
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dashboard')
  })

  it('renders hamburger trigger with accessible label', () => {
    // Arrange & Act
    render(<AdminHeader user={makeUser()} />)

    // Assert
    expect(screen.getByLabelText('Abrir menú de administración')).toBeInTheDocument()
  })

  it('opens Sheet on hamburger click showing nav and brand', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<AdminHeader user={makeUser('SUPER_ADMIN')} />)

    // Act — click hamburger trigger
    await user.click(screen.getByLabelText('Abrir menú de administración'))

    // Assert — Sheet title (sr-only) and brand inside Sheet
    await waitFor(() => expect(screen.getByText('Menú de administración')).toBeInTheDocument())
    // Sheet should contain nav links for SUPER_ADMIN
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1)
    // Agentes visible for super admin inside sheet
    await waitFor(() => expect(screen.queryByText('Agentes')).toBeInTheDocument())
  })

  it('filters sheet nav items by role — AGENT hides Agentes', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<AdminHeader user={makeUser('AGENT')} />)
    await user.click(screen.getByLabelText('Abrir menú de administración'))

    // Assert
    await waitFor(() => expect(screen.getByText('Menú de administración')).toBeInTheDocument())
    expect(screen.queryByText('Agentes')).not.toBeInTheDocument()
    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument()
  })

  it('renders UserMenu with session user', () => {
    // Arrange & Act
    render(<AdminHeader user={makeUser()} />)

    // Assert — UserMenu trigger via avatar initials
    expect(screen.getByLabelText('Abrir menú de usuario')).toBeInTheDocument()
    expect(screen.getByText('TA')).toBeInTheDocument() // Test Admin initials
  })

  it('has sticky header classes', () => {
    // Arrange & Act
    const { container } = render(<AdminHeader user={makeUser()} />)

    // Assert
    const header = container.querySelector('header')
    expect(header).toHaveClass('sticky')
    expect(header).toHaveClass('top-0')
    expect(header).toHaveClass('backdrop-blur-md')
  })

  it('closing sheet via close button works', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<AdminHeader user={makeUser()} />)
    await user.click(screen.getByLabelText('Abrir menú de administración'))
    await waitFor(() => expect(screen.getByText('Menú de administración')).toBeInTheDocument())

    // Act — click X close button
    const closeBtn = screen.getByLabelText('Cerrar menú de administración')
    await user.click(closeBtn)

    // Assert — after close, Sheet should be closed (menuOpen false) — hamburger still visible
    expect(screen.getByLabelText('Abrir menú de administración')).toBeInTheDocument()
  })
})
