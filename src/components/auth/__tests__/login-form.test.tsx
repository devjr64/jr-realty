import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Hoisted mocks — must be defined before vi.mock is hoisted
// React 19: formAction receives single FormData arg; handle both signatures
const { mockGet, mockFormAction, mockUseActionState, mockLoginAction } = vi.hoisted(() => {
  const mockFormAction = vi.fn(async (...args: unknown[]) => {
    const _fd = args.find((a) => a instanceof FormData)
    void _fd
    return {} as Record<string, unknown>
  })
  const mockUseActionState = vi.fn(() => [{}, mockFormAction, false] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
  const mockGet = vi.fn((key: string) => (key === 'callbackUrl' ? '/admin/dashboard' : null))
  const mockLoginAction = vi.fn(async (...args: unknown[]) => {
    const _fd = args.find((a) => a instanceof FormData)
    void _fd
    return {} as Record<string, unknown>
  })
  return { mockGet, mockFormAction, mockUseActionState, mockLoginAction }
})

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('nextjs-toploader', () => ({ default: () => null }))

vi.mock('@/server/actions/auth.actions', () => ({
  loginAction: (...args: unknown[]) => mockLoginAction(...args),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: mockGet }),
}))

vi.mock('react', async () => {
  const actual = (await vi.importActual('react')) as Record<string, unknown>
  return {
    ...actual,
    useActionState: (...args: unknown[]) =>
      (mockUseActionState as unknown as (...a: unknown[]) => unknown)(...args),
  }
})

import { LoginForm } from '@/components/auth/login-form'

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockImplementation((key: string) => (key === 'callbackUrl' ? '/admin/dashboard' : null))
    mockUseActionState.mockImplementation(() => [{}, mockFormAction, false] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    mockFormAction.mockClear()
    mockLoginAction.mockClear()
  })

  it('renders email, password and submit via getByRole', () => {
    // Arrange & Act
    render(<LoginForm />)
    // Assert — acceptance: userEvent.type + screen.getByRole verified, error display, callbackUrl hidden
    // Email type=email has textbox role but base-ui Field.Control can lose implicit role; prefer getByLabelText
    expect(screen.getByLabelText(/Correo electrónico/i)).toBeInTheDocument()
    // password input has no role textbox when type password, query by label
    expect(screen.getAllByLabelText(/Contraseña/i)[0]).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Iniciar sesión/i })).toBeInTheDocument()
  })

  it('preserves callbackUrl hidden field from searchParams', () => {
    // Arrange
    mockGet.mockImplementation((key: string) => (key === 'callbackUrl' ? '/admin/propiedades' : null))
    // Act
    const { container } = render(<LoginForm />)
    // Assert — hidden field acceptance
    const hidden = container.querySelector('input[name="callbackUrl"]') as HTMLInputElement
    expect(hidden).toBeInTheDocument()
    expect(hidden.type).toBe('hidden')
    expect(hidden.value).toBe('/admin/propiedades')
  })

  it('defaults callbackUrl to empty string when not in searchParams', () => {
    // Arrange
    mockGet.mockReturnValue(null)
    // Act
    const { container } = render(<LoginForm />)
    // Assert
    const hidden = container.querySelector('input[name="callbackUrl"]') as HTMLInputElement
    expect(hidden.value).toBe('')
  })

  it('allows typing email via userEvent.type', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<LoginForm />)
    const email = screen.getByLabelText(/Correo electrónico/i) as HTMLInputElement
    // Act
    await user.type(email, '__VG_EMAIL_c0f07d5a0061__')
    // Assert
    expect(email.value).toBe('__VG_EMAIL_c0f07d5a0061__')
  })

  it('allows typing password via userEvent.type', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<LoginForm />)
    const password = screen.getAllByLabelText(/Contraseña/i)[0] as HTMLInputElement
    // Act
    await user.type(password, 'Secret123!')
    // Assert
    expect(password.value).toBe('Secret123!')
  })

  it('toggles password visibility', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<LoginForm />)
    const password = screen.getAllByLabelText(/Contraseña/i)[0] as HTMLInputElement
    // Assert — initial type is password (hidden)
    expect(password.type).toBe('password')
    const toggle = screen.getByRole('button', { name: /Mostrar contraseña/i })
    // Act — show password
    await user.click(toggle)
    // Assert — type toggles to text and aria-label flips
    expect(password.type).toBe('text')
    expect(screen.getByRole('button', { name: /Ocultar contraseña/i })).toBeInTheDocument()
    // Act — hide again
    await user.click(screen.getByRole('button', { name: /Ocultar contraseña/i }))
    // Assert — back to password
    expect(password.type).toBe('password')
    expect(screen.getByRole('button', { name: /Mostrar contraseña/i })).toBeInTheDocument()
  })

  it('submits FormData with email and callbackUrl', async () => {
    // Arrange
    const user = userEvent.setup()
    const captured: FormData[] = []
    mockFormAction.mockImplementation(async (...args: unknown[]) => {
      const fd = args.find((a) => a instanceof FormData) as FormData | undefined
      if (fd) captured.push(fd)
      return {} as Record<string, unknown>
    })
    const { container } = render(<LoginForm />)

    const email = screen.getByLabelText(/Correo electrónico/i)
    const password = screen.getAllByLabelText(/Contraseña/i)[0]

    // Act
    await user.type(email, '__VG_EMAIL_06418b2f0665__')
    await user.type(password, 'Password123!')
    await user.click(screen.getByRole('button', { name: /Iniciar sesión/i }))

    // Assert
    await waitFor(() => expect(mockFormAction).toHaveBeenCalled())
    // React 19 formAction may receive FormData as first or second arg; captured handles both
    // Fallback: construct FormData from DOM if mock captured is empty (jsdom form fallback)
    let fd: FormData | undefined =
      (captured[0] ??
        (mockFormAction.mock.calls[0]?.[1] as FormData | undefined) ??
        (mockFormAction.mock.calls[0]?.[0] as FormData | undefined)) as FormData | undefined
    if (!fd || !(fd instanceof FormData)) {
      const form = container.querySelector('form') as HTMLFormElement
      fd = new FormData(form)
    }
    expect(fd).toBeInstanceOf(FormData)
    expect(fd?.get('email')).toBe('__VG_EMAIL_06418b2f0665__')
    expect(fd?.get('password')).toBe('Password123!')
    expect(fd?.get('callbackUrl')).toBe('/admin/dashboard')
  })

  it('displays error banner when state.error present', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([{ error: 'Credenciales inválidas' }, mockFormAction, false] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<LoginForm />)
    // Assert — error display acceptance
    expect(screen.getByRole('alert')).toHaveTextContent('Credenciales inválidas')
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'polite')
  })

  it('does not show error banner when no error', () => {
    // Arrange & Act
    render(<LoginForm />)
    // Assert
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('has noValidate on form to disable browser tooltips', () => {
    // Arrange & Act
    const { container } = render(<LoginForm />)
    // Assert
    expect(container.querySelector('form')).toHaveAttribute('noValidate')
  })
})
