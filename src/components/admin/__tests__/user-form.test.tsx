import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mockFormAction, mockUseActionState, mockCreateAction, mockUpdateAction } = vi.hoisted(() => {
  const mockFormAction = vi.fn(async (...args: unknown[]) => {
    const _fd = args.find((a) => a instanceof FormData)
    void _fd
    return { success: true } as Record<string, unknown>
  })
  const mockUseActionState = vi.fn(
    () => [{}, mockFormAction, false] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean],
  )
  const mockCreateAction = vi.fn(async (...args: unknown[]) => {
    const _fd = args.find((a) => a instanceof FormData)
    void _fd
    return { success: true } as Record<string, unknown>
  })
  const mockUpdateAction = vi.fn(async (...args: unknown[]) => {
    const _fd = args.find((a) => a instanceof FormData)
    void _fd
    return { success: true } as Record<string, unknown>
  })
  return { mockFormAction, mockUseActionState, mockCreateAction, mockUpdateAction }
})

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

vi.mock('@/server/actions/user.actions', () => ({
  createUserAction: (...args: unknown[]) => mockCreateAction(...args),
  updateUserAction: (...args: unknown[]) => mockUpdateAction(...args),
}))

vi.mock('react', async () => {
  const actual = (await vi.importActual('react')) as Record<string, unknown>
  return {
    ...actual,
    useActionState: (...args: unknown[]) =>
      (mockUseActionState as unknown as (...a: unknown[]) => unknown)(...args),
  }
})

import { UserForm } from '@/components/admin/user-form'

describe('UserForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseActionState.mockImplementation(
      () => [{}, mockFormAction, false] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean],
    )
  })

  it('renders name, email, role and active fields in create mode', () => {
    // Arrange & Act
    render(<UserForm initial={null} />)
    // Assert
    expect(screen.getByLabelText(/Nombre completo/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Correo electrónico/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Rol/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Contraseña/i)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Usuario activo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Crear usuario/i })).toBeInTheDocument()
  })

  it('shows password required hint in create vs optional in edit', () => {
    // Arrange & Act - create
    const { rerender } = render(<UserForm initial={null} />)
    expect(screen.getByLabelText(/Contraseña/i)).toBeRequired()
    expect(screen.getByText(/Contraseña/)).toBeInTheDocument()
    // Edit mode
    rerender(
      <UserForm
        initial={{ id: 'u1', name: 'Juan', email: 'juan@test.com', role: 'AGENT', active: true }}
      />,
    )
    expect(screen.getByLabelText(/Nueva contraseña/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Nueva contraseña/i)).not.toBeRequired()
    expect(screen.getByPlaceholderText(/Dejar en blanco/)).toBeInTheDocument()
  })

  it('renders role options SUPER_ADMIN and AGENT and selects AGENT', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<UserForm initial={{ name: 'Ana', email: 'ana@test.com', role: 'AGENT', active: true }} />)
    const select = screen.getByLabelText(/^Rol/i) as HTMLSelectElement
    // Assert - options present
    expect(screen.getByRole('option', { name: 'Super Admin' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Agente' })).toBeInTheDocument()
    expect(select.value).toBe('AGENT')
    // Act - switch to SUPER_ADMIN
    await user.selectOptions(select, 'SUPER_ADMIN')
    expect(select.value).toBe('SUPER_ADMIN')
  })

  it('renders SUPER_ADMIN initial and defaults CLIENT when empty', () => {
    // Arrange & Act — render with SUPER_ADMIN initial
    const { unmount } = render(
      <UserForm initial={{ name: 'Admin', email: 'admin@test.com', role: 'SUPER_ADMIN', active: true }} />,
    )
    // Assert
    expect((screen.getByLabelText(/^Rol/i) as HTMLSelectElement).value).toBe('SUPER_ADMIN')
    // No initial -> defaults CLIENT (fresh render to reset state)
    unmount()
    render(<UserForm initial={null} />)
    expect((screen.getByLabelText(/^Rol/i) as HTMLSelectElement).value).toBe('CLIENT')
  })

  it('allows typing name and email', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<UserForm initial={null} />)
    const name = screen.getByLabelText(/Nombre completo/i) as HTMLInputElement
    const email = screen.getByLabelText(/Correo electrónico/i) as HTMLInputElement
    // Act
    await user.type(name, 'Juan Pérez')
    await user.type(email, 'juan@example.com')
    // Assert
    expect(name.value).toBe('Juan Pérez')
    expect(email.value).toBe('juan@example.com')
  })

  it('toggles active checkbox', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<UserForm initial={null} />)
    const checkbox = screen.getByRole('checkbox', { name: /Usuario activo/i }) as HTMLInputElement
    // Act & Assert - default true
    expect(checkbox.checked).toBe(true)
    await user.click(checkbox)
    expect(checkbox.checked).toBe(false)
    await user.click(checkbox)
    expect(checkbox.checked).toBe(true)
  })

  it('fills and submits via userEvent triggers formAction with FormData', async () => {
    // Arrange
    const user = userEvent.setup()
    const captured: FormData[] = []
    mockFormAction.mockImplementation(async (...args: unknown[]) => {
      const fd = args.find((a) => a instanceof FormData) as FormData | undefined
      if (fd) captured.push(fd)
      return { success: true } as Record<string, unknown>
    })
    render(<UserForm initial={null} />)
    // Act
    await user.type(screen.getByLabelText(/Nombre completo/i), 'María García')
    await user.type(screen.getByLabelText(/Correo electrónico/i), 'maria@test.com')
    await user.type(screen.getByLabelText(/Contraseña/i), 'Secret123!')
    await user.selectOptions(screen.getByLabelText(/^Rol/i), 'AGENT')
    // Phone field appears when role is AGENT — fill it in
    await user.type(screen.getByLabelText(/Teléfono/i), '+58 212-555-1234')
    await user.click(screen.getByRole('button', { name: /Crear usuario/i }))
    // Assert
    await waitFor(() => expect(mockFormAction).toHaveBeenCalled())
    const fd =
      (captured[0] ??
        (mockFormAction.mock.calls[0]?.[1] as FormData | undefined) ??
        (mockFormAction.mock.calls[0]?.[0] as FormData | undefined)) as FormData | undefined
    expect(fd).toBeInstanceOf(FormData)
    expect(fd?.get('name')).toBe('María García')
    expect(fd?.get('email')).toBe('maria@test.com')
    expect(fd?.get('role')).toBe('AGENT')
  })

  it('shows fieldErrors under inputs and alert role', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([
      {
        error: 'Revisa los campos del formulario.',
        fieldErrors: {
          name: 'El nombre debe tener al menos 2 caracteres',
          email: 'Ingresa un correo electrónico válido',
          role: 'Selecciona un rol válido',
        },
      },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<UserForm initial={null} />)
    // Assert
    expect(screen.getByText('El nombre debe tener al menos 2 caracteres')).toBeInTheDocument()
    expect(screen.getByText('Ingresa un correo electrónico válido')).toBeInTheDocument()
    expect(screen.getByText('Selecciona un rol válido')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Revisa los campos del formulario.')
    expect(screen.getByLabelText(/Nombre completo/i)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText(/Correo electrónico/i)).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows success banner', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([{ success: true }, mockFormAction, false] as unknown as [
      Record<string, unknown>,
      typeof mockFormAction,
      boolean,
    ])
    // Act
    render(<UserForm initial={null} />)
    // Assert
    expect(screen.getByRole('status')).toHaveTextContent('Usuario guardado correctamente.')
  })

  it('disables inputs when pending and shows Guardando', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([{}, mockFormAction, true] as unknown as [
      Record<string, unknown>,
      typeof mockFormAction,
      boolean,
    ])
    // Act
    render(<UserForm initial={null} />)
    // Assert
    expect(screen.getByLabelText(/Nombre completo/i)).toBeDisabled()
    expect(screen.getByLabelText(/Correo electrónico/i)).toBeDisabled()
    expect(screen.getByRole('button', { name: /Guardando/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Guardando/i })).toHaveAttribute('aria-busy', 'true')
  })

  it('edit mode renders hidden id and Guardar cambios', () => {
    // Arrange
    const initial = { id: 'user-1', name: 'Juan', email: 'juan@test.com', role: 'SUPER_ADMIN' as const, active: false }
    // Act
    const { container } = render(<UserForm initial={initial} />)
    // Assert
    expect(container.querySelector('input[name="id"]')).toHaveValue('user-1')
    expect(screen.getByRole('button', { name: /Guardar cambios/i })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Usuario activo/i })).not.toBeChecked()
  })
})
