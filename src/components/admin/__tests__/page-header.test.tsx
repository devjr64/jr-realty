import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { PageHeader } from '@/components/admin/page-header'

describe('PageHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders title as h1', () => {
    // Arrange & Act
    render(<PageHeader title="Propiedades" />)

    // Assert
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('Propiedades')
    expect(heading).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    // Arrange
    const title = 'Dashboard'
    const description = 'Resumen general del sistema'

    // Act
    render(<PageHeader title={title} description={description} />)

    // Assert
    expect(screen.getByText(description)).toBeInTheDocument()
    expect(screen.getByText(description)).toHaveClass('text-muted-foreground')
  })

  it('does not render description paragraph when not provided', () => {
    // Arrange & Act
    const { container } = render(<PageHeader title="Leads" />)

    // Assert — only heading, no muted paragraph
    expect(container.querySelector('p.text-muted-foreground')).toBeNull()
  })

  it('renders actions slot on the right', () => {
    // Arrange
    const actionLabel = 'Nueva propiedad'

    // Act
    render(<PageHeader title="Propiedades" actions={<button>{actionLabel}</button>} />)

    // Assert
    expect(screen.getByRole('button', { name: actionLabel })).toBeInTheDocument()
  })

  it('does not render actions container when actions not provided', () => {
    // Arrange & Act
    const { container } = render(<PageHeader title="Zonas" />)

    // Assert — no shrink-0 actions div
    expect(container.querySelector('div.flex.shrink-0')).toBeNull()
  })

  it('applies heading font classes to title', () => {
    // Arrange & Act
    render(<PageHeader title="Agentes" />)

    // Assert
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveClass('font-heading')
    expect(heading).toHaveClass('text-2xl')
  })

  it('header has flex-wrap and justify-between layout', () => {
    // Arrange & Act
    const { container } = render(<PageHeader title="CMS" />)

    // Assert
    const header = container.querySelector('header')
    expect(header).toBeInTheDocument()
    expect(header).toHaveClass('flex')
    expect(header).toHaveClass('justify-between')
    expect(header).toHaveClass('gap-4')
  })

  it('renders title, description, and actions together', () => {
    // Arrange & Act
    render(
      <PageHeader
        title="Usuarios"
        description="Gestiona los usuarios del panel"
        actions={
          <>
            <button>Importar</button>
            <button>Crear</button>
          </>
        }
      />,
    )

    // Assert
    expect(screen.getByRole('heading', { name: 'Usuarios' })).toBeInTheDocument()
    expect(screen.getByText('Gestiona los usuarios del panel')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Importar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear' })).toBeInTheDocument()
  })
})
