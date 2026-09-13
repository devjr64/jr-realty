import { describe, expect, it } from 'vitest'

import { authErrorMessages, loginSchema } from '@/lib/validations/auth.schema'

describe('loginSchema', () => {
  const validBase = {
    email: 'admin' + '@' + 'example.com',
    password: 'Admin123!',
  }

  // Happy path
  it('accepts valid email and password', () => {
    // Arrange
    const input = { ...validBase }
    // Act
    const result = loginSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts password with exactly 8 characters (min)', () => {
    // Arrange
    const input = { ...validBase, password: 'Abcdef12' }
    // Act
    const result = loginSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts long password', () => {
    // Arrange
    const input = { ...validBase, password: 'a'.repeat(100) }
    // Act
    const result = loginSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  // email validation
  it('rejects invalid email without @', () => {
    // Arrange
    const input = { ...validBase, email: 'not-email' }
    // Act
    const result = loginSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects email with trailing @ (test@)', () => {
    // Arrange
    const input = { ...validBase, email: 'test@' }
    // Act
    const result = loginSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects email with spaces', () => {
    // Arrange
    const input = { ...validBase, email: 'admin @example.com' }
    // Act
    const result = loginSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects empty email', () => {
    // Arrange
    const input = { ...validBase, email: '' }
    // Act
    const result = loginSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects missing email', () => {
    // Arrange
    const input = { password: 'Admin123!' }
    // Act
    const result = loginSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects null email', () => {
    // Arrange
    const input = { ...validBase, email: null }
    // Act
    const result = loginSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects undefined email', () => {
    // Arrange
    const input = { ...validBase, email: undefined }
    // Act
    const result = loginSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects email without domain', () => {
    // Arrange
    const input = { ...validBase, email: 'admin@' }
    // Act
    const result = loginSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  // password boundaries min 8
  it('rejects password with 7 characters (min-1)', () => {
    // Arrange
    const input = { ...validBase, password: 'Abc123!' }
    // Act
    const result = loginSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects empty string password', () => {
    // Arrange
    const input = { ...validBase, password: '' }
    // Act
    const result = loginSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects missing password', () => {
    // Arrange
    const input = { email: 'admin' + '@' + 'example.com' }
    // Act
    const result = loginSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects null password', () => {
    // Arrange
    const input = { ...validBase, password: null }
    // Act
    const result = loginSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects undefined password', () => {
    // Arrange
    const input = { ...validBase, password: undefined }
    // Act
    const result = loginSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects password with only spaces but under min after trim is not applied (server trims, schema checks raw)', () => {
    // Arrange
    const input = { ...validBase, password: '       ' }
    // Act
    const result = loginSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  // XSS payload — schema allows, sanitized at render layer / server action never reflects
  it('allows XSS payload in email field syntactically valid but schema rejects if not email-shaped', () => {
    // Arrange
    const input = { ...validBase, email: '<script>alert(1)</script>@example.com' }
    // Act
    const result = loginSchema.safeParse(input)
    // Assert — zod email check will reject malformed; this documents behavior
    expect(result.success).toBe(false)
  })

  it('allows XSS payload in password (schema checks length only, not content)', () => {
    // Arrange
    const input = { ...validBase, password: '<script>alert(1)</script>123' }
    // Act
    const result = loginSchema.safeParse(input)
    // Assert — password length valid, content not sanitized at validation layer
    expect(result.success).toBe(true)
  })
})

describe('authErrorMessages', () => {
  it('contains CredentialsSignin message', () => {
    // Arrange
    const key = 'CredentialsSignin'
    // Act
    const message = authErrorMessages[key]
    // Assert
    expect(message).toBeDefined()
  })

  it('contains validation message', () => {
    // Arrange
    const key = 'validation'
    // Act
    const message = authErrorMessages[key]
    // Assert
    expect(message).toBeDefined()
  })

  it('contains default message', () => {
    // Arrange
    const key = 'default'
    // Act
    const message = authErrorMessages[key]
    // Assert
    expect(message).toBeDefined()
  })
})
