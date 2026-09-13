import * as React from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { StatusBadge } from '@/components/shared/status-badge'

describe('StatusBadge', () => {
  it('renders AVAILABLE with Spanish label and emerald class', () => {
    // Arrange
    const status = 'AVAILABLE'
    // Act
    const { container } = render(<StatusBadge status={status} />)
    // Assert
    expect(screen.getByText('Disponible')).toBeInTheDocument()
    expect(container.firstChild).toHaveClass('bg-emerald-500/10')
  })

  it('renders all default statuses with expected labels', () => {
    // Arrange
    const cases: [string, string][] = [
      ['SOLD', 'Vendido'],
      ['RENTED', 'Alquilado'],
      ['RESERVED', 'Reservado'],
      ['INACTIVE', 'Inactivo'],
      ['NEW', 'Nuevo'],
      ['CONTACTED', 'Contactado'],
      ['FOLLOWING_UP', 'En seguimiento'],
      ['VISIT_SCHEDULED', 'Visita agendada'],
      ['NEGOTIATING', 'Negociación'],
      ['CLOSED_WON', 'Cerrado'],
      ['CLOSED_LOST', 'Perdido'],
    ]
    // Act & Assert
    cases.forEach(([status, label]) => {
      const { unmount } = render(<StatusBadge status={status} />)
      expect(screen.getByText(label)).toBeInTheDocument()
      unmount()
    })
  })

  it('falls back to raw value for unknown status with secondary variant', () => {
    // Arrange
    const unknown = 'UNKNOWN_STATUS'
    // Act
    render(<StatusBadge status={unknown} />)
    // Assert
    expect(screen.getByText(unknown)).toBeInTheDocument()
    // secondary badge has bg-secondary class via badgeVariants
    expect(screen.getByText(unknown).className).toContain('bg-secondary')
  })

  it('applies variantMap override over defaults', () => {
    // Arrange
    const variantMap = {
      AVAILABLE: { label: 'Override', className: 'bg-custom text-custom' },
    }
    // Act
    const { container } = render(<StatusBadge status="AVAILABLE" variantMap={variantMap} />)
    // Assert
    expect(screen.getByText('Override')).toBeInTheDocument()
    expect(container.firstChild).toHaveClass('bg-custom')
    expect(screen.queryByText('Disponible')).not.toBeInTheDocument()
  })

  it('uses variantMap for unknown status when provided', () => {
    // Arrange
    const variantMap = {
      CUSTOM: { label: 'Custom', className: 'bg-custom' },
    }
    // Act
    render(<StatusBadge status="CUSTOM" variantMap={variantMap} />)
    // Assert
    expect(screen.getByText('Custom')).toBeInTheDocument()
  })

  it('renders lead statuses with correct colors', () => {
    // Arrange & Act
    const { container: c1 } = render(<StatusBadge status="NEW" />)
    // Assert
    expect(c1.firstChild).toHaveClass('bg-blue-500/10')
    const { container: c2 } = render(<StatusBadge status="CLOSED_WON" />)
    expect(c2.firstChild).toHaveClass('bg-emerald-500/10')
  })

  it('matches snapshot for single badge', () => {
    // Arrange
    const { container } = render(<StatusBadge status="AVAILABLE" />)
    // Act & Assert
    expect(container.innerHTML).toMatchSnapshot()
  })
})
