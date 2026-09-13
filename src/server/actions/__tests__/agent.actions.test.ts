import { beforeEach, describe, expect, it, vi } from 'vitest'

// Isolated mocks per file — no shared state
vi.mock('@/lib/auth-helpers', () => ({
  requireAdmin: vi.fn(),
  requireSuperAdmin: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    agent: {
      findUnique: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_pw'),
  },
}))

vi.mock('@/lib/utils/uploads', () => ({
  deleteUploadedFile: vi.fn(),
}))

import bcrypt from 'bcryptjs'
import { requireSuperAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { deleteUploadedFile } from '@/lib/utils/uploads'
import {
  createAgentAction,
  deleteAgentAction,
  updateAgentAction,
} from '@/server/actions/agent.actions'
import { revalidatePath } from 'next/cache'

const mockedRequireSuperAdmin = vi.mocked(requireSuperAdmin)
const mockedRevalidate = vi.mocked(revalidatePath)
const mockedDeleteFile = vi.mocked(deleteUploadedFile)
const mockedHash = vi.mocked(bcrypt.hash)

// Pure helper — deterministic FormData builder
function form(entries: Record<string, string>) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) fd.set(k, v)
  return fd
}

describe('agent.actions RBAC & logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedRequireSuperAdmin.mockResolvedValue({ id: 'super1', role: 'SUPER_ADMIN' } as never)
    // Default $transaction impl: executes callback with tx mock
    vi.mocked(db.$transaction).mockImplementation(async (cb: never) => {
      const txMock = {
        user: {
          update: vi.fn().mockResolvedValue({} as never),
          delete: vi.fn().mockResolvedValue({} as never),
        },
        agent: {
          update: vi.fn().mockResolvedValue({} as never),
          delete: vi.fn().mockResolvedValue({} as never),
        },
      }
      return (cb as unknown as (tx: typeof txMock) => Promise<unknown>)(txMock)
    })
  })

  describe('createAgentAction', () => {
    it('requires SUPER_ADMIN — AGENT blocked', async () => {
      // Arrange
      mockedRequireSuperAdmin.mockRejectedValue(new Error('NEXT_REDIRECT'))
      // Act & Assert
      await expect(
        createAgentAction({}, form({ name: 'Ana', email: 'ana@test.com', password: 'Str0ng!123', phone: '61234567' })),
      ).rejects.toThrow()
      expect(db.user.create).not.toHaveBeenCalled()
    })

    it('returns fieldErrors on validation failure', async () => {
      // Arrange — name too short, email bad, phone too short
      const fd = form({ name: 'A', email: 'bad', password: '123', phone: '12' })
      // Act
      const result = await createAgentAction({}, fd)
      // Assert
      expect(result.error).toBeDefined()
      expect(result.fieldErrors).toBeDefined()
      expect(db.user.create).not.toHaveBeenCalled()
    })

    it('returns error when password missing on create', async () => {
      // Arrange — valid other fields but password empty -> schema passes (optional) but action checks !password
      const fd = form({ name: 'Ana Torres', email: 'ana@test.com', password: '', phone: '61234567' })
      vi.mocked(db.user.findUnique).mockResolvedValue(null)
      // Act
      const result = await createAgentAction({}, fd)
      // Assert
      expect(result.error).toMatch(/contraseña.*obligatoria/)
      expect(db.user.create).not.toHaveBeenCalled()
    })

    it('returns error when email already exists', async () => {
      // Arrange
      vi.mocked(db.user.findUnique).mockResolvedValue({ id: 'u1', email: 'ana@test.com' } as never)
      const fd = form({ name: 'Ana Torres', email: 'ana@test.com', password: 'Str0ng!123', phone: '61234567' })
      // Act
      const result = await createAgentAction({}, fd)
      // Assert
      expect(result.error).toMatch(/Ya existe un usuario/)
      expect(db.user.create).not.toHaveBeenCalled()
    })

    it('creates agent with hashed password and revalidates', async () => {
      // Arrange
      vi.mocked(db.user.findUnique).mockResolvedValue(null)
      vi.mocked(db.user.create).mockResolvedValue({ id: 'new' } as never)
      const fd = form({
        name: 'Ana Torres',
        email: 'ANA@TEST.COM', // will be lowercased
        password: 'Str0ng!123',
        phone: '61234567',
        title: 'Asesor Senior',
        whatsapp: '61230000',
        active: 'on',
      })
      // Act
      const result = await createAgentAction({}, fd)
      // Assert
      expect(result.success).toBe(true)
      expect(mockedHash).toHaveBeenCalledWith('Str0ng!123', 12)
      expect(db.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'ana@test.com', // lowercased
            role: 'AGENT',
            phone: '61234567',
            agent: expect.objectContaining({
              create: expect.objectContaining({ title: 'Asesor Senior', active: true }),
            }),
          }),
        }),
      )
      expect(mockedRevalidate).toHaveBeenCalledWith('/admin/agentes')
    })

    it('creates agent with defaults when optional fields empty', async () => {
      // Arrange
      vi.mocked(db.user.findUnique).mockResolvedValue(null)
      vi.mocked(db.user.create).mockResolvedValue({ id: 'new' } as never)
      const fd = form({ name: 'Ana Torres', email: 'ana@test.com', password: 'Str0ng!123', phone: '61234567' })
      // Act
      const result = await createAgentAction({}, fd)
      // Assert
      expect(result.success).toBe(true)
      expect(db.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            agent: expect.objectContaining({ create: expect.objectContaining({ title: null, whatsapp: null }) }),
          }),
        }),
      )
    })

    it('handles db error on create', async () => {
      // Arrange
      vi.mocked(db.user.findUnique).mockResolvedValue(null)
      vi.mocked(db.user.create).mockRejectedValue(new Error('db fail'))
      const fd = form({ name: 'Ana Torres', email: 'ana@test.com', password: 'Str0ng!123', phone: '61234567' })
      // Act
      const result = await createAgentAction({}, fd)
      // Assert
      expect(result.error).toMatch(/No se pudo crear el agente/)
    })

    it('normalizes email to lowercase and trim', async () => {
      // Arrange
      vi.mocked(db.user.findUnique).mockResolvedValue(null)
      vi.mocked(db.user.create).mockResolvedValue({ id: 'new' } as never)
      const fd = form({ name: 'Ana', email: '  Ana@TEST.com  ', password: 'Str0ng!123', phone: '61234567' })
      // Act
      await createAgentAction({}, fd)
      // Assert
      expect(db.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ email: 'ana@test.com' }) }),
      )
    })
  })

  describe('updateAgentAction', () => {
    it('returns error when id missing', async () => {
      // Arrange
      const fd = form({ name: 'Ana', email: 'ana@test.com', phone: '61234567' })
      // Act
      const result = await updateAgentAction({}, fd)
      // Assert
      expect(result.error).toMatch(/identificador/)
    })

    it('returns error when id is whitespace only', async () => {
      // Arrange
      const fd = form({ id: '   ', name: 'Ana', email: 'ana@test.com', phone: '61234567' })
      // Act
      const result = await updateAgentAction({}, fd)
      // Assert
      expect(result.error).toMatch(/identificador/)
    })

    it('returns fieldErrors on validation failure', async () => {
      // Arrange
      const fd = form({ id: 'a1', name: '', email: 'bad', phone: '12' })
      // Act
      const result = await updateAgentAction({}, fd)
      // Assert
      expect(result.fieldErrors).toBeDefined()
      expect(db.agent.findUnique).not.toHaveBeenCalled()
    })

    it('returns error when agent not found', async () => {
      // Arrange
      vi.mocked(db.agent.findUnique).mockResolvedValue(null)
      const fd = form({ id: 'missing', name: 'Ana', email: 'ana@test.com', phone: '61234567' })
      // Act
      const result = await updateAgentAction({}, fd)
      // Assert
      expect(result.error).toMatch(/no existe/)
    })

    it('returns error when email taken by another user', async () => {
      // Arrange
      vi.mocked(db.agent.findUnique).mockResolvedValue({ id: 'a1', userId: 'u1', user: { id: 'u1', email: 'old@test.com' } } as never)
      vi.mocked(db.user.findFirst).mockResolvedValue({ id: 'other', email: 'ana@test.com' } as never)
      const fd = form({ id: 'a1', name: 'Ana', email: 'ana@test.com', phone: '61234567' })
      // Act
      const result = await updateAgentAction({}, fd)
      // Assert
      expect(result.error).toMatch(/Ya existe un usuario/)
    })

    it('updates without re-hashing when password empty', async () => {
      // Arrange
      vi.mocked(db.agent.findUnique).mockResolvedValue({ id: 'a1', userId: 'u1', user: { id: 'u1', email: 'old@test.com' } } as never)
      vi.mocked(db.user.findFirst).mockResolvedValue(null)
      const captured: { userData?: Record<string, unknown> } = {}
      vi.mocked(db.$transaction).mockImplementation(async (cb: never) => {
        const txMock = {
          user: {
            update: vi.fn().mockImplementation(async (args: unknown) => {
              captured.userData = (args as { data: Record<string, unknown> }).data
              return {} as never
            }),
          },
          agent: { update: vi.fn().mockResolvedValue({} as never) },
        }
        return (cb as unknown as (tx: typeof txMock) => Promise<unknown>)(txMock)
      })
      const fd = form({ id: 'a1', name: 'Ana', email: 'ana@test.com', password: '', phone: '61234567', active: 'on' })
      // Act
      const result = await updateAgentAction({}, fd)
      // Assert
      expect(result.success).toBe(true)
      expect(captured.userData).not.toHaveProperty('passwordHash')
      expect(mockedHash).not.toHaveBeenCalled()
      expect(mockedRevalidate).toHaveBeenCalledWith('/admin/agentes')
    })

    it('hashes password when provided on update', async () => {
      // Arrange
      vi.mocked(db.agent.findUnique).mockResolvedValue({ id: 'a1', userId: 'u1', user: { id: 'u1', email: 'old@test.com' } } as never)
      vi.mocked(db.user.findFirst).mockResolvedValue(null)
      let capturedHash: string | undefined
      vi.mocked(db.$transaction).mockImplementation(async (cb: never) => {
        const txMock = {
          user: {
            update: vi.fn().mockImplementation(async (args: unknown) => {
              capturedHash = (args as { data: { passwordHash?: string } }).data.passwordHash
              return {} as never
            }),
          },
          agent: { update: vi.fn().mockResolvedValue({} as never) },
        }
        return (cb as unknown as (tx: typeof txMock) => Promise<unknown>)(txMock)
      })
      const fd = form({ id: 'a1', name: 'Ana', email: 'ana@test.com', password: 'NewPass123!', phone: '61234567' })
      // Act
      const result = await updateAgentAction({}, fd)
      // Assert
      expect(result.success).toBe(true)
      expect(capturedHash).toBe('hashed_pw')
    })

    it('allows keeping same email (excludes self from uniqueness)', async () => {
      // Arrange
      vi.mocked(db.agent.findUnique).mockResolvedValue({ id: 'a1', userId: 'u1', user: { id: 'u1', email: 'ana@test.com' } } as never)
      vi.mocked(db.user.findFirst).mockResolvedValue(null) // not taken because NOT u1
      const fd = form({ id: 'a1', name: 'Ana', email: 'ana@test.com', phone: '61234567' })
      // Act
      const result = await updateAgentAction({}, fd)
      // Assert
      expect(result.success).toBe(true)
      expect(db.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ email: 'ana@test.com', NOT: { id: 'u1' } }) }),
      )
    })

    it('handles transaction error on update', async () => {
      // Arrange
      vi.mocked(db.agent.findUnique).mockResolvedValue({ id: 'a1', userId: 'u1', user: { id: 'u1', email: 'old@test.com' } } as never)
      vi.mocked(db.user.findFirst).mockResolvedValue(null)
      vi.mocked(db.$transaction).mockRejectedValue(new Error('tx fail'))
      const fd = form({ id: 'a1', name: 'Ana', email: 'ana@test.com', phone: '61234567' })
      // Act
      const result = await updateAgentAction({}, fd)
      // Assert
      expect(result.error).toMatch(/No se pudo actualizar el agente/)
    })

    it('requires SUPER_ADMIN on update', async () => {
      // Arrange
      mockedRequireSuperAdmin.mockRejectedValue(new Error('NEXT_REDIRECT'))
      // Act & Assert
      await expect(updateAgentAction({}, form({ id: 'a1', name: 'Ana', email: 'ana@test.com', phone: '61234567' }))).rejects.toThrow()
    })

    it('handles active checkbox off (inactive agent)', async () => {
      // Arrange
      vi.mocked(db.agent.findUnique).mockResolvedValue({ id: 'a1', userId: 'u1', user: { id: 'u1', email: 'old@test.com' } } as never)
      vi.mocked(db.user.findFirst).mockResolvedValue(null)
      // No 'active' field => false
      const fd = form({ id: 'a1', name: 'Ana', email: 'ana@test.com', phone: '61234567' })
      // Act
      const result = await updateAgentAction({}, fd)
      // Assert
      expect(result.success).toBe(true)
    })
  })

  describe('deleteAgentAction', () => {
    it('requires SUPER_ADMIN', async () => {
      // Arrange
      mockedRequireSuperAdmin.mockRejectedValue(new Error('NEXT_REDIRECT'))
      // Act & Assert
      await expect(deleteAgentAction(form({ id: 'a1' }))).rejects.toThrow()
    })

    it('returns error when info missing', async () => {
      // Arrange
      const result = await deleteAgentAction({} as never, undefined)
      // Assert
      expect(result.error).toMatch(/Falta la información/)
    })

    it('returns error when id missing', async () => {
      // Arrange
      const fd = form({ id: '' })
      // Act
      const result = await deleteAgentAction(fd)
      // Assert
      expect(result.error).toMatch(/identificador/)
    })

    it('returns error when agent not found', async () => {
      // Arrange
      vi.mocked(db.agent.findUnique).mockResolvedValue(null)
      const fd = form({ id: 'missing' })
      // Act
      const result = await deleteAgentAction(fd)
      // Assert
      expect(result.error).toMatch(/no existe/)
    })

    it('deletes agent and user via transaction and cleans avatar', async () => {
      // Arrange
      vi.mocked(db.agent.findUnique).mockResolvedValue({
        id: 'a1',
        userId: 'u1',
        user: { id: 'u1', avatarUrl: '/uploads/avatar.jpg' },
      } as never)
      const txCalls: string[] = []
      vi.mocked(db.$transaction).mockImplementation(async (cb: never) => {
        const txMock = {
          agent: { delete: vi.fn().mockImplementation(async () => { txCalls.push('agent'); return {} as never }) },
          user: { delete: vi.fn().mockImplementation(async () => { txCalls.push('user'); return {} as never }) },
        }
        return (cb as unknown as (tx: typeof txMock) => Promise<unknown>)(txMock)
      })
      const fd = form({ id: 'a1' })
      // Act
      const result = await deleteAgentAction(fd)
      // Assert
      expect(result.success).toBe(true)
      expect(txCalls).toEqual(['agent', 'user'])
      expect(mockedDeleteFile).toHaveBeenCalledWith('/uploads/avatar.jpg')
      expect(mockedRevalidate).toHaveBeenCalledWith('/admin/agentes')
    })

    it('deletes without avatar cleanup when no avatarUrl', async () => {
      // Arrange
      vi.mocked(db.agent.findUnique).mockResolvedValue({
        id: 'a1',
        userId: 'u1',
        user: { id: 'u1', avatarUrl: null },
      } as never)
      const fd = form({ id: 'a1' })
      // Act
      const result = await deleteAgentAction(fd)
      // Assert
      expect(result.success).toBe(true)
      expect(mockedDeleteFile).not.toHaveBeenCalled()
    })

    it('supports overloaded FormData signature', async () => {
      // Arrange
      vi.mocked(db.agent.findUnique).mockResolvedValue({
        id: 'a1',
        userId: 'u1',
        user: { id: 'u1', avatarUrl: null },
      } as never)
      const fd = form({ id: 'a1' })
      // Act
      const result = await deleteAgentAction(fd as never)
      // Assert
      expect(result.success).toBe(true)
    })

    it('supports two-arg overload', async () => {
      // Arrange
      vi.mocked(db.agent.findUnique).mockResolvedValue({
        id: 'a1',
        userId: 'u1',
        user: { id: 'u1', avatarUrl: null },
      } as never)
      const fd = form({ id: 'a1' })
      // Act
      const result = await deleteAgentAction({} as never, fd)
      // Assert
      expect(result.success).toBe(true)
    })

    it('handles delete failure due to associations', async () => {
      // Arrange
      vi.mocked(db.agent.findUnique).mockResolvedValue({
        id: 'a1',
        userId: 'u1',
        user: { id: 'u1', avatarUrl: null },
      } as never)
      vi.mocked(db.$transaction).mockRejectedValue(new Error('FK'))
      const fd = form({ id: 'a1' })
      // Act
      const result = await deleteAgentAction(fd)
      // Assert
      expect(result.error).toMatch(/no tenga propiedades asociadas/)
    })

    it('handles File value for id', async () => {
      // Arrange
      const fd = new FormData()
      fd.set('id', new File([''], 'x.png'))
      // Act
      const result = await deleteAgentAction(fd)
      // Assert
      expect(result.error).toMatch(/identificador/)
    })
  })
})
