import { describe, expect, it } from 'vitest'

import { siteSettingsSchema } from '@/lib/validations/site-settings.schema'

describe('siteSettingsSchema', () => {
  const validBase = {
    general: {
      siteName: 'JR Realty',
      phone: '+58 212-555-5678',
      email: 'admin' + '@' + 'example.com',
    },
    social: {},
    seo: {},
  }

  // Happy path
  it('accepts valid minimal input with required general fields', () => {
    // Arrange
    const input = { ...validBase }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts valid full input with all optional fields', () => {
    // Arrange
    const input = {
      general: {
        siteName: 'JR Realty',
        tagline: 'Tu hogar ideal en Venezuela',
        phone: '+58 212-555-4567',
        whatsapp: '+58 212-555-4567',
        email: 'admin' + '@' + 'example.com',
        address: 'Calle 50, Venezuela',
        currency: 'VES' as const,
      },
      social: {
        facebook: 'https://facebook.com/jrrealty',
        instagram: 'https://instagram.com/jrrealty',
        twitter: 'https://twitter.com/jrrealty',
        linkedin: 'https://linkedin.com/company/jrrealty',
        youtube: 'https://youtube.com/jrrealty',
      },
      seo: {
        title: 'JR Realty | Propiedades en Venezuela',
        description: 'Encuentra tu propiedad ideal con JR Realty, expertos en bienes raíces.',
      },
    }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('defaults currency to USD when omitted', () => {
    // Arrange
    const input = { ...validBase }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.general.currency).toBe('USD')
  })

  // general.siteName min 2 max 100
  it('rejects siteName with 1 character (min-1)', () => {
    // Arrange
    const input = { ...validBase, general: { ...validBase.general, siteName: 'A' } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('accepts siteName with exactly 2 characters (min)', () => {
    // Arrange
    const input = { ...validBase, general: { ...validBase.general, siteName: 'Ab' } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts siteName with exactly 100 characters (max)', () => {
    // Arrange
    const input = { ...validBase, general: { ...validBase.general, siteName: 'a'.repeat(100) } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects siteName with 101 characters (max+1)', () => {
    // Arrange
    const input = { ...validBase, general: { ...validBase.general, siteName: 'a'.repeat(101) } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects empty siteName', () => {
    // Arrange
    const input = { ...validBase, general: { ...validBase.general, siteName: '' } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects missing siteName', () => {
    // Arrange
    const { siteName: _s, ...restGeneral } = validBase.general
    const input = { ...validBase, general: restGeneral }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects null siteName', () => {
    // Arrange
    const input = { ...validBase, general: { ...validBase.general, siteName: null as unknown as string } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects undefined siteName', () => {
    // Arrange
    const input = { ...validBase, general: { ...validBase.general, siteName: undefined as unknown as string } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  // general.tagline max 200 optional
  it('accepts undefined tagline', () => {
    // Arrange
    const input = { ...validBase, general: { ...validBase.general, tagline: undefined } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts missing tagline field', () => {
    // Arrange
    const input = { ...validBase }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts tagline with exactly 200 characters (max)', () => {
    // Arrange
    const input = { ...validBase, general: { ...validBase.general, tagline: 'a'.repeat(200) } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects tagline with 201 characters (max+1)', () => {
    // Arrange
    const input = { ...validBase, general: { ...validBase.general, tagline: 'a'.repeat(201) } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  // general.phone min 6 max 30
  it('rejects phone with 5 characters (min-1)', () => {
    // Arrange
    const input = { ...validBase, general: { ...validBase.general, phone: '12345' } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('accepts phone with exactly 6 characters (min)', () => {
    // Arrange
    const input = { ...validBase, general: { ...validBase.general, phone: '123456' } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts phone with exactly 30 characters (max)', () => {
    // Arrange
    const input = { ...validBase, general: { ...validBase.general, phone: '1'.repeat(30) } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects phone with 31 characters (max+1)', () => {
    // Arrange
    const input = { ...validBase, general: { ...validBase.general, phone: '1'.repeat(31) } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects empty phone', () => {
    // Arrange
    const input = { ...validBase, general: { ...validBase.general, phone: '' } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects missing phone', () => {
    // Arrange
    const { phone: _p, ...restGeneral } = validBase.general
    const input = { ...validBase, general: restGeneral }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects null phone', () => {
    // Arrange
    const input = { ...validBase, general: { ...validBase.general, phone: null as unknown as string } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects undefined phone', () => {
    // Arrange
    const input = { ...validBase, general: { ...validBase.general, phone: undefined as unknown as string } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  // general.whatsapp max 30 optional
  it('accepts undefined whatsapp', () => {
    // Arrange
    const input = { ...validBase, general: { ...validBase.general, whatsapp: undefined } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts missing whatsapp field', () => {
    // Arrange
    const input = { ...validBase }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts whatsapp with exactly 30 characters (max)', () => {
    // Arrange
    const input = { ...validBase, general: { ...validBase.general, whatsapp: '1'.repeat(30) } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects whatsapp with 31 characters (max+1)', () => {
    // Arrange
    const input = { ...validBase, general: { ...validBase.general, whatsapp: '1'.repeat(31) } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  // general.email z.email
  it('rejects invalid email without @', () => {
    // Arrange
    const input = { ...validBase, general: { ...validBase.general, email: 'not-email' } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects email with trailing @ (test@)', () => {
    // Arrange
    const input = { ...validBase, general: { ...validBase.general, email: 'test@' } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects email with spaces', () => {
    // Arrange
    const input = { ...validBase, general: { ...validBase.general, email: 'admin @example.com' } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects empty email', () => {
    // Arrange
    const input = { ...validBase, general: { ...validBase.general, email: '' } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects missing email', () => {
    // Arrange
    const { email: _e, ...restGeneral } = validBase.general
    const input = { ...validBase, general: restGeneral }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects null email', () => {
    // Arrange
    const input = { ...validBase, general: { ...validBase.general, email: null as unknown as string } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects undefined email', () => {
    // Arrange
    const input = { ...validBase, general: { ...validBase.general, email: undefined as unknown as string } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  // general.address max 300 optional
  it('accepts undefined address', () => {
    // Arrange
    const input = { ...validBase, general: { ...validBase.general, address: undefined } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts missing address field', () => {
    // Arrange
    const input = { ...validBase }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts address with exactly 300 characters (max)', () => {
    // Arrange
    const input = { ...validBase, general: { ...validBase.general, address: 'a'.repeat(300) } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects address with 301 characters (max+1)', () => {
    // Arrange
    const input = { ...validBase, general: { ...validBase.general, address: 'a'.repeat(301) } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  // general.currency enum USD/VES default USD
  it('accepts currency USD', () => {
    // Arrange
    const input = { ...validBase, general: { ...validBase.general, currency: 'USD' as const } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts currency VES', () => {
    // Arrange
    const input = { ...validBase, general: { ...validBase.general, currency: 'VES' as const } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects invalid currency EUR', () => {
    // Arrange
    const input = { ...validBase, general: { ...validBase.general, currency: 'EUR' as unknown as 'USD' } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects empty string currency', () => {
    // Arrange
    const input = { ...validBase, general: { ...validBase.general, currency: '' as unknown as 'USD' } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  // social fields max 300 optional or literal ''
  it('accepts empty string facebook (allowed via literal)', () => {
    // Arrange
    const input = { ...validBase, social: { facebook: '' } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts valid facebook url', () => {
    // Arrange
    const input = { ...validBase, social: { facebook: 'https://facebook.com/test' } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts undefined social fields', () => {
    // Arrange
    const input = { ...validBase, social: { instagram: undefined, twitter: undefined } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts social field with exactly 300 characters (max)', () => {
    // Arrange
    const input = { ...validBase, social: { instagram: 'a'.repeat(300) } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects social field with 301 characters (max+1)', () => {
    // Arrange
    const input = { ...validBase, social: { instagram: 'a'.repeat(301) } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('accepts empty string for all social fields', () => {
    // Arrange
    const input = {
      ...validBase,
      social: { facebook: '', instagram: '', twitter: '', linkedin: '', youtube: '' },
    }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts youtube with valid url', () => {
    // Arrange
    const input = { ...validBase, social: { youtube: 'https://youtube.com/channel/test' } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts linkedin with valid url', () => {
    // Arrange
    const input = { ...validBase, social: { linkedin: 'https://linkedin.com/company/test' } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  // seo.title max 200 optional
  it('accepts undefined seo title', () => {
    // Arrange
    const input = { ...validBase, seo: { title: undefined } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts missing seo title field', () => {
    // Arrange
    const input = { ...validBase, seo: {} }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts seo title with exactly 200 characters (max)', () => {
    // Arrange
    const input = { ...validBase, seo: { title: 'a'.repeat(200) } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects seo title with 201 characters (max+1)', () => {
    // Arrange
    const input = { ...validBase, seo: { title: 'a'.repeat(201) } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  // seo.description max 500 optional
  it('accepts undefined seo description', () => {
    // Arrange
    const input = { ...validBase, seo: { description: undefined } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts missing seo description field', () => {
    // Arrange
    const input = { ...validBase, seo: {} }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts seo description with exactly 500 characters (max)', () => {
    // Arrange
    const input = { ...validBase, seo: { description: 'a'.repeat(500) } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects seo description with 501 characters (max+1)', () => {
    // Arrange
    const input = { ...validBase, seo: { description: 'a'.repeat(501) } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  // missing top-level objects
  it('rejects missing general object', () => {
    // Arrange
    const { general: _g, ...rest } = validBase
    // Act
    const result = siteSettingsSchema.safeParse(rest)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects missing social object', () => {
    // Arrange
    const { social: _s, ...rest } = validBase
    // Act
    const result = siteSettingsSchema.safeParse(rest)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects missing seo object', () => {
    // Arrange
    const { seo: _s, ...rest } = validBase
    // Act
    const result = siteSettingsSchema.safeParse(rest)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects null general', () => {
    // Arrange
    const input = { ...validBase, general: null as unknown as typeof validBase.general }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  // XSS payload — schema allows, sanitized at render layer
  it('allows XSS payload in siteName (sanitized at render layer)', () => {
    // Arrange
    const input = { ...validBase, general: { ...validBase.general, siteName: '<script>alert(1)</script>' } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert — zod checks length; display layer sanitizes via rehype-sanitize
    expect(result.success).toBe(true)
  })

  it('allows XSS payload in tagline (sanitized at render layer)', () => {
    // Arrange
    const input = { ...validBase, general: { ...validBase.general, tagline: '<img src=x onerror=alert(1)>' } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('allows XSS payload in seo title (sanitized at render layer)', () => {
    // Arrange
    const input = { ...validBase, seo: { title: '<svg onload=alert(1)>' } }
    // Act
    const result = siteSettingsSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })
})
