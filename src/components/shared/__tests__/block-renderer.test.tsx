import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { BlocksRenderer, BlockView, isCmsBlock } from '@/components/shared/block-renderer'

// Mock next/link to avoid Next.js router dependency — use plain <a> without React factory hoist issues
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children),
}))

// Mock Button to keep hero/cta snapshots stable — real Button (base-ui) adds many classes
// which would make `toMatchSnapshot` brittle across shadcn updates. Mock renders plain element
// while preserving render prop (Link) behaviour.
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    render,
  }: {
    children: React.ReactNode
    render?: React.ReactElement<{ href?: string }>
  }) => {
    if (render && React.isValidElement(render)) {
      const href = (render.props as { href?: string }).href
      return React.createElement('a', { href: href ?? '/' }, children)
    }
    return React.createElement('button', {}, children)
  },
  buttonVariants: () => '',
}))

// Mocks to satisfy Sonner/toploader usage elsewhere — not used in BlockView but harmless
vi.mock('nextjs-toploader', () => ({ default: () => null }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

describe('BlockRenderer - isCmsBlock', () => {
  it('returns true for valid block with type', () => {
    // Arrange
    const value = { type: 'hero', title: 'Hola' }
    // Act
    const result = isCmsBlock(value)
    // Assert
    expect(result).toBe(true)
  })

  it('returns false for null, non-object, or missing type', () => {
    // Arrange & Act & Assert
    expect(isCmsBlock(null)).toBe(false)
    expect(isCmsBlock('string')).toBe(false)
    expect(isCmsBlock({ title: 'no type' })).toBe(false)
    expect(isCmsBlock({ type: 123 })).toBe(false)
  })
})

describe('BlockRenderer - BlockView', () => {
  it('renders hero block with title, subtitle and cta', () => {
    // Arrange
    const block = { type: 'hero', title: 'Bienvenido', subtitle: 'Subtitulo', ctaText: 'Ver más', ctaHref: '/propiedades' }
    // Act
    const { container } = render(<BlockView block={block as never} />)
    // Assert
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Bienvenido')
    expect(screen.getByText('Subtitulo')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver más' })).toHaveAttribute('href', '/propiedades')
    expect(container.querySelector('section')).toBeInTheDocument()
  })

  it('renders hero without subtitle or cta when not provided', () => {
    // Arrange
    const block = { type: 'hero', title: 'Solo título' }
    // Act
    render(<BlockView block={block as never} />)
    // Assert
    expect(screen.getByText('Solo título')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('renders text block with title and body', () => {
    // Arrange
    const block = { type: 'text', title: 'Sobre nosotros', body: 'Contenido largo' }
    // Act
    render(<BlockView block={block as never} />)
    // Assert
    expect(screen.getByText('Sobre nosotros')).toBeInTheDocument()
    expect(screen.getByText('Contenido largo')).toBeInTheDocument()
  })

  it('renders cta block with description and button', () => {
    // Arrange
    const block = { type: 'cta', title: 'Contacto', description: 'Desc', buttonText: 'Escribir', buttonHref: '/contacto' }
    // Act
    render(<BlockView block={block as never} />)
    // Assert
    expect(screen.getByText('Contacto')).toBeInTheDocument()
    expect(screen.getByText('Desc')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Escribir' })).toHaveAttribute('href', '/contacto')
  })

  it('renders features block grid', () => {
    // Arrange
    const block = { type: 'features', title: 'Ventajas', items: [{ title: 'Piscina', description: 'Grande' }, { title: 'Gimnasio' }] }
    // Act
    render(<BlockView block={block as never} />)
    // Assert
    expect(screen.getByText('Ventajas')).toBeInTheDocument()
    expect(screen.getByText('Piscina')).toBeInTheDocument()
    expect(screen.getByText('Grande')).toBeInTheDocument()
    expect(screen.getByText('Gimnasio')).toBeInTheDocument()
  })

  it('renders markdown block with prose and XSS sanitized', () => {
    // Arrange
    // Separate Hola paragraph from <script> so rehype-sanitize preserves markdown while stripping script.
    // Previous fixture '# Título\n\n<script>alert(1)</script> Hola **negrita**' caused second paragraph
    // to be parsed as HTML (script + text), so 'Hola' was dropped; split ensures Hola survives as md.
    const xss = '# Título\n\nHola **negrita**\n\n<script>alert(1)</script>'
    const block = { type: 'markdown', content: xss, title: 'MD Title' }
    // Act
    const { container } = render(<BlockView block={block as never} />)
    // Assert
    expect(screen.getByText('MD Title')).toBeInTheDocument()
    expect(container.querySelector('script')).toBeNull()
    expect(container.textContent).not.toContain('<script>')
    expect(container.textContent).toContain('Hola')
    expect(container.textContent).toContain('negrita')
    expect(container.textContent).toContain('Título')
    // MarkdownRenderer adds prose class via its container
    expect(container.querySelector('.prose')).toBeInTheDocument()
  })

  it('renders markdown block with gfm tables', () => {
    // Arrange
    const md = '| col1 | col2 |\n|------|------|\n| a | b |'
    const block = { type: 'markdown', content: md }
    // Act
    const { container } = render(<BlockView block={block as never} />)
    // Assert
    expect(container.querySelector('table')).toBeInTheDocument()
  })

  it('returns null for empty markdown content (placeholder)', () => {
    // Arrange
    const block = { type: 'markdown', content: '   ' }
    // Act
    const { container } = render(<BlockView block={block as never} />)
    // Assert
    expect(container.innerHTML).toBe('')
  })

  it('returns null for unknown block type', () => {
    // Arrange
    const block = { type: 'unknown-type', foo: 'bar' }
    // Act
    const { container } = render(<BlockView block={block as never} />)
    // Assert
    expect(container.innerHTML).toBe('')
  })

  it('strips <script>alert(1)</script> via rehype-sanitize in markdown', () => {
    // Arrange
    const payload = '<script>alert(1)</script>'
    const block = { type: 'markdown', content: payload }
    // Act
    const { container } = render(<BlockView block={block as never} />)
    // Assert — acceptance: XSS <script>alert(1)</script> stripped
    expect(container.querySelector('script')).toBeNull()
    expect(container.innerHTML).not.toContain('script')
  })

  it('matches snapshot for hero block', () => {
    // Arrange
    const block = { type: 'hero', title: 'Snapshot Hero', subtitle: 'sub', ctaText: 'Click', ctaHref: '/' }
    // Act
    const { container } = render(<BlockView block={block as never} />)
    // Assert
    expect(container.innerHTML).toMatchSnapshot()
  })

  it('matches snapshot for markdown block', () => {
    // Arrange
    const block = { type: 'markdown', content: '## Hola\n\n**negrita** y lista:\n\n- uno\n- dos' }
    // Act
    const { container } = render(<BlockView block={block as never} />)
    // Assert
    expect(container.innerHTML).toMatchSnapshot()
  })
})

describe('BlockRenderer - BlocksRenderer', () => {
  it('renders list of blocks in order', () => {
    // Arrange
    const blocks = [
      { type: 'hero', title: 'Hero' },
      { type: 'text', title: 'Texto', body: 'Cuerpo' },
    ]
    // Act
    render(<BlocksRenderer blocks={blocks as never} />)
    // Assert
    expect(screen.getByText('Hero')).toBeInTheDocument()
    expect(screen.getByText('Texto')).toBeInTheDocument()
  })

  it('renders empty fragment for empty blocks', () => {
    // Arrange
    const blocks: never[] = []
    // Act
    const { container } = render(<BlocksRenderer blocks={blocks} />)
    // Assert
    expect(container.innerHTML).toBe('')
  })

  it('skips unknown blocks silently while rendering known ones', () => {
    // Arrange
    const blocks = [
      { type: 'hero', title: 'Visible' },
      { type: 'properties-grid', title: 'Grid placeholder' },
    ]
    // Act
    render(<BlocksRenderer blocks={blocks as never} />)
    // Assert
    expect(screen.getByText('Visible')).toBeInTheDocument()
    // properties-grid hits default null, nothing rendered for second
  })
})
