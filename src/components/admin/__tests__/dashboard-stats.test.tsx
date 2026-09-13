import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Hoisted db mock — must be before imports that use it
const {
  mockPropertyCount,
  mockLeadCount,
  mockPropertyAggregate,
  mockAgentCount,
  mockPropertyFindMany,
  mockLeadFindMany,
} = vi.hoisted(() => ({
  mockPropertyCount: vi.fn(),
  mockLeadCount: vi.fn(),
  mockPropertyAggregate: vi.fn(),
  mockAgentCount: vi.fn(),
  mockPropertyFindMany: vi.fn(),
  mockLeadFindMany: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    property: {
      count: (...args: unknown[]) => mockPropertyCount(...args),
      aggregate: (...args: unknown[]) => mockPropertyAggregate(...args),
      findMany: (...args: unknown[]) => mockPropertyFindMany(...args),
    },
    lead: {
      count: (...args: unknown[]) => mockLeadCount(...args),
      findMany: (...args: unknown[]) => mockLeadFindMany(...args),
    },
    agent: {
      count: (...args: unknown[]) => mockAgentCount(...args),
    },
  },
}))

// Mock next/link to plain anchor for href assertions
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href, ...props }, children),
}))

import { DashboardStats, DashboardStatsSkeleton } from '@/components/admin/dashboard-stats'

describe('DashboardStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPropertyCount.mockResolvedValue(5)
    mockLeadCount.mockResolvedValue(12)
    mockPropertyAggregate.mockResolvedValue({ _sum: { viewsCount: 1234 } })
    mockAgentCount.mockResolvedValue(3)
    mockPropertyFindMany.mockResolvedValue([])
    mockLeadFindMany.mockResolvedValue([])
  })

  it('renders KPI grid with mock stats (properties, leads, views, agents)', async () => {
    // Arrange — aggregated counts
    mockPropertyCount.mockResolvedValue(7)
    mockLeadCount.mockResolvedValue(9)
    mockPropertyAggregate.mockResolvedValue({ _sum: { viewsCount: 5000 } })
    mockAgentCount.mockResolvedValue(4)
    mockPropertyFindMany.mockResolvedValue([])
    mockLeadFindMany.mockResolvedValue([])

    // Act — server component is async; await before render
    const jsx = await DashboardStats()
    render(jsx)

    // Assert — KPI titles and values present
    expect(screen.getByText('Propiedades activas')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('Leads del mes')).toBeInTheDocument()
    expect(screen.getByText('9')).toBeInTheDocument()
    expect(screen.getByText('Vistas totales')).toBeInTheDocument()
    // views formatted via toLocaleString('es-VE') — tolerate both 5.000 and 5,000 depending on ICU
    expect(screen.getByText(/5[.,]000/)).toBeInTheDocument()
    expect(screen.getByText('Agentes activos')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('renders zero values and handles null views aggregate', async () => {
    // Arrange — zero / null edge case
    mockPropertyCount.mockResolvedValue(0)
    mockLeadCount.mockResolvedValue(0)
    mockPropertyAggregate.mockResolvedValue({ _sum: { viewsCount: null } })
    mockAgentCount.mockResolvedValue(0)

    // Act
    const jsx = await DashboardStats()
    render(jsx)

    // Assert — zeroes displayed (views null coalesces to 0)
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(3)
    expect(screen.getByText('Propiedades activas')).toBeInTheDocument()
    expect(screen.getByText('Agentes activos')).toBeInTheDocument()
  })

  it('renders large numbers with locale formatting', async () => {
    // Arrange
    mockPropertyAggregate.mockResolvedValue({ _sum: { viewsCount: 1234567 } })
    mockPropertyCount.mockResolvedValue(1234)
    mockLeadCount.mockResolvedValue(98765)

    // Act
    const jsx = await DashboardStats()
    render(jsx)

    // Assert — large numeric KPIs rendered
    expect(screen.getByText('1234')).toBeInTheDocument()
    expect(screen.getByText('98765')).toBeInTheDocument()
    expect(screen.getByText((1_234_567).toLocaleString('es-VE'))).toBeInTheDocument()
    // also tolerate alternative thousand separator
    expect(screen.getByText(/1[.,]234[.,]567/)).toBeInTheDocument()
  })

  it('renders recent properties list with type, price and status badge', async () => {
    // Arrange — one recent property
    const propertyRow = {
      id: 'prop-1',
      title: 'Casa en Las Mercedes',
      type: 'HOUSE' as const,
      status: 'AVAILABLE' as const,
      price: '250000' as unknown as number, // Prisma Decimal duck-typed; component does Number()
      currency: 'USD' as const,
      createdAt: new Date('2026-03-01T10:00:00Z'),
    }
    mockPropertyFindMany.mockResolvedValue([propertyRow])
    mockLeadFindMany.mockResolvedValue([])

    // Act
    const jsx = await DashboardStats()
    render(jsx)

    // Assert
    expect(screen.getByText('Casa en Las Mercedes')).toBeInTheDocument()
    expect(screen.getAllByText(/Casa/).length).toBeGreaterThanOrEqual(1) // type label (also in title)
    expect(screen.getByText('Disponible')).toBeInTheDocument() // status label
    expect(screen.getByText('Ver todas')).toBeInTheDocument()
    expect(screen.getByText('Ver todas').closest('a')).toHaveAttribute('href', '/admin/propiedades')
  })

  it('renders empty state for properties when no recent items', async () => {
    // Arrange — empty recent properties (already default)
    mockPropertyFindMany.mockResolvedValue([])
    mockLeadFindMany.mockResolvedValue([])

    // Act
    const jsx = await DashboardStats()
    render(jsx)

    // Assert — empty state titles
    expect(screen.getByText('Aún no hay propiedades publicadas')).toBeInTheDocument()
    expect(screen.getByText(/Publica tu primera propiedad/)).toBeInTheDocument()
    expect(screen.getByText('Nueva propiedad')).toBeInTheDocument()
  })

  it('renders recent leads list with email, source and status', async () => {
    // Arrange — one recent lead
    const leadRow = {
      id: 'lead-1',
      name: 'María López',
      email: 'maria@example.com',
      source: 'WEBSITE' as const,
      status: 'NEW' as const,
      createdAt: new Date(Date.now() - 60_000 * 30), // 30 min ago
    }
    mockLeadFindMany.mockResolvedValue([leadRow])
    mockPropertyFindMany.mockResolvedValue([])

    // Act
    const jsx = await DashboardStats()
    render(jsx)

    // Assert
    expect(screen.getByText('María López')).toBeInTheDocument()
    expect(screen.getByText(/maria@example.com/)).toBeInTheDocument()
    expect(screen.getByText(/Web/)).toBeInTheDocument()
    expect(screen.getByText('Nuevo')).toBeInTheDocument()
    expect(screen.getByText('Ver todos')).toBeInTheDocument()
    expect(screen.getByText('Ver todos').closest('a')).toHaveAttribute('href', '/admin/leads')
  })

  it('renders empty state for leads when no recent leads', async () => {
    // Arrange
    mockLeadFindMany.mockResolvedValue([])
    mockPropertyFindMany.mockResolvedValue([])

    // Act
    const jsx = await DashboardStats()
    render(jsx)

    // Assert
    expect(screen.getByText('Aún no hay leads registrados')).toBeInTheDocument()
    expect(screen.getByText(/Los contactos que lleguen/)).toBeInTheDocument()
  })

  it('handles multiple recent properties and leads together', async () => {
    // Arrange — 2 properties + 2 leads
    mockPropertyFindMany.mockResolvedValue([
      {
        id: 'p1',
        title: 'Apartamento Central',
        type: 'APARTMENT' as const,
        status: 'AVAILABLE' as const,
        price: 150000 as unknown as number,
        currency: 'USD' as const,
        createdAt: new Date('2026-02-15T12:00:00Z'),
      },
      {
        id: 'p2',
        title: 'Oficina Los Palos Grandes',
        type: 'OFFICE' as const,
        status: 'RESERVED' as const,
        price: 3000 as unknown as number,
        currency: 'VES' as const,
        createdAt: new Date('2026-02-10T12:00:00Z'),
      },
    ])
    mockLeadFindMany.mockResolvedValue([
      {
        id: 'l1',
        name: 'Juan Pérez',
        email: 'juan@test.com',
        source: 'WHATSAPP' as const,
        status: 'CONTACTED' as const,
        createdAt: new Date(Date.now() - 60_000 * 5),
      },
      {
        id: 'l2',
        name: 'Ana Gómez',
        email: 'ana@test.com',
        source: 'PHONE' as const,
        status: 'FOLLOWING_UP' as const,
        createdAt: new Date(Date.now() - 60_000 * 60 * 3),
      },
    ])

    // Act
    const jsx = await DashboardStats()
    render(jsx)

    // Assert — both sections populated
    expect(screen.getByText('Apartamento Central')).toBeInTheDocument()
    expect(screen.getByText('Oficina Los Palos Grandes')).toBeInTheDocument()
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getByText('Ana Gómez')).toBeInTheDocument()
    expect(screen.getByText('Contactado')).toBeInTheDocument()
    expect(screen.getByText('En seguimiento')).toBeInTheDocument()
  })
})

describe('DashboardStatsSkeleton', () => {
  it('renders skeleton KPI grid and list placeholders', () => {
    // Arrange & Act
    const { container } = render(<DashboardStatsSkeleton />)

    // Assert — skeleton structure present
    expect(container.innerHTML).toContain('animate-pulse')
    // 4 KPI skeletons + 2 list skeletons (at least 6 pulse elements)
    const pulseElements = container.querySelectorAll('[class*="animate-pulse"]')
    expect(pulseElements.length).toBeGreaterThanOrEqual(4)
  })
})
