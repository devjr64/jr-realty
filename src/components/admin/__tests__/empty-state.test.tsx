import { Building2, Inbox } from 'lucide-react'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { EmptyState } from '@/components/admin/empty-state'

describe('EmptyState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders title', () => {
    // Arrange & Act
    render(<EmptyState title="Sin resultados" />)

    // Assert
    expect(screen.getByText('Sin resultados')).toBeInTheDocument()
    expect(screen.getByText('Sin resultados')).toHaveClass('font-medium')
  })

  it('renders description when provided', () => {
    // Arrange
    const description = 'No hay propiedades que coincidan con los filtros.'

    // Act
    render(<EmptyState title="Sin resultados" description={description} />)

    // Assert
    expect(screen.getByText(description)).toBeInTheDocument()
    expect(screen.getByText(description)).toHaveClass('text-muted-foreground')
  })

  it('does not render description paragraph when not provided', () => {
    // Arrange & Act
    const { container } = render(<EmptyState title="Vacío" />)

    // Assert — only title paragraph, no second muted paragraph
    const paragraphs = container.querySelectorAll('p.text-muted-foreground')
    expect(paragraphs.length).toBe(0)
  })

  it('renders icon inside muted circle when provided', () => {
    // Arrange & Act
    const { container } = render(<EmptyState title="Vacío" icon={Building2} />)

    // Assert — circle wrapper exists
    const circle = container.querySelector('div.bg-muted.rounded-full')
    expect(circle).toBeInTheDocument()
    expect(circle).toHaveClass('size-12')
    // icon svg exists and has aria-hidden
    const svg = circle?.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })

  it('does not render icon circle when icon not provided', () => {
    // Arrange & Act
    const { container } = render(<EmptyState title="Vacío" />)

    // Assert
    expect(container.querySelector('div.bg-muted.rounded-full')).toBeNull()
  })

  it('renders action slot below content', () => {
    // Arrange & Act
    render(<EmptyState title="Vacío" action={<button>Crear propiedad</button>} />)

    // Assert
    expect(screen.getByRole('button', { name: 'Crear propiedad' })).toBeInTheDocument()
  })

  it('does not render action wrapper when action not provided', () => {
    // Arrange & Act
    const { container } = render(<EmptyState title="Vacío" />)

    // Assert — no mt-1 wrapper
    expect(container.querySelector('div.mt-1')).toBeNull()
  })

  it('renders full composition: icon, title, description, action', () => {
    // Arrange & Act
    render(
      <EmptyState
        title="No hay leads"
        description="Aún no se han recibido consultas."
        icon={Inbox}
        action={<button>Ver propiedades</button>}
      />,
    )

    // Assert
    expect(screen.getByText('No hay leads')).toBeInTheDocument()
    expect(screen.getByText('Aún no se han recibido consultas.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ver propiedades' })).toBeInTheDocument()
    // icon present
    const { container } = render(
      <EmptyState title="No hay leads" icon={Inbox} />,
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('has centered flex column layout with py spacing', () => {
    // Arrange & Act
    const { container } = render(<EmptyState title="Vacío" />)

    // Assert
    const root = container.firstChild as HTMLElement
    expect(root).toHaveClass('flex')
    expect(root).toHaveClass('flex-col')
    expect(root).toHaveClass('items-center')
    expect(root).toHaveClass('text-center')
  })
})
