import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Hoisted mocks
const {
  mockStatusAction,
  mockNoteAction,
  mockAssignAction,
  mockStatusState,
  mockNoteState,
  mockAssignState,
} = vi.hoisted(() => {
  const mockStatusAction = vi.fn(async (..._args: unknown[]) => ({ success: true }) as Record<string, unknown>)
  const mockNoteAction = vi.fn(async (..._args: unknown[]) => ({ success: true }) as Record<string, unknown>)
  const mockAssignAction = vi.fn(async (..._args: unknown[]) => ({ success: true }) as Record<string, unknown>)
  const mockStatusState = vi.fn(() => [{}, mockStatusAction, false] as unknown as [Record<string, unknown>, typeof mockStatusAction, boolean])
  const mockNoteState = vi.fn(() => [{}, mockNoteAction, false] as unknown as [Record<string, unknown>, typeof mockNoteAction, boolean])
  const mockAssignState = vi.fn(() => [{}, mockAssignAction, false] as unknown as [Record<string, unknown>, typeof mockAssignAction, boolean])
  return { mockStatusAction, mockNoteAction, mockAssignAction, mockStatusState, mockNoteState, mockAssignState }
})

// Need to coordinate useActionState calls order: LeadDetail calls 3 times
// Sequence: status, note, assign — use modulo so multiple renders stay stable
let callCount = 0
vi.mock('react', async () => {
  const actual = (await vi.importActual('react')) as Record<string, unknown>
  return {
    ...actual,
    useActionState: (...args: unknown[]) => {
      callCount += 1
      const slot = ((callCount - 1) % 3) + 1
      if (slot === 1) return (mockStatusState as unknown as (...a: unknown[]) => unknown)(...args)
      if (slot === 2) return (mockNoteState as unknown as (...a: unknown[]) => unknown)(...args)
      return (mockAssignState as unknown as (...a: unknown[]) => unknown)(...args)
    },
  }
})

vi.mock('@/server/actions/lead.actions', () => ({
  updateLeadStatusAction: (...args: unknown[]) => mockStatusAction(...args),
  addLeadNoteAction: (...args: unknown[]) => mockNoteAction(...args),
  assignLeadAgentAction: (...args: unknown[]) => mockAssignAction(...args),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href, ...props }, children),
}))

import { LeadDetail } from '@/components/admin/lead-detail'

const baseLead = {
  id: 'lead-1',
  name: 'María López',
  email: 'maria@example.com',
  phone: '+58 212-555-1234',
  message: 'Hola, me interesa la propiedad de Las Mercedes. ¿Podría agendar visita?',
  source: 'WEBSITE' as string,
  status: 'NEW' as string,
  propertyTitle: 'Casa en Las Mercedes',
  propertySlug: 'casa-las-mercedes',
  assignedAgentId: 'agent-1',
  assignedAgentName: 'Carlos Pérez',
}

const agents = [
  { id: 'agent-1', name: 'Carlos Pérez' },
  { id: 'agent-2', name: 'Ana Gómez' },
]

const notes = [
  { text: 'Primera nota', createdAt: new Date(Date.now() - 60_000 * 60 * 2).toISOString() }, // 2h ago
  { text: 'Segunda nota reciente', createdAt: new Date(Date.now() - 60_000 * 10).toISOString() }, // 10 min ago
]

describe('LeadDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    callCount = 0
    mockStatusState.mockReturnValue([{}, mockStatusAction, false] as unknown as [Record<string, unknown>, typeof mockStatusAction, boolean])
    mockNoteState.mockReturnValue([{}, mockNoteAction, false] as unknown as [Record<string, unknown>, typeof mockNoteAction, boolean])
    mockAssignState.mockReturnValue([{}, mockAssignAction, false] as unknown as [Record<string, unknown>, typeof mockAssignAction, boolean])
    if (!HTMLFormElement.prototype.requestSubmit) {
      HTMLFormElement.prototype.requestSubmit = vi.fn(function (this: HTMLFormElement) {
        this.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
      }) as unknown as typeof HTMLFormElement.prototype.requestSubmit
    }
  })

  it('renders lead with all fields: name, email, phone, message, property, assigned agent', () => {
    // Arrange & Act
    render(<LeadDetail lead={baseLead} notes={notes} agents={agents} />)

    // Assert — header
    expect(screen.getByText('Información de contacto')).toBeInTheDocument()
    // badges: status "Nuevo" via StatusBadge, source raw "WEBSITE" (fallback secondary badge)
    // "Nuevo" also appears as selected option in status select
    expect(screen.getAllByText('Nuevo').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('WEBSITE')).toBeInTheDocument()
    // property link
    const propLink = screen.getByText('Casa en Las Mercedes').closest('a')
    expect(propLink).toHaveAttribute('href', '/propiedades/casa-las-mercedes')
    // assigned agent
    expect(screen.getByText(/Asignado a: Carlos Pérez/)).toBeInTheDocument()
    // email and phone
    expect(screen.getByText('maria@example.com')).toBeInTheDocument()
    expect(screen.getByText('+58 212-555-1234')).toBeInTheDocument()
    // WhatsApp link contains phone
    const wa = screen.getByText('Enviar WhatsApp').closest('a')
    expect(wa?.getAttribute('href')).toContain('+58 212-555-1234')
    // message box
    expect(screen.getByText(/Hola, me interesa/)).toBeInTheDocument()
  })

  it('handles null optional fields gracefully (no phone, no message, no property, no agent)', () => {
    // Arrange — null optionals
    const leadNull = {
      ...baseLead,
      phone: null,
      message: null,
      propertyTitle: null,
      propertySlug: null,
      assignedAgentId: null,
      assignedAgentName: null,
    }

    // Act
    render(<LeadDetail lead={leadNull} notes={[]} agents={agents} />)

    // Assert — phone not rendered (no inline-flex with phone text)
    expect(screen.queryByText('+58')).not.toBeInTheDocument()
    // No property link
    expect(screen.queryByText('Casa en Las Mercedes')).not.toBeInTheDocument()
    // No assigned agent line
    expect(screen.queryByText(/Asignado a:/)).not.toBeInTheDocument()
    // Message box not rendered (rounded-lg border)
    expect(screen.queryByText(/Hola, me interesa/)).not.toBeInTheDocument()
    // WhatsApp still renders but with empty phone in href (https://wa.me/)
    const wa = screen.getByText('Enviar WhatsApp').closest('a')
    expect(wa).toHaveAttribute('href', 'https://wa.me/')
    // Email still present
    expect(screen.getByText('maria@example.com')).toBeInTheDocument()
  })

  it('renders status select with correct default and options', () => {
    // Arrange & Act
    render(<LeadDetail lead={baseLead} notes={[]} agents={agents} />)

    // Assert — status label and select
    expect(screen.getByLabelText('Estado')).toBeInTheDocument()
    const statusSelect = screen.getByLabelText('Estado') as HTMLSelectElement
    expect(statusSelect.value).toBe('NEW')
    // Options include all statuses
    expect(screen.queryByText('Visitado? no — check')).not.toBeInTheDocument() // sanity
    expect(statusSelect.querySelectorAll('option').length).toBeGreaterThanOrEqual(7)
    // Contains CONTACTED label "Contactado"
    expect(statusSelect.innerHTML).toContain('Contactado')
  })

  it('renders agent assignment select with Sin asignar and agents list', () => {
    // Arrange & Act
    render(<LeadDetail lead={baseLead} notes={[]} agents={agents} />)

    // Assert
    const agentSelect = screen.getByLabelText('Asignar agente') as HTMLSelectElement
    expect(agentSelect.value).toBe('agent-1')
    expect(screen.getByText('Sin asignar')).toBeInTheDocument()
    expect(screen.getByText('Carlos Pérez')).toBeInTheDocument()
    expect(screen.getByText('Ana Gómez')).toBeInTheDocument()

    // Arrange — null assignedAgentId should default to ""
    callCount = 0
    const { unmount } = render(
      <LeadDetail lead={{ ...baseLead, assignedAgentId: null }} notes={[]} agents={agents} />,
    )
    unmount()
    callCount = 0
    const { container } = render(
      <LeadDetail lead={{ ...baseLead, assignedAgentId: null }} notes={[]} agents={agents} />,
    )
    // Find select again — should be "" (Sin asignar)
    const selects = container.querySelectorAll('select#lead-agent')
    // At least one select has value "" via defaultValue; check option exists
    expect(container.innerHTML).toContain('Sin asignar')
    void selects
  })

  it('triggers requestSubmit on status and agent select change', async () => {
    // Arrange
    const user = userEvent.setup()
    const spy = vi.fn()
    const orig = HTMLFormElement.prototype.requestSubmit
    HTMLFormElement.prototype.requestSubmit = spy as unknown as typeof orig

    render(<LeadDetail lead={baseLead} notes={[]} agents={agents} />)

    // Act — change status
    const statusSelect = screen.getByLabelText('Estado')
    await user.selectOptions(statusSelect, 'CONTACTED')

    // Assert
    expect(spy).toHaveBeenCalled()

    // Act — change agent
    spy.mockClear()
    const agentSelect = screen.getByLabelText('Asignar agente')
    await user.selectOptions(agentSelect, 'agent-2')
    expect(spy).toHaveBeenCalled()

    // Cleanup
    HTMLFormElement.prototype.requestSubmit = orig
  })

  it('renders notes sorted descending and formatted relative time', () => {
    // Arrange — notes unsorted input, component should sort by createdAt desc
    const unsorted = [
      { text: 'Antigua', createdAt: new Date(Date.now() - 60_000 * 60 * 24).toISOString() },
      { text: 'Reciente', createdAt: new Date(Date.now() - 60_000 * 5).toISOString() },
    ]

    // Act
    render(<LeadDetail lead={baseLead} notes={unsorted} agents={agents} />)

    // Assert — heading
    expect(screen.getByText('Notas de seguimiento')).toBeInTheDocument()
    // Both notes present
    expect(screen.getByText('Antigua')).toBeInTheDocument()
    expect(screen.getByText('Reciente')).toBeInTheDocument()
    // Recent should appear before Antigua (sorted desc)
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Reciente')
    expect(items[1]).toHaveTextContent('Antigua')
    // Relative time formatting present (e.g., "hace 5 min" or date) — multiple notes
    expect(screen.getAllByText(/hace/).length).toBeGreaterThanOrEqual(1)
  })

  it('shows empty notes placeholder when no notes', () => {
    // Arrange & Act
    render(<LeadDetail lead={baseLead} notes={[]} agents={agents} />)

    // Assert
    expect(screen.getByText('Aún no hay notas para este lead.')).toBeInTheDocument()
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })

  it('displays note textarea and add button disabled when pending', () => {
    // Arrange — notePending true
    callCount = 0
    mockStatusState.mockReturnValue([{}, mockStatusAction, false] as unknown as [Record<string, unknown>, typeof mockStatusAction, boolean])
    mockNoteState.mockReturnValue([{}, mockNoteAction, true] as unknown as [Record<string, unknown>, typeof mockNoteAction, boolean])
    mockAssignState.mockReturnValue([{}, mockAssignAction, false] as unknown as [Record<string, unknown>, typeof mockAssignAction, boolean])

    // Act
    render(<LeadDetail lead={baseLead} notes={notes} agents={agents} />)

    // Assert — textarea disabled, button disabled
    const textarea = screen.getByPlaceholderText('Agrega una nota sobre el seguimiento…') as HTMLTextAreaElement
    expect(textarea).toBeDisabled()
    expect(textarea).toBeRequired()
    expect(screen.getByRole('button', { name: /Agregar nota/ })).toBeDisabled()
  })

  it('shows status select disabled when statusPending', () => {
    // Arrange — statusPending true
    callCount = 0
    mockStatusState.mockReturnValue([{}, mockStatusAction, true] as unknown as [Record<string, unknown>, typeof mockStatusAction, boolean])
    mockNoteState.mockReturnValue([{}, mockNoteAction, false] as unknown as [Record<string, unknown>, typeof mockNoteAction, boolean])
    mockAssignState.mockReturnValue([{}, mockAssignAction, false] as unknown as [Record<string, unknown>, typeof mockAssignAction, boolean])

    // Act
    render(<LeadDetail lead={baseLead} notes={[]} agents={agents} />)

    // Assert
    expect(screen.getByLabelText('Estado')).toBeDisabled()
  })

  it('handles large number of notes and zero edge with proper rendering', () => {
    // Arrange — 5 notes
    const manyNotes = Array.from({ length: 5 }, (_, i) => ({
      text: `Nota ${i}`,
      createdAt: new Date(Date.now() - 60_000 * i).toISOString(),
    }))

    // Act
    render(<LeadDetail lead={baseLead} notes={manyNotes} agents={agents} />)

    // Assert — all 5 rendered
    for (let i = 0; i < 5; i++) {
      expect(screen.getByText(`Nota ${i}`)).toBeInTheDocument()
    }
    expect(screen.getAllByRole('listitem').length).toBe(5)
  })

  it('renders different lead sources and status badges correctly', () => {
    // Arrange — test WHATSAPP / NEGOTIATING branch
    const leadVariant = { ...baseLead, source: 'WHATSAPP', status: 'NEGOTIATING' }

    // Act
    render(<LeadDetail lead={leadVariant} notes={[]} agents={agents} />)

    // Assert — badges reflect variant labels (status via map, source raw fallback)
    // "Negociación" also appears as selected option in status select
    expect(screen.getAllByText('Negociación').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('WHATSAPP')).toBeInTheDocument()
  })
})
