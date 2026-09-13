import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E config — pyramid-top smoke (Phase 0).
 *
 * - Chromium only (single browser keeps CI fast; Firefox/webkit add later).
 * - webServer starts `pnpm run dev --port 3000` so tests run against a real
 *   Next.js dev server (auto-reuses existing one locally, fresh in CI).
 * - trace on-first-retry keeps artifacts small but useful on failure.
 * - baseURL http://localhost:3000 matches AUTH_URL / NEXT_PUBLIC_APP_URL
 *   (pinned port 3000; if 3000 is taken use pnpm run dev:3001 and override
 *   AUTH_URL accordingly — see .env.example).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: [['html', { open: 'never' }], ['list']],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm run dev --port 3000 --hostname localhost',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
