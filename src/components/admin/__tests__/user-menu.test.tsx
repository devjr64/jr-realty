import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// next/link → plain anchor (no router needed in unit tests)
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    // eslint-disable-next-line jsx-a11y/anchor-has-content
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const mockLogoutAction = vi.fn(async () => { })

vi.mock('@/server/actions/auth.actions', () => ({
  logoutAction: (...args: unknown[]) => mockLogoutAction(...args),
}))

/**
 * Mock the shadcn/Base UI dropdown wrapper. Rationale:
 * - Base UI's menu-open path livelocks in native code under vitest+jsdom
 *   (Node 24 + @base-ui/react 1.7): each trigger click stalls ~50-70s.
 * - Per vitest.config.ts, `src/components/ui/**` is vendor UI — unit tests
 *   cover UserMenu's own logic; real open/close interaction belongs to E2E.
 * The stubs render the `render` prop element with children, so the DOM keeps
 * the same shape UserMenu produces (Button trigger, <a> link, submit button).
 */
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children, render }: { children: React.ReactNode; render: React.ReactElement }) =>
    React.cloneElement(render, {}, children),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({ children, render }: { children: React.ReactNode; render: React.ReactElement }) =>
    React.cloneElement(render, {}, children),
}))

import { UserMenu } from '@/components/admin/user-menu'
import type { Session } from 'next-auth'

function makeUser(overrides: Partial<Session['user']> = {}): Session['user'] {
  return {
    id: 'user-1',
    name: 'Ana García',
    email: 'ana@example.com',
    role: 'SUPER_ADMIN',
    image: null,
    emailVerified: null,
    ...overrides,
  } as Session['user']
}

describe('UserMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders trigger with avatar initials and name', () => {
    // Arrange
    const user = makeUser({ name: 'Ana García' })

    // Act
    render(<UserMenu user={user} />)

    // Assert — initials AG, trigger label; name renders in trigger + menu label
    expect(screen.getByLabelText('Abrir menú de usuario')).toBeInTheDocument()
    expect(screen.getByText('AG')).toBeInTheDocument()
    expect(screen.getAllByText('Ana García').length).toBeGreaterThanOrEqual(1)
  })

  it('shows MC initials when name is null', () => {
    // Arrange
    const user = makeUser({ name: null })

    // Act
    render(<UserMenu user={user} />)

    // Assert — 'Usuario' renders in trigger + menu label
    expect(screen.getByText('MC')).toBeInTheDocument()
    expect(screen.getAllByText('Usuario').length).toBeGreaterThanOrEqual(1)
  })

  it('shows single initial for single-word name', () => {
    // Arrange
    const user = makeUser({ name: 'Valentina' })

    // Act
    render(<UserMenu user={user} />)

    // Assert
    expect(screen.getByText('V')).toBeInTheDocument()
  })

  it('handles extra spaces and limits to 2 initials', () => {
    // Arrange
    const user = makeUser({ name: '  Ana   María  López  ' })

    // Act
    render(<UserMenu user={user} />)

    // Assert — first two parts Ana + María => AM
    expect(screen.getByText('AM')).toBeInTheDocument()
  })

  it('shows email and role badge SUPER_ADMIN', () => {
    // Arrange — name differs from badge text so getByText stays unambiguous
    const sessionUser = makeUser({
      role: 'SUPER_ADMIN',
      email: 'super@example.com',
      name: 'Root User',
    })

    // Act
    render(<UserMenu user={sessionUser} />)

    // Assert
    expect(screen.getByText('super@example.com')).toBeInTheDocument()
    expect(screen.getByText('Super Admin')).toBeInTheDocument() // badge
  })

  it('shows Agente badge for AGENT role', () => {
    // Arrange
    const sessionUser = makeUser({ role: 'AGENT', name: 'Agent One', email: 'agent@example.com' })

    // Act
    render(<UserMenu user={sessionUser} />)

    // Assert
    expect(screen.getByText('Agente')).toBeInTheDocument()
    expect(screen.queryByText('Super Admin')).not.toBeInTheDocument()
  })

  it('renders Ver sitio link pointing to /', () => {
    // Arrange & Act
    render(<UserMenu user={makeUser()} />)

    // Assert
    const link = screen.getByText('Ver sitio').closest('a')
    expect(link).toHaveAttribute('href', '/')
  })

  it('renders Cerrar sesión submit button inside form with logoutAction', () => {
    // Arrange & Act
    render(<UserMenu user={makeUser()} />)

    // Assert — logout item renders a submit <button> wrapped in a <form>.
    // Note: in the real DOM Base UI gives it role="menuitem" (ARIA-correct for
    // menu items); the stub keeps the plain button semantics.
    const btn = screen.getByRole('button', { name: /Cerrar sesión/ })
    expect(btn.tagName).toBe('BUTTON')
    expect(btn).toHaveAttribute('type', 'submit')
    expect(btn.closest('form')).toBeInTheDocument()
  })

  it('trigger has avatar fallback with primary styling', () => {
    // Arrange & Act
    const { container } = render(<UserMenu user={makeUser({ name: 'John Doe' })} />)

    // Assert — AvatarFallback classes
    const fallback = container.querySelector('.bg-primary\\/15')
    expect(fallback).toBeInTheDocument()
    expect(fallback).toHaveTextContent('JD')
  })

  it('renders email truncated and badge w-fit', () => {
    // Arrange & Act
    render(<UserMenu user={makeUser({ email: 'very-long-email-address@example.com' })} />)

    // Assert
    const emailEl = screen.getByText('very-long-email-address@example.com')
    expect(emailEl).toHaveClass('truncate')
    const badge = screen.getByText('Super Admin')
    expect(badge).toHaveClass('w-fit')
  })
})
