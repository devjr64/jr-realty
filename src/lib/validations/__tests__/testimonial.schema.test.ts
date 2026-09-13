import { describe, expect, it } from 'vitest'

import { testimonialSchema } from '@/lib/validations/testimonial.schema'

describe('testimonialSchema', () => {
  const validBase = {
    name: 'Carlos López',
    content: 'Excelente servicio, encontraron la casa de mis sueños en tiempo récord. ¡Muy recomendado!',
  }

  // Happy path
  it('accepts valid minimal input', () => {
    // Arrange
    const input = { ...validBase }
    // Act
    const result = testimonialSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts valid full input with all optional fields', () => {
    // Arrange
    const input = {
      ...validBase,
      role: 'Propietario',
      rating: 4,
      active: false,
    }
    // Act
    const result = testimonialSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('defaults rating to 5 when omitted', () => {
    // Arrange
    const input = { ...validBase }
    // Act
    const result = testimonialSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.rating).toBe(5)
  })

  it('defaults active to true when omitted', () => {
    // Arrange
    const input = { ...validBase }
    // Act
    const result = testimonialSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.active).toBe(true)
  })

  // name boundaries min 2 max 120
  it('rejects name with 1 character (min-1)', () => {
    // Arrange
    const input = { ...validBase, name: 'A' }
    // Act
    const result = testimonialSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('accepts name with exactly 2 characters (min)', () => {
    // Arrange
    const input = { ...validBase, name: 'Ab' }
    // Act
    const result = testimonialSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts name with exactly 120 characters (max)', () => {
    // Arrange
    const input = { ...validBase, name: 'a'.repeat(120) }
    // Act
    const result = testimonialSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects name with 121 characters (max+1)', () => {
    // Arrange
    const input = { ...validBase, name: 'a'.repeat(121) }
    // Act
    const result = testimonialSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects empty string name', () => {
    // Arrange
    const input = { ...validBase, name: '' }
    // Act
    const result = testimonialSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects missing name', () => {
    // Arrange
    const { name: _n, ...rest } = validBase
    // Act
    const result = testimonialSchema.safeParse(rest)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects null name', () => {
    // Arrange
    const input = { ...validBase, name: null }
    // Act
    const result = testimonialSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects undefined name', () => {
    // Arrange
    const input = { ...validBase, name: undefined }
    // Act
    const result = testimonialSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  // role max 100 optional nullable
  it('accepts valid role', () => {
    // Arrange
    const input = { ...validBase, role: 'Comprador' }
    // Act
    const result = testimonialSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts null role', () => {
    // Arrange
    const input = { ...validBase, role: null }
    // Act
    const result = testimonialSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts undefined role', () => {
    // Arrange
    const input = { ...validBase, role: undefined }
    // Act
    const result = testimonialSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts missing role field', () => {
    // Arrange
    const input = { ...validBase }
    // Act
    const result = testimonialSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts role with exactly 100 characters (max)', () => {
    // Arrange
    const input = { ...validBase, role: 'a'.repeat(100) }
    // Act
    const result = testimonialSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects role with 101 characters (max+1)', () => {
    // Arrange
    const input = { ...validBase, role: 'a'.repeat(101) }
    // Act
    const result = testimonialSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  // content boundaries min 10 max 2000
  it('rejects content with 9 characters (min-1)', () => {
    // Arrange
    const input = { ...validBase, content: 'a'.repeat(9) }
    // Act
    const result = testimonialSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('accepts content with exactly 10 characters (min)', () => {
    // Arrange
    const input = { ...validBase, content: 'a'.repeat(10) }
    // Act
    const result = testimonialSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts content with exactly 2000 characters (max)', () => {
    // Arrange
    const input = { ...validBase, content: 'a'.repeat(2000) }
    // Act
    const result = testimonialSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects content with 2001 characters (max+1)', () => {
    // Arrange
    const input = { ...validBase, content: 'a'.repeat(2001) }
    // Act
    const result = testimonialSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects empty string content', () => {
    // Arrange
    const input = { ...validBase, content: '' }
    // Act
    const result = testimonialSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects missing content', () => {
    // Arrange
    const { content: _c, ...rest } = validBase
    // Act
    const result = testimonialSchema.safeParse(rest)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects null content', () => {
    // Arrange
    const input = { ...validBase, content: null }
    // Act
    const result = testimonialSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects undefined content', () => {
    // Arrange
    const input = { ...validBase, content: undefined }
    // Act
    const result = testimonialSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  // rating coerce int min1 max5 default 5
  it('accepts rating 1 (min)', () => {
    // Arrange
    const input = { ...validBase, rating: 1 }
    // Act
    const result = testimonialSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts rating 5 (max)', () => {
    // Arrange
    const input = { ...validBase, rating: 5 }
    // Act
    const result = testimonialSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects rating 0 (min-1)', () => {
    // Arrange
    const input = { ...validBase, rating: 0 }
    // Act
    const result = testimonialSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects rating 6 (max+1)', () => {
    // Arrange
    const input = { ...validBase, rating: 6 }
    // Act
    const result = testimonialSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('coerces numeric string rating to number', () => {
    // Arrange
    const input = { ...validBase, rating: '4' }
    // Act
    const result = testimonialSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.rating).toBe(4)
  })

  it('rejects non-integer rating (float)', () => {
    // Arrange
    const input = { ...validBase, rating: 3.5 }
    // Act
    const result = testimonialSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects non-numeric string rating', () => {
    // Arrange
    const input = { ...validBase, rating: 'excellent' }
    // Act
    const result = testimonialSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  // active default true
  it('accepts active true', () => {
    // Arrange
    const input = { ...validBase, active: true }
    // Act
    const result = testimonialSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts active false', () => {
    // Arrange
    const input = { ...validBase, active: false }
    // Act
    const result = testimonialSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  // XSS payload — schema allows, sanitized at render layer
  it('allows XSS payload in name (sanitized at render layer)', () => {
    // Arrange
    const input = { ...validBase, name: '<script>alert(1)</script>' }
    // Act
    const result = testimonialSchema.safeParse(input)
    // Assert — validation checks length; display layer sanitizes via rehype-sanitize
    expect(result.success).toBe(true)
  })

  it('allows XSS payload in content (sanitized at render layer)', () => {
    // Arrange
    const input = { ...validBase, content: '<img src=x onerror=alert(1)> testimonio válido' }
    // Act
    const result = testimonialSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('allows XSS payload in role (sanitized at render layer)', () => {
    // Arrange
    const input = { ...validBase, role: '<svg onload=alert(1)>' }
    // Act
    const result = testimonialSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })
})
