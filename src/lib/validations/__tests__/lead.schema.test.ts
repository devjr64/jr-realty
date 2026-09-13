import { describe, expect, it } from 'vitest'

import {
  assignLeadSchema,
  createLeadSchema,
  leadNoteSchema,
  updateLeadStatusSchema,
} from '@/lib/validations/lead.schema'

describe('createLeadSchema', () => {
  const validBase = {
    name: 'Ana García',
    email: 'ana@example.com',
  }

  // Happy path
  it('accepts valid minimal input with name and email', () => {
    // Arrange
    const input = { ...validBase }
    // Act
    const result = createLeadSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts valid full input with all optional fields', () => {
    // Arrange
    const input = {
      ...validBase,
      phone: '+58 212-555-5678',
      message: 'Me interesa esta propiedad, ¿sigue disponible?',
      propertyId: 'prop_123',
    }
    // Act
    const result = createLeadSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  // name boundaries: min 2, max 120
  it('rejects name with 1 character (min-1)', () => {
    // Arrange
    const input = { ...validBase, name: 'A' }
    // Act
    const result = createLeadSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('accepts name with exactly 2 characters (min)', () => {
    // Arrange
    const input = { ...validBase, name: 'Ab' }
    // Act
    const result = createLeadSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts name with exactly 120 characters (max)', () => {
    // Arrange
    const input = { ...validBase, name: 'a'.repeat(120) }
    // Act
    const result = createLeadSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects name with 121 characters (max+1)', () => {
    // Arrange
    const input = { ...validBase, name: 'a'.repeat(121) }
    // Act
    const result = createLeadSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects empty string name', () => {
    // Arrange
    const input = { ...validBase, name: '' }
    // Act
    const result = createLeadSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects missing name (undefined)', () => {
    // Arrange
    const input = { email: 'ana@example.com' }
    // Act
    const result = createLeadSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects null name', () => {
    // Arrange
    const input = { ...validBase, name: null }
    // Act
    const result = createLeadSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  // email validation
  it('rejects invalid email format without @', () => {
    // Arrange
    const input = { ...validBase, email: 'not-an-email' }
    // Act
    const result = createLeadSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects email with spaces', () => {
    // Arrange
    const input = { ...validBase, email: 'ana @example.com' }
    // Act
    const result = createLeadSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects empty email', () => {
    // Arrange
    const input = { ...validBase, email: '' }
    // Act
    const result = createLeadSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects missing email', () => {
    // Arrange
    const input = { name: 'Ana García' }
    // Act
    const result = createLeadSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects null email', () => {
    // Arrange
    const input = { ...validBase, email: null }
    // Act
    const result = createLeadSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  // phone optionalField — emptyToNull behavior
  it('transforms empty string phone to null via emptyToNull', () => {
    // Arrange
    const input = { ...validBase, phone: '' }
    // Act
    const result = createLeadSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.phone).toBeNull()
  })

  it('keeps null phone as null', () => {
    // Arrange
    const input = { ...validBase, phone: null }
    // Act
    const result = createLeadSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('keeps undefined phone as undefined (missing optional field)', () => {
    // Arrange
    const input = { ...validBase, phone: undefined }
    // Act
    const result = createLeadSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts missing phone field (optional)', () => {
    // Arrange
    const input = { ...validBase }
    // Act
    const result = createLeadSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts phone with exactly 30 characters (max)', () => {
    // Arrange
    const input = { ...validBase, phone: '1'.repeat(30) }
    // Act
    const result = createLeadSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects phone with 31 characters (max+1)', () => {
    // Arrange
    const input = { ...validBase, phone: '1'.repeat(31) }
    // Act
    const result = createLeadSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  // message optionalField max 2000
  it('transforms empty string message to null', () => {
    // Arrange
    const input = { ...validBase, message: '' }
    // Act
    const result = createLeadSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('keeps null message as null', () => {
    // Arrange
    const input = { ...validBase, message: null }
    // Act
    const result = createLeadSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts message with exactly 2000 characters (max)', () => {
    // Arrange
    const input = { ...validBase, message: 'a'.repeat(2000) }
    // Act
    const result = createLeadSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects message with 2001 characters (max+1)', () => {
    // Arrange
    const input = { ...validBase, message: 'a'.repeat(2001) }
    // Act
    const result = createLeadSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('accepts missing message field', () => {
    // Arrange
    const input = { ...validBase }
    // Act
    const result = createLeadSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  // propertyId optionalField string
  it('transforms empty string propertyId to null', () => {
    // Arrange
    const input = { ...validBase, propertyId: '' }
    // Act
    const result = createLeadSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('keeps null propertyId as null', () => {
    // Arrange
    const input = { ...validBase, propertyId: null }
    // Act
    const result = createLeadSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts valid propertyId string', () => {
    // Arrange
    const input = { ...validBase, propertyId: 'clx123' }
    // Act
    const result = createLeadSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  // XSS payload behavior — schema allows, renderer sanitizes via rehype-sanitize
  it('allows XSS script payload in name (stored, sanitized at render layer)', () => {
    // Arrange
    const input = { ...validBase, name: '<script>alert(1)</script>' }
    // Act
    const result = createLeadSchema.safeParse(input)
    // Assert — zod validates length/format, not XSS; MarkdownRenderer/BlockRenderer sanitizes via rehype-sanitize
    expect(result.success).toBe(true)
  })

  it('allows XSS script payload in message (stored, sanitized at render layer)', () => {
    // Arrange
    const input = { ...validBase, message: '<img src=x onerror=alert(1)>' }
    // Act
    const result = createLeadSchema.safeParse(input)
    // Assert — allowed by schema; sanitization happens in MarkdownRenderer with rehype-sanitize
    expect(result.success).toBe(true)
  })
})

describe('leadNoteSchema', () => {
  it('accepts valid note text', () => {
    // Arrange
    const input = { text: 'Cliente interesado, llamar mañana a las 10am.' }
    // Act
    const result = leadNoteSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts text with exactly 1 character (min)', () => {
    // Arrange
    const input = { text: 'a' }
    // Act
    const result = leadNoteSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects empty string text (min-1)', () => {
    // Arrange
    const input = { text: '' }
    // Act
    const result = leadNoteSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('accepts text with exactly 1000 characters (max)', () => {
    // Arrange
    const input = { text: 'a'.repeat(1000) }
    // Act
    const result = leadNoteSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects text with 1001 characters (max+1)', () => {
    // Arrange
    const input = { text: 'a'.repeat(1001) }
    // Act
    const result = leadNoteSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects missing text', () => {
    // Arrange
    const input = {}
    // Act
    const result = leadNoteSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects null text', () => {
    // Arrange
    const input = { text: null }
    // Act
    const result = leadNoteSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects undefined text', () => {
    // Arrange
    const input = { text: undefined }
    // Act
    const result = leadNoteSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('allows XSS payload in note text (sanitized at render layer)', () => {
    // Arrange
    const input = { text: '<script>alert("xss")</script>' }
    // Act
    const result = leadNoteSchema.safeParse(input)
    // Assert — schema stores raw; display layer must sanitize
    expect(result.success).toBe(true)
  })
})

describe('updateLeadStatusSchema', () => {
  it('accepts valid status NEW', () => {
    // Arrange
    const input = { status: 'NEW' }
    // Act
    const result = updateLeadStatusSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts valid status CLOSED_WON', () => {
    // Arrange
    const input = { status: 'CLOSED_WON' }
    // Act
    const result = updateLeadStatusSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts all 7 defined statuses', () => {
    // Arrange
    const statuses = [
      'NEW',
      'CONTACTED',
      'FOLLOWING_UP',
      'VISIT_SCHEDULED',
      'NEGOTIATING',
      'CLOSED_WON',
      'CLOSED_LOST',
    ] as const
    // Act
    const results = statuses.map((status) => updateLeadStatusSchema.safeParse({ status }))
    // Assert
    expect(results.every((r) => r.success)).toBe(true)
  })

  it('rejects invalid enum value', () => {
    // Arrange
    const input = { status: 'INVALID_STATUS' }
    // Act
    const result = updateLeadStatusSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects empty string status', () => {
    // Arrange
    const input = { status: '' }
    // Act
    const result = updateLeadStatusSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects missing status', () => {
    // Arrange
    const input = {}
    // Act
    const result = updateLeadStatusSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects null status', () => {
    // Arrange
    const input = { status: null }
    // Act
    const result = updateLeadStatusSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects lowercase valid value (case sensitive enum)', () => {
    // Arrange
    const input = { status: 'new' }
    // Act
    const result = updateLeadStatusSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })
})

describe('assignLeadSchema', () => {
  it('accepts valid agentId', () => {
    // Arrange
    const input = { agentId: 'agent_123' }
    // Act
    const result = assignLeadSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })

  it('transforms empty string agentId to null (unassign)', () => {
    // Arrange
    const input = { agentId: '' }
    // Act
    const result = assignLeadSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.agentId).toBeNull()
  })

  it('rejects missing agentId', () => {
    // Arrange
    const input = {}
    // Act
    const result = assignLeadSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects null agentId (must be string before transform)', () => {
    // Arrange
    const input = { agentId: null }
    // Act
    const result = assignLeadSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('rejects undefined agentId', () => {
    // Arrange
    const input = { agentId: undefined }
    // Act
    const result = assignLeadSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it('accepts XSS-like string as agentId (validation is assignment, id checked at DB layer)', () => {
    // Arrange
    const input = { agentId: '<script>alert(1)</script>' }
    // Act
    const result = assignLeadSchema.safeParse(input)
    // Assert — schema transforms/validates type only; existence checked by server action via DB lookup
    expect(result.success).toBe(true)
  })
})
