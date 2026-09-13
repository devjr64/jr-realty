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

vi.mock('@/server/actions/zone.actions', () => ({
  createZoneAction: (...args: unknown[]) => mockCreateAction(...args),
  updateZoneAction: (...args: unknown[]) => mockUpdateAction(...args),
}))

vi.mock('react', async () => {
  const actual = (await vi.importActual('react')) as Record<string, unknown>
  return {
    ...actual,
    useActionState: (...args: unknown[]) =>
      (mockUseActionState as unknown as (...a: unknown[]) => unknown)(...args),
  }
})

import { ZoneForm } from '@/components/admin/zone-form'
import { toast } from 'sonner'

const parentZones = [
  { id: 'pz-1', name: 'Venezuela' },
  { id: 'pz-2', name: 'Los Palos Grandes' },
]

describe('ZoneForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseActionState.mockImplementation(
      () => [{}, mockFormAction, false] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean],
    )
    mockFormAction.mockClear()
    mockCreateAction.mockClear()
    mockUpdateAction.mockClear()
  })

  it('renders create mode with Crear zona button', () => {
    // Arrange & Act
    render(<ZoneForm parentZones={parentZones} />)
    // Assert
    expect(screen.getByRole('button', { name: /Crear zona/i })).toBeInTheDocument()
  })

  it('renders all fields labels in create mode', () => {
    // Arrange & Act
    render(<ZoneForm parentZones={parentZones} />)
    // Assert
    expect(screen.getByLabelText(/^Nombre/i)).toBeInTheDocument()
  })

  it('does not render hidden id in create mode', () => {
    // Arrange & Act
    const { container } = render(<ZoneForm parentZones={parentZones} />)
    // Assert
    expect(container.querySelector('input[name="id"]')).toBeNull()
  })

  it('renders edit mode with hidden id and Guardar cambios', () => {
    // Arrange
    const initial = { id: 'zone-1', name: 'Las Mercedes', description: null, imageUrl: null, parentId: null }
    // Act
    const { container } = render(<ZoneForm parentZones={parentZones} initial={initial} />)
    // Assert
    expect(container.querySelector('input[name="id"]')).toHaveValue('zone-1')
  })

  it('shows Guardar cambios button in edit mode', () => {
    // Arrange
    const initial = { id: 'zone-1', name: 'Las Mercedes', description: 'desc', imageUrl: null, parentId: null }
    // Act
    render(<ZoneForm parentZones={parentZones} initial={initial} />)
    // Assert
    expect(screen.getByRole('button', { name: /Guardar cambios/i })).toBeInTheDocument()
  })

  it('pre-fills name and description in edit mode', () => {
    // Arrange
    const initial = {
      id: 'zone-1',
      name: 'Las Mercedes',
      description: 'Zona exclusiva',
      imageUrl: 'https://example.com/img.jpg',
      parentId: 'pz-1',
    }
    // Act
    render(<ZoneForm parentZones={parentZones} initial={initial} />)
    // Assert
    expect(screen.getByLabelText(/^Nombre/i)).toHaveValue('Las Mercedes')
  })

  it('shows parent zones options', () => {
    // Arrange & Act
    render(<ZoneForm parentZones={parentZones} />)
    // Assert
    expect(screen.getByText('Venezuela')).toBeInTheDocument()
  })

  it('disables inputs and shows Guardando… when pending', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([{}, mockFormAction, true] as unknown as [
      Record<string, unknown>,
      typeof mockFormAction,
      boolean,
    ])
    // Act
    render(<ZoneForm parentZones={parentZones} />)
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
    render(<ZoneForm parentZones={parentZones} />)
    // Assert
    expect(screen.getByLabelText(/^Nombre/i)).toBeDisabled()
  })

  it('displays fieldErrors for name', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([
      { fieldErrors: { name: 'El nombre debe tener al menos 2 caracteres' } },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<ZoneForm parentZones={parentZones} />)
    // Assert
    expect(screen.getByText('El nombre debe tener al menos 2 caracteres')).toBeInTheDocument()
  })

  it('displays fieldErrors for description', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([
      { fieldErrors: { description: 'La descripción no puede superar los 2.000 caracteres' } },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<ZoneForm parentZones={parentZones} />)
    // Assert
    expect(screen.getByText('La descripción no puede superar los 2.000 caracteres')).toBeInTheDocument()
  })

  it('displays fieldErrors for imageUrl', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([
      { fieldErrors: { imageUrl: 'La URL de la imagen es demasiado larga' } },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<ZoneForm parentZones={parentZones} />)
    // Assert
    expect(screen.getByText('La URL de la imagen es demasiado larga')).toBeInTheDocument()
  })

  it('displays fieldErrors for parentId', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([
      { fieldErrors: { parentId: 'La zona padre seleccionada no existe.' } },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<ZoneForm parentZones={parentZones} />)
    // Assert
    expect(screen.getByText('La zona padre seleccionada no existe.')).toBeInTheDocument()
  })

  it('marks name with aria-invalid when fieldError present', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([
      { fieldErrors: { name: 'El nombre debe tener al menos 2 caracteres' } },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<ZoneForm parentZones={parentZones} />)
    // Assert
    expect(screen.getByLabelText(/^Nombre/i)).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows error alert when state.error present', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([
      { error: 'Revisa los campos del formulario.' },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<ZoneForm parentZones={parentZones} />)
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
    render(<ZoneForm parentZones={parentZones} />)
    // Assert
    expect(screen.getByRole('status')).toHaveTextContent('Zona guardada correctamente.')
  })

  it('triggers toast success on state.success', async () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([{ success: true }, mockFormAction, false] as unknown as [
      Record<string, unknown>,
      typeof mockFormAction,
      boolean,
    ])
    // Act
    render(<ZoneForm parentZones={parentZones} />)
    // Assert
    await waitFor(() => expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Zona guardada correctamente.'))
  })

  it('triggers toast error on state.error', async () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([
      { error: 'No se pudo crear la zona. Intenta de nuevo.' },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<ZoneForm parentZones={parentZones} />)
    // Assert
    await waitFor(() => expect(vi.mocked(toast.error)).toHaveBeenCalledWith('No se pudo crear la zona. Intenta de nuevo.'))
  })

  it('fills valid data and submits with FormData containing field values', async () => {
    // Arrange
    const user = userEvent.setup()
    const captured: FormData[] = []
    mockFormAction.mockImplementation(async (...args: unknown[]) => {
      const fd = args.find((a) => a instanceof FormData) as FormData | undefined
      if (fd) captured.push(fd)
      return { success: true } as Record<string, unknown>
    })
    render(<ZoneForm parentZones={parentZones} />)
    // Act
    await user.type(screen.getByLabelText(/^Nombre/i), 'Las Mercedes')
    await user.type(screen.getByLabelText(/Descripción/i), 'Zona exclusiva cerca del mar')
    await user.type(screen.getByLabelText(/URL de imagen/i), 'https://example.com/zone.jpg')
    await user.selectOptions(screen.getByLabelText(/Zona padre/i), 'pz-1')
    await user.click(screen.getByRole('button', { name: /Crear zona/i }))
    // Assert
    await waitFor(() => expect(mockFormAction).toHaveBeenCalled())
    const fd =
      (captured[0] ??
        (mockFormAction.mock.calls[0]?.[1] as FormData | undefined) ??
        (mockFormAction.mock.calls[0]?.[0] as FormData | undefined)) as FormData | undefined
    expect(fd).toBeInstanceOf(FormData)
    expect(fd?.get('name')).toBe('Las Mercedes')
    expect(fd?.get('description')).toBe('Zona exclusiva cerca del mar')
    expect(fd?.get('imageUrl')).toBe('https://example.com/zone.jpg')
    expect(fd?.get('parentId')).toBe('pz-1')
  })

  it('allows submitting without optional description and imageUrl', async () => {
    // Arrange
    const user = userEvent.setup()
    const captured: FormData[] = []
    mockFormAction.mockImplementation(async (...args: unknown[]) => {
      const fd = args.find((a) => a instanceof FormData) as FormData | undefined
      if (fd) captured.push(fd)
      return { success: true } as Record<string, unknown>
    })
    render(<ZoneForm parentZones={parentZones} />)
    // Act
    await user.type(screen.getByLabelText(/^Nombre/i), 'Los Palos Grandes')
    await user.click(screen.getByRole('button', { name: /Crear zona/i }))
    // Assert
    await waitFor(() => expect(mockFormAction).toHaveBeenCalled())
    const fd = captured[0] ?? (mockFormAction.mock.calls[0]?.[0] as FormData | undefined)
    expect(fd?.get('name')).toBe('Los Palos Grandes')
  })

  it('does not toast success when fieldErrors present', async () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([
      { error: 'Revisa los campos del formulario.', fieldErrors: { name: 'El nombre debe tener al menos 2 caracteres' } },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<ZoneForm parentZones={parentZones} />)
    // Assert
    await waitFor(() => expect(vi.mocked(toast.error)).toHaveBeenCalled())
    expect(vi.mocked(toast.success)).not.toHaveBeenCalled()
  })
})
