import { describe, expect, it } from 'vitest'

import { propertySchema } from '@/lib/validations/property.schema'

describe('propertySchema', () => {
  const base = {
    title: 'Apartamento en Las Mercedes',
    description: 'Espectacular apartamento de 3 recámaras con vista al mar.',
    type: 'APARTMENT',
    operation: 'SALE',
    price: '480000',
    address: 'Av. Principal, Las Mercedes',
    zoneId: 'z1',
  }

  it('accepts a valid property', () => {
    const result = propertySchema.safeParse(base)
    expect(result.success).toBe(true)
  })

  it('coerces numeric strings and applies defaults', () => {
    const result = propertySchema.safeParse(base)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.price).toBe(480000)
      expect(result.data.currency).toBe('USD')
      expect(result.data.status).toBe('AVAILABLE')
      expect(result.data.featured).toBe(false)
      expect(result.data.features).toEqual([])
    }
  })

  it('keeps blank optional numbers as null (not 0)', () => {
    const result = propertySchema.safeParse({ ...base, bedrooms: '' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.bedrooms).toBeNull()
  })

  it('rejects invalid enum values', () => {
    const result = propertySchema.safeParse({ ...base, type: 'CASTLE' })
    expect(result.success).toBe(false)
  })

  it('rejects non-positive prices', () => {
    const result = propertySchema.safeParse({ ...base, price: '0' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid image URLs', () => {
    const result = propertySchema.safeParse({
      ...base,
      images: [{ url: 'not-a-url', sortOrder: 0 }],
    })
    expect(result.success).toBe(false)
  })

  it('accepts relative paths starting with /uploads/', () => {
    const result = propertySchema.safeParse({
      ...base,
      images: [{ url: '/uploads/abc-123.jpg', sortOrder: 0 }],
    })
    expect(result.success).toBe(true)
  })

  it('accepts full http/https URLs', () => {
    const result = propertySchema.safeParse({
      ...base,
      images: [{ url: 'https://example.com/image.jpg', sortOrder: 0 }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects more than 6 tags', () => {
    const result = propertySchema.safeParse({
      ...base,
      tags: ['FURNISHED', 'PREMIUM', 'OPPORTUNITY', 'NEW_CONSTRUCTION', 'REPOSSESSED', 'PET_FRIENDLY', 'FURNISHED'],
    })
    expect(result.success).toBe(false)
  })
})