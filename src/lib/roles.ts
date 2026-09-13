import type { UserRole } from '@/types/next-auth'

/**
 * Fuente única de verdad para roles y permisos.
 * W8: evita duplicar lógica de roles en middleware, auth-helpers y nav.
 */

export const ADMIN_ROLES: readonly UserRole[] = ['SUPER_ADMIN', 'AGENT']

/**
 * Type-safe admin check. Accepts unknown (middleware JWT puede dar string)
 * y valida contra allowlist; null/undefined/no-string => false.
 */
export const isAdminRole = (
  role: UserRole | string | null | undefined,
): boolean =>
  typeof role === 'string' &&
  (ADMIN_ROLES as readonly string[]).includes(role)
