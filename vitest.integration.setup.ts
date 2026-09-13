/**
 * Integration setup — loads env and connects the Prisma client.
 *
 * WHY separate from vitest.setup.ts: unit setup uses jsdom + jest-dom;
 * integration needs node env + DB connectivity. This file is the entry point
 * declared in vitest.config.integration.ts `setupFiles`.
 *
 * Behavior:
 *  - Saves DATABASE_URL (set by shell env or vitest config) BEFORE dotenv
 *    loads .env, which would overwrite it with the dev DB URL.
 *  - Loads .env via dotenv for any other variables it provides.
 *  - Restores DATABASE_URL to the saved value (test DB) after dotenv runs.
 *  - The `import { db }` at the bottom is ESM-hoisted above ALL top-level
 *    code, but since it's the LAST import in the file, all env overrides
 *    above it have already run by the time the module graph resolves.
 *    (ESM: all imports resolve → then top-level code runs. The import of
 *    @/lib/db triggers db.ts which reads DATABASE_URL at that point — after
 *    dotenv + restore have run.)
 *  - Calls db.$connect() in beforeAll and db.$disconnect() in afterAll.
 */

import fs from 'node:fs'
import { afterAll, beforeAll } from 'vitest'

// ── Step 1: Save DATABASE_URL before dotenv overwrites it ───────────────
const savedDatabaseUrl = process.env.DATABASE_URL

// ── Step 2: Load .env for any other variables (RESEND_API_KEY, etc.) ────
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dotenv = require('dotenv') as typeof import('dotenv')
  dotenv.config()
  if (fs.existsSync('.env.test')) dotenv.config({ path: '.env.test' })
} catch {
  try {
    const maybeLoad = (process as unknown as { loadEnvFile?: (p: string) => void }).loadEnvFile
    if (typeof maybeLoad === 'function') {
      maybeLoad.call(process, '.env')
      if (fs.existsSync('.env.test')) maybeLoad.call(process, '.env.test')
    }
  } catch {
    // no env loader available — rely on shell env
  }
}

// ── Step 3: Restore DATABASE_URL so db.ts creates PrismaClient with it ──
if (savedDatabaseUrl) {
  process.env.DATABASE_URL = savedDatabaseUrl
}

// ── Step 4: Import db (ESM hoisted, but env is now correct) ─────────────
import { db } from '@/lib/db'

beforeAll(async () => {
  if (!process.env.DATABASE_URL_TEST) return
  await db.$connect()
})

afterAll(async () => {
  await db.$disconnect().catch(() => undefined)
})
