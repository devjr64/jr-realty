import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    globals: false,
    setupFiles: ['./vitest.setup.ts'],
    environmentMatchGlobs: [
      ['src/components/**/*.test.{ts,tsx}', 'jsdom'],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      // AUDIT 2026-09-03 (subtask 06): coverage gate fix — thresholds remain 80% (NOT lowered).
      // WHY global 80%: Medium coverage gate per test-coverage.md; perFile false keeps global
      // aggregate while still counting every uncovered file (0% drags gate — forces real tests).
      // Include intentionally stays: src/lib/**, src/components/shared/**,
      // src/components/admin/**, src/server/actions/** — business logic + forms.
      // Uncovered admin components count toward gate; MVP will exclude them only if explicitly
      // justified (shadcn/ui excluded below). Do NOT add src/app/** to gate yet (routes/E2E).
      include: [
        'src/lib/**/*.{ts,tsx}',
        'src/components/shared/**/*.{ts,tsx}',
        'src/components/admin/**/*.{ts,tsx}',
        'src/server/actions/**/*.{ts,tsx}',
      ],
      // Exclude rationale (each entry justified — WHY not just WHAT):
      exclude: [
        'src/**/*.test.{ts,tsx}', // test files themselves — not production code
        'src/**/*.d.ts', // type declarations — no runtime branches
        'src/types/**', // type augmentation — no runtime
        // src/components/ui/** — shadcn/ui primitives (Button, Dialog, etc.)
        // Third-party vendor UI, not business logic. Per test-coverage.md: DON'T test
        // framework libs. Styling/variants are visual, covered by E2E if needed.
        'src/components/ui/**',
        // src/middleware.ts — DECISION: explicitly excluded from unit coverage gate.
        // WHY: Edge runtime (imports only auth.config edge-safe, verifies JWT). Unit
        // mocking Edge NextResponse.redirect is brittle and overlaps with
        // auth-helpers unit (src/lib/__tests__/auth-helpers.test.ts) + E2E
        // (G: middleware-redirects.spec.ts, auth-rbac.spec.ts). Covered via
        // integration/E2E, not v8 per-file. To include later: switch env to edge
        // and add dedicated src/__tests__/middleware.test.ts with auth.config mock.
        'src/middleware.ts',
        // src/app/** — Next.js routes/layouts/loading pages: composition + data
        // fetching (force-dynamic / ISR). Not unit-measured; verify via Playwright
        // smoke (catalog, lead-capture). Keep out of MVP 80% gate to avoid
        // inflating denominator with server components; revisit post-MVP.
        'src/app/**',
      ],
      thresholds: {
        // Global 80% enforced — do NOT lower. perFile false = aggregate gate.
        // WHY false: allows incremental fill (new tests raise aggregate) without
        // failing on single uncovered admin form (0%) while still penalizing overall.
        // Critical paths (validations) should aim 100% individually; add per-path
        // threshold in Phase 1 if needed: 'src/lib/validations/**': { lines: 100 }.
        perFile: false,
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
