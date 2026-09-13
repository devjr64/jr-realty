import { describe, expect, it } from 'vitest'

import { agentSchema } from '@/lib/validations/agent.schema'

describe('agentSchema', () => {
  const validBase = {
    name: 'Carlos Ruiz',
    email: 'agent' + '@' + 'example.com',
    phone: '+58 212-555-5678',
  }

  // Happy path
  it('accepts valid minimal input with name, email and phone', () => {
    // Arrange
    const input = { ...validBase }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts valid full input with all optional fields', () => {
    // Arrange
    const input = {
      ...validBase,
      password: 'Secure123!',
      title: 'Agente Senior',
      whatsapp: '+58 212-555-4567',
      active: false,
    }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('defaults active to true when omitted', () => {
    // Arrange
    const input = { ...validBase }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.active).toBe(true)
  })

  // name boundaries min 2 max 120
  it('rejects name with 1 character (min-1)', () => {
    // Arrange
    const input = { ...validBase, name: 'A' }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('accepts name with exactly 2 characters (min)', () => {
    // Arrange
    const input = { ...validBase, name: 'Ab' }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts name with exactly 120 characters (max)', () => {
    // Arrange
    const input = { ...validBase, name: 'a'.repeat(120) }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects name with 121 characters (max+1)', () => {
    // Arrange
    const input = { ...validBase, name: 'a'.repeat(121) }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects empty string name', () => {
    // Arrange
    const input = { ...validBase, name: '' }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects missing name', () => {
    // Arrange
    const { name: _n, ...rest } = validBase
    // Act
    const result = agentSchema.safeParse(rest)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects null name', () => {
    // Arrange
    const input = { ...validBase, name: null }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects undefined name', () => {
    // Arrange
    const input = { ...validBase, name: undefined }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  // email validation
  it('rejects invalid email without @', () => {
    // Arrange
    const input = { ...validBase, email: 'not-email' }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects email with trailing @ (test@)', () => {
    // Arrange
    const input = { ...validBase, email: 'test@' }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects email with spaces', () => {
    // Arrange
    const input = { ...validBase, email: 'agent @example.com' }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects empty email', () => {
    // Arrange
    const input = { ...validBase, email: '' }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects missing email', () => {
    // Arrange
    const { email: _e, ...rest } = validBase
    // Act
    const result = agentSchema.safeParse(rest)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects null email', () => {
    // Arrange
    const input = { ...validBase, email: null }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects undefined email', () => {
    // Arrange
    const input = { ...validBase, email: undefined }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  // password optional min 8 or empty string
  it('accepts valid password with 8 characters (min)', () => {
    // Arrange
    const input = { ...validBase, password: 'Abcdef12' }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects password with 7 characters (min-1)', () => {
    // Arrange
    const input = { ...validBase, password: 'Abc123!' }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('accepts empty string password (allowed via literal)', () => {
    // Arrange
    const input = { ...validBase, password: '' }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts missing password field (optional)', () => {
    // Arrange
    const input = { ...validBase }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts undefined password', () => {
    // Arrange
    const input = { ...validBase, password: undefined }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts long password', () => {
    // Arrange
    const input = { ...validBase, password: 'a'.repeat(50) }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  // title optional nullable max 100
  it('accepts valid title', () => {
    // Arrange
    const input = { ...validBase, title: 'Agente Inmobiliario' }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts null title', () => {
    // Arrange
    const input = { ...validBase, title: null }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts undefined title', () => {
    // Arrange
    const input = { ...validBase, title: undefined }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts missing title field', () => {
    // Arrange
    const input = { ...validBase }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts title with exactly 100 characters (max)', () => {
    // Arrange
    const input = { ...validBase, title: 'a'.repeat(100) }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects title with 101 characters (max+1)', () => {
    // Arrange
    const input = { ...validBase, title: 'a'.repeat(101) }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  // phone min 6 max 30
  it('rejects phone with 5 characters (min-1)', () => {
    // Arrange
    const input = { ...validBase, phone: '12345' }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('accepts phone with exactly 6 characters (min)', () => {
    // Arrange
    const input = { ...validBase, phone: '123456' }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts phone with exactly 30 characters (max)', () => {
    // Arrange
    const input = { ...validBase, phone: '1'.repeat(30) }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects phone with 31 characters (max+1)', () => {
    // Arrange
    const input = { ...validBase, phone: '1'.repeat(31) }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects empty phone', () => {
    // Arrange
    const input = { ...validBase, phone: '' }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects missing phone', () => {
    // Arrange
    const { phone: _p, ...rest } = validBase
    // Act
    const result = agentSchema.safeParse(rest)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects null phone', () => {
    // Arrange
    const input = { ...validBase, phone: null }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects undefined phone', () => {
    // Arrange
    const input = { ...validBase, phone: undefined }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  // whatsapp optional nullable max 30
  it('accepts valid whatsapp', () => {
    // Arrange
    const input = { ...validBase, whatsapp: '+58 212-555-4567' }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts null whatsapp', () => {
    // Arrange
    const input = { ...validBase, whatsapp: null }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts undefined whatsapp', () => {
    // Arrange
    const input = { ...validBase, whatsapp: undefined }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts missing whatsapp field', () => {
    // Arrange
    const input = { ...validBase }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts whatsapp with exactly 30 characters (max)', () => {
    // Arrange
    const input = { ...validBase, whatsapp: '1'.repeat(30) }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects whatsapp with 31 characters (max+1)', () => {
    // Arrange
    const input = { ...validBase, whatsapp: '1'.repeat(31) }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  // active boolean default true
  it('accepts active true', () => {
    // Arrange
    const input = { ...validBase, active: true }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts active false', () => {
    // Arrange
    const input = { ...validBase, active: false }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  // XSS payload — schema allows, sanitized at render layer
  it('allows XSS payload in name (sanitized at render layer)', () => {
    // Arrange
    const input = { ...validBase, name: '<script>alert(1)</script>' }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert — zod checks length; display layer sanitizes via rehype-sanitize
    expect(result.success).toBe(true)
  })

  it('allows XSS payload in title (sanitized at render layer)', () => {
    // Arrange
    const input = { ...validBase, title: '<img src=x onerror=alert(1)>' }
    // Act
    const result = agentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })
})
