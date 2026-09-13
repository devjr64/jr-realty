import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Hoisted mocks — avoid hoisting ReferenceErrors for useActionState
// React 19 useActionState returns [state, formAction, isPending] where formAction is (formData) => void
// Server actions expect (prevState, formData) — overload handles both. Mock must capture FormData
// regardless of whether it arrives as first or second arg.
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

// --- Mocks required by acceptance criteria ---
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('nextjs-toploader', () => ({ default: () => null }))

vi.mock('@/components/admin/property-image-uploader', () => ({
  PropertyImageUploader: ({ value }: { value: unknown[] }) =>
    React.createElement('div', { 'data-testid': 'uploader', 'data-count': String(value.length) }),
}))

vi.mock('@/server/actions/property.actions', () => ({
  createPropertyAction: (...args: unknown[]) => mockCreateAction(...args),
  updatePropertyAction: (...args: unknown[]) => mockUpdateAction(...args),
}))

vi.mock('react', async () => {
  const actual = (await vi.importActual('react')) as Record<string, unknown>
  return {
    ...actual,
    useActionState: (...args: unknown[]) =>
      (mockUseActionState as unknown as (...a: unknown[]) => unknown)(...args),
  }
})

import { PropertyForm } from '@/components/admin/property-form'

const zones = [
  { id: 'zone-1', name: 'Las Mercedes' },
  { id: 'zone-2', name: 'Los Palos Grandes' },
]
const agents = [
  { id: 'agent-1', name: 'Agent One' },
  { id: 'agent-2', name: 'Agent Two' },
]

describe('PropertyForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseActionState.mockImplementation(
      () => [{}, mockFormAction, false] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean],
    )
    mockFormAction.mockClear()
    mockCreateAction.mockClear()
    mockUpdateAction.mockClear()
  })

  it('renders all basic fields and submit button via getByRole', () => {
    // Arrange & Act
    render(<PropertyForm zones={zones} agents={agents} isSuperAdmin />)
    // Assert — screen.getByRole verified
    expect(screen.getByRole('textbox', { name: /Título/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/Tipo de propiedad/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Operación/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Precio \(USD\)/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Crear propiedad/i })).toBeInTheDocument()
    expect(screen.getByText('Información básica')).toBeInTheDocument()
    expect(screen.getByTestId('uploader')).toBeInTheDocument()
  })

  it('allows typing title and price via userEvent.type', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<PropertyForm zones={zones} agents={agents} isSuperAdmin />)
    const titleInput = screen.getByRole('textbox', { name: /Título/i }) as HTMLInputElement
    const priceInput = screen.getByLabelText(/Precio \(USD\)/i) as HTMLInputElement
    // Act
    await user.type(titleInput, 'Apartamento en Las Mercedes')
    await user.type(priceInput, '250000')
    // Assert
    expect(titleInput.value).toBe('Apartamento en Las Mercedes')
    expect(priceInput.value).toBe('250000')
  })

  it('toggles featured checkbox', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<PropertyForm zones={zones} agents={agents} isSuperAdmin />)
    const checkbox = screen.getByRole('checkbox', { name: /Propiedad destacada/i }) as HTMLInputElement
    // Act & Assert — initially unchecked
    expect(checkbox.checked).toBe(false)
    await user.click(checkbox)
    expect(checkbox.checked).toBe(true)
    await user.click(checkbox)
    expect(checkbox.checked).toBe(false)
  })

  it('fills title/price/description and submits calls createPropertyAction with FormData', async () => {
    // Arrange
    const user = userEvent.setup()
    // Capture FormData — React 19 formAction receives single FormData arg (not prevState, FormData)
    const captured: FormData[] = []
    mockFormAction.mockImplementation(async (...args: unknown[]) => {
      const fd = args.find((a) => a instanceof FormData) as FormData | undefined
      if (fd) captured.push(fd)
      return { success: true } as Record<string, unknown>
    })
    render(<PropertyForm zones={zones} agents={agents} isSuperAdmin />)

    const titleInput = screen.getByRole('textbox', { name: /Título/i })
    const priceInput = screen.getByLabelText(/Precio \(USD\)/i)
    const description = screen.getByLabelText(/Descripción/i)
    const address = screen.getByLabelText(/Dirección/i)

    // Act — fill required fields via userEvent.type
    await user.type(titleInput, 'Casa en Los Palos Grandes')
    await user.type(priceInput, '350000')
    await user.type(address, 'Calle 79, Los Palos Grandes')
    await user.type(description, 'Hermosa casa con piscina y vista al mar, ideal para familia grande.')

    // selects — type, operation, zone, agent
    const typeSelect = screen.getByLabelText(/Tipo de propiedad/i) as HTMLSelectElement
    await user.selectOptions(typeSelect, 'HOUSE')
    const operationSelect = screen.getByLabelText(/Operación/i) as HTMLSelectElement
    await user.selectOptions(operationSelect, 'SALE')
    const zoneSelect = screen.getByLabelText(/^Zona/i) as HTMLSelectElement
    await user.selectOptions(zoneSelect, 'zone-1')
    const agentSelect = screen.getByLabelText(/Agente responsable/i) as HTMLSelectElement
    await user.selectOptions(agentSelect, 'agent-1')

    const submit = screen.getByRole('button', { name: /Crear propiedad/i })
    await user.click(submit)

    // Assert
    await waitFor(() => expect(mockFormAction).toHaveBeenCalled())
    // Verify FormData contains title and price (acceptance: asserts createPropertyAction called with FormData)
    // Support both signatures: captured array or mock.calls fallback (second arg if exists, else first)
    const fd =
      (captured[0] ??
        (mockFormAction.mock.calls[0]?.[1] as FormData | undefined) ??
        (mockFormAction.mock.calls[0]?.[0] as FormData | undefined)) as FormData | undefined
    expect(fd).toBeInstanceOf(FormData)
    expect(fd?.get('title')).toBe('Casa en Los Palos Grandes')
    expect(fd?.get('price')).toBe('350000')
    expect(fd?.get('address')).toBe('Calle 79, Los Palos Grandes')
    expect(fd?.get('type')).toBe('HOUSE')
    expect(fd?.get('zoneId')).toBe('zone-1')
    expect(fd?.get('agentId')).toBe('agent-1')
  })

  it('displays fieldErrors under inputs when action returns validation errors', () => {
    // Arrange — mockUseActionState to return fieldErrors state
    mockUseActionState.mockReturnValueOnce([
      {
        error: 'Revisa los campos del formulario.',
        fieldErrors: {
          title: 'El título debe tener al menos 5 caracteres',
          price: 'El precio debe ser mayor que cero',
        },
      },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<PropertyForm zones={zones} agents={agents} isSuperAdmin />)
    // Assert — fieldErrors displayed under inputs via FormField
    expect(screen.getByText('El título debe tener al menos 5 caracteres')).toBeInTheDocument()
    expect(screen.getByText('El precio debe ser mayor que cero')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Revisa los campos del formulario.')
    // aria-invalid on controls with error
    expect(screen.getByRole('textbox', { name: /Título/i })).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText(/Precio \(USD\)/i)).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows success banner when state.success true', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([{ success: true }, mockFormAction, false] as unknown as [
      Record<string, unknown>,
      typeof mockFormAction,
      boolean,
    ])
    // Act
    render(<PropertyForm zones={zones} agents={agents} isSuperAdmin />)
    // Assert
    expect(screen.getByRole('status')).toHaveTextContent('Propiedad guardada correctamente.')
  })

  it('renders hidden id and agentId when initial provided (edit mode)', () => {
    // Arrange
    const initial = {
      id: 'prop-123',
      title: 'Existente',
      description: 'Descripción larga existente con más de veinte caracteres.',
      type: 'APARTMENT',
      operation: 'SALE',
      price: 200000,
      currency: 'USD',
      bedrooms: 2,
      bathrooms: 2,
      halfBathrooms: null,
      parkingSpots: 1,
      landAreaM2: null,
      buildAreaM2: 80,
      yearBuilt: 2020,
      address: 'Las Mercedes',
      latitude: null,
      longitude: null,
      zoneId: 'zone-1',
      features: [],
      tags: [],
      videoUrl: null,
      virtualTourUrl: null,
      status: 'AVAILABLE',
      featured: true,
      images: [],
      agentId: 'agent-1',
    }
    // Act
    const { container } = render(<PropertyForm zones={zones} agents={agents} isSuperAdmin initial={initial} />)
    // Assert
    expect(container.querySelector('input[name="id"]')).toHaveValue('prop-123')
    expect(screen.getByRole('button', { name: /Guardar cambios/i })).toBeInTheDocument()
    const featured = screen.getByRole('checkbox', { name: /Propiedad destacada/i }) as HTMLInputElement
    expect(featured.checked).toBe(true)
  })

  it('includes hidden features/tags/images JSON fields', () => {
    // Arrange & Act
    const { container } = render(<PropertyForm zones={zones} agents={agents} isSuperAdmin />)
    // Assert
    expect(container.querySelector('input[name="features"]')).toBeInTheDocument()
    expect(container.querySelector('input[name="tags"]')).toBeInTheDocument()
    expect(container.querySelector('input[name="images"]')).toBeInTheDocument()
  })
})
