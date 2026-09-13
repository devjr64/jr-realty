import React from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { MarkdownRenderer } from '@/components/shared/markdown-renderer'

describe('MarkdownRenderer', () => {
  it('renders ## heading as h2', () => {
    render(<MarkdownRenderer content="## Inversión en Venezuela" />)
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveTextContent('Inversión en Venezuela')
  })

  it('renders GFM lists', () => {
    const md = '- Casa en Las Mercedes\n- Apartamento en El Rosal\n- Lote en La Castellana'
    const { container } = render(<MarkdownRenderer content={md} />)
    const items = container.querySelectorAll('li')
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('Casa en Las Mercedes')
  })

  it('sanitizes script tags (rehype-sanitize)', () => {
    const md = 'Hola <script>alert("xss")</script> mundo'
    const { container } = render(<MarkdownRenderer content={md} />)
    expect(container.querySelector('script')).toBeNull()
    expect(container.textContent).not.toContain('<script>')
    expect(container.textContent).toContain('Hola')
    expect(container.textContent).toContain('mundo')
  })

  it('sanitizes javascript: links and event handlers', () => {
    const md = '[click](javascript:alert(1))'
    const { container } = render(<MarkdownRenderer content={md} />)
    const anchor = container.querySelector('a')
    // rehype-sanitize strips javascript: href
    if (anchor) {
      expect(anchor.getAttribute('href')).not.toBe('javascript:alert(1)')
    }
    expect(container.querySelector('[onclick]')).toBeNull()
  })

  it('renders GFM tables and bold', () => {
    const md = '**Negrita**\n\n| col1 | col2 |\n|------|------|\n| a | b |'
    const { container } = render(<MarkdownRenderer content={md} />)
    expect(container.querySelector('strong')).toHaveTextContent('Negrita')
    expect(container.querySelector('table')).toBeInTheDocument()
  })

  it('returns null for empty/blank content', () => {
    const { container: c1 } = render(<MarkdownRenderer content="" />)
    expect(c1.innerHTML).toBe('')

    const { container: c2 } = render(<MarkdownRenderer content="   " />)
    expect(c2.innerHTML).toBe('')

    const { container: c3 } = render(<MarkdownRenderer content={null as unknown as string} />)
    expect(c3.innerHTML).toBe('')
  })

  it('normalizes array content (Prisma Json block array)', () => {
    const arr = [{ text: '## Desde array' }, 'segundo bloque', { body: 'tercer bloque' }]
    const { container } = render(<MarkdownRenderer content={arr as unknown as string} />)
    expect(container.querySelector('h2')).toHaveTextContent('Desde array')
    expect(container.textContent).toContain('segundo bloque')
    expect(container.textContent).toContain('tercer bloque')
  })

  it('normalizes object content via JSON stringification', () => {
    const obj = { title: 'obj' }
    const { container } = render(<MarkdownRenderer content={obj as unknown as string} />)
    // JSON.stringify produces {"title":"obj"} rendered as text
    expect(container.textContent).toContain('obj')
  })

  it('applies custom className when provided', () => {
    const { container } = render(<MarkdownRenderer content="Hola" className="custom-prose" />)
    expect(container.firstChild).toHaveClass('custom-prose')
  })

  it('applies default prose classes when no className', () => {
    const { container } = render(<MarkdownRenderer content="Hola" />)
    expect(container.firstChild).toHaveClass('prose')
  })

  it('strips exact XSS payload <script>alert(1)</script>', () => {
    // Arrange
    const xss = '<script>alert(1)</script>'
    // Act
    const { container } = render(<MarkdownRenderer content={xss} />)
    // Assert — acceptance: XSS <script>alert(1)</script> stripped by rehype-sanitize
    expect(container.querySelector('script')).toBeNull()
    expect(container.innerHTML).not.toContain('script')
    // Even the text node should be empty or sanitized — no execution
    expect(container.textContent).not.toContain('<script>')
  })

  it('has prose class covering prose-neutral and leading-relaxed', () => {
    // Arrange & Act
    const { container } = render(<MarkdownRenderer content="Hola mundo" />)
    // Assert — prose class requirement
    expect(container.firstChild).toHaveClass('prose')
    expect(container.firstChild).toHaveClass('prose-neutral')
    expect(container.firstChild).toHaveClass('leading-relaxed')
  })

  it('empty placeholder returns null fragment (no prose wrapper)', () => {
    // Arrange & Act
    const { container } = render(<MarkdownRenderer content="" />)
    // Assert
    expect(container.innerHTML).toBe('')
    expect(container.querySelector('.prose')).toBeNull()
  })

  it('matches snapshot for heading markdown', () => {
    // Arrange
    const md = '## Inversión en Venezuela\n\nContenido **negrita**'
    // Act
    const { container } = render(<MarkdownRenderer content={md} />)
    // Assert — snapshots for markdown
    expect(container.innerHTML).toMatchSnapshot()
  })

  it('matches snapshot for gfm table markdown', () => {
    // Arrange
    const md = '| col1 | col2 |\n|------|------|\n| a | b |\n| c | d |'
    // Act
    const { container } = render(<MarkdownRenderer content={md} />)
    // Assert
    expect(container.innerHTML).toMatchSnapshot()
  })

  it('Verifies XSS snapshot is sanitized', () => {
    // Arrange
    const xss = 'Hola <script>alert(1)</script> mundo'
    // Act
    const { container } = render(<MarkdownRenderer content={xss} />)
    // Assert
    expect(container.innerHTML).toMatchSnapshot()
    expect(container.querySelector('script')).toBeNull()
  })
})
