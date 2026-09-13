import path from 'node:path'
import { defineConfig } from 'vitest/config'

/**
 * Integration config — real PostgreSQL via DATABASE_URL_TEST.
 *
 * WHY separate config: unit suite (vitest.config.ts) mocks Prisma and runs in
 * <1s; integration needs a real DB, longer timeout, and exclusive truncate
 * isolation (sequence concurrent false). Keeping configs separate lets CI run
 * `pnpm test` fast and `pnpm test:integration` only when Docker is up.
 * Skips gracefully when DATABASE_URL_TEST is absent (see setup + helpers).
 *
 * `env.DATABASE_URL` — seeds DATABASE_URL from DATABASE_URL_TEST before any
 * file loads. The setup file saves this, lets dotenv overwrite it (to load
 * other .env vars), then restores it. This ensures `db.ts` creates its
 * PrismaClient with the test DB URL.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.integration.test.{ts,tsx}'],
    globals: false,
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL_TEST || process.env.DATABASE_URL || '',
    },
    setupFiles: ['./vitest.integration.setup.ts'],
    testTimeout: 15_000,
    hookTimeout: 15_000,
    sequence: { concurrent: false },
    // No coverage gate here — integration verifies flows, not per-file %.
    // Coverage is still collected when --coverage is passed.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/server/actions/**/*.{ts,tsx}', 'src/lib/**/*.{ts,tsx}'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
