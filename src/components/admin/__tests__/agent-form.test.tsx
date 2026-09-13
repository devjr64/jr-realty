import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mockFormAction, mockUseActionState, mockCreateAction, mockUpdateAction } = vi.hoisted(() => {
  const mockFormAction = vi.fn(async (...args: unknown[]) => {
    const fd = args.find((a) => a instanceof FormData)
    void fd
    return { success: true } as Record<string, unknown>
  })
  const mockUseActionState = vi.fn(
    () => [{}, mockFormAction, false] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean],
  )
  const mockCreateAction = vi.fn(async (...args: unknown[]) => {
    const fd = args.find((a) => a instanceof FormData)
    void fd
    return { success: true } as Record<string, unknown>
  })
  const mockUpdateAction = vi.fn(async (...args: unknown[]) => {
    const fd = args.find((a) => a instanceof FormData)
    void fd
    return { success: true } as Record<string, unknown>
  })
  return { mockFormAction, mockUseActionState, mockCreateAction, mockUpdateAction }
})

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

vi.mock('@/server/actions/agent.actions', () => ({
  createAgentAction: (...args: unknown[]) => mockCreateAction(...args),
  updateAgentAction: (...args: unknown[]) => mockUpdateAction(...args),
}))

vi.mock('react', async () => {
  const actual = (await vi.importActual('react')) as Record<string, unknown>
  return {
    ...actual,
    useActionState: (...args: unknown[]) =>
      (mockUseActionState as unknown as (...a: unknown[]) => unknown)(...args),
  }
})

import { AgentForm } from '@/components/admin/agent-form'
import { toast } from 'sonner'

describe('AgentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseActionState.mockImplementation(
      () => [{}, mockFormAction, false] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean],
    )
    mockFormAction.mockClear()
    mockCreateAction.mockClear()
    mockUpdateAction.mockClear()
  })

  it('renders create mode with all fields and Crear agente button', () => {
    // Arrange & Act
    render(<AgentForm />)
    // Assert
    expect(screen.getByRole('button', { name: /Crear agente/i })).toBeInTheDocument()
  })

  it('shows required labels for name, email and phone in create mode', () => {
    // Arrange & Act
    render(<AgentForm />)
    // Assert
    expect(screen.getByLabelText(/Nombre completo/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Correo electrónico/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Teléfono/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Nombre completo/i)).toBeRequired()
  })

  it('shows password required label in create mode', () => {
    // Arrange & Act
    render(<AgentForm />)
    // Assert
    expect(screen.getByLabelText(/Contraseña/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Contraseña/i)).toBeRequired()
  })

  it('does not render hidden id input in create mode', () => {
    // Arrange & Act
    const { container } = render(<AgentForm />)
    // Assert
    expect(container.querySelector('input[name="id"]')).toBeNull()
  })

  it('renders edit mode with hidden id and Guardar cambios', () => {
    // Arrange
    const initial = {
      id: 'agent-123',
      name: 'Andreína Salas',
      email: 'andrea@example.com',
      title: 'Asesor',
      phone: '+58 212-555-0000',
      whatsapp: '+58 212-555-0001',
      active: true,
    }
    // Act
    const { container } = render(<AgentForm initial={initial} />)
    // Assert
    expect(container.querySelector('input[name="id"]')).toHaveValue('agent-123')
  })

  it('shows Guardar cambios button in edit mode', () => {
    // Arrange
    const initial = {
      id: 'agent-123',
      name: 'Andreína Salas',
      email: 'andrea@example.com',
      title: null,
      phone: '+58 212-555-0000',
      whatsapp: null,
      active: false,
    }
    // Act
    render(<AgentForm initial={initial} />)
    // Assert
    expect(screen.getByRole('button', { name: /Guardar cambios/i })).toBeInTheDocument()
  })

  it('shows optional password label in edit mode', () => {
    // Arrange
    const initial = {
      id: 'agent-123',
      name: 'Andrea',
      email: 'a@b.com',
      title: null,
      phone: '+58 212-555-0000',
      whatsapp: null,
      active: true,
    }
    // Act
    render(<AgentForm initial={initial} />)
    // Assert
    expect(screen.getByLabelText(/Nueva contraseña/i)).toBeInTheDocument()
  })

  it('disables inputs and shows Guardando… when pending', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([{}, mockFormAction, true] as unknown as [
      Record<string, unknown>,
      typeof mockFormAction,
      boolean,
    ])
    // Act
    render(<AgentForm />)
    // Assert
    expect(screen.getByRole('button', { name: /Guardando…/i })).toBeInTheDocument()
  })

  it('disables name input when pending', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([{}, mockFormAction, true] as unknown as [
      Record<string, unknown>,
      typeof mockFormAction,
      boolean,
    ])
    // Act
    render(<AgentForm />)
    // Assert
    expect(screen.getByLabelText(/Nombre completo/i)).toBeDisabled()
  })

  it('displays fieldErrors for name via FormField', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([
      { error: 'Revisa los campos', fieldErrors: { name: 'El nombre debe tener al menos 2 caracteres' } },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<AgentForm />)
    // Assert
    expect(screen.getByText('El nombre debe tener al menos 2 caracteres')).toBeInTheDocument()
  })

  it('displays fieldErrors for email and marks aria-invalid', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([
      { fieldErrors: { email: 'Ingresa un correo electrónico válido' } },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<AgentForm />)
    // Assert
    expect(screen.getByLabelText(/Correo electrónico/i)).toHaveAttribute('aria-invalid', 'true')
  })

  it('displays fieldErrors for phone', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([
      { fieldErrors: { phone: 'Ingresa un teléfono válido' } },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<AgentForm />)
    // Assert
    expect(screen.getByText('Ingresa un teléfono válido')).toBeInTheDocument()
  })

  it('displays fieldErrors for password', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([
      { fieldErrors: { password: 'La contraseña debe tener al menos 8 caracteres' } },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<AgentForm />)
    // Assert
    expect(screen.getByText('La contraseña debe tener al menos 8 caracteres')).toBeInTheDocument()
  })

  it('displays fieldErrors for whatsapp', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([
      { fieldErrors: { whatsapp: 'WhatsApp inválido' } },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<AgentForm />)
    // Assert
    expect(screen.getByText('WhatsApp inválido')).toBeInTheDocument()
  })

  it('displays fieldErrors for title', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([
      { fieldErrors: { title: 'El cargo no puede superar los 100 caracteres' } },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<AgentForm />)
    // Assert
    expect(screen.getByText('El cargo no puede superar los 100 caracteres')).toBeInTheDocument()
  })

  it('shows error alert when state.error present', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([
      { error: 'Revisa los campos del formulario.' },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<AgentForm />)
    // Assert
    expect(screen.getByRole('alert')).toHaveTextContent('Revisa los campos del formulario.')
  })

  it('shows success banner when state.success true', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([{ success: true }, mockFormAction, false] as unknown as [
      Record<string, unknown>,
      typeof mockFormAction,
      boolean,
    ])
    // Act
    render(<AgentForm />)
    // Assert
    expect(screen.getByRole('status')).toHaveTextContent('Agente guardado correctamente.')
  })

  it('triggers toast success on state.success via useEffect', async () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([{ success: true }, mockFormAction, false] as unknown as [
      Record<string, unknown>,
      typeof mockFormAction,
      boolean,
    ])
    // Act
    render(<AgentForm />)
    // Assert
    await waitFor(() => expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Agente guardado correctamente.'))
  })

  it('triggers toast error on state.error via useEffect', async () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([
      { error: 'No se pudo crear el agente. Intenta de nuevo.' },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<AgentForm />)
    // Assert
    await waitFor(() =>
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith('No se pudo crear el agente. Intenta de nuevo.'),
    )
  })

  it('fills valid data and submits calls formAction with FormData containing values', async () => {
    // Arrange
    const user = userEvent.setup()
    const captured: FormData[] = []
    mockFormAction.mockImplementation(async (...args: unknown[]) => {
      const fd = args.find((a) => a instanceof FormData) as FormData | undefined
      if (fd) captured.push(fd)
      return { success: true } as Record<string, unknown>
    })
    const { container } = render(<AgentForm />)
    void container

    // Act
    await user.type(screen.getByLabelText(/Nombre completo/i), 'Andreína Salas')
    await user.type(screen.getByLabelText(/Correo electrónico/i), 'andrea@example.com')
    await user.type(screen.getByLabelText(/Contraseña/i), 'Secret123!')
    await user.type(screen.getByLabelText(/Cargo/i), 'Asesora')
    await user.type(screen.getByLabelText(/^Teléfono/i), '+58 212-555-0000')
    await user.type(screen.getByLabelText(/WhatsApp/i), '+58 212-555-0001')
    await user.click(screen.getByRole('button', { name: /Crear agente/i }))

    // Assert
    await waitFor(() => expect(mockFormAction).toHaveBeenCalled())
    const fd =
      (captured[0] ??
        (mockFormAction.mock.calls[0]?.[1] as FormData | undefined) ??
        (mockFormAction.mock.calls[0]?.[0] as FormData | undefined)) as FormData | undefined
    expect(fd).toBeInstanceOf(FormData)
    expect(fd?.get('name')).toBe('Andreína Salas')
    expect(fd?.get('email')).toBe('andrea@example.com')
    expect(fd?.get('phone')).toBe('+58 212-555-0000')
    expect(fd?.get('whatsapp')).toBe('+58 212-555-0001')
    expect(fd?.get('title')).toBe('Asesora')
  })

  it('includes active checkbox value on submit', async () => {
    // Arrange
    const user = userEvent.setup()
    const captured: FormData[] = []
    mockFormAction.mockImplementation(async (...args: unknown[]) => {
      const fd = args.find((a) => a instanceof FormData) as FormData | undefined
      if (fd) captured.push(fd)
      return { success: true } as Record<string, unknown>
    })
    render(<AgentForm />)
    // Act
    await user.type(screen.getByLabelText(/Nombre completo/i), 'Juan Perez')
    await user.type(screen.getByLabelText(/Correo electrónico/i), 'juan@example.com')
    await user.type(screen.getByLabelText(/Contraseña/i), 'Password1!')
    await user.type(screen.getByLabelText(/^Teléfono/i), '+58 212-555-0002')
    // active is checked by default
    await user.click(screen.getByRole('button', { name: /Crear agente/i }))
    // Assert
    await waitFor(() => expect(mockFormAction).toHaveBeenCalled())
    const fd = captured[0] ?? (mockFormAction.mock.calls[0]?.[0] as FormData | undefined)
    expect(fd?.get('active')).toBe('on')
  })

  it('toggles active checkbox off and submits without active value', async () => {
    // Arrange
    const user = userEvent.setup()
    const captured: FormData[] = []
    mockFormAction.mockImplementation(async (...args: unknown[]) => {
      const fd = args.find((a) => a instanceof FormData) as FormData | undefined
      if (fd) captured.push(fd)
      return { success: true } as Record<string, unknown>
    })
    render(<AgentForm />)
    const active = screen.getByLabelText(/Agente activo/i) as HTMLInputElement
    // Act
    expect(active.checked).toBe(true)
    await user.click(active)
    await user.type(screen.getByLabelText(/Nombre completo/i), 'Ana Lopez')
    await user.type(screen.getByLabelText(/Correo electrónico/i), 'ana@example.com')
    await user.type(screen.getByLabelText(/Contraseña/i), 'Password1!')
    await user.type(screen.getByLabelText(/^Teléfono/i), '+58 212-555-0003')
    await user.click(screen.getByRole('button', { name: /Crear agente/i }))
    // Assert
    await waitFor(() => expect(mockFormAction).toHaveBeenCalled())
    const fd = captured[0] ?? (mockFormAction.mock.calls[0]?.[0] as FormData | undefined)
    expect(fd?.get('active')).toBeNull()
  })

  it('renders active default true when no initial', () => {
    // Arrange & Act
    render(<AgentForm />)
    // Assert
    expect(screen.getByLabelText(/Agente activo/i)).toBeChecked()
  })

  it('renders active false when initial active false', () => {
    // Arrange
    const initial = {
      id: 'a-1',
      name: 'X',
      email: 'x@x.com',
      title: null,
      phone: '+58 212-555-0000',
      whatsapp: null,
      active: false,
    }
    // Act
    render(<AgentForm initial={initial} />)
    // Assert
    expect(screen.getByLabelText(/Agente activo/i)).not.toBeChecked()
  })

  it('does not toast success when fieldErrors present (invalid)', async () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([
      { error: 'Revisa los campos del formulario.', fieldErrors: { name: 'El nombre debe tener al menos 2 caracteres' } },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<AgentForm />)
    // Assert — error toast called, success not called
    await waitFor(() => expect(vi.mocked(toast.error)).toHaveBeenCalled())
    expect(vi.mocked(toast.success)).not.toHaveBeenCalled()
  })
})
