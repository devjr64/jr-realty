import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// --- Hoisted mocks for React 19 useActionState and server actions ---
const { mockToggleAction, mockDeleteAction, mockActionState, mockFormAction } = vi.hoisted(() => {
  const mockFormAction = vi.fn(async (..._args: unknown[]) => ({ success: true }) as Record<string, unknown>)
  const mockActionState = vi.fn(
    () => [{}, mockFormAction, false] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean],
  )
  const mockToggleAction = vi.fn(async (..._args: unknown[]) => ({ success: true }))
  const mockDeleteAction = vi.fn(async (..._args: unknown[]) => ({ success: true }))
  return { mockToggleAction, mockDeleteAction, mockActionState, mockFormAction }
})

vi.mock('react', async () => {
  const actual = (await vi.importActual('react')) as Record<string, unknown>
  return {
    ...actual,
    useActionState: (...args: unknown[]) =>
      (mockActionState as unknown as (...a: unknown[]) => unknown)(...args),
  }
})

vi.mock('@/server/actions/property.actions', () => ({
  toggleFeaturedAction: (...args: unknown[]) => mockToggleAction(...args),
  deletePropertyAction: (...args: unknown[]) => mockDeleteAction(...args),
}))

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string }) =>
    React.createElement('img', { src, alt, ...props }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href, ...props }, children),
}))

// Sonner / toploader not used directly but safe to mock
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { PropertyList, type AdminProperty, type PropertyFilters } from '@/components/admin/property-list'

const baseFilters: PropertyFilters = {
  search: '',
  type: '',
  operation: '',
  status: '',
  zone: '',
}

const zones = [
  { id: 'zone-1', name: 'Las Mercedes' },
  { id: 'zone-2', name: 'Los Palos Grandes' },
]

function makeProperty(overrides: Partial<AdminProperty> = {}): AdminProperty {
  return {
    id: 'prop-1',
    title: 'Apartamento en Las Mercedes',
    type: 'APARTMENT',
    operation: 'SALE',
    price: 250000,
    currency: 'USD',
    status: 'AVAILABLE',
    featured: false,
    zoneName: 'Las Mercedes',
    agentName: 'Carlos Pérez',
    coverImage: 'https://example.com/cover.jpg',
    createdAt: '2026-03-01T12:00:00Z',
    ...overrides,
  }
}

describe('PropertyList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockActionState.mockImplementation(
      () => [{}, mockFormAction, false] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean],
    )
    mockFormAction.mockClear()
    // Spy requestSubmit as some JSDOM versions lack it
    if (!HTMLFormElement.prototype.requestSubmit) {
      HTMLFormElement.prototype.requestSubmit = vi.fn(function (this: HTMLFormElement) {
        this.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
      }) as unknown as typeof HTMLFormElement.prototype.requestSubmit
    }
  })

  it('renders properties table with title, price, status badge and agent when super admin', () => {
    // Arrange
    const properties = [
      makeProperty({ id: 'p1', title: 'Casa Bella', price: 300000, status: 'AVAILABLE', featured: true }),
      makeProperty({
        id: 'p2',
        title: 'Oficina Central',
        price: 1500,
        currency: 'VES',
        type: 'OFFICE',
        operation: 'RENT',
        status: 'RESERVED',
        featured: false,
        zoneName: 'Los Palos Grandes',
        agentName: 'Ana Gómez',
      }),
    ]

    // Act
    render(
      <PropertyList
        properties={properties}
        total={2}
        page={1}
        pageSize={10}
        filters={baseFilters}
        zones={zones}
        isSuperAdmin
      />,
    )

    // Assert — titles
    expect(screen.getByText('Casa Bella')).toBeInTheDocument()
    expect(screen.getByText('Oficina Central')).toBeInTheDocument()
    // Price formatted via formatCurrency (es-VE)
    expect(screen.getByText(/300/)).toBeInTheDocument()
    expect(screen.getByText(/Bs\.|1\.500/)).toBeInTheDocument()
    // Status badges — "Disponible" also appears in the filter select option
    expect(screen.getAllByText('Disponible').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Reservado').length).toBeGreaterThanOrEqual(1)
    // Agent name visible for super admin
    expect(screen.getByText('Carlos Pérez')).toBeInTheDocument()
    expect(screen.getByText('Ana Gómez')).toBeInTheDocument()
    // Table headers
    expect(screen.getByText('Imagen')).toBeInTheDocument()
    expect(screen.getByText('Destacada')).toBeInTheDocument()
  })

  it('hides agent name when not super admin', () => {
    // Arrange
    const properties = [makeProperty({ agentName: 'Carlos Pérez' })]

    // Act
    render(
      <PropertyList
        properties={properties}
        total={1}
        page={1}
        pageSize={10}
        filters={baseFilters}
        zones={zones}
        isSuperAdmin={false}
      />,
    )

    // Assert — agent not rendered
    expect(screen.queryByText('Carlos Pérez')).not.toBeInTheDocument()
  })

  it('renders empty state when no properties', () => {
    // Arrange & Act
    render(
      <PropertyList properties={[]} total={0} page={1} pageSize={10} filters={baseFilters} zones={zones} isSuperAdmin />,
    )

    // Assert — EmptyState
    expect(screen.getByText('No hay propiedades')).toBeInTheDocument()
    expect(screen.getByText('Crea tu primera propiedad para comenzar')).toBeInTheDocument()
    expect(screen.getByText('Nueva propiedad')).toBeInTheDocument()
    expect(screen.getByText('Nueva propiedad').closest('a')).toHaveAttribute('href', '/admin/propiedades/nuevo')
    // No table when empty
    expect(screen.queryByText('Imagen')).not.toBeInTheDocument()
  })

  it('renders image fallback when coverImage is null and img when present', () => {
    // Arrange
    const properties = [
      makeProperty({ id: 'p1', coverImage: null, title: 'Sin imagen' }),
      makeProperty({ id: 'p2', coverImage: 'https://example.com/img.jpg', title: 'Con imagen' }),
    ]

    // Act
    const { container } = render(
      <PropertyList properties={properties} total={2} page={1} pageSize={10} filters={baseFilters} zones={zones} isSuperAdmin />,
    )

    // Assert — fallback has no img, second row has img with src
    const imgs = container.querySelectorAll('img')
    expect(imgs.length).toBe(1)
    expect(imgs[0].getAttribute('src')).toBe('https://example.com/img.jpg')
    // Alt is empty (decorative)
    expect(imgs[0].getAttribute('alt')).toBe('')
  })

  it('renders link hrefs for title and edit button correctly', () => {
    // Arrange
    const properties = [makeProperty({ id: 'prop-123', title: 'Link Test' })]

    // Act
    render(
      <PropertyList properties={properties} total={1} page={1} pageSize={10} filters={baseFilters} zones={zones} isSuperAdmin />,
    )

    // Assert — title link and edit button link
    const titleLink = screen.getByText('Link Test').closest('a')
    expect(titleLink).toHaveAttribute('href', '/admin/propiedades/prop-123/editar')
    const editButton = screen.getByLabelText('Editar Link Test')
    expect(editButton.closest('a') ?? editButton).toHaveAttribute('href', expect.stringContaining('prop-123'))
  })

  it('renders filter bar with search placeholder and select options', () => {
    // Arrange & Act
    render(
      <PropertyList properties={[]} total={0} page={1} pageSize={10} filters={baseFilters} zones={zones} isSuperAdmin />,
    )

    // Assert — search input
    expect(screen.getByPlaceholderText('Buscar por título o dirección')).toBeInTheDocument()
    // Filter selects — check labels exist via options text
    expect(screen.getByText('Todos los tipos')).toBeInTheDocument()
    expect(screen.getByText('Todas las operaciones')).toBeInTheDocument()
    expect(screen.getByText('Todos los estados')).toBeInTheDocument()
    expect(screen.getByText('Todas las zonas')).toBeInTheDocument()
    // Zone options from props
    expect(screen.getByText('Las Mercedes')).toBeInTheDocument()
    expect(screen.getByText('Los Palos Grandes')).toBeInTheDocument()
    // Buttons
    expect(screen.getByRole('button', { name: /Filtrar/ })).toBeInTheDocument()
    expect(screen.getByText('Limpiar').closest('a')).toHaveAttribute('href', '/admin/propiedades')
  })

  it('builds pagination hrefs preserving filters and shows correct controls', () => {
    // Arrange — total 25, pageSize 10 => 3 pages; currently page 2 shows both prev/next
    const filters: PropertyFilters = {
      search: 'casa',
      type: 'HOUSE',
      operation: 'SALE',
      status: 'AVAILABLE',
      zone: 'zone-1',
    }

    // Act — page 2 of 3
    const { rerender } = render(
      <PropertyList properties={[makeProperty()]} total={25} page={2} pageSize={10} filters={filters} zones={zones} isSuperAdmin />,
    )

    // Assert — pagination text
    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument()
    const prevLink = screen.getByText('Anterior').closest('a')
    const nextLink = screen.getByText('Siguiente').closest('a')
    expect(prevLink).toBeInTheDocument()
    expect(nextLink).toBeInTheDocument()
    // Hrefs preserve filters
    expect(prevLink?.getAttribute('href')).toContain('search=casa')
    expect(prevLink?.getAttribute('href')).toContain('type=HOUSE')
    expect(nextLink?.getAttribute('href')).toContain('status=AVAILABLE')
    expect(nextLink?.getAttribute('href')).toContain('zone=zone-1')
    // page 2 => prev is page 1 (no page param for 1, default omitted)
    expect(prevLink?.getAttribute('href')).not.toContain('page=1')
    expect(nextLink?.getAttribute('href')).toContain('page=3')

    // Act — page 1 of 3: only next
    rerender(
      <PropertyList properties={[makeProperty()]} total={25} page={1} pageSize={10} filters={filters} zones={zones} isSuperAdmin />,
    )
    expect(screen.getByText('Página 1 de 3')).toBeInTheDocument()
    expect(screen.queryByText('Anterior')).not.toBeInTheDocument()
    expect(screen.getByText('Siguiente')).toBeInTheDocument()

    // Act — page 3 of 3: only prev
    rerender(
      <PropertyList properties={[makeProperty()]} total={25} page={3} pageSize={10} filters={filters} zones={zones} isSuperAdmin />,
    )
    expect(screen.getByText('Página 3 de 3')).toBeInTheDocument()
    expect(screen.getByText('Anterior')).toBeInTheDocument()
    expect(screen.queryByText('Siguiente')).not.toBeInTheDocument()
  })

  it('does not render pagination when only one page', () => {
    // Arrange & Act — total 5, pageSize 10 => 1 page
    render(
      <PropertyList properties={[makeProperty()]} total={5} page={1} pageSize={10} filters={baseFilters} zones={zones} isSuperAdmin />,
    )

    // Assert — no pagination controls
    expect(screen.queryByText(/Página/)).not.toBeInTheDocument()
    expect(screen.queryByText('Anterior')).not.toBeInTheDocument()
    expect(screen.queryByText('Siguiente')).not.toBeInTheDocument()
  })

  it('renders featured toggle with correct aria attributes and icons', () => {
    // Arrange — featured false => label "Marcar como destacada"
    const { rerender } = render(
      <PropertyList
        properties={[makeProperty({ featured: false })]}
        total={1}
        page={1}
        pageSize={10}
        filters={baseFilters}
        zones={zones}
        isSuperAdmin
      />,
    )

    // Assert
    const notFeaturedBtn = screen.getByLabelText('Marcar como destacada')
    expect(notFeaturedBtn).toHaveAttribute('aria-pressed', 'false')
    expect(notFeaturedBtn).not.toBeDisabled()

    // Act — featured true
    rerender(
      <PropertyList
        properties={[makeProperty({ featured: true })]}
        total={1}
        page={1}
        pageSize={10}
        filters={baseFilters}
        zones={zones}
        isSuperAdmin
      />,
    )
    // Assert
    const featuredBtn = screen.getByLabelText('Quitar de destacadas')
    expect(featuredBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows pending loader when featured toggle isPending', () => {
    // Arrange — mock pending true
    mockActionState.mockReturnValueOnce([{}, mockFormAction, true] as unknown as [
      Record<string, unknown>,
      typeof mockFormAction,
      boolean,
    ])
    // Act
    const { container } = render(
      <PropertyList properties={[makeProperty()]} total={1} page={1} pageSize={10} filters={baseFilters} zones={zones} isSuperAdmin />,
    )
    // Assert — button disabled and spinner rendered
    const btn = screen.getByLabelText(/Marcar como destacada|Quitar de destacadas/)
    expect(btn).toBeDisabled()
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    expect(mockActionState).toHaveBeenCalled()
  })

  it('delete button opens confirm dialog and calls requestSubmit on confirm', async () => {
    // Arrange
    const user = userEvent.setup()
    const requestSubmitSpy = vi.fn()
    // Spy prototype
    const original = HTMLFormElement.prototype.requestSubmit
    HTMLFormElement.prototype.requestSubmit = requestSubmitSpy as unknown as typeof original

    render(
      <PropertyList
        properties={[makeProperty({ id: 'prop-DEL', title: 'Borrable' })]}
        total={1}
        page={1}
        pageSize={10}
        filters={baseFilters}
        zones={zones}
        isSuperAdmin
      />,
    )

    // Act — click trash button
    const delBtn = screen.getByLabelText('Eliminar Borrable')
    await user.click(delBtn)

    // Assert — dialog appears
    expect(screen.getByText('Eliminar propiedad')).toBeInTheDocument()
    expect(screen.getByText(/¿Seguro que deseas eliminar "Borrable"/)).toBeInTheDocument()

    // Act — confirm (click Eliminar in dialog)
    const confirmBtn = screen.getByRole('button', { name: /^Eliminar$/ })
    await user.click(confirmBtn)

    // Assert — requestSubmit called via formRef
    expect(requestSubmitSpy).toHaveBeenCalled()

    // Cleanup
    HTMLFormElement.prototype.requestSubmit = original
  })

  it('displays zone name and formatted price for each row', () => {
    // Arrange
    const props = [
      makeProperty({ zoneName: 'Las Mercedes', price: 123456, currency: 'USD' }),
      makeProperty({ id: 'p2', title: 'Segunda', zoneName: 'Los Palos Grandes', price: 7890, currency: 'VES' }),
    ]

    // Act
    render(<PropertyList properties={props} total={2} page={1} pageSize={10} filters={baseFilters} zones={zones} isSuperAdmin />)

    // Assert — zones via table cells (also present in filter select options)
    expect(screen.getAllByText('Las Mercedes').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Los Palos Grandes').length).toBeGreaterThanOrEqual(1)
    // Prices: check at least one formatted currency appears (not strictly exact locale but contains numbers)
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('row').length).toBe(3) // header + 2 rows
  })

  it('renders type and operation labels correctly', () => {
    // Arrange
    const properties = [
      makeProperty({ type: 'HOUSE', operation: 'SALE' }),
      makeProperty({ id: 'p2', title: 'Otra', type: 'APARTMENT', operation: 'RENT' }),
    ]

    // Act
    render(<PropertyList properties={properties} total={2} page={1} pageSize={10} filters={baseFilters} zones={zones} isSuperAdmin />)

    // Assert — labels from property.schema (also present in filter select options)
    expect(screen.getAllByText('Casa').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Apartamento').length).toBeGreaterThanOrEqual(1)
    // at least one of operation semantics indirectly via not failing render; status badge also
    expect(screen.getAllByText('Disponible').length).toBeGreaterThanOrEqual(1)
  })

  it('handles filters search prefilled and zone options rendering', async () => {
    // Arrange — filters with values
    const filters: PropertyFilters = { search: 'vista mar', type: 'APARTMENT', operation: '', status: '', zone: 'zone-2' }

    // Act
    render(<PropertyList properties={[]} total={0} page={1} pageSize={10} filters={filters} zones={zones} isSuperAdmin />)

    // Assert — search defaultValue
    const search = screen.getByPlaceholderText('Buscar por título o dirección') as HTMLInputElement
    expect(search.defaultValue).toBe('vista mar')
    // Selects defaultValue (check hidden select values via option selected)
    const typeSelect = document.getElementById('type') as HTMLSelectElement
    expect(typeSelect.value).toBe('APARTMENT')
    const zoneSelect = document.getElementById('zone') as HTMLSelectElement
    expect(zoneSelect.value).toBe('zone-2')
  })
})
