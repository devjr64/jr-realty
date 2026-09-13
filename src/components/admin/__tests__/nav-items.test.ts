import { describe, expect, it } from 'vitest'

import { adminNavItems, filterAdminNavItems } from '@/components/admin/nav-items'
import { ADMIN_ROLES } from '@/lib/roles'

describe('filterAdminNavItems', () => {
  it('returns all items for SUPER_ADMIN', () => {
    // Arrange
    const role = 'SUPER_ADMIN' as const

    // Act
    const result = filterAdminNavItems(role)

    // Assert
    expect(result).toHaveLength(adminNavItems.length)
    expect(result).toHaveLength(10)
    expect(result.map((i) => i.label)).toEqual(
      expect.arrayContaining(['Agentes', 'Usuarios']),
    )
  })

  it('excludes superAdminOnly items for AGENT', () => {
    // Arrange
    const role = 'AGENT' as const

    // Act
    const result = filterAdminNavItems(role)

    // Assert
    expect(result).toHaveLength(5)
    expect(result.some((i) => i.label === 'Agentes')).toBe(false)
    expect(result.some((i) => i.label === 'Usuarios')).toBe(false)
    expect(result.some((i) => i.label === 'Zonas')).toBe(false)
    expect(result.some((i) => i.label === 'CMS')).toBe(false)
    expect(result.some((i) => i.label === 'Configuración')).toBe(false)
    expect(result.every((i) => !i.superAdminOnly)).toBe(true)
  })

  it('excludes superAdminOnly for CLIENT as non-admin', () => {
    // Arrange
    const role = 'CLIENT' as const

    // Act
    const result = filterAdminNavItems(role)

    // Assert — CLIENT should be treated like AGENT (no super-admin items)
    expect(result.some((i) => i.superAdminOnly)).toBe(false)
    expect(result).toHaveLength(5)
  })

  it('returns new array reference and does not mutate adminNavItems', () => {
    // Arrange
    const originalLength = adminNavItems.length
    const originalFirstHref = adminNavItems[0].href

    // Act
    const superResult = filterAdminNavItems('SUPER_ADMIN')
    const agentResult = filterAdminNavItems('AGENT')

    // Assert — new references
    expect(superResult).not.toBe(adminNavItems)
    expect(agentResult).not.toBe(adminNavItems)
    // original untouched
    expect(adminNavItems).toHaveLength(originalLength)
    expect(adminNavItems[0].href).toBe(originalFirstHref)
  })

  it('each item has href, label, and icon', () => {
    // Arrange & Act
    const result = filterAdminNavItems('SUPER_ADMIN')

    // Assert
    for (const item of result) {
      expect(item.href).toMatch(/^\/admin\//)
      expect(typeof item.label).toBe('string')
      expect(item.label.length).toBeGreaterThan(0)
      expect(item.icon).toBeDefined()
    }
  })

  it('superAdminOnly items are exactly Agentes, Usuarios, Zonas, CMS, Configuracion', () => {
    // Arrange
    const superOnly = adminNavItems.filter((i) => i.superAdminOnly)

    // Act & Assert
    expect(superOnly).toHaveLength(5)
    expect(superOnly.map((i) => i.href)).toEqual(
      expect.arrayContaining([
        '/admin/agentes',
        '/admin/usuarios',
        '/admin/zonas',
        '/admin/cms',
        '/admin/configuracion',
      ]),
    )
  })

  it('AGENT filtered result preserves order of non-superAdmin items', () => {
    // Arrange
    const expected = adminNavItems.filter((i) => !i.superAdminOnly).map((i) => i.href)

    // Act
    const result = filterAdminNavItems('AGENT').map((i) => i.href)

    // Assert
    expect(result).toEqual(expected)
  })

  it('respects ADMIN_ROLES constant — SUPER_ADMIN is admin role', () => {
    // Arrange & Act & Assert — sanity check that role constants align
    expect(ADMIN_ROLES).toContain('SUPER_ADMIN')
    expect(ADMIN_ROLES).toContain('AGENT')
    expect(filterAdminNavItems('SUPER_ADMIN')).toHaveLength(adminNavItems.length)
  })
})
