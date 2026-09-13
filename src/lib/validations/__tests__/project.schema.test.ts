import { describe, expect, it } from 'vitest'

import { projectSchema } from '@/lib/validations/project.schema'

describe('projectSchema', () => {
  const validBase = {
    name: 'Torre Central Premium',
    description:
      'Proyecto exclusivo de 30 pisos ubicado en el corazón de la ciudad con amenidades de primer nivel y acabados de lujo para un estilo de vida único.',
    zoneId: 'zone_123',
  }

  // Happy path
  it('accepts valid minimal input', () => {
    // Arrange
    const input = { ...validBase }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts valid full input with all optional fields', () => {
    // Arrange
    const input = {
      ...validBase,
      developer: 'Constructora Venezuela S.A.',
      deliveryDate: '2027-12-31',
      priceRangeMin: '150000',
      priceRangeMax: '500000',
      coverImage: 'https://example.com/cover.jpg',
      gallery: [{ url: 'https://example.com/1.jpg', alt: 'Vista' }],
      status: 'ACTIVE' as const,
    }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('defaults status to ACTIVE when omitted', () => {
    // Arrange
    const input = { ...validBase }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.status).toBe('ACTIVE')
  })

  it('defaults gallery to empty array when omitted', () => {
    // Arrange
    const input = { ...validBase }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.gallery).toEqual([])
  })

  // name boundaries min 3 max 150
  it('rejects name with 2 characters (min-1)', () => {
    // Arrange
    const input = { ...validBase, name: 'Ab' }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('accepts name with exactly 3 characters (min)', () => {
    // Arrange
    const input = { ...validBase, name: 'Abc' }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts name with exactly 150 characters (max)', () => {
    // Arrange
    const input = { ...validBase, name: 'a'.repeat(150) }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects name with 151 characters (max+1)', () => {
    // Arrange
    const input = { ...validBase, name: 'a'.repeat(151) }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects empty string name', () => {
    // Arrange
    const input = { ...validBase, name: '' }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects missing name', () => {
    // Arrange
    const { name: _n, ...rest } = validBase
    // Act
    const result = projectSchema.safeParse(rest)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects null name', () => {
    // Arrange
    const input = { ...validBase, name: null }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  // description boundaries min 20 max 10000
  it('rejects description with 19 characters (min-1)', () => {
    // Arrange
    const input = { ...validBase, description: 'a'.repeat(19) }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('accepts description with exactly 20 characters (min)', () => {
    // Arrange
    const input = { ...validBase, description: 'a'.repeat(20) }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts description with exactly 10000 characters (max)', () => {
    // Arrange
    const input = { ...validBase, description: 'a'.repeat(10000) }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects description with 10001 characters (max+1)', () => {
    // Arrange
    const input = { ...validBase, description: 'a'.repeat(10001) }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects missing description', () => {
    // Arrange
    const { description: _d, ...rest } = validBase
    // Act
    const result = projectSchema.safeParse(rest)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects null description', () => {
    // Arrange
    const input = { ...validBase, description: null }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects empty description', () => {
    // Arrange
    const input = { ...validBase, description: '' }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  // developer max 150 optional nullable
  it('accepts null developer', () => {
    // Arrange
    const input = { ...validBase, developer: null }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts undefined developer', () => {
    // Arrange
    const input = { ...validBase, developer: undefined }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts developer with exactly 150 characters (max)', () => {
    // Arrange
    const input = { ...validBase, developer: 'a'.repeat(150) }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects developer with 151 characters (max+1)', () => {
    // Arrange
    const input = { ...validBase, developer: 'a'.repeat(151) }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  // zoneId required min 1
  it('rejects empty zoneId', () => {
    // Arrange
    const input = { ...validBase, zoneId: '' }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects missing zoneId', () => {
    // Arrange
    const { zoneId: _z, ...rest } = validBase
    // Act
    const result = projectSchema.safeParse(rest)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects null zoneId', () => {
    // Arrange
    const input = { ...validBase, zoneId: null }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects undefined zoneId', () => {
    // Arrange
    const input = { ...validBase, zoneId: undefined }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  // deliveryDate coerce date optional nullable
  it('accepts valid deliveryDate as ISO string (coerced to Date)', () => {
    // Arrange
    const input = { ...validBase, deliveryDate: '2026-01-01' }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts null deliveryDate', () => {
    // Arrange
    const input = { ...validBase, deliveryDate: null }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts undefined deliveryDate', () => {
    // Arrange
    const input = { ...validBase, deliveryDate: undefined }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects invalid date string for deliveryDate', () => {
    // Arrange
    const input = { ...validBase, deliveryDate: 'not-a-date' }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  // priceRangeMin/Max coerce number positive max 100M
  it('coerces numeric string priceRangeMin', () => {
    // Arrange
    const input = { ...validBase, priceRangeMin: '250000' }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.priceRangeMin).toBe(250000)
  })

  it('rejects zero priceRangeMin (positive required)', () => {
    // Arrange
    const input = { ...validBase, priceRangeMin: 0 }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects negative priceRangeMin', () => {
    // Arrange
    const input = { ...validBase, priceRangeMin: -100 }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects priceRangeMax exceeding 100M (max+1)', () => {
    // Arrange
    const input = { ...validBase, priceRangeMax: 100_000_001 }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('accepts priceRangeMax exactly 100000000 (max)', () => {
    // Arrange
    const input = { ...validBase, priceRangeMax: 100_000_000 }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts null priceRangeMin', () => {
    // Arrange
    const input = { ...validBase, priceRangeMin: null }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  // coverImage max 500 optional nullable
  it('accepts null coverImage', () => {
    // Arrange
    const input = { ...validBase, coverImage: null }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects coverImage with 501 characters (max+1)', () => {
    // Arrange
    const input = { ...validBase, coverImage: 'a'.repeat(501) }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('accepts coverImage with exactly 500 characters (max)', () => {
    // Arrange
    const input = { ...validBase, coverImage: 'a'.repeat(500) }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  // gallery max 30 default []
  it('accepts empty gallery array', () => {
    // Arrange
    const input = { ...validBase, gallery: [] }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts gallery with exactly 30 items (max)', () => {
    // Arrange
    const gallery = Array.from({ length: 30 }, (_, i) => ({ url: `https://ex.com/${i}.jpg` }))
    // Act
    const result = projectSchema.safeParse({ ...validBase, gallery })
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects gallery with 31 items (max+1)', () => {
    // Arrange
    const gallery = Array.from({ length: 31 }, (_, i) => ({ url: `https://ex.com/${i}.jpg` }))
    // Act
    const result = projectSchema.safeParse({ ...validBase, gallery })
    // Assert
    expect(result.success).toBe(false)
  })

  // status enum
  it('accepts valid status SOLD_OUT', () => {
    // Arrange
    const input = { ...validBase, status: 'SOLD_OUT' as const }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts valid status COMING_SOON', () => {
    // Arrange
    const input = { ...validBase, status: 'COMING_SOON' as const }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects invalid enum status', () => {
    // Arrange
    const input = { ...validBase, status: 'INVALID' }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects empty string status', () => {
    // Arrange
    const input = { ...validBase, status: '' }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  // XSS payload — schema allows, sanitized at render layer
  it('allows XSS payload in name (sanitized at render layer)', () => {
    // Arrange
    const input = { ...validBase, name: '<script>alert(1)</script>' }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('allows XSS payload in description (sanitized at render layer)', () => {
    // Arrange
    const input = { ...validBase, description: '<svg onload=alert(1)>' + 'a'.repeat(20) }
    // Act
    const result = projectSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })
})
