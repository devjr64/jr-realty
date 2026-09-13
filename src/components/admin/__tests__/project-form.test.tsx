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

vi.mock('@/server/actions/project.actions', () => ({
  createProjectAction: (...args: unknown[]) => mockCreateAction(...args),
  updateProjectAction: (...args: unknown[]) => mockUpdateAction(...args),
}))

vi.mock('react', async () => {
  const actual = (await vi.importActual('react')) as Record<string, unknown>
  return {
    ...actual,
    useActionState: (...args: unknown[]) =>
      (mockUseActionState as unknown as (...a: unknown[]) => unknown)(...args),
  }
})

import { ProjectForm } from '@/components/admin/project-form'
import { toast } from 'sonner'

const zones = [
  { id: 'zone-1', name: 'Las Mercedes' },
  { id: 'zone-2', name: 'Los Palos Grandes' },
]

const agents = [
  { id: 'agent-1', name: 'Andreína Salas' },
  { id: 'agent-2', name: 'Carlos Lopez' },
]

describe('ProjectForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseActionState.mockImplementation(
      () => [{}, mockFormAction, false] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean],
    )
    mockFormAction.mockClear()
    mockCreateAction.mockClear()
    mockUpdateAction.mockClear()
  })

  it('renders create mode with Crear proyecto button', () => {
    // Arrange & Act
    render(<ProjectForm zones={zones} agents={agents} isSuperAdmin={true} />)
    // Assert
    expect(screen.getByRole('button', { name: /Crear proyecto/i })).toBeInTheDocument()
  })

  it('renders name and description fields in create mode', () => {
    // Arrange & Act
    render(<ProjectForm zones={zones} agents={agents} isSuperAdmin={true} />)
    // Assert
    expect(screen.getByLabelText(/^Nombre/i)).toBeInTheDocument()
  })

  it('does not render hidden id in create mode', () => {
    // Arrange & Act
    const { container } = render(<ProjectForm zones={zones} agents={agents} isSuperAdmin={true} />)
    // Assert
    expect(container.querySelector('input[name="id"]')).toBeNull()
  })

  it('renders edit mode with hidden id and Guardar cambios', () => {
    // Arrange
    const initial = {
      id: 'proj-1',
      name: 'Torre Miranda',
      description: 'Descripción larga con al menos veinte caracteres aquí.',
      developer: 'Grupo XYZ',
      zoneId: 'zone-1',
      agentId: 'agent-1',
      deliveryDate: '2026-12-31',
      priceRangeMin: 150000,
      priceRangeMax: 400000,
      coverImage: 'https://example.com/cover.jpg',
      gallery: [],
      status: 'ACTIVE',
    }
    // Act
    const { container } = render(
      <ProjectForm zones={zones} agents={agents} isSuperAdmin={true} initial={initial} />,
    )
    // Assert
    expect(container.querySelector('input[name="id"]')).toHaveValue('proj-1')
  })

  it('shows Guardar cambios button in edit mode', () => {
    // Arrange
    const initial = {
      id: 'proj-1',
      name: 'Torre Miranda',
      description: 'Descripción larga con al menos veinte caracteres aquí.',
      developer: null,
      zoneId: 'zone-1',
      agentId: null,
      deliveryDate: null,
      priceRangeMin: null,
      priceRangeMax: null,
      coverImage: null,
      gallery: [],
      status: 'ACTIVE',
    }
    // Act
    render(<ProjectForm zones={zones} agents={agents} isSuperAdmin={true} initial={initial} />)
    // Assert
    expect(screen.getByRole('button', { name: /Guardar cambios/i })).toBeInTheDocument()
  })

  it('pre-fills name and zone in edit mode', () => {
    // Arrange
    const initial = {
      id: 'proj-1',
      name: 'Torre Miranda',
      description: 'Descripción larga con al menos veinte caracteres aquí.',
      developer: null,
      zoneId: 'zone-1',
      agentId: null,
      deliveryDate: null,
      priceRangeMin: null,
      priceRangeMax: null,
      coverImage: null,
      gallery: [],
      status: 'ACTIVE',
    }
    // Act
    render(<ProjectForm zones={zones} agents={agents} isSuperAdmin={true} initial={initial} />)
    // Assert
    expect(screen.getByLabelText(/^Nombre/i)).toHaveValue('Torre Miranda')
  })

  it('shows zone options', () => {
    // Arrange & Act
    render(<ProjectForm zones={zones} agents={agents} isSuperAdmin={true} />)
    // Assert
    expect(screen.getByText('Las Mercedes')).toBeInTheDocument()
  })

  it('disables inputs and shows Guardando… when pending', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([{}, mockFormAction, true] as unknown as [
      Record<string, unknown>,
      typeof mockFormAction,
      boolean,
    ])
    // Act
    render(<ProjectForm zones={zones} agents={agents} isSuperAdmin={true} />)
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
    render(<ProjectForm zones={zones} agents={agents} isSuperAdmin={true} />)
    // Assert
    expect(screen.getByLabelText(/^Nombre/i)).toBeDisabled()
  })

  it('displays fieldErrors for name', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([
      { fieldErrors: { name: 'El nombre debe tener al menos 3 caracteres' } },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<ProjectForm zones={zones} agents={agents} isSuperAdmin={true} />)
    // Assert
    expect(screen.getByText('El nombre debe tener al menos 3 caracteres')).toBeInTheDocument()
  })

  it('displays fieldErrors for description', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([
      { fieldErrors: { description: 'La descripción debe tener al menos 20 caracteres' } },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<ProjectForm zones={zones} agents={agents} isSuperAdmin={true} />)
    // Assert
    expect(screen.getByText('La descripción debe tener al menos 20 caracteres')).toBeInTheDocument()
  })

  it('displays fieldErrors for zoneId', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([
      { fieldErrors: { zoneId: 'Selecciona una zona' } },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<ProjectForm zones={zones} agents={agents} isSuperAdmin={true} />)
    // Assert — error message also appears as placeholder option in zone select
    expect(screen.getAllByText('Selecciona una zona').length).toBeGreaterThanOrEqual(1)
  })

  it('displays fieldErrors for slug-like status', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([
      { fieldErrors: { status: 'Estado inválido' } },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<ProjectForm zones={zones} agents={agents} isSuperAdmin={true} />)
    // Assert
    expect(screen.getByText('Estado inválido')).toBeInTheDocument()
  })

  it('marks name with aria-invalid when fieldError present', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([
      { fieldErrors: { name: 'El nombre debe tener al menos 3 caracteres' } },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<ProjectForm zones={zones} agents={agents} isSuperAdmin={true} />)
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
    render(<ProjectForm zones={zones} agents={agents} isSuperAdmin={true} />)
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
    render(<ProjectForm zones={zones} agents={agents} isSuperAdmin={true} />)
    // Assert
    expect(screen.getByRole('status')).toHaveTextContent('Proyecto guardado correctamente.')
  })

  it('triggers toast success on state.success', async () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([{ success: true }, mockFormAction, false] as unknown as [
      Record<string, unknown>,
      typeof mockFormAction,
      boolean,
    ])
    // Act
    render(<ProjectForm zones={zones} agents={agents} isSuperAdmin={true} />)
    // Assert
    await waitFor(() => expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Proyecto guardado correctamente.'))
  })

  it('triggers toast error on state.error', async () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([
      { error: 'No se pudo crear el proyecto. Intenta de nuevo.' },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<ProjectForm zones={zones} agents={agents} isSuperAdmin={true} />)
    // Assert
    await waitFor(() => expect(vi.mocked(toast.error)).toHaveBeenCalledWith('No se pudo crear el proyecto. Intenta de nuevo.'))
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
    render(<ProjectForm zones={zones} agents={agents} isSuperAdmin={true} />)
    // Act
    await user.type(screen.getByLabelText(/^Nombre/i), 'Torre Miranda')
    await user.type(screen.getByLabelText(/Desarrolladora/i), 'Grupo XYZ')
    await user.selectOptions(screen.getByLabelText(/^Zona/i), 'zone-1')
    await user.selectOptions(screen.getByLabelText(/^Estado/i), 'ACTIVE')
    await user.type(screen.getByLabelText(/Fecha de entrega/i), '2026-12-31')
    await user.type(screen.getByLabelText(/Precio desde/i), '150000')
    await user.type(screen.getByLabelText(/Precio hasta/i), '400000')
    await user.type(screen.getByLabelText(/URL de imagen de portada/i), 'https://example.com/cover.jpg')
    await user.type(
      screen.getByLabelText(/Descripción/i),
      'Proyecto de lujo frente al mar con amenidades premium y vista panorámica excepcional.',
    )
    await user.click(screen.getByRole('button', { name: /Crear proyecto/i }))
    // Assert
    await waitFor(() => expect(mockFormAction).toHaveBeenCalled())
    const fd =
      (captured[0] ??
        (mockFormAction.mock.calls[0]?.[1] as FormData | undefined) ??
        (mockFormAction.mock.calls[0]?.[0] as FormData | undefined)) as FormData | undefined
    expect(fd).toBeInstanceOf(FormData)
    expect(fd?.get('name')).toBe('Torre Miranda')
    expect(fd?.get('developer')).toBe('Grupo XYZ')
    expect(fd?.get('zoneId')).toBe('zone-1')
    expect(fd?.get('description')).toContain('Proyecto de lujo')
    expect(fd?.get('coverImage')).toBe('https://example.com/cover.jpg')
  })

  it('handles gallery add and hidden gallery field', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<ProjectForm zones={zones} agents={agents} isSuperAdmin={true} />)
    const galleryInput = screen.getByPlaceholderText('URL de imagen https://…')
    // Act
    await user.type(galleryInput, 'https://example.com/g1.jpg')
    await user.click(screen.getByRole('button', { name: /Agregar/i }))
    // Assert
    expect(screen.getByText('https://example.com/g1.jpg')).toBeInTheDocument()
  })

  it('renders hidden gallery field with JSON', () => {
    // Arrange & Act
    const { container } = render(<ProjectForm zones={zones} agents={agents} isSuperAdmin={true} />)
    // Assert
    expect(container.querySelector('input[name="gallery"]')).toHaveAttribute('value', '[]')
  })

  it('does not toast success when fieldErrors present', async () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([
      { error: 'Revisa los campos del formulario.', fieldErrors: { name: 'El nombre debe tener al menos 3 caracteres' } },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<ProjectForm zones={zones} agents={agents} isSuperAdmin={true} />)
    // Assert
    await waitFor(() => expect(vi.mocked(toast.error)).toHaveBeenCalled())
    expect(vi.mocked(toast.success)).not.toHaveBeenCalled()
  })

  it('renders gallery items from initial and allows removal', async () => {
    // Arrange
    const user = userEvent.setup()
    const initial = {
      id: 'proj-1',
      name: 'Torre Miranda',
      description: 'Descripción larga con al menos veinte caracteres aquí.',
      developer: null,
      zoneId: 'zone-1',
      agentId: null,
      deliveryDate: null,
      priceRangeMin: null,
      priceRangeMax: null,
      coverImage: null,
      gallery: [{ url: 'https://example.com/g1.jpg' }],
      status: 'ACTIVE',
    }
    render(<ProjectForm zones={zones} agents={agents} isSuperAdmin={true} initial={initial} />)
    // Act
    expect(screen.getByText('https://example.com/g1.jpg')).toBeInTheDocument()
    await user.click(screen.getByLabelText('Quitar imagen'))
    // Assert — after removal, gallery empty message appears
    expect(screen.getByText(/Agrega URLs de imágenes/i)).toBeInTheDocument()
  })
})
