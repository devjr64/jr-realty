/**
 * Playwright globalSetup — pre-warms the dev server by hitting key pages.
 *
 * WHY: Next.js dev server compiles pages on first request. Without warmup,
 * the first test that hits /login, /admin/dashboard, etc. takes 5-15s extra
 * for compilation. This script logs in via API and navigates to admin pages
 * using the browser context (with session cookie) to trigger full compilation.
 */
import { chromium } from '@playwright/test'

const BASE = 'http://localhost:3000'

export default async function globalSetup() {
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  // 1. Warm up public pages
  for (const path of ['/', '/login', '/propiedades', '/contacto']) {
    try {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 15_000 })
    } catch {
      // Skip
    }
  }

  // 2. Login via API and warm up admin pages
  try {
    const csrfRes = await page.request.get(`${BASE}/api/auth/csrf`)
    if (csrfRes.ok()) {
      const { csrfToken } = (await csrfRes.json()) as { csrfToken: string }
      if (csrfToken) {
        const res = await page.request.post(`${BASE}/api/auth/callback/credentials`, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          data: new URLSearchParams({
            csrfToken,
            email: process.env.SEED_ADMIN_EMAIL || 'admin@test.com',
            password: process.env.SEED_ADMIN_PASSWORD || 'Admin123!',
            callbackUrl: '/admin/dashboard',
            json: 'true',
          }).toString(),
        })
        const body = await res.json().catch(() => null) as { url?: string } | null
        if (body?.url) {
          // Navigate with session cookie to trigger full page compilation
          await page.goto(body.url, { waitUntil: 'domcontentloaded', timeout: 30_000 })
          for (const path of ['/admin/usuarios', '/admin/propiedades', '/admin/leads']) {
            try {
              await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 15_000 })
            } catch {
              // Skip
            }
          }
        }
      }
    }
  } catch {
    // Auth not available — skip admin warmup
  }

  await browser.close()
}
