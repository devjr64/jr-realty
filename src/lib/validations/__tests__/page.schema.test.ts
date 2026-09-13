import { describe, expect, it } from 'vitest'

import { pageSchema } from '@/lib/validations/page.schema'

describe('pageSchema', () => {
  const validBase = {
    title: 'Sobre Nosotros',
  }

  // Happy path
  it('accepts valid minimal input with title only', () => {
    // Arrange
    const input = { ...validBase }
    // Act
    const result = pageSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts valid full input with all optional fields', () => {
    // Arrange
    const input = {
      ...validBase,
      slug: 'sobre-nosotros',
      metaTitle: 'Sobre Nosotros | JR Realty',
      metaDescription: 'Conoce nuestra historia y equipo en JR Realty',
      published: true,
      content: [{ type: 'hero', title: 'Bienvenidos' }],
    }
    // Act
    const result = pageSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('defaults published to false when omitted', () => {
    // Arrange
    const input = { ...validBase }
    // Act
    const result = pageSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.published).toBe(false)
  })

  it('defaults content to empty array when omitted', () => {
    // Arrange
    const input = { ...validBase }
    // Act
    const result = pageSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.content).toEqual([])
  })

  // title boundaries min 2 max 150
  it('rejects title with 1 character (min-1)', () => {
    // Arrange
    const input = { ...validBase, title: 'A' }
    // Act
    const result = pageSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('accepts title with exactly 2 characters (min)', () => {
    // Arrange
    const input = { ...validBase, title: 'Ab' }
    // Act
    const result = pageSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts title with exactly 150 characters (max)', () => {
    // Arrange
    const input = { ...validBase, title: 'a'.repeat(150) }
    // Act
    const result = pageSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects title with 151 characters (max+1)', () => {
    // Arrange
    const input = { ...validBase, title: 'a'.repeat(151) }
    // Act
    const result = pageSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects empty string title', () => {
    // Arrange
    const input = { ...validBase, title: '' }
    // Act
    const result = pageSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects missing title', () => {
    // Arrange
    const input = {}
    // Act
    const result = pageSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects null title', () => {
    // Arrange
    const input = { ...validBase, title: null }
    // Act
    const result = pageSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects undefined title', () => {
    // Arrange
    const input = { ...validBase, title: undefined }
    // Act
    const result = pageSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  // slug optional
  it('accepts undefined slug', () => {
    // Arrange
    const input = { ...validBase, slug: undefined }
    // Act
    const result = pageSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts valid slug string', () => {
    // Arrange
    const input = { ...validBase, slug: 'mi-pagina-custom' }
    // Act
    const result = pageSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts missing slug field', () => {
    // Arrange
    const input = { ...validBase }
    // Act
    const result = pageSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  // metaTitle max 160 optional nullable
  it('accepts null metaTitle', () => {
    // Arrange
    const input = { ...validBase, metaTitle: null }
    // Act
    const result = pageSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts undefined metaTitle', () => {
    // Arrange
    const input = { ...validBase, metaTitle: undefined }
    // Act
    const result = pageSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts metaTitle with exactly 160 characters (max)', () => {
    // Arrange
    const input = { ...validBase, metaTitle: 'a'.repeat(160) }
    // Act
    const result = pageSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects metaTitle with 161 characters (max+1)', () => {
    // Arrange
    const input = { ...validBase, metaTitle: 'a'.repeat(161) }
    // Act
    const result = pageSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  // metaDescription max 300 optional nullable
  it('accepts null metaDescription', () => {
    // Arrange
    const input = { ...validBase, metaDescription: null }
    // Act
    const result = pageSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts undefined metaDescription', () => {
    // Arrange
    const input = { ...validBase, metaDescription: undefined }
    // Act
    const result = pageSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts metaDescription with exactly 300 characters (max)', () => {
    // Arrange
    const input = { ...validBase, metaDescription: 'a'.repeat(300) }
    // Act
    const result = pageSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects metaDescription with 301 characters (max+1)', () => {
    // Arrange
    const input = { ...validBase, metaDescription: 'a'.repeat(301) }
    // Act
    const result = pageSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  // published boolean default false
  it('accepts published true', () => {
    // Arrange
    const input = { ...validBase, published: true }
    // Act
    const result = pageSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts published false explicitly', () => {
    // Arrange
    const input = { ...validBase, published: false }
    // Act
    const result = pageSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  // content array max 30 default []
  it('accepts empty content array', () => {
    // Arrange
    const input = { ...validBase, content: [] }
    // Act
    const result = pageSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts content with exactly 30 blocks (max)', () => {
    // Arrange
    const content = Array.from({ length: 30 }, (_, i) => ({ type: 'text', body: `block ${i}` }))
    // Act
    const result = pageSchema.safeParse({ ...validBase, content })
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects content with 31 blocks (max+1)', () => {
    // Arrange
    const content = Array.from({ length: 31 }, (_, i) => ({ type: 'text', body: `block ${i}` }))
    // Act
    const result = pageSchema.safeParse({ ...validBase, content })
    // Assert
    expect(result.success).toBe(false)
  })

  it('accepts content with mixed block types', () => {
    // Arrange
    const content = [
      { type: 'hero', title: 'Hero' },
      { type: 'markdown', content: '## Hola' },
      { type: 'image', url: 'https://ex.com/img.jpg' },
    ]
    // Act
    const result = pageSchema.safeParse({ ...validBase, content })
    // Assert
    expect(result.success).toBe(true)
  })

  // XSS payload — schema allows, sanitized at render layer
  it('allows XSS payload in title (sanitized via rehype-sanitize at render)', () => {
    // Arrange
    const input = { ...validBase, title: '<script>alert(1)</script>' }
    // Act
    const result = pageSchema.safeParse(input)
    // Assert — zod validates length; BlockRenderer/MarkdownRenderer sanitizes
    expect(result.success).toBe(true)
  })

  it('allows XSS payload in content block (sanitized at render layer)', () => {
    // Arrange
    const content = [{ type: 'markdown', content: '<script>alert(1)</script>' }]
    // Act
    const result = pageSchema.safeParse({ ...validBase, content })
    // Assert
    expect(result.success).toBe(true)
  })

  it('allows XSS payload in metaTitle (sanitized at render layer)', () => {
    // Arrange
    const input = { ...validBase, metaTitle: '<img src=x onerror=alert(1)>' }
    // Act
    const result = pageSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })
})
