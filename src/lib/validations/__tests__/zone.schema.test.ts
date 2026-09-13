import { describe, expect, it } from 'vitest'

import { zoneSchema } from '@/lib/validations/zone.schema'

describe('zoneSchema', () => {
  const validBase = {
    name: 'Las Mercedes',
  }

  // Happy path
  it('accepts valid minimal input', () => {
    // Arrange
    const input = { ...validBase }
    // Act
    const result = zoneSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts valid full input with all optional fields', () => {
    // Arrange
    const input = {
      ...validBase,
      slug: 'las-mercedes',
      description: 'Zona exclusiva con vista al mar y acceso directo a la ciudad.',
      imageUrl: 'https://example.com/images/costa.jpg',
      parentId: 'parent_123',
    }
    // Act
    const result = zoneSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  // name boundaries min 2 max 100
  it('rejects name with 1 character (min-1)', () => {
    // Arrange
    const input = { ...validBase, name: 'A' }
    // Act
    const result = zoneSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('accepts name with exactly 2 characters (min)', () => {
    // Arrange
    const input = { ...validBase, name: 'Ab' }
    // Act
    const result = zoneSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts name with exactly 100 characters (max)', () => {
    // Arrange
    const input = { ...validBase, name: 'a'.repeat(100) }
    // Act
    const result = zoneSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects name with 101 characters (max+1)', () => {
    // Arrange
    const input = { ...validBase, name: 'a'.repeat(101) }
    // Act
    const result = zoneSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects empty string name', () => {
    // Arrange
    const input = { ...validBase, name: '' }
    // Act
    const result = zoneSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects missing name', () => {
    // Arrange
    const input = {}
    // Act
    const result = zoneSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects null name', () => {
    // Arrange
    const input = { ...validBase, name: null }
    // Act
    const result = zoneSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects undefined name', () => {
    // Arrange
    const input = { ...validBase, name: undefined }
    // Act
    const result = zoneSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  // slug optional
  it('accepts undefined slug (optional)', () => {
    // Arrange
    const input = { ...validBase, slug: undefined }
    // Act
    const result = zoneSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts missing slug field', () => {
    // Arrange
    const input = { ...validBase }
    // Act
    const result = zoneSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts any string slug (auto-generated from name in server action)', () => {
    // Arrange
    const input = { ...validBase, slug: 'my-custom-slug-123' }
    // Act
    const result = zoneSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  // description max 2000 optional nullable
  it('accepts null description', () => {
    // Arrange
    const input = { ...validBase, description: null }
    // Act
    const result = zoneSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts undefined description', () => {
    // Arrange
    const input = { ...validBase, description: undefined }
    // Act
    const result = zoneSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts description with exactly 2000 characters (max)', () => {
    // Arrange
    const input = { ...validBase, description: 'a'.repeat(2000) }
    // Act
    const result = zoneSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects description with 2001 characters (max+1)', () => {
    // Arrange
    const input = { ...validBase, description: 'a'.repeat(2001) }
    // Act
    const result = zoneSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('accepts missing description field', () => {
    // Arrange
    const input = { ...validBase }
    // Act
    const result = zoneSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  // imageUrl max 500 optional nullable
  it('accepts null imageUrl', () => {
    // Arrange
    const input = { ...validBase, imageUrl: null }
    // Act
    const result = zoneSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts undefined imageUrl', () => {
    // Arrange
    const input = { ...validBase, imageUrl: undefined }
    // Act
    const result = zoneSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts imageUrl with exactly 500 characters (max)', () => {
    // Arrange
    const input = { ...validBase, imageUrl: 'a'.repeat(500) }
    // Act
    const result = zoneSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects imageUrl with 501 characters (max+1)', () => {
    // Arrange
    const input = { ...validBase, imageUrl: 'a'.repeat(501) }
    // Act
    const result = zoneSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  // parentId optional nullable
  it('accepts null parentId', () => {
    // Arrange
    const input = { ...validBase, parentId: null }
    // Act
    const result = zoneSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts undefined parentId', () => {
    // Arrange
    const input = { ...validBase, parentId: undefined }
    // Act
    const result = zoneSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts missing parentId field', () => {
    // Arrange
    const input = { ...validBase }
    // Act
    const result = zoneSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts valid parentId string', () => {
    // Arrange
    const input = { ...validBase, parentId: 'zone_parent_1' }
    // Act
    const result = zoneSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  // XSS payload — schema allows, sanitized at render layer
  it('allows XSS payload in name (sanitized via rehype-sanitize at render)', () => {
    // Arrange
    const input = { ...validBase, name: '<script>alert(1)</script>' }
    // Act
    const result = zoneSchema.safeParse(input)
    // Assert — zod checks length only; display must sanitize
    expect(result.success).toBe(true)
  })

  it('allows XSS payload in description (sanitized at render layer)', () => {
    // Arrange
    const input = { ...validBase, description: '<img src=x onerror=alert(1)>' }
    // Act
    const result = zoneSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })
})
