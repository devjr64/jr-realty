'use server'

import { AuthError } from 'next-auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth-helpers'
import { signIn, signOut } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { isAdminRole } from '@/lib/roles'
import { safeCallbackUrl } from '@/lib/safe-callback'
import {
  authErrorMessages,
  loginSchema,
} from '@/lib/validations/auth.schema'
import type { UserRole } from '@/types/next-auth'

/** Contract between this Server Action and the client `useActionState`. */
export interface LoginFormState {
  error?: string
}

/**
 * Reads a string field from FormData. Files/other values degrade to '' so the
 * zod schema always receives typed strings (it rejects them with the field
 * message when required).
 */
function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

/**
 * Login Server Action — driven by `useActionState` from the client form.
 *
 * FLOW:
 *  1. Extract raw FormData values and normalize (trim + lowercase email).
 *     Passwords are NEVER trimmed (spaces may be significant).
 *  2. Validate with `loginSchema`; on failure return the first zod issue
 *     message (friendly, already localized).
 *  3. Call `signIn('credentials', { email, password, redirect: false })`.
 *     - `redirect: false` authenticates and writes the session cookie without
 *       letting Auth.js perform the redirect, so we can read the role next.
 *     - On invalid credentials Auth.js throws `CredentialsSignin` (an
 *       `AuthError`). We map it to a generic message — we must NOT reveal
 *       whether the email exists or the password was wrong.
 *  4. Read the fresh session via `getCurrentUser()` and redirect by role:
 *     SUPER_ADMIN/AGENT → /admin/dashboard (or a safe callbackUrl), CLIENT → /.
 *     (Matches the middleware logic in src/middleware.ts.)
 */
export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  // Rate limit: 10 intentos/minuto por IP en producción para frenar fuerza bruta.
  // En dev/test: 100 para evitar que E2E tests agoten el límite.
  const headerStore = await headers()
  const ip =
    headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headerStore.get('x-real-ip') ??
    'unknown'
  if (!rateLimit(`login:${ip}`, process.env.NODE_ENV === 'production' ? 10 : 100, 60_000)) {
    return { error: 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.' }
  }

  const parsed = loginSchema.safeParse({
    email: getFormString(formData, 'email').trim().toLowerCase(),
    password: getFormString(formData, 'password'),
  })

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    return { error: firstIssue?.message ?? authErrorMessages.validation }
  }

  const { email, password } = parsed.data

  try {
    await signIn('credentials', { email, password, redirect: false })
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error: authErrorMessages[error.type] ?? authErrorMessages.default,
      }
    }
    // Unknown failure (DB down, etc.): keep the user-facing message generic.
    return { error: authErrorMessages.default }
  }

  // Authenticated — pick the landing page from the actual role.
  // Race fix: signIn with redirect:false escribe la cookie, pero
  // getCurrentUser() (auth() leyendo cookies del request) puede devolver
  // null en el mismo tick si la cookie aún no está disponible. Fallback
  // a lectura directa de DB por email para evitar desvío incorrecto a "/".
  const rawCallback = getFormString(formData, 'callbackUrl')
  const callbackUrl = safeCallbackUrl(rawCallback)

  let role: UserRole | null | undefined
  const sessionUser = await getCurrentUser()
  role = sessionUser?.role

  if (!role) {
    // Fallback determinístico: el email ya fue validado y autenticado arriba
    const dbUser = await db.user
      .findUnique({
        where: { email },
        select: { role: true },
      })
      .catch(() => null)
    role = (dbUser?.role as UserRole | undefined) ?? null
  }

  // Si aún no hay rol (caso extremo), cae a "/" sin open redirect.
  if (!role) {
    redirect('/')
  }

  const isAdmin = isAdminRole(role as UserRole | undefined)

  // W7: solo usamos el callbackUrl si es ruta interna segura.
  // Lista blanca: solo /admin/* para admins; cualquier otra ruta se ignora
  // para evitar que un CLIENT sea llevado a /admin o un admin a externo.
  if (isAdmin) {
    if (callbackUrl && callbackUrl.startsWith('/admin')) {
      redirect(callbackUrl)
    }
    redirect('/admin/dashboard')
  }
  redirect('/')
}

/**
 * Logout Server Action — clears the session and redirects to /login.
 *
 * Called from the admin user menu via a plain <form action={logoutAction}> so
 * it works without JavaScript. `signOut` handles session cookie cleanup and
 * `redirectTo` lets Auth.js perform the redirect.
 */
export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: '/login' })
}
