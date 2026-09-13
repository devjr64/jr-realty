import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockAuth, mockFindUnique, mockRedirect } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFindUnique: vi.fn(),
  mockRedirect: vi.fn((url: string): never => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))

vi.mock('@/lib/auth', () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}))

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}))

vi.mock('next/navigation', () => ({
  redirect: (url: string): never => mockRedirect(url),
}))

import { getCurrentUser, requireAdmin, requireSuperAdmin } from '@/lib/auth-helpers'

describe('getCurrentUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when no session', async () => {
    // Arrange
    mockAuth.mockResolvedValue(null)

    // Act
    const result = await getCurrentUser()

    // Assert
    expect(result).toBeNull()
  })

  it('returns null when session has no user', async () => {
    // Arrange
    mockAuth.mockResolvedValue({})

    // Act
    const result = await getCurrentUser()

    // Assert
    expect(result).toBeNull()
  })

  it('returns null when session.user is undefined', async () => {
    // Arrange
    mockAuth.mockResolvedValue({ user: undefined })

    // Act
    const result = await getCurrentUser()

    // Assert
    expect(result).toBeNull()
  })

  it('returns user when session exists', async () => {
    // Arrange
    const user = { id: 'u1', name: 'Alice', email: 'a@test.com', role: 'AGENT' as const }
    mockAuth.mockResolvedValue({ user })

    // Act
    const result = await getCurrentUser()

    // Assert
    expect(result).toEqual(user)
  })

  it('returns user with SUPER_ADMIN role', async () => {
    // Arrange
    const user = { id: 'u2', name: 'Boss', email: 'boss@test.com', role: 'SUPER_ADMIN' as const }
    mockAuth.mockResolvedValue({ user })

    // Act
    const result = await getCurrentUser()

    // Assert
    expect(result).toEqual(user)
  })
})

describe('requireAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to /login when no user', async () => {
    // Arrange
    mockAuth.mockResolvedValue(null)

    // Act & Assert
    await expect(requireAdmin()).rejects.toThrow('NEXT_REDIRECT:/login')
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('redirects when session has no user object', async () => {
    // Arrange
    mockAuth.mockResolvedValue({})

    // Act & Assert
    await expect(requireAdmin()).rejects.toThrow('NEXT_REDIRECT:/login')
  })

  it('redirects when role is CLIENT (not admin)', async () => {
    // Arrange
    mockAuth.mockResolvedValue({
      user: { id: 'c1', name: 'Client', email: 'c@test.com', role: 'CLIENT' },
    })
    mockFindUnique.mockResolvedValue({ active: true })

    // Act & Assert
    await expect(requireAdmin()).rejects.toThrow('NEXT_REDIRECT:/login')
    // isUserActive must NOT be called when role check fails
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('redirects when role is undefined', async () => {
    // Arrange
    mockAuth.mockResolvedValue({
      user: { id: 'u1', name: 'NoRole', email: 'n@test.com', role: undefined },
    })

    // Act & Assert
    await expect(requireAdmin()).rejects.toThrow('NEXT_REDIRECT:/login')
  })

  it('redirects when user is deactivated (active false) — mid-JWT defense', async () => {
    // Arrange
    mockAuth.mockResolvedValue({
      user: { id: 'u1', name: 'Ana', email: 'ana@test.com', role: 'AGENT' },
    })
    mockFindUnique.mockResolvedValue({ active: false })

    // Act & Assert
    await expect(requireAdmin()).rejects.toThrow('NEXT_REDIRECT:/login')
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: 'u1' },
      select: { active: true },
    })
  })

  it('redirects when user row not found (null) — treated as inactive', async () => {
    // Arrange
    mockAuth.mockResolvedValue({
      user: { id: 'deleted', name: 'Ghost', email: 'g@test.com', role: 'AGENT' },
    })
    mockFindUnique.mockResolvedValue(null)

    // Act & Assert
    await expect(requireAdmin()).rejects.toThrow('NEXT_REDIRECT:/login')
  })

  it('redirects when active is undefined (missing field)', async () => {
    // Arrange
    mockAuth.mockResolvedValue({
      user: { id: 'u1', name: 'Ana', email: 'ana@test.com', role: 'SUPER_ADMIN' },
    })
    mockFindUnique.mockResolvedValue({})

    // Act & Assert
    await expect(requireAdmin()).rejects.toThrow('NEXT_REDIRECT:/login')
  })

  it('returns user when AGENT and active', async () => {
    // Arrange
    const user = { id: 'a1', name: 'Agent', email: 'agent@test.com', role: 'AGENT' as const }
    mockAuth.mockResolvedValue({ user })
    mockFindUnique.mockResolvedValue({ active: true })

    // Act
    const result = await requireAdmin()

    // Assert
    expect(result).toEqual(user)
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: 'a1' },
      select: { active: true },
    })
  })

  it('returns user when SUPER_ADMIN and active', async () => {
    // Arrange
    const user = { id: 's1', name: 'Super', email: 'super@test.com', role: 'SUPER_ADMIN' as const }
    mockAuth.mockResolvedValue({ user })
    mockFindUnique.mockResolvedValue({ active: true })

    // Act
    const result = await requireAdmin()

    // Assert
    expect(result).toEqual(user)
  })

  it('blocks AGENT deactivated mid-JWT — active check happens after role check', async () => {
    // Arrange — JWT still valid but DB says inactive
    mockAuth.mockResolvedValue({
      user: { id: 'a1', name: 'Agent', email: 'agent@test.com', role: 'AGENT' },
    })
    mockFindUnique.mockResolvedValue({ active: false })

    // Act & Assert
    await expect(requireAdmin()).rejects.toThrow('NEXT_REDIRECT:/login')
  })
})

describe('requireSuperAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects when no user', async () => {
    // Arrange
    mockAuth.mockResolvedValue(null)

    // Act & Assert
    await expect(requireSuperAdmin()).rejects.toThrow('NEXT_REDIRECT:/login')
  })

  it('redirects when role is AGENT (only SUPER_ADMIN passes)', async () => {
    // Arrange
    mockAuth.mockResolvedValue({
      user: { id: 'a1', name: 'Agent', email: 'a@test.com', role: 'AGENT' },
    })

    // Act & Assert
    await expect(requireSuperAdmin()).rejects.toThrow('NEXT_REDIRECT:/login')
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('redirects when role is CLIENT', async () => {
    // Arrange
    mockAuth.mockResolvedValue({
      user: { id: 'c1', name: 'Client', email: 'c@test.com', role: 'CLIENT' },
    })

    // Act & Assert
    await expect(requireSuperAdmin()).rejects.toThrow('NEXT_REDIRECT:/login')
  })

  it('redirects when SUPER_ADMIN but deactivated mid-JWT', async () => {
    // Arrange
    mockAuth.mockResolvedValue({
      user: { id: 's1', name: 'Super', email: 's@test.com', role: 'SUPER_ADMIN' },
    })
    mockFindUnique.mockResolvedValue({ active: false })

    // Act & Assert
    await expect(requireSuperAdmin()).rejects.toThrow('NEXT_REDIRECT:/login')
  })

  it('redirects when SUPER_ADMIN but user row deleted (null)', async () => {
    // Arrange
    mockAuth.mockResolvedValue({
      user: { id: 's1', name: 'Super', email: 's@test.com', role: 'SUPER_ADMIN' },
    })
    mockFindUnique.mockResolvedValue(null)

    // Act & Assert
    await expect(requireSuperAdmin()).rejects.toThrow('NEXT_REDIRECT:/login')
  })

  it('returns user when SUPER_ADMIN and active', async () => {
    // Arrange
    const user = { id: 's1', name: 'Super', email: 's@test.com', role: 'SUPER_ADMIN' as const }
    mockAuth.mockResolvedValue({ user })
    mockFindUnique.mockResolvedValue({ active: true })

    // Act
    const result = await requireSuperAdmin()

    // Assert
    expect(result).toEqual(user)
  })

  it('blocks SUPER_ADMIN deactivated — defense in depth after 8h JWT window', async () => {
    // Arrange
    mockAuth.mockResolvedValue({
      user: { id: 's1', name: 'Super', email: 's@test.com', role: 'SUPER_ADMIN' },
    })
    mockFindUnique.mockResolvedValue({ active: false })

    // Act & Assert
    await expect(requireSuperAdmin()).rejects.toThrow('NEXT_REDIRECT:/login')
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: 's1' },
      select: { active: true },
    })
  })

  it('redirects when role is case-mismatched super_admin', async () => {
    // Arrange
    mockAuth.mockResolvedValue({
      user: { id: 's1', name: 'Super', email: 's@test.com', role: 'super_admin' as unknown as string },
    })

    // Act & Assert
    await expect(requireSuperAdmin()).rejects.toThrow('NEXT_REDIRECT:/login')
  })
})
