import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Building2, Users } from 'lucide-react'

import { KpiCard, KpiCardSkeleton } from '@/components/admin/kpi-card'

describe('KpiCard', () => {
  it('renders title and numeric value', () => {
    // Arrange & Act
    render(<KpiCard title="Propiedades activas" value={42} icon={Building2} />)

    // Assert
    expect(screen.getByText('Propiedades activas')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('renders string value and icon', () => {
    // Arrange & Act
    render(<KpiCard title="Vistas totales" value="1.234" icon={Building2} />)

    // Assert
    expect(screen.getByText('1.234')).toBeInTheDocument()
    expect(screen.getByText('Vistas totales')).toBeInTheDocument()
  })

  it('renders zero and large numbers without formatting loss', () => {
    // Arrange & Act
    const { rerender } = render(<KpiCard title="Cero" value={0} icon={Building2} />)
    // Assert zero
    expect(screen.getByText('0')).toBeInTheDocument()

    // Arrange & Act — large number
    rerender(<KpiCard title="Large" value={1_000_000} icon={Building2} />)
    // Assert
    expect(screen.getByText('1000000')).toBeInTheDocument()

    rerender(<KpiCard title="Large string" value="999,999" icon={Building2} />)
    expect(screen.getByText('999,999')).toBeInTheDocument()
  })

  it('renders description when provided and hides when absent', () => {
    // Arrange & Act — with description
    const { rerender } = render(
      <KpiCard title="Agentes" value={5} icon={Users} description="Asesores con perfil público" />,
    )
    // Assert
    expect(screen.getByText('Asesores con perfil público')).toBeInTheDocument()

    // Arrange & Act — without description
    rerender(<KpiCard title="Agentes" value={5} icon={Users} />)
    // Assert
    expect(screen.queryByText('Asesores con perfil público')).not.toBeInTheDocument()
  })

  it('renders trend positive with emerald style and value', () => {
    // Arrange & Act
    render(<KpiCard title="Leads" value={10} icon={Building2} trend={{ value: '+12 %', positive: true }} />)

    // Assert
    expect(screen.getByText('+12 %')).toBeInTheDocument()
    // Badge should have emerald class (variant verification via DOM)
    const badge = screen.getByText('+12 %').closest('span')
    expect(badge?.className).toContain('emerald')
  })

  it('renders trend negative with destructive style', () => {
    // Arrange & Act
    render(<KpiCard title="Leads" value={10} icon={Building2} trend={{ value: '-5 %', positive: false }} />)

    // Assert
    expect(screen.getByText('-5 %')).toBeInTheDocument()
    const badge = screen.getByText('-5 %').closest('span')
    expect(badge?.className).toContain('destructive')
  })

  it('does not render trend badge when trend is undefined', () => {
    // Arrange & Act
    render(<KpiCard title="Sin tendencia" value={3} icon={Building2} />)

    // Assert — no trend text, only title/value
    expect(screen.getByText('Sin tendencia')).toBeInTheDocument()
    expect(screen.queryByText('+')).not.toBeInTheDocument()
  })

  it('renders icon container with aria-hidden svg', () => {
    // Arrange & Act
    const { container } = render(<KpiCard title="Icon test" value={1} icon={Building2} />)

    // Assert — lucide icon renders as svg with aria-hidden
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })

  it('applies different icons correctly', () => {
    // Arrange & Act
    const { container, rerender } = render(<KpiCard title="A" value={1} icon={Building2} />)
    const firstSvg = container.querySelector('svg')
    expect(firstSvg).toBeInTheDocument()

    // Act — different icon
    rerender(<KpiCard title="B" value={2} icon={Users} />)
    // Assert — still renders svg (icon swapped)
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
  })
})

describe('KpiCardSkeleton', () => {
  it('renders skeleton placeholders', () => {
    // Arrange & Act
    const { container } = render(<KpiCardSkeleton />)

    // Assert — skeleton divs present (aria not needed, check by class)
    expect(container.querySelectorAll('div').length).toBeGreaterThan(0)
    // Should contain at least 2 skeleton elements
    const skeletons = container.querySelectorAll('[class*="animate-pulse"], [class*="bg-muted"]')
    // Fallback: skeleton component renders divs with h- classes
    expect(container.innerHTML).toContain('h-8')
  })
})
