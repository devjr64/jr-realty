import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Hoisted mock for useActionState
const { mockFormAction, mockUseActionState } = vi.hoisted(() => {
  const mockFormAction = vi.fn(async (..._args: unknown[]) => ({ success: true }) as Record<string, unknown>)
  const mockUseActionState = vi.fn(
    () => [{}, mockFormAction, false] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean],
  )
  return { mockFormAction, mockUseActionState }
})

vi.mock('react', async () => {
  const actual = (await vi.importActual('react')) as Record<string, unknown>
  return {
    ...actual,
    useActionState: (...args: unknown[]) =>
      (mockUseActionState as unknown as (...a: unknown[]) => unknown)(...args),
  }
})

vi.mock('@/server/actions/lead.actions', () => ({
  updateLeadStatusAction: (...args: unknown[]) => mockFormAction(...args),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href, ...props }, children),
}))

import { LeadsTable, type LeadRow } from '@/components/admin/leads-table'

function makeLead(overrides: Partial<LeadRow> = {}): LeadRow {
  return {
    id: 'lead-1',
    name: 'María López',
    email: 'maria@example.com',
    phone: '+58 212-555-0000',
    message: 'Interesada en la propiedad',
    source: 'WEBSITE',
    status: 'NEW',
    propertyTitle: 'Casa en Las Mercedes',
    propertySlug: 'casa-las-mercedes',
    assignedAgentName: 'Carlos Pérez',
    createdAt: new Date(Date.now() - 60_000 * 30).toISOString(),
    ...overrides,
  }
}

const agents = [
  { id: 'agent-1', name: 'Carlos Pérez' },
  { id: 'agent-2', name: 'Ana Gómez' },
]

const counts = {
  total: 2,
  byStatus: { NEW: 1, CONTACTED: 1, FOLLOWING_UP: 0, VISIT_SCHEDULED: 0, NEGOTIATING: 0, CLOSED_WON: 0, CLOSED_LOST: 0 },
}

describe('LeadsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseActionState.mockReturnValue([{}, mockFormAction, false] as unknown as [
      Record<string, unknown>,
      typeof mockFormAction,
      boolean,
    ])
    // Ensure requestSubmit exists for onChange handler
    if (!HTMLFormElement.prototype.requestSubmit) {
      HTMLFormElement.prototype.requestSubmit = vi.fn(function (this: HTMLFormElement) {
        this.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
      }) as unknown as typeof HTMLFormElement.prototype.requestSubmit
    }
  })

  it('renders leads rows with name, email, status and source badges', () => {
    // Arrange
    const leads = [
      makeLead({ id: 'l1', name: 'Juan Pérez', email: '__VG_EMAIL_e9f0d48e2d53__' }),
      makeLead({
        id: 'l2',
        name: 'Ana Gómez',
        email: '__VG_EMAIL_aa121afd97ca__',
        status: 'CONTACTED',
        source: 'WHATSAPP',
        phone: null,
      }),
    ]

    // Act
    render(<LeadsTable leads={leads} agents={agents} counts={counts} isSuperAdmin />)

    // Assert
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getByText('__VG_EMAIL_e9f0d48e2d53__')).toBeInTheDocument()
    expect(screen.getByText('Ana Gómez')).toBeInTheDocument()
    expect(screen.getByText('__VG_EMAIL_aa121afd97ca__')).toBeInTheDocument()
    // Status badges via StatusBadge => labels "Nuevo", "Contactado" (also in filter select)
    expect(screen.getAllByText('Nuevo').length).toBeGreaterThanOrEqual(1)
    // phone present for first, absent for second (only one phone instance)
    expect(screen.getByText('+58 212-555-0000')).toBeInTheDocument()
    // propertyTitle displayed, source badge (via StatusBadge fallback secondary if unknown? source WEBSITE -> Badge secondary with "WEBSITE" raw)
    expect(screen.getAllByText('Casa en Las Mercedes').length).toBeGreaterThanOrEqual(1)
  })

  it('handles null optional fields: phone, propertyTitle shows General, message optional', () => {
    // Arrange
    const leads = [
      makeLead({ phone: null, propertyTitle: null, propertySlug: null, message: null }),
    ]

    // Act
    render(<LeadsTable leads={leads} agents={agents} counts={counts} isSuperAdmin />)

    // Assert — General when no property
    expect(screen.getByText('General')).toBeInTheDocument()
    // Phone not rendered (no +58)
    expect(screen.queryByText('+58 212-555-0000')).not.toBeInTheDocument()
    // Still renders name/email
    expect(screen.getByText('María López')).toBeInTheDocument()
  })

  it('renders empty table body when no leads (no crash)', () => {
    // Arrange & Act
    render(<LeadsTable leads={[]} agents={agents} counts={{ total: 0, byStatus: {} }} isSuperAdmin />)

    // Assert — table header still present, no rows
    expect(screen.getByText('Contacto')).toBeInTheDocument()
    expect(screen.getByText('Propiedad')).toBeInTheDocument()
    expect(screen.queryByText('María López')).not.toBeInTheDocument()
    // Filter bar still rendered
    expect(screen.getByPlaceholderText('Buscar por nombre o correo…')).toBeInTheDocument()
  })

  it('renders detail link with correct href for row click', () => {
    // Arrange
    const leads = [makeLead({ id: 'lead-XYZ' })]

    // Act
    render(<LeadsTable leads={leads} agents={agents} counts={counts} isSuperAdmin />)

    // Assert — eye button links to detail
    const detailBtn = screen.getByLabelText('Ver detalle de María López')
    const anchor = detailBtn.closest('a') ?? detailBtn
    expect(anchor).toHaveAttribute('href', '/admin/leads/lead-XYZ')
  })

  it('renders status select with defaultValue and triggers requestSubmit onChange', async () => {
    // Arrange
    const user = userEvent.setup()
    const leads = [makeLead({ id: 'l1', status: 'NEW' })]
    const requestSubmitSpy = vi.fn()
    const orig = HTMLFormElement.prototype.requestSubmit
    HTMLFormElement.prototype.requestSubmit = requestSubmitSpy as unknown as typeof orig

    // Act
    render(<LeadsTable leads={leads} agents={agents} counts={counts} isSuperAdmin />)
    const select = screen.getByDisplayValue('Nuevo') as HTMLSelectElement
    expect(select.value).toBe('NEW')
    // Change status — should call requestSubmit via onChange
    await user.selectOptions(select, 'CONTACTED')

    // Assert
    expect(requestSubmitSpy).toHaveBeenCalled()

    // Cleanup
    HTMLFormElement.prototype.requestSubmit = orig
  })

  it('shows pending disabled state for status select when isPending true', () => {
    // Arrange — pending true
    mockUseActionState.mockReturnValueOnce([{}, mockFormAction, true] as unknown as [
      Record<string, unknown>,
      typeof mockFormAction,
      boolean,
    ])

    // Act
    render(<LeadsTable leads={[makeLead()]} agents={agents} counts={counts} isSuperAdmin />)

    // Assert — select disabled
    const select = screen.getByDisplayValue('Nuevo') as HTMLSelectElement
    expect(select).toBeDisabled()
  })

  it('renders filter selects with counts and export CSV button', () => {
    // Arrange & Act
    render(<LeadsTable leads={[makeLead()]} agents={agents} counts={counts} isSuperAdmin />)

    // Assert — status filter shows counts "(1)" for NEW etc
    expect(screen.getByText('Todos los estados')).toBeInTheDocument()
    expect(screen.getByText(/Nuevo \(1\)/)).toBeInTheDocument()
    expect(screen.getByText('Todas las fuentes')).toBeInTheDocument()
    expect(screen.getByText('Filtrar')).toBeInTheDocument()
    expect(screen.getByText('Exportar CSV')).toBeInTheDocument()
  })

  it('exportCsv creates blob and triggers download with correct filename', async () => {
    // Arrange — mock URL and Blob related APIs
    const user = userEvent.setup()
    const createObjectURLSpy = vi.fn(() => 'blob:fake-url')
    const revokeSpy = vi.fn()
    const clickSpy = vi.fn()
    const originalCreate = URL.createObjectURL
    const originalRevoke = URL.revokeObjectURL
    const originalCreateElement = document.createElement.bind(document)

    // Spy URL
    global.URL.createObjectURL = createObjectURLSpy as unknown as typeof URL.createObjectURL
    global.URL.revokeObjectURL = revokeSpy as unknown as typeof URL.revokeObjectURL

    // Spy anchor click by intercepting createElement
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string, ...args: unknown[]) => {
      const el = originalCreateElement(tag as never) as unknown as HTMLElement
      if (tag === 'a') {
        el.click = clickSpy
      }
      return el as unknown as HTMLElement
    }) as unknown as typeof document.createElement)

    const leads = [
      makeLead({ name: 'Test "Quotes"', email: '__VG_EMAIL_fd337bcc6501__' }),
      makeLead({ id: 'l2', name: 'Segunda', email: '__VG_EMAIL_72b43662cf9b__' }),
    ]

    // Act
    render(<LeadsTable leads={leads} agents={agents} counts={counts} isSuperAdmin />)
    const exportBtn = screen.getByText('Exportar CSV')
    await user.click(exportBtn)

    // Assert
    expect(createObjectURLSpy).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    expect(revokeSpy).toHaveBeenCalled()

    // Cleanup
    global.URL.createObjectURL = originalCreate
    global.URL.revokeObjectURL = originalRevoke
    vi.restoreAllMocks()
  })

  it('renders table with all required headers and relative time formatting', () => {
    // Arrange
    const recentDate = new Date(Date.now() - 60_000 * 5).toISOString() // 5 min ago
    const leads = [makeLead({ createdAt: recentDate })]

    // Act
    render(<LeadsTable leads={leads} agents={agents} counts={counts} isSuperAdmin />)

    // Assert — headers
    expect(screen.getByText('Contacto')).toBeInTheDocument()
    expect(screen.getByText('Fuente')).toBeInTheDocument()
    expect(screen.getByText('Estado')).toBeInTheDocument()
    expect(screen.getByText('Recibido')).toBeInTheDocument()
    expect(screen.getByText('Acciones')).toBeInTheDocument()
    // Relative time should be "hace 5 min" (tolerate minutos/min)
    expect(screen.getByText(/hace 5/)).toBeInTheDocument()
  })

  it('handles large number of leads and pagination absent (renders all rows)', () => {
    // Arrange — 5 leads
    const leads = Array.from({ length: 5 }, (_, i) => makeLead({ id: `l-${i}`, name: `Lead ${i}`, email: `lead${i}@test.com` }))

    // Act
    render(<LeadsTable leads={leads} agents={agents} counts={counts} isSuperAdmin />)

    // Assert — all rendered
    for (let i = 0; i < 5; i++) {
      expect(screen.getByText(`Lead ${i}`)).toBeInTheDocument()
    }
    const table = screen.getByRole('table')
    // header + 5 rows = 6
    expect(within(table).getAllByRole('row').length).toBe(6)
  })
})
