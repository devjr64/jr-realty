import { beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

vi.mock('next/server', () => ({
  NextResponse: {
    redirect: vi.fn((url: URL | string) => {
      const href = typeof url === 'string' ? url : url.toString()
      return {
        status: 307,
        url: href,
        headers: { get: (k: string) => (k === 'location' ? href : null) },
      } as unknown as Response
    }),
    next: vi.fn(() => ({ status: 200 }) as unknown as Response),
  },
}))

vi.mock('next/server.js', () => ({
  NextResponse: {
    redirect: vi.fn((url: URL | string) => {
      const href = typeof url === 'string' ? url : url.toString()
      return {
        status: 307,
        url: href,
        headers: { get: (k: string) => (k === 'location' ? href : null) },
      } as unknown as Response
    }),
    next: vi.fn(() => ({ status: 200 }) as unknown as Response),
  },
}))

// Make auth wrapper transparent: auth(handler) => handler
vi.mock('@/lib/auth.config', () => ({
  auth: (handler: (req: unknown) => unknown) => handler,
}))

// Import after mocks - middleware uses edge-safe auth.config only
import middleware from '@/middleware'
import { NextResponse } from 'next/server'
import { isAdminRole } from '@/lib/roles'

const mockRedirect = vi.mocked(NextResponse.redirect)
const mockNext = vi.mocked(NextResponse.next)

type MockReq = {
  nextUrl: URL
  auth?: { user?: { role?: string | null } | null } | null
}

function req(pathname: string, user: { role?: string | null } | null = null): MockReq {
  return {
    nextUrl: new URL(pathname, 'http://localhost:3000'),
    auth: user ? { user } : null,
  } as unknown as MockReq
}

describe('middleware — /admin protection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects unauthenticated /admin to /login with callbackUrl', async () => {
    // Arrange
    const r = req('/admin/dashboard', null)

    // Act
    const res = (middleware as unknown as (req: MockReq) => Response)(r)

    // Assert
    expect(mockRedirect).toHaveBeenCalledTimes(1)
    const redirectUrl = (mockRedirect.mock.calls[0]?.[0] as URL).toString()
    expect(redirectUrl).toContain('/login')
    expect(redirectUrl).toContain('callbackUrl=%2Fadmin%2Fdashboard')
    expect(res).toHaveProperty('status', 307)
  })

  it('encodes pathname in callbackUrl (preserves /admin structure)', async () => {
    // Arrange
    const r = req('/admin/propiedades', null)

    // Act
    ;(middleware as unknown as (req: MockReq) => Response)(r)

    // Assert
    const url = mockRedirect.mock.calls[0]?.[0] as URL
    expect(url.searchParams.get('callbackUrl')).toBe('/admin/propiedades')
  })

  it('redirects CLIENT role from /admin to / (not authorized)', async () => {
    // Arrange
    const r = req('/admin/dashboard', { role: 'CLIENT' })

    // Act
    const res = (middleware as unknown as (req: MockReq) => Response)(r)

    // Assert
    expect(mockRedirect).toHaveBeenCalledTimes(1)
    const redirectUrl = (mockRedirect.mock.calls[0]?.[0] as URL).toString()
    expect(redirectUrl).toBe('http://localhost:3000/')
    expect(res).toHaveProperty('status', 307)
  })

  it('redirects CLIENT on nested /admin/blog/new to /', async () => {
    // Arrange
    const r = req('/admin/blog/new', { role: 'CLIENT' })

    // Act
    ;(middleware as unknown as (req: MockReq) => Response)(r)

    // Assert
    const redirectUrl = (mockRedirect.mock.calls[0]?.[0] as URL).toString()
    expect(redirectUrl).toBe('http://localhost:3000/')
  })

  it('allows AGENT to /admin -> NextResponse.next()', async () => {
    // Arrange
    const r = req('/admin/dashboard', { role: 'AGENT' })

    // Act
    const res = (middleware as unknown as (req: MockReq) => Response)(r)

    // Assert
    expect(mockNext).toHaveBeenCalledTimes(1)
    expect(mockRedirect).not.toHaveBeenCalled()
    expect(res).toHaveProperty('status', 200)
  })

  it('allows SUPER_ADMIN to /admin -> next', async () => {
    // Arrange
    const r = req('/admin/usuarios', { role: 'SUPER_ADMIN' })

    // Act
    const res = (middleware as unknown as (req: MockReq) => Response)(r)

    // Assert
    expect(mockNext).toHaveBeenCalledTimes(1)
    expect(res).toHaveProperty('status', 200)
  })

  it('allows SUPER_ADMIN on deep /admin path', async () => {
    // Arrange
    const r = req('/admin/zonas/123/edit', { role: 'SUPER_ADMIN' })

    // Act
    ;(middleware as unknown as (req: MockReq) => Response)(r)

    // Assert
    expect(mockNext).toHaveBeenCalledTimes(1)
  })

  it('uses isAdminRole — CLIENT is not admin, AGENT/SUPER_ADMIN are', () => {
    // Assert — direct contract of helper used by middleware
    expect(isAdminRole('CLIENT')).toBe(false)
    expect(isAdminRole('AGENT')).toBe(true)
    expect(isAdminRole('SUPER_ADMIN')).toBe(true)
    expect(isAdminRole(null)).toBe(false)
    expect(isAdminRole(undefined)).toBe(false)
  })
})

describe('middleware — /login redirect for authenticated users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects authenticated AGENT from /login to /admin/dashboard', async () => {
    // Arrange
    const r = req('/login', { role: 'AGENT' })

    // Act
    const res = (middleware as unknown as (req: MockReq) => Response)(r)

    // Assert
    expect(mockRedirect).toHaveBeenCalledTimes(1)
    const redirectUrl = (mockRedirect.mock.calls[0]?.[0] as URL).toString()
    expect(redirectUrl).toBe('http://localhost:3000/admin/dashboard')
    expect(res).toHaveProperty('status', 307)
  })

  it('redirects authenticated SUPER_ADMIN from /login to /admin/dashboard', async () => {
    // Arrange
    const r = req('/login', { role: 'SUPER_ADMIN' })

    // Act
    ;(middleware as unknown as (req: MockReq) => Response)(r)

    // Assert
    const redirectUrl = (mockRedirect.mock.calls[0]?.[0] as URL).toString()
    expect(redirectUrl).toContain('/admin/dashboard')
  })

  it('redirects authenticated CLIENT from /login to /', async () => {
    // Arrange
    const r = req('/login', { role: 'CLIENT' })

    // Act
    const res = (middleware as unknown as (req: MockReq) => Response)(r)

    // Assert
    expect(mockRedirect).toHaveBeenCalledTimes(1)
    const redirectUrl = (mockRedirect.mock.calls[0]?.[0] as URL).toString()
    expect(redirectUrl).toBe('http://localhost:3000/')
  })

  it('allows unauthenticated user to /login -> next', async () => {
    // Arrange
    const r = req('/login', null)

    // Act
    const res = (middleware as unknown as (req: MockReq) => Response)(r)

    // Assert
    expect(mockNext).toHaveBeenCalledTimes(1)
    expect(mockRedirect).not.toHaveBeenCalled()
    expect(res).toHaveProperty('status', 200)
  })

  it('allows unauthenticated null auth to /login -> next', async () => {
    // Arrange
    const r: MockReq = {
      nextUrl: new URL('/login', 'http://localhost:3000'),
      auth: null,
    } as unknown as MockReq

    // Act
    const res = (middleware as unknown as (req: MockReq) => Response)(r)

    // Assert
    expect(mockNext).toHaveBeenCalled()
    expect(res).toHaveProperty('status', 200)
  })

  it('allows public path / to next (not matched but handler falls through)', async () => {
    // Arrange
    const r = req('/', null)

    // Act
    const res = (middleware as unknown as (req: MockReq) => Response)(r)

    // Assert
    expect(mockNext).toHaveBeenCalledTimes(1)
    expect(res).toHaveProperty('status', 200)
  })
})

describe('middleware — edge-safe imports', () => {
  it('imports only from auth.config (not auth.ts / db / bcrypt)', () => {
    // Arrange
    const filePath = path.resolve(process.cwd(), 'src/middleware.ts')
    const content = fs.readFileSync(filePath, 'utf-8')

    // Assert — must import edge-safe auth (either quote style)
    const hasEdgeImport =
      content.includes('@/lib/auth.config') && (content.includes('from "@/lib/auth.config"') || content.includes("from '@/lib/auth.config'"))
    expect(hasEdgeImport).toBe(true)

    // Assert — must NOT import Node deps (exact '@/lib/auth' without .config)
    // Use regex to avoid false positive on auth.config
    expect(content).not.toMatch(/from\s+["']@\/lib\/auth["']/)
    // Should not pull db or bcrypt into middleware (check imports, not comments)
    expect(content).not.toContain('@/lib/db')
    expect(content).not.toMatch(/import\s+.*bcrypt/)
    expect(content).not.toContain('prisma')
  })

  it('imports isAdminRole from @/lib/roles single source', () => {
    // Arrange
    const content = fs.readFileSync(path.resolve(process.cwd(), 'src/middleware.ts'), 'utf-8')

    // Assert
    expect(content).toContain('isAdminRole')
    expect(content).toContain('@/lib/roles')
  })

  it('uses NextResponse for redirects', () => {
    // Arrange
    const content = fs.readFileSync(path.resolve(process.cwd(), 'src/middleware.ts'), 'utf-8')

    // Assert
    expect(content).toContain('NextResponse.redirect')
    expect(content).toContain('NextResponse.next()')
  })

  it('exports config matcher for /admin/:path* and /login', () => {
    // Arrange
    const content = fs.readFileSync(path.resolve(process.cwd(), 'src/middleware.ts'), 'utf-8')

    // Assert
    expect(content).toContain('/admin/:path*')
    expect(content).toContain('/login')
  })
})
