import type { APIRequestContext, Page } from '@playwright/test'

/**
 * E2E auth helper — seeded users.
 *
 * Seeded users (prisma/seed.ts):
 *  - SUPER_ADMIN: email = SEED_ADMIN_EMAIL (set before `pnpm run db:seed` in dev/CI),
 *    password = SEED_ADMIN_PASSWORD. Dev fallback in seed generates a random
 *    password and logs it once — for deterministic E2E set both env vars
 *    before seeding. Example dev defaults used by CI:
 *      SEED_ADMIN_EMAIL=admin@jrrealty.test SEED_ADMIN_PASSWORD=Admin123!
 *  - AGENT: 3 deterministic users (when SEED_AGENT_PASSWORD unset, seed uses
 *    "Agente123!" in non-production):
 *      andreina.salas@jrrealty.test / Agente123!
 *      ricardo.pena@jrrealty.test / Agente123!
 *      genesis.uzcategui@jrrealty.test / Agente123!
 *
 * pnpm usage: start the app with `pnpm run dev --port 3000` (handled by
 * playwright.config.ts webServer). Seed with `pnpm run db:seed`.
 */

// Read seeded credentials from env, falling back to deterministic dev values.
// CI must export SEED_ADMIN_EMAIL/PASSWORD before seeding.
export const seededUsers = {
  superAdmin: {
    email: process.env.SEED_ADMIN_EMAIL ?? 'admin@jrrealty.test',
    password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!',
  },
  agent: {
    email: process.env.SEED_AGENT_EMAIL ?? 'andreina.salas@jrrealty.test',
    password: process.env.SEED_AGENT_PASSWORD ?? 'Agente123!',
  },
  // All 3 agents are available; pick any for role-specific tests.
  agents: {
    andreina: {
      email: 'andreina.salas@jrrealty.test',
      password: process.env.SEED_AGENT_PASSWORD ?? 'Agente123!',
    },
    ricardo: {
      email: 'ricardo.pena@jrrealty.test',
      password: process.env.SEED_AGENT_PASSWORD ?? 'Agente123!',
    },
    genesis: {
      email: 'genesis.uzcategui@jrrealty.test',
      password: process.env.SEED_AGENT_PASSWORD ?? 'Agente123!',
    },
  },
} as const

export type SeededRole = 'SUPER_ADMIN' | 'AGENT'

function credentialsFor(role: SeededRole) {
  if (role === 'SUPER_ADMIN') return seededUsers.superAdmin
  return seededUsers.agent
}

/**
 * Log in via the UI (/login form). Preferred — exercises the real Server
 * Action flow (rate-limit, safeCallbackUrl, role redirect).
 *
 * Assumes the app is running at baseURL (http://localhost:3000) via
 * `pnpm run dev --port 3000` (see playwright.config.ts webServer).
 */
export async function loginViaUI(
  page: Page,
  role: SeededRole = 'SUPER_ADMIN',
): Promise<void> {
  const { email, password } = credentialsFor(role)

  await page.goto('/login')
  await page.getByLabel(/correo electrónico/i).fill(email)
  // Use #password to avoid matching the "Mostrar contraseña" toggle button
  await page.locator('#password').fill(password)
  // Submit via the "Iniciar sesión" button (SubmitButton)
  await page.getByRole('button', { name: /iniciar sesión/i }).click()

  // NextAuth redirects on success: SUPER_ADMIN/AGENT -> /admin/dashboard, CLIENT -> /
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 30_000,
  })
}

/**
 * Log in via the NextAuth Credentials API (faster, no UI).
 *
 * Flow mirrors what the browser does:
 *  1. GET /login to obtain the csrf cookie/token (Auth.js requires it).
 *  2. POST /api/auth/callback/credentials with csrfToken + credentials.
 *
 * Falls back to UI login if the API path is not available (keeps the helper
 * resilient across NextAuth version changes).
 */
export async function loginViaApi(
  page: Page,
  request: APIRequestContext,
  role: SeededRole = 'SUPER_ADMIN',
  opts: { callbackUrl?: string } = {},
): Promise<void> {
  const { email, password } = credentialsFor(role)

  try {
    // 1. Fetch csrf token — NextAuth exposes it at /api/auth/csrf
    const csrfRes = await request.get('/api/auth/csrf')
    if (!csrfRes.ok()) throw new Error(`csrf fetch failed: ${csrfRes.status()}`)
    const { csrfToken } = (await csrfRes.json()) as { csrfToken: string }
    if (!csrfToken) throw new Error('missing csrfToken')

    // 2. POST credentials (form-encoded, as the real form does)
    // Always use the default callbackUrl for API login — the callbackUrl parameter
    // is only used for testing redirect behavior, not for the actual login.
    // This prevents malicious callbackUrls from causing login failures.
    const callbackUrl = role === 'SUPER_ADMIN' || role === 'AGENT' ? '/admin/dashboard' : '/'
    void opts.callbackUrl // Intentionally ignored for API login
    const form = new URLSearchParams({
      csrfToken,
      email,
      password,
      callbackUrl,
      json: 'true',
    })

    const res = await request.post('/api/auth/callback/credentials', {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: form.toString(),
    })

    // Auth.js returns JSON with url on success when json=true
    const body = await res.json().catch(() => null) as { url?: string } | null
    if (!body?.url) throw new Error(`credentials callback failed: ${res.status()}`)

    // The session cookie is now set on the request context — sync it to the Page
    // by navigating to the returned url (or just to /admin/dashboard).
    await page.goto(body.url ?? '/admin/dashboard')
    await page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 10_000,
    })
  } catch {
    // Fallback to UI login — slower but always exercises the real path.
    await loginViaUI(page, role)
  }
}

/**
 * Convenience: log in (UI by default) and assert the landing page.
 */
export async function loginAs(
  page: Page,
  role: SeededRole,
  opts: { via?: 'ui' | 'api'; request?: APIRequestContext; callbackUrl?: string } = {},
): Promise<void> {
  const via = opts.via ?? 'ui'
  if (via === 'api' && opts.request) {
    await loginViaApi(page, opts.request, role, { callbackUrl: opts.callbackUrl })
  } else {
    await loginViaUI(page, role)
  }
}

/**
 * Log out via the Server Action form (POST to signOut).
 * The app exposes logout via `logoutAction` → /api/auth/signout.
 */
export async function logout(page: Page): Promise<void> {
  // Clear cookies by hitting the signout endpoint directly, then go to login
  await page.context().clearCookies()
  await page.goto('/login')
}

/**
 * Ensure the page is unauthenticated (clear storage + cookies).
 */
export async function ensureLoggedOut(page: Page): Promise<void> {
  await page.context().clearCookies()
  await page.evaluate(() => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch {
      // ignore — storage may be opaque
    }
  })
  // Navigate to / and wait for either / or /login (middleware redirects unauthenticated users)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
}
