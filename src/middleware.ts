import { auth } from "@/lib/auth.config"
import { isAdminRole } from "@/lib/roles"
import { NextResponse } from "next/server"

/**
 * Edge middleware. `auth` from '@/lib/auth.config' is edge-safe and only
 * verifies the JWT session cookie here — the Credentials `authorize()` (and
 * its Prisma/bcrypt deps) never runs on middleware, since sign-in POSTs hit
 * /api/auth, not the matcher. See `src/lib/auth.config.ts` vs `auth.ts`.
 *
 * This is defense-in-depth only: each /admin page/layout/action must ALSO
 * enforce authorization via the helpers in '@/lib/auth-helpers'.
 */
export default auth((req) => {
  const { nextUrl } = req
  const user = req.auth?.user
  const isLoggedIn = Boolean(user)
  const role = user?.role

  // Protect /admin/*: unauthenticated users go to /login, CLIENTs stay out.
  if (nextUrl.pathname.startsWith('/admin')) {
    if (!isLoggedIn) {
      const loginUrl = new URL('/login', nextUrl)
      // W7: solo un pathname interno (seguro contra open redirect)
      loginUrl.searchParams.set('callbackUrl', nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }
    if (!isAdminRole(role)) {
      // Authenticated CLIENT is not authorized for the admin area.
      return NextResponse.redirect(new URL('/', nextUrl))
    }
    return NextResponse.next()
  }

  // Already-authenticated users don't need the login page.
  if (nextUrl.pathname === '/login' && isLoggedIn) {
    return NextResponse.redirect(
      new URL(isAdminRole(role) ? '/admin/dashboard' : '/', nextUrl),
    )
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/admin/:path*', '/login'],
}
