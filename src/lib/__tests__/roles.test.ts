import { describe, expect, it } from 'vitest'

import { ADMIN_ROLES, isAdminRole } from '@/lib/roles'

describe('ADMIN_ROLES', () => {
  it('contains only SUPER_ADMIN and AGENT', () => {
    expect([...ADMIN_ROLES]).toEqual(['SUPER_ADMIN', 'AGENT'])
  })

  it('is readonly tuple length 2', () => {
    expect(ADMIN_ROLES).toHaveLength(2)
  })
})

describe('isAdminRole', () => {
  it('returns true for SUPER_ADMIN', () => {
    expect(isAdminRole('SUPER_ADMIN')).toBe(true)
  })

  it('returns true for AGENT', () => {
    expect(isAdminRole('AGENT')).toBe(true)
  })

  it('returns false for CLIENT', () => {
    expect(isAdminRole('CLIENT')).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isAdminRole(undefined)).toBe(false)
  })

  it('returns false for null', () => {
    expect(isAdminRole(null)).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isAdminRole('')).toBe(false)
  })

  it('returns false for lowercase super_admin (case-sensitive)', () => {
    expect(isAdminRole('super_admin')).toBe(false)
    expect(isAdminRole('agent')).toBe(false)
  })

  it('returns false for arbitrary strings', () => {
    expect(isAdminRole('ADMIN')).toBe(false)
    expect(isAdminRole('SUPER')).toBe(false)
    expect(isAdminRole('ROOT')).toBe(false)
  })

  it('returns false for strings with whitespace', () => {
    expect(isAdminRole(' SUPER_ADMIN')).toBe(false)
    expect(isAdminRole('SUPER_ADMIN ')).toBe(false)
  })

  it('returns false for non-string via type coercion guard', () => {
    // @ts-expect-error intentional runtime edge
    expect(isAdminRole(0)).toBe(false)
    // @ts-expect-error intentional runtime edge
    expect(isAdminRole(123)).toBe(false)
    // @ts-expect-error intentional runtime edge
    expect(isAdminRole({})).toBe(false)
  })

  it('is consistent with ADMIN_ROLES allowlist', () => {
    for (const role of ADMIN_ROLES) {
      expect(isAdminRole(role)).toBe(true)
    }
    expect(isAdminRole('CLIENT')).toBe(false)
  })
})
