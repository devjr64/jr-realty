# AGENTS.md — JR Realty

> Stack: Next.js 15 (App Router) + TypeScript strict + Tailwind v4 + Prisma 6 + PostgreSQL 16 + NextAuth v5 (credentials/JWT). Single app, no monorepo. Path alias `@/*` → `src/*`.

## Package Manager — pnpm Only

- **Never use `npm`/`yarn`/`bun`.** All commands via `pnpm`. `packageManager: pnpm@11.20.0`, `engines.node >=22.13` (target Node 24 LTS).
- `pnpm-workspace.yaml` owns `allowBuilds` (blocks postinstall by default, least-privilege). Adding a native dep (`sharp`, `esbuild`, `prisma`, `unrs-resolver`) → add it there or install will fail silently.
- Always use `--frozen-lockfile` in CI/Docker. Lockfile is `pnpm-lock.yaml`.

## Commands

```bash
pnpm install                          # install
pnpm run dev                          # Next dev pinned --port 3000 --hostname localhost
pnpm run dev:3001                     # fallback if 3000 busy (also update AUTH_URL)
pnpm run build                        # must produce 0 Edge warnings, middleware ~86kB
pnpm run lint                         # eslint next/core-web-vitals
pnpm test                             # vitest run, 1293 tests expected green
pnpm run test:coverage                # v8, thresholds 80% lines/fn/branch/stmt
pnpm run db:migrate                   # prisma migrate dev (local)
pnpm run db:deploy                    # prisma migrate deploy (prod)
pnpm run db:seed                      # tsx prisma/seed.ts — requires SEED_ADMIN_EMAIL/PASSWORD in prod
pnpm run db:studio                    # Prisma Studio
docker compose up -d db               # PG 16 only (dev)
docker compose up -d --build          # full prod stack (app+db, auto-migrates on boot)
docker compose --profile dev up dev   # hot-reload dev on :3001 (never with plain up -d)
docker compose --profile tools run --rm migrate  # one-shot migrate (needs built image)
```

Single test: `pnpm exec vitest run src/lib/utils/slugify.test.ts` (or any `src/**/*.test.{ts,tsx}`). Coverage includes `src/lib/**`, `src/components/shared/**`, `src/components/admin/**`, `src/server/actions/**`.

## DB & Seed

- `DATABASE_URL` required. `docker compose up -d db` before any `db:*`.
- Seed creates SUPER_ADMIN + 3 AGENT users, 8 properties, 3 projects, 12 zones, etc. In production `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD` are mandatory (seed throws if missing). Dev fallback generates random password once to stdout.
- Dev creds (seed): agents use `Agente123!` (override with `SEED_AGENT_PASSWORD`). The SUPER_ADMIN email comes from `SEED_ADMIN_EMAIL` (no fallback — seed throws if unset, in dev too) and its password is **random** unless `SEED_ADMIN_PASSWORD` is set — the seed prints it once to stdout on creation; never a fixed default.

## Auth — Edge/Node Split (Critical)

- `src/lib/auth.config.ts` = edge-safe (no `prisma`/`bcrypt`, only JWT verification). **Middleware (`src/middleware.ts`) imports ONLY from here.** Importing `auth.ts`/`db.ts`/`bcrypt` in middleware reintroduces Node deps → build warnings + middleware bloat (86kB → 150kB).
- `src/lib/auth.ts` = Node-only (extends config with `Credentials` + `bcrypt` + `prisma`). Used by API routes / server actions.
- `trustHost: true` in config — `AUTH_URL`/`NEXT_PUBLIC_APP_URL` must match the actual port (3000 pinned, 3001 fallback). Mismatch = lost session / redirect loop. See `.env.example`.
- `safeCallbackUrl` in `src/lib/safe-callback.ts` — allowlist for `callbackUrl` (prevents open redirect). Only `/admin/*` and `/` passes.
- Roles: single source `src/lib/roles.ts` (`ADMIN_ROLES = ['SUPER_ADMIN','AGENT']`, `isAdminRole()`). `src/lib/auth-helpers.ts` (`requireAdmin()`, `requireSuperAdmin()`, `getCurrentUser()`) does DB `active` re-check (JWT is 8h, deactivated users lose access immediately). Keep `middleware.ts` ↔ `roles.ts` ↔ `auth-helpers.ts` ↔ `src/lib/nav-links.ts` in sync — nav hides routes by role, middleware enforces.

## Project Structure

- `src/app/(public)/` — public site, `blog/[slug]` uses `MarkdownRenderer` (react-markdown + remark-gfm + rehype-sanitize). Public pages with DB use `force-dynamic`; catalog uses ISR 5min.
- `src/app/(admin)/` — all admin pages export `dynamic = 'force-dynamic'`. Routes `/admin/agentes` + `/admin/usuarios` are SUPER_ADMIN-only.
- `src/app/(auth)/` + `src/app/api/auth/` — login + NextAuth handlers.
- `src/app/api/mcp/` — MCP REST API for AI agents (X-API-Key auth, SUPER_ADMIN only, keys stored as SHA-256 hashes — see `src/app/api/mcp/lib/auth.ts`). `mcp-server/` is a standalone stdio server with its own `package.json`/`node_modules` (gitignored) and is excluded from the Next build via `next.config.ts` webpack rule.
- `src/components/ui/` — shadcn (style `base-nova`), `sonner` toasts, `nextjs-toploader` in layout, `SubmitButton` for pending state.
- `src/components/shared/markdown-renderer.tsx` — centralized markdown renderer (`prose` via @tailwindcss/typography, XSS-safe). `src/components/shared/block-renderer.tsx` + `src/components/admin/block-editor.tsx` — CMS block editor (types include `markdown`). Component files use kebab-case.
- `src/lib/validations/` — Zod 4 schemas (blog `content` is `string | block[]` union, `Json` normalized before render).
- `src/lib/email.ts` — Resend wrapper (best-effort; dev fallback logs to console).
- `src/lib/lead-emails.ts` — dispatches submitter confirmation + admin notification for new leads.
- `src/emails/` — React Email templates (plain JSX + inline styles, no deprecated `@react-email/components`).
- Property detail page uses **free Google Maps Embed API** (no API key required) when lat/lng are set; falls back to zone + address text otherwise.
- `src/server/actions/` — Server Actions per entity (property/lead/zone/agent/user/project/blog/cms/settings).
- `prisma/schema.prisma` — 12 models, 9 enums. `binaryTargets = ["native","linux-musl-openssl-3.0.x"]` for Alpine. `public/uploads/` is runtime-only (gitignored, seed uses picsum placeholders).

## Env

Copy `.env.example` → `.env`. Required prod: `DATABASE_URL`, `AUTH_SECRET` (`npx auth secret`), `AUTH_URL`, `NEXT_PUBLIC_APP_URL`. Optional Phase 2: `RESEND_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, R2/UploadThing, Upstash Redis. Never commit `.env`.

## Verification Order

```
pnpm run lint -> pnpm run build -> pnpm test
```

`build` must be 0 warnings (Edge). Tests must stay 1287 green. Coverage gate 80% — don't lower thresholds in `vitest.config.ts`.

## Conventions & Gotchas

- Prettier: singleQuote, semi false, printWidth 100, tabWidth 2 (`/.prettierrc`). Run before commit if you touched formatting.
- `Button` with `render={<Link>}` needs `nativeButton={false}` (auto-set) — don't pass native button props to link buttons.
- New shadcn component: `pnpm dlx shadcn@latest add <component>` (project uses `components.json` aliases).
- Docker multi-stage: `deps` → `builder` (needs all deps including dev for Tailwind) → `runner` (standalone + full `node_modules` for `prisma migrate deploy`). Don't remove `openssl`/`libc6-compat` from Alpine stages.
- `.tmp/` and `.opencode/` are gitignored — session/task scratch, never commit.
- Playwright artifacts in `test-results/` and `playwright-report/` are disposable and gitignored. Keep them only while investigating E2E failures, then remove them at the end of the workday or when finishing the session.
