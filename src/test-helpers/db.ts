/**
 * Integration test helpers — real PostgreSQL via DATABASE_URL_TEST.
 *
 * Provides deterministic isolation for Prisma integration tests:
 *  - truncateAll()   — wipes all app tables (CASCADE) between tests
 *  - createTestUser(role) — creates a User row (bcrypt-hashed)
 *  - createTestAgent()    — creates an AGENT User + Agent row
 *  - lifecycle: migrate deploy in beforeAll, truncate in beforeEach,
 *    disconnect in afterAll
 *
 * Skips gracefully when DATABASE_URL_TEST is absent: helpers become no-ops
 * and isIntegrationEnabled is false so suites can `describe.skip`.
 */

import { execSync } from 'node:child_process'
import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { afterAll, beforeAll, beforeEach } from 'vitest'

// Resolve test DB URL — prefer DATABASE_URL_TEST, fall back to undefined
const TEST_URL = process.env.DATABASE_URL_TEST

/** True when the integration suite can run (real DB available). */
export const isIntegrationEnabled = Boolean(TEST_URL)

/**
 * Dedicated PrismaClient for integration tests.
 * When DATABASE_URL_TEST is set we point it at that URL; otherwise we export
 * a dummy client that will never be used (suites skip).
 * WHY `as any` for datasources: Prisma 6 types moved to `datasourceUrl`, but
 * the runtime still accepts `datasources.db.url` for backwards compat — cast
 * keeps TS happy while preserving real-DB targeting.
 */
export const testDb: PrismaClient = TEST_URL
  ? new PrismaClient({ datasources: { db: { url: TEST_URL } } } as unknown as ConstructorParameters<typeof PrismaClient>[0])
  : (new PrismaClient() as PrismaClient)

/**
 * Truncates all application tables in FK-safe order using CASCADE.
 * WHY raw TRUNCATE + CASCADE: Prisma has no built-in truncate; deleteMany
 * would be slower and order-dependent. CASCADE handles FKs atomically.
 * Lead.notes and Property.features are Json columns — no FK issues.
 */
export async function truncateAll(): Promise<void> {
  if (!TEST_URL) return
  // Order does not matter with CASCADE, but we list explicitly for clarity.
  // Exclude _prisma_migrations (managed by migrate deploy).
  await testDb.$executeRawUnsafe(
    `TRUNCATE TABLE
      "PropertyImage",
      "PropertyTag",
      "Lead",
      "Property",
      "Project",
      "BlogPost",
      "Page",
      "Testimonial",
      "SiteSetting",
      "Zone",
      "Agent",
      "User"
     CASCADE;`,
  )
}

/**
 * Creates a User row for tests. Password is a bcrypt hash of a known value
 * (not used for login in integration — we mock requireAdmin).
 */
export async function createTestUser(role: Role = 'SUPER_ADMIN'): Promise<{ id: string; email: string }> {
  if (!TEST_URL) throw new Error('DATABASE_URL_TEST not set — integration disabled')
  const n = Math.random().toString(36).slice(2, 8)
  const email = `test-${n}-${Date.now()}@example.com`
  const passwordHash = await bcrypt.hash('Test123!', 4) // low cost for speed
  const user = await testDb.user.create({
    data: {
      name: `Test ${role} ${n}`,
      email,
      passwordHash,
      role,
      active: true,
    },
    select: { id: true, email: true },
  })
  return user
}

/**
 * Creates an AGENT User + Agent row. Returns { userId, agentId, email }.
 */
export async function createTestAgent(): Promise<{ userId: string; agentId: string; email: string }> {
  if (!TEST_URL) throw new Error('DATABASE_URL_TEST not set — integration disabled')
  const n = Math.random().toString(36).slice(2, 8)
  const email = `agent-${n}-${Date.now()}@example.com`
  const passwordHash = await bcrypt.hash('Test123!', 4)
  const user = await testDb.user.create({
    data: {
      name: `Agent ${n}`,
      email,
      passwordHash,
      role: Role.AGENT,
      active: true,
      agent: {
        create: {
          phone: '+582125550000',
          whatsapp: '+582125550000',
          title: 'Asesor Test',
          active: true,
        },
      },
    },
    include: { agent: true },
  })
  return { userId: user.id, agentId: user.agent!.id, email }
}

/**
 * Creates a Zone row (required FK for Property/Project).
 */
export async function createTestZone(name = 'Zona Test'): Promise<{ id: string; slug: string }> {
  if (!TEST_URL) throw new Error('DATABASE_URL_TEST not set')
  const slug = `zona-${Math.random().toString(36).slice(2, 8)}-${Date.now()}`
  const zone = await testDb.zone.create({
    data: { name, slug, description: 'Zona integration test' },
    select: { id: true, slug: true },
  })
  return zone
}

/**
 * Lifecycle: run `prisma migrate deploy` against DATABASE_URL_TEST before
 * the suite starts. WHY: ensures the test DB schema matches schema.prisma
 * without relying on manual `docker compose up` ordering.
 */
export function setupIntegrationHooks(): void {
  beforeAll(async () => {
    if (!TEST_URL) return
    // Point DATABASE_URL to the test DB for the migrate command
    const env = { ...process.env, DATABASE_URL: TEST_URL }
    try {
      execSync('pnpm exec prisma migrate deploy', {
        env,
        stdio: 'pipe',
        timeout: 30_000,
      })
    } catch (error) {
      // Re-throw with context so CI logs show why integration failed
      const msg = error instanceof Error ? error.message : String(error)
      throw new Error(`prisma migrate deploy failed for integration DB: ${msg}`)
    }
    await testDb.$connect()
  })

  beforeEach(async () => {
    if (!TEST_URL) return
    await truncateAll()
  })

  afterAll(async () => {
    if (!TEST_URL) return
    await testDb.$disconnect().catch(() => undefined)
  })
}
