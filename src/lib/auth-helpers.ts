import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { isAdminRole } from '@/lib/roles'
import { redirect } from 'next/navigation'
import type { Session } from 'next-auth'

/**
 * Returns the current session user ({ id, name, email, image, role }) or null.
 *
 * Safe to call in Server Components, Server Actions, and Route Handlers.
 * This is the source of truth for authorization (middleware is only the
 * first line of defense).
 */
export async function getCurrentUser(): Promise<Session['user'] | null> {
  const session = await auth()
  return session?.user ?? null
}

/**
 * Re-checks that the user row still exists and is active. The JWT session
 * lasts 8h, so a deactivated admin would otherwise keep access until expiry.
 * Returns true when the user is still active.
 */
async function isUserActive(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { active: true },
  })
  return user?.active ?? false
}

/**
 * Requires an authenticated SUPER_ADMIN or AGENT.
 *
 * Redirects to /login otherwise. `redirect()` throws, so callers can use the
 * returned user without null-checks (TS still knows it's non-null).
 */
export async function requireAdmin(): Promise<Session['user']> {
  const user = await getCurrentUser()
  if (!user || !isAdminRole(user.role)) {
    redirect('/login')
  }
  // Defense in depth: a deactivated account loses access immediately,
  // without waiting for the JWT to expire.
  if (!(await isUserActive(user.id))) {
    redirect('/login')
  }
  return user
}

/**
 * Requires a SUPER_ADMIN. Reserved for user-management pages and actions.
 */
export async function requireSuperAdmin(): Promise<Session['user']> {
  const user = await getCurrentUser()
  if (!user || user.role !== 'SUPER_ADMIN') {
    redirect('/login')
  }
  if (!(await isUserActive(user.id))) {
    redirect('/login')
  }
  return user
}