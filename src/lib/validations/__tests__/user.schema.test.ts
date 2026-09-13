import { describe, expect, it } from 'vitest'

import { userSchema } from '@/lib/validations/user.schema'

describe('userSchema', () => {
  const validBase = {
    name: 'Carlos Ruiz',
    email: 'user@example.com',
    password: 'Secure123!',
    role: 'CLIENT' as const,
    active: true,
    phone: '',
    title: '',
    whatsapp: '',
  }

  // Happy path — CLIENT role (no agent fields required)
  it('accepts valid CLIENT user without agent fields', () => {
    const result = userSchema.safeParse(validBase)
    expect(result.success).toBe(true)
  })

  it('accepts valid AGENT user with phone', () => {
    const result = userSchema.safeParse({
      ...validBase,
      role: 'AGENT',
      phone: '+58 212-555-1234',
      title: 'Asesor Senior',
      whatsapp: '+58 212-555-5678',
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid SUPER_ADMIN user', () => {
    const result = userSchema.safeParse({ ...validBase, role: 'SUPER_ADMIN' })
    expect(result.success).toBe(true)
  })

  // Agent-specific validation
  it('rejects AGENT without phone (empty string)', () => {
    const result = userSchema.safeParse({ ...validBase, role: 'AGENT', phone: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const phoneError = result.error.issues.find((i) => i.path.includes('phone'))
      expect(phoneError).toBeDefined()
    }
  })

  it('rejects AGENT with phone too short (< 6 chars)', () => {
    const result = userSchema.safeParse({ ...validBase, role: 'AGENT', phone: '12345' })
    expect(result.success).toBe(false)
  })

  it('accepts AGENT with phone exactly 6 chars', () => {
    const result = userSchema.safeParse({ ...validBase, role: 'AGENT', phone: '123456' })
    expect(result.success).toBe(true)
  })

  it('does NOT require phone for CLIENT role', () => {
    const result = userSchema.safeParse({ ...validBase, role: 'CLIENT', phone: '' })
    expect(result.success).toBe(true)
  })

  it('does NOT require phone for SUPER_ADMIN role', () => {
    const result = userSchema.safeParse({ ...validBase, role: 'SUPER_ADMIN', phone: '' })
    expect(result.success).toBe(true)
  })

  // title/whatsapp are always optional
  it('accepts AGENT with empty title and whatsapp', () => {
    const result = userSchema.safeParse({
      ...validBase,
      role: 'AGENT',
      phone: '+58 212-555-1234',
      title: '',
      whatsapp: '',
    })
    expect(result.success).toBe(true)
  })

  // name boundaries min 2 max 120
  it('rejects name with 1 character (min-1)', () => {
    const result = userSchema.safeParse({ ...validBase, name: 'A' })
    expect(result.success).toBe(false)
  })

  it('rejects name with 121 characters (max+1)', () => {
    const result = userSchema.safeParse({ ...validBase, name: 'A'.repeat(121) })
    expect(result.success).toBe(false)
  })

  it('accepts name with exactly 2 characters', () => {
    const result = userSchema.safeParse({ ...validBase, name: 'AB' })
    expect(result.success).toBe(true)
  })

  it('accepts name with exactly 120 characters', () => {
    const result = userSchema.safeParse({ ...validBase, name: 'A'.repeat(120) })
    expect(result.success).toBe(true)
  })

  // email validation
  it('rejects invalid email format', () => {
    const result = userSchema.safeParse({ ...validBase, email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects email without domain', () => {
    const result = userSchema.safeParse({ ...validBase, email: 'user@' })
    expect(result.success).toBe(false)
  })

  // password validation (required on create, optional on update)
  it('rejects password shorter than 8 characters', () => {
    const result = userSchema.safeParse({ ...validBase, password: '1234567' })
    expect(result.success).toBe(false)
  })

  it('accepts empty password (for update flow)', () => {
    const result = userSchema.safeParse({ ...validBase, password: '' })
    expect(result.success).toBe(true)
  })

  it('accepts no password field (for update flow)', () => {
    const { password: _, ...withoutPassword } = validBase
    const result = userSchema.safeParse(withoutPassword)
    expect(result.success).toBe(true)
  })

  // role validation
  it('rejects invalid role', () => {
    const result = userSchema.safeParse({ ...validBase, role: 'MODERATOR' })
    expect(result.success).toBe(false)
  })

  // active defaults
  it('defaults active to true when omitted', () => {
    const { active: _, ...withoutActive } = validBase
    const result = userSchema.safeParse(withoutActive)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.active).toBe(true)
  })

  // title max length
  it('rejects title longer than 100 characters', () => {
    const result = userSchema.safeParse({
      ...validBase,
      role: 'AGENT',
      phone: '+58 212-555-1234',
      title: 'X'.repeat(101),
    })
    expect(result.success).toBe(false)
  })

  it('accepts title with exactly 100 characters', () => {
    const result = userSchema.safeParse({
      ...validBase,
      role: 'AGENT',
      phone: '+58 212-555-1234',
      title: 'X'.repeat(100),
    })
    expect(result.success).toBe(true)
  })

  // whatsapp max length
  it('rejects whatsapp longer than 30 characters', () => {
    const result = userSchema.safeParse({
      ...validBase,
      role: 'AGENT',
      phone: '+58 212-555-1234',
      whatsapp: 'X'.repeat(31),
    })
    expect(result.success).toBe(false)
  })

  it('accepts whatsapp with exactly 30 characters', () => {
    const result = userSchema.safeParse({
      ...validBase,
      role: 'AGENT',
      phone: '+58 212-555-1234',
      whatsapp: 'X'.repeat(30),
    })
    expect(result.success).toBe(true)
  })
})
