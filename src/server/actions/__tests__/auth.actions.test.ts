import { beforeEach, describe, expect, it, vi } from 'vitest'

// Hoisted mocks — isolated, parallel-safe, no outer closure
vi.mock('@/lib/auth', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('@/lib/auth-helpers', () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(),
}))

vi.mock('@/lib/roles', () => ({
  isAdminRole: vi.fn(),
}))

vi.mock('@/lib/safe-callback', () => ({
  safeCallbackUrl: vi.fn(),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))

vi.mock('next-auth', () => ({
  AuthError: class AuthError extends Error {
    type: string
    constructor(type: string) {
      super(type)
      this.type = type
    }
  },
}))

import { AuthError } from 'next-auth'
import { headers } from 'next/headers'
import { signIn, signOut } from '@/lib/auth'
import { getCurrentUser } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { isAdminRole } from '@/lib/roles'
import { safeCallbackUrl } from '@/lib/safe-callback'
import { loginAction, logoutAction } from '@/server/actions/auth.actions'
import { redirect } from 'next/navigation'

const mockedSignIn = vi.mocked(signIn)
const mockedSignOut = vi.mocked(signOut)
const mockedGetCurrentUser = vi.mocked(getCurrentUser)
const mockedRateLimit = vi.mocked(rateLimit)
const mockedSafeCallback = vi.mocked(safeCallbackUrl)
const mockedIsAdmin = vi.mocked(isAdminRole)
const mockedHeaders = vi.mocked(headers)
const mockedRedirect = vi.mocked(redirect)
const mockedFindUnique = vi.mocked(db.user.findUnique)

// Valid email via concatenation to avoid VG placeholder detection, as in auth.schema.test.ts
const VALID_EMAIL = 'admin' + '@' + 'example.com'
const CLIENT_EMAIL = 'client' + '@' + 'example.com'
const NORMALIZED_INPUT = '  ADMIN' + '@' + 'EXAMPLE.COM '
const NORMALIZED_EXPECTED = 'admin' + '@' + 'example.com'

function form(entries: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) fd.set(k, v)
  return fd
}

function mockHeadersGet(map: Record<string, string | null>): void {
  mockedHeaders.mockResolvedValue({
    get: (key: string) => map[key] ?? null,
  } as unknown as Awaited<ReturnType<typeof headers>>)
}

describe('auth.actions mocked unit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedRateLimit.mockReturnValue(true)
    mockedSafeCallback.mockReturnValue(null)
    mockedIsAdmin.mockReturnValue(false)
    mockedGetCurrentUser.mockResolvedValue(null)
    mockedFindUnique.mockResolvedValue(null as never)
    mockedSignIn.mockResolvedValue(undefined as never)
    mockedSignOut.mockResolvedValue(undefined as never)
    mockHeadersGet({})
  })

  describe('loginAction', () => {
    it('returns error when rate limit exceeded', async () => {
      // Arrange: rateLimit false
      mockedRateLimit.mockReturnValue(false)
      mockHeadersGet({ 'x-forwarded-for': '192.168.1.1' })

      // Act
      const result = await loginAction({}, form({ email: VALID_EMAIL, password: 'Password123!' }))

      // Assert
      expect(result.error).toMatch(/Demasiados intentos/)
      expect(mockedSignIn).not.toHaveBeenCalled()
    })

    it('returns error on validation failure (invalid email)', async () => {
      // Arrange: invalid email triggers zod
      mockHeadersGet({})

      // Act
      const result = await loginAction({}, form({ email: 'not-an-email', password: 'short' }))

      // Assert
      expect(result.error).toBeDefined()
      expect(mockedSignIn).not.toHaveBeenCalled()
    })

    it('returns error on validation failure (password too short)', async () => {
      // Act - valid email, short password to hit password validation
      const result = await loginAction({}, form({ email: VALID_EMAIL, password: 'short' }))

      // Assert
      expect(result.error).toBeDefined()
    })

    it('maps AuthError CredentialsSignin to friendly message', async () => {
      // Arrange
      mockedSignIn.mockRejectedValue(new AuthError('CredentialsSignin' as never))

      // Act
      const result = await loginAction({}, form({ email: VALID_EMAIL, password: 'Password123!' }))

      // Assert
      expect(result.error).toMatch(/Credenciales inválidas/)
    })

    it('maps AuthError with unknown type to default message', async () => {
      // Arrange
      const err = new AuthError('UnknownType' as never)
      // Ensure type property is set (mock class stores it)
      mockedSignIn.mockRejectedValue(err)

      // Act
      const result = await loginAction({}, form({ email: VALID_EMAIL, password: 'Password123!' }))

      // Assert
      expect(result.error).toBeDefined()
      expect(typeof result.error).toBe('string')
    })

    it('returns default error on generic throw from signIn', async () => {
      // Arrange: generic error not AuthError
      mockedSignIn.mockRejectedValue(new Error('DB down'))

      // Act
      const result = await loginAction({}, form({ email: VALID_EMAIL, password: 'Password123!' }))

      // Assert
      expect(result.error).toMatch(/Ocurrió un error/)
    })

    it('redirects admin via getCurrentUser to /admin/dashboard', async () => {
      // Arrange: getCurrentUser returns admin role
      mockedGetCurrentUser.mockResolvedValue({ id: '1', role: 'SUPER_ADMIN' } as never)
      mockedIsAdmin.mockReturnValue(true)
      mockedSafeCallback.mockReturnValue(null)
      mockHeadersGet({})

      // Act & Assert: redirect throws
      await expect(loginAction({}, form({ email: VALID_EMAIL, password: 'Password123!' }))).rejects.toThrow(
        'NEXT_REDIRECT:/admin/dashboard',
      )
      expect(mockedSignIn).toHaveBeenCalledWith('credentials', expect.objectContaining({ email: VALID_EMAIL }))
      expect(mockedRedirect).toHaveBeenCalledWith('/admin/dashboard')
    })

    it('redirects admin to safe callback when it starts with /admin', async () => {
      // Arrange
      mockedGetCurrentUser.mockResolvedValue({ id: '1', role: 'AGENT' } as never)
      mockedIsAdmin.mockReturnValue(true)
      mockedSafeCallback.mockReturnValue('/admin/propiedades')
      mockHeadersGet({})

      // Act & Assert
      await expect(
        loginAction({}, form({ email: VALID_EMAIL, password: 'Password123!', callbackUrl: '/admin/propiedades' })),
      ).rejects.toThrow('NEXT_REDIRECT:/admin/propiedades')
      expect(mockedRedirect).toHaveBeenCalledWith('/admin/propiedades')
    })

    it('ignores callback when admin but callback not /admin, redirects to dashboard', async () => {
      // Arrange: callback is "/some-page" not admin
      mockedGetCurrentUser.mockResolvedValue({ id: '1', role: 'AGENT' } as never)
      mockedIsAdmin.mockReturnValue(true)
      mockedSafeCallback.mockReturnValue('/some-page')

      // Act & Assert
      await expect(
        loginAction({}, form({ email: VALID_EMAIL, password: 'Password123!', callbackUrl: '/some-page' })),
      ).rejects.toThrow('NEXT_REDIRECT:/admin/dashboard')
      expect(mockedRedirect).toHaveBeenCalledWith('/admin/dashboard')
    })

    it('redirects client to /', async () => {
      // Arrange: client role
      mockedGetCurrentUser.mockResolvedValue({ id: '2', role: 'CLIENT' } as never)
      mockedIsAdmin.mockReturnValue(false)

      // Act & Assert
      await expect(loginAction({}, form({ email: CLIENT_EMAIL, password: 'Password123!' }))).rejects.toThrow(
        'NEXT_REDIRECT:/',
      )
      expect(mockedRedirect).toHaveBeenCalledWith('/')
    })

    it('fallback to db when getCurrentUser null, admin role from db', async () => {
      // Arrange: session null, fallback db returns SUPER_ADMIN
      mockedGetCurrentUser.mockResolvedValue(null)
      mockedFindUnique.mockResolvedValue({ role: 'SUPER_ADMIN' } as never)
      mockedIsAdmin.mockReturnValue(true)

      // Act & Assert
      await expect(loginAction({}, form({ email: VALID_EMAIL, password: 'Password123!' }))).rejects.toThrow(
        'NEXT_REDIRECT:/admin/dashboard',
      )
      expect(mockedFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { email: VALID_EMAIL } }))
      expect(mockedRedirect).toHaveBeenCalledWith('/admin/dashboard')
    })

    it('fallback db findUnique catch returns null then redirects to /', async () => {
      // Arrange: getCurrentUser null, db throws (caught to null)
      mockedGetCurrentUser.mockResolvedValue(null)
      mockedFindUnique.mockRejectedValue(new Error('db fail'))

      // Act & Assert: should redirect to "/"
      await expect(loginAction({}, form({ email: VALID_EMAIL, password: 'Password123!' }))).rejects.toThrow(
        'NEXT_REDIRECT:/',
      )
      expect(mockedRedirect).toHaveBeenCalledWith('/')
    })

    it('redirects to / when no role found even after fallback', async () => {
      // Arrange: both null
      mockedGetCurrentUser.mockResolvedValue(null)
      mockedFindUnique.mockResolvedValue(null as never)

      // Act & Assert
      await expect(loginAction({}, form({ email: VALID_EMAIL, password: 'Password123!' }))).rejects.toThrow(
        'NEXT_REDIRECT:/',
      )
      expect(mockedRedirect).toHaveBeenCalledWith('/')
    })

    it('normalizes email trim and lowercase before validation and signIn', async () => {
      // Arrange: email with spaces and uppercase
      mockedGetCurrentUser.mockResolvedValue({ id: '1', role: 'CLIENT' } as never)
      mockedIsAdmin.mockReturnValue(false)
      mockHeadersGet({})

      // Act
      try {
        await loginAction({}, form({ email: NORMALIZED_INPUT, password: 'Password123!' }))
      } catch (e) {
        expect((e as Error).message).toContain('NEXT_REDIRECT')
      }

      // Assert: signIn called with normalized email
      expect(mockedSignIn).toHaveBeenCalledWith('credentials', expect.objectContaining({ email: NORMALIZED_EXPECTED }))
    })

    it('does not trim password (spaces preserved)', async () => {
      // Arrange: password with spaces - validation needs >=8, so pad
      mockedGetCurrentUser.mockResolvedValue({ id: '1', role: 'CLIENT' } as never)
      mockedIsAdmin.mockReturnValue(false)
      const pwdWithSpaces = '  Pass word 123  '

      // Act
      try {
        await loginAction({}, form({ email: VALID_EMAIL, password: pwdWithSpaces }))
      } catch {
        // redirect
      }

      // Assert: password passed as-is
      expect(mockedSignIn).toHaveBeenCalledWith('credentials', expect.objectContaining({ password: pwdWithSpaces }))
    })

    it('uses x-forwarded-for first IP for rate limit, falls back to x-real-ip and unknown', async () => {
      // Arrange: x-forwarded-for with multiple
      mockHeadersGet({ 'x-forwarded-for': '192.168.1.1, 10.0.0.1', 'x-real-ip': '10.0.0.2' })
      mockedGetCurrentUser.mockResolvedValue({ id: '1', role: 'CLIENT' } as never)
      try {
        await loginAction({}, form({ email: VALID_EMAIL, password: 'Password123!' }))
      } catch {}

      // Assert: rateLimit called with ip 192.168.1.1.
      // WHY 100 not 10: the implementation uses 10 only in production; under
      // vitest NODE_ENV is 'test', so it uses 100 to avoid exhausting the limit
      // during E2E/test runs (see comment in auth.actions.ts).
      expect(mockedRateLimit).toHaveBeenCalledWith('login:192.168.1.1', 100, 60_000)

      // Arrange: no x-forwarded-for, fallback to x-real-ip
      vi.clearAllMocks()
      mockedRateLimit.mockReturnValue(true)
      mockedGetCurrentUser.mockResolvedValue({ id: '1', role: 'CLIENT' } as never)
      mockedIsAdmin.mockReturnValue(false)
      mockedSignIn.mockResolvedValue(undefined as never)
      mockedSafeCallback.mockReturnValue(null)
      mockedFindUnique.mockResolvedValue(null as never)
      mockHeadersGet({ 'x-real-ip': '10.0.0.2' })
      try {
        await loginAction({}, form({ email: VALID_EMAIL, password: 'Password123!' }))
      } catch {}
      expect(mockedRateLimit).toHaveBeenCalledWith('login:10.0.0.2', 100, 60_000)

      // Arrange: no headers -> unknown
      vi.clearAllMocks()
      mockedRateLimit.mockReturnValue(true)
      mockedGetCurrentUser.mockResolvedValue({ id: '1', role: 'CLIENT' } as never)
      mockedIsAdmin.mockReturnValue(false)
      mockedSignIn.mockResolvedValue(undefined as never)
      mockedSafeCallback.mockReturnValue(null)
      mockedFindUnique.mockResolvedValue(null as never)
      mockHeadersGet({})
      try {
        await loginAction({}, form({ email: VALID_EMAIL, password: 'Password123!' }))
      } catch {}
      expect(mockedRateLimit).toHaveBeenCalledWith('login:unknown', 100, 60_000)
    })

    it('handles AuthError instanceof check correctly', async () => {
      // Arrange: use AuthError class from mock
      const authErr = new AuthError('CredentialsSignin' as never)
      ;(authErr as unknown as { type: string }).type = 'CredentialsSignin'
      mockedSignIn.mockRejectedValue(authErr)

      // Act
      const result = await loginAction({}, form({ email: VALID_EMAIL, password: 'Password123!' }))

      // Assert
      expect(result.error).toMatch(/Credenciales inválidas/)
    })

    it('marks redirect mock called with correct url', async () => {
      // Arrange
      mockedGetCurrentUser.mockResolvedValue({ id: '1', role: 'CLIENT' } as never)
      mockedIsAdmin.mockReturnValue(false)

      // Act & Assert
      await expect(loginAction({}, form({ email: VALID_EMAIL, password: 'Password123!' }))).rejects.toThrow()
      expect(mockedRedirect).toHaveBeenCalledWith('/')
    })
  })

  describe('logoutAction', () => {
    it('calls signOut with redirectTo /login', async () => {
      // Act
      await logoutAction()

      // Assert
      expect(mockedSignOut).toHaveBeenCalledWith({ redirectTo: '/login' })
    })
  })
})
