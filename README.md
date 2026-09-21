# 🏠 JR Realty

[![CI](https://github.com/devjr64/jr-realty/actions/workflows/ci.yml/badge.svg)](https://github.com/devjr64/jr-realty/actions/workflows/ci.yml)

Full-stack real estate platform for a Venezuelan agency: public listing site with
search and filters, lead-capture CRM, block-based CMS, blog, and a complete admin
panel — plus an MCP (Model Context Protocol) API so AI agents can manage the
catalog programmatically.

> Fictional demo brand (JR Realty, Caracas) with seeded demo data. Built as a
> production-grade showcase: **1,287 tests**, **80% coverage gate**, hardened
> auth, and CI/CD from lint to E2E.

## Highlights

**Public site** — property catalog with filters (type, operation, zone, price,
rooms, tags), property detail with gallery + agent WhatsApp CTA, zones,
pre-construction projects, blog (XSS-safe markdown), CMS pages, contact form
with anti-spam.

**Admin panel** (`/admin`) — dashboard KPIs, CRUD for properties / zones /
agents / users / projects / testimonials, image uploads, lead CRM (status,
notes, agent assignment, CSV export), unified block editor (hero, text,
markdown, CTA, features) with live preview, site settings.

**Security engineering**

- NextAuth v5 with an **edge-safe split**: middleware verifies JWT only
  (`auth.config.ts`), credentials/bcrypt/Prisma live in Node-only `auth.ts` —
  keeps middleware at ~86 kB with zero Edge warnings
- RBAC (SUPER_ADMIN / AGENT / CLIENT) enforced in middleware **and** re-checked
  per action with a DB `active` flag (deactivated users lose access instantly)
- Uploads: MIME allowlist + **magic-byte verification** (no HTML disguised as
  images), server-generated UUID filenames, 5 MB cap
- MCP API keys: CSPRNG-generated, stored **only as SHA-256 hashes**, audited per
  operation
- Login rate limiting (10/min per IP), lead-form rate limiting (5/min) +
  honeypot, open-redirect-safe callback allowlist, generic auth errors

**Quality gates** — ESLint 0 warnings, Next.js build 0 Edge warnings, Vitest
**1,287 tests** with an **80% coverage gate** (lines/functions/branches/
statements), Playwright E2E (catalog, lead capture, auth RBAC, middleware
redirects). CI blocks merges on any red gate.

**AI-ready** — REST MCP API (`/api/mcp/*`) + standalone stdio MCP server
(`mcp-server/`) so tools like opencode or Claude can list, create, and parse
properties (including a Word-document → property parser).

## Stack

| Layer     | Tech                                                                    |
| --------- | ----------------------------------------------------------------------- |
| Framework | Next.js 15 (App Router, Server Actions)                                 |
| Language  | TypeScript (strict)                                                     |
| UI        | Tailwind CSS v4 + shadcn/ui + @tailwindcss/typography                   |
| Database  | PostgreSQL 16 + Prisma 6                                                |
| Auth      | NextAuth v5 (credentials + JWT + roles, edge-safe config)               |
| Validation| Zod 4                                                                   |
| Markdown  | react-markdown + remark-gfm + rehype-sanitize (XSS-safe)                |
| Testing   | Vitest + Testing Library (unit) · Playwright (E2E)                      |
| Deploy    | Node.js 24 + pm2 (VPS) + GitHub Actions CD · Docker for local Postgres  |
| Extras    | MCP REST API + stdio server, sonner toasts, nextjs-toploader           |

## Quick start (development)

```bash
# 1. Install (pnpm only — see "Why pnpm" below)
pnpm install

# 2. Start PostgreSQL (Docker, dev only)
docker compose up -d db

# 3. Environment
cp .env.example .env    # fill DATABASE_URL, AUTH_SECRET, ...

# 4. Migrate + seed demo data
pnpm run db:migrate
SEED_ADMIN_EMAIL=admin@jrrealty.com SEED_ADMIN_PASSWORD='Admin123!' pnpm run db:seed

# 5. Run (port 3000 pinned)
pnpm run dev            # → http://localhost:3000
```

### Seeded demo users

| Role        | Email                      | Password    |
| ----------- | -------------------------- | ----------- |
| SUPER_ADMIN | `admin@jrrealty.com`    | `Admin123!` |
| AGENT       | `andreina.salas@jrrealty.test` | `Agente123!` |

> In production `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` are **required** —
> the seed refuses to run with known defaults. Set `SEED_DEMO_DATA=false` to
> skip demo content.

The seed also creates 12 Caracas-area zones, 8 properties, 3 pre-construction
projects, 3 testimonials, 2 blog posts, and a CMS page.

## Testing & coverage

```bash
docker compose up -d db   # integration tests need PostgreSQL
pnpm test                 # 1,287 unit tests (node + jsdom)
pnpm run test:coverage    # v8 coverage — 80% gate on lines/fn/branch/stmt
pnpm run test:ci          # lint → build → coverage (full local CI)
pnpm exec playwright test # E2E (chromium)
```

Coverage includes `src/lib/**`, `src/components/shared|admin/**`, and
`src/server/actions/**` — the business-logic surfaces (Zod schemas, RBAC,
server actions). shadcn primitives and route files are covered via E2E instead.

## Architecture notes

- **Edge/Node auth split** — `src/lib/auth.config.ts` is edge-safe (JWT verify
  only) and is the *only* auth module middleware imports; `src/lib/auth.ts`
  extends it with credentials + bcrypt + Prisma for Node runtimes. Importing
  the wrong one bloats middleware from 86 kB to 150 kB.
- **Server Actions per entity** (`src/server/actions/`) with Zod validation at
  the boundary, `useActionState` contracts, and `revalidatePath` freshness.
- **Public pages** are `force-dynamic` (fresh data); the catalog uses ISR
  (5 min).
- **Uploads** are written to `public/uploads/` (runtime-only, gitignored) with
  server-generated names; external images go through `next/image` remote
  patterns.
- **MCP** — `/api/mcp/*` routes share `lib/auth.ts` (hashed-key lookup) and
  `lib/audit.ts` (fire-and-forget operation log). See
  [MCP-SPECIFICATIONS.md](MCP-SPECIFICATIONS.md) and
  [docs/mcp/setup.md](docs/mcp/setup.md).

```
src/
├── app/
│   ├── (public)/    # catalog, property detail, zones, projects, blog, CMS pages
│   ├── (auth)/      # login (safe callbackUrl, rate limited)
│   ├── (admin)/     # admin panel (force-dynamic, RBAC)
│   └── api/         # NextAuth handlers + MCP REST API
├── components/      # ui (shadcn) · public · admin · shared (MarkdownRenderer…)
├── lib/             # auth split, roles, rate-limit, validations (Zod), utils
├── server/actions/  # Server Actions per entity
└── middleware.ts    # edge-safe RBAC (defense in depth)
prisma/              # schema (12 models, 9 enums), migrations, seed
e2e/                 # Playwright specs + helpers
mcp-server/          # standalone stdio MCP server (own package.json)
```

## Deployment (VPS + pm2)

Production runs natively on a VPS (Node 24 + PostgreSQL 16 + pm2); Docker is
for local development only.

- One-time setup: `scripts/vps-setup.sh` (Node, pnpm, PostgreSQL, deploy user,
  pm2)
- Every push to `main`: `.github/workflows/deploy.yml` SSHes in, pulls,
  installs, migrates, builds, and reloads pm2
- Required env: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`,
  `NEXT_PUBLIC_APP_URL` (see `.env.example`)

## Why pnpm

Strict `node_modules` (no phantom dependencies), install scripts blocked by
default via `pnpm-workspace.yaml` allowlist (least privilege), and lockfile
integrity enforced in CI/Docker with `--frozen-lockfile`.

## Documentation

- [MCP-SPECIFICATIONS.md](MCP-SPECIFICATIONS.md) — MCP API design
- [docs/mcp/setup.md](docs/mcp/setup.md) — MCP setup guide
- [AGENTS.md](AGENTS.md) — engineering conventions for AI coding agents
