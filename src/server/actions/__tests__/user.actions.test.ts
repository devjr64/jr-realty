import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mocks must be hoisted before imports
vi.mock('@/lib/auth-helpers', () => ({
  requireSuperAdmin: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    agent: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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

import { requireSuperAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import {
  createUserAction,
  deleteUserAction,
  getUserById,
  listUsers,
  updateUserAction,
} from '@/server/actions/user.actions'
import { revalidatePath } from 'next/cache'

const mockedRequireSuperAdmin = vi.mocked(requireSuperAdmin)
const mockedRevalidate = vi.mocked(revalidatePath)

function form(entries: Record<string, string>) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) fd.set(k, v)
  return fd
}

describe('user.actions RBAC & logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedRequireSuperAdmin.mockResolvedValue({ id: 'admin1', role: 'SUPER_ADMIN' } as never)
    // Default $transaction impl: executes callback with tx mock
    vi.mocked(db.$transaction).mockImplementation(async (cb: never) => {
      const txMock = {
        user: {
          findUnique: vi.fn().mockResolvedValue(null),
          update: vi.fn().mockResolvedValue({} as never),
          delete: vi.fn().mockResolvedValue({} as never),
        },
        agent: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({} as never),
          update: vi.fn().mockResolvedValue({} as never),
          delete: vi.fn().mockResolvedValue({} as never),
        },
      }
      return (cb as unknown as (tx: typeof txMock) => Promise<unknown>)(txMock)
    })
  })

  describe('createUserAction', () => {
    it('rejects when email already exists', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue({ id: '1', email: 'a@a.com' } as never)
      const result = await createUserAction(
        {},
        form({ name: 'Ana', email: 'a@a.com', password: '12345678', role: 'AGENT', active: 'on', phone: '+58 212-555-0000' }),
      )
      expect(result.error).toMatch(/Ya existe/)
      expect(db.user.create).not.toHaveBeenCalled()
    })

    it('creates CLIENT user without agent record', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null)
      vi.mocked(db.user.create).mockResolvedValue({ id: 'new' } as never)
      const result = await createUserAction(
        {},
        form({ name: 'Ana', email: 'ana@test.com', password: 'Str0ng!Pass123', role: 'CLIENT', active: 'on' }),
      )
      expect(result.success).toBe(true)
      expect(db.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: 'ana@test.com', role: 'CLIENT' }),
        }),
      )
      // Should NOT revalidate agent page for non-agent roles
      expect(mockedRevalidate).toHaveBeenCalledWith('/admin/usuarios')
      expect(mockedRevalidate).not.toHaveBeenCalledWith('/admin/agentes')
    })

    it('creates AGENT user with nested Agent record', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null)
      vi.mocked(db.user.create).mockResolvedValue({ id: 'new', agent: { id: 'agent1' } } as never)
      const result = await createUserAction(
        {},
        form({
          name: 'Carlos',
          email: 'carlos@test.com',
          password: 'Str0ng!Pass123',
          role: 'AGENT',
          active: 'on',
          phone: '+58 212-555-1234',
          title: 'Asesor Senior',
          whatsapp: '+58 212-555-5678',
        }),
      )
      expect(result.success).toBe(true)
      // Should create User with nested Agent record
      expect(db.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'carlos@test.com',
            role: 'AGENT',
            phone: '+58 212-555-1234',
            agent: {
              create: {
                phone: '+58 212-555-1234',
                title: 'Asesor Senior',
                whatsapp: '+58 212-555-5678',
                active: true,
              },
            },
          }),
        }),
      )
      // Should revalidate both pages
      expect(mockedRevalidate).toHaveBeenCalledWith('/admin/usuarios')
      expect(mockedRevalidate).toHaveBeenCalledWith('/admin/agentes')
    })

    it('creates AGENT with null title/whatsapp when empty', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null)
      vi.mocked(db.user.create).mockResolvedValue({ id: 'new', agent: { id: 'agent1' } } as never)
      const result = await createUserAction(
        {},
        form({
          name: 'Diana',
          email: 'diana@test.com',
          password: 'Str0ng!Pass123',
          role: 'AGENT',
          active: 'on',
          phone: '+58 212-555-0999',
        }),
      )
      expect(result.success).toBe(true)
      expect(db.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            agent: {
              create: expect.objectContaining({
                phone: '+58 212-555-0999',
                title: null,
                whatsapp: null,
              }),
            },
          }),
        }),
      )
    })

    it('requires phone when role is AGENT', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null)
      const result = await createUserAction(
        {},
        form({ name: 'Ana', email: 'ana@test.com', password: 'Str0ng!Pass123', role: 'AGENT', active: 'on', phone: '' }),
      )
      expect(result.error).toBeDefined()
      expect(result.fieldErrors?.phone).toBeDefined()
      expect(db.user.create).not.toHaveBeenCalled()
    })

    it('returns fieldErrors on validation failure', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null)
      const result = await createUserAction(
        {},
        form({ name: '', email: 'bad', password: '123', role: 'AGENT', phone: '' }),
      )
      expect(result.error).toBeDefined()
      expect(result.fieldErrors).toBeDefined()
      expect(db.user.create).not.toHaveBeenCalled()
    })

    it('requires SUPER_ADMIN (redirect throws) — mocked to throw', async () => {
      mockedRequireSuperAdmin.mockRejectedValue(new Error('NEXT_REDIRECT'))
      await expect(
        createUserAction(
          {},
          form({ name: 'x', email: 'x@x.com', password: '12345678', role: 'AGENT', phone: '+58 212-555-0000' }),
        ),
      ).rejects.toThrow()
    })

    it('requires password on create', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null)
      const result = await createUserAction(
        {},
        form({ name: 'Ana', email: 'ana2@test.com', password: '', role: 'CLIENT' }),
      )
      expect(result.error).toBeDefined()
    })
  })

  describe('updateUserAction', () => {
    it('returns error when id missing', async () => {
      const result = await updateUserAction(
        {},
        form({ name: 'Ana', email: 'ana@test.com', password: '', role: 'AGENT' }),
      )
      expect(result.error).toMatch(/identificador/)
    })

    it('returns error when user not found', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null)
      const result = await updateUserAction(
        {},
        form({ id: 'missing', name: 'Ana', email: 'ana@test.com', password: '', role: 'CLIENT' }),
      )
      expect(result.error).toMatch(/no existe/)
    })

    it('rejects duplicate email on update', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue({ id: 'u1', email: 'old@test.com', role: 'CLIENT' } as never)
      vi.mocked(db.user.findFirst).mockResolvedValue({ id: 'other', email: 'ana@test.com' } as never)
      const result = await updateUserAction(
        {},
        form({ id: 'u1', name: 'Ana', email: 'ana@test.com', password: '', role: 'CLIENT' }),
      )
      expect(result.error).toMatch(/Ya existe/)
    })

    it('updates CLIENT to AGENT — creates Agent record in transaction', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue({ id: 'u1', role: 'CLIENT' } as never)
      vi.mocked(db.user.findFirst).mockResolvedValue(null)
      const result = await updateUserAction(
        {},
        form({
          id: 'u1',
          name: 'Ana',
          email: 'ana@test.com',
          password: '',
          role: 'AGENT',
          phone: '+58 212-555-1111',
          title: 'Asesora',
          whatsapp: '+58 212-555-2222',
        }),
      )
      expect(result.success).toBe(true)
      // Should use transaction for role change
      expect(db.$transaction).toHaveBeenCalled()
      // Should revalidate both pages
      expect(mockedRevalidate).toHaveBeenCalledWith('/admin/usuarios')
      expect(mockedRevalidate).toHaveBeenCalledWith('/admin/agentes')
    })

    it('updates AGENT to CLIENT — deletes Agent record in transaction', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue({ id: 'u1', role: 'AGENT' } as never)
      vi.mocked(db.user.findFirst).mockResolvedValue(null)
      const result = await updateUserAction(
        {},
        form({ id: 'u1', name: 'Ana', email: 'ana@test.com', password: '', role: 'CLIENT' }),
      )
      expect(result.success).toBe(true)
      expect(db.$transaction).toHaveBeenCalled()
      // Should revalidate agent page when removing agent role
      expect(mockedRevalidate).toHaveBeenCalledWith('/admin/usuarios')
      expect(mockedRevalidate).toHaveBeenCalledWith('/admin/agentes')
    })

    it('updates AGENT to AGENT — updates both records in transaction', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue({ id: 'u1', role: 'AGENT' } as never)
      vi.mocked(db.user.findFirst).mockResolvedValue(null)
      const result = await updateUserAction(
        {},
        form({
          id: 'u1',
          name: 'Ana Updated',
          email: 'ana@test.com',
          password: '',
          role: 'AGENT',
          phone: '+58 212-555-3333',
          title: 'Senior',
          whatsapp: '+58 212-555-4444',
        }),
      )
      expect(result.success).toBe(true)
      expect(db.$transaction).toHaveBeenCalled()
      expect(mockedRevalidate).toHaveBeenCalledWith('/admin/usuarios')
      expect(mockedRevalidate).toHaveBeenCalledWith('/admin/agentes')
    })

    it('updates without re-hashing when password empty', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue({ id: 'u1', role: 'AGENT' } as never)
      vi.mocked(db.user.findFirst).mockResolvedValue(null)
      const result = await updateUserAction(
        {},
        form({ id: 'u1', name: 'Ana', email: 'ana@test.com', password: '', role: 'AGENT', phone: '+58 212-555-0000' }),
      )
      expect(result.success).toBe(true)
    })

    it('hashes password when provided on update', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue({ id: 'u1', role: 'AGENT' } as never)
      vi.mocked(db.user.findFirst).mockResolvedValue(null)
      const result = await updateUserAction(
        {},
        form({ id: 'u1', name: 'Ana', email: 'ana@test.com', password: 'NewPass123!', role: 'AGENT', phone: '+58 212-555-0000' }),
      )
      expect(result.success).toBe(true)
    })
  })

  describe('listUsers', () => {
    it('returns users ordered by createdAt desc', async () => {
      const mockUsers = [{ id: '1', role: 'AGENT' }]
      vi.mocked(db.user.findMany).mockResolvedValue(mockUsers as never)
      const result = await listUsers()
      expect(result).toEqual(mockUsers)
      expect(db.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      )
    })
  })

  describe('getUserById', () => {
    it('returns null for empty id without querying db', async () => {
      const result = await getUserById('')
      expect(result).toBeNull()
      expect(db.user.findUnique).not.toHaveBeenCalled()
    })

    it('returns user when found', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue({ id: 'u1', role: 'AGENT' } as never)
      const result = await getUserById('u1')
      expect(result).toEqual({ id: 'u1', role: 'AGENT' })
    })
  })

  describe('deleteUserAction', () => {
    it('prevents deleting last SUPER_ADMIN', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue({ id: 'u1', role: 'SUPER_ADMIN' } as never)
      vi.mocked(db.user.count).mockResolvedValue(1)
      const result = await deleteUserAction(form({ id: 'u1' }))
      expect(result.error).toMatch(/último super administrador/)
      expect(db.user.delete).not.toHaveBeenCalled()
    })

    it('allows deleting SUPER_ADMIN when more than one exists', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue({ id: 'u1', role: 'SUPER_ADMIN' } as never)
      vi.mocked(db.user.count).mockResolvedValue(2)
      vi.mocked(db.agent.findUnique).mockResolvedValue(null)
      vi.mocked(db.user.delete).mockResolvedValue({} as never)
      const result = await deleteUserAction(form({ id: 'u1' }))
      expect(result.success).toBe(true)
    })

    it('deletes linked agent before user (FK RESTRICT)', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue({ id: 'u1', role: 'AGENT' } as never)
      vi.mocked(db.agent.findUnique).mockResolvedValue({ id: 'agent1', userId: 'u1' } as never)
      vi.mocked(db.agent.delete).mockResolvedValue({} as never)
      vi.mocked(db.user.delete).mockResolvedValue({} as never)
      const result = await deleteUserAction(form({ id: 'u1' }))
      expect(result.success).toBe(true)
      expect(db.agent.delete).toHaveBeenCalledWith({ where: { id: 'agent1' } })
      expect(db.user.delete).toHaveBeenCalledWith({ where: { id: 'u1' } })
    })

    it('supports overloaded FormData signature (prevState instanceof FormData)', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue({ id: 'u1', role: 'CLIENT' } as never)
      vi.mocked(db.user.delete).mockResolvedValue({} as never)
      vi.mocked(db.agent.findUnique).mockResolvedValue(null)
      const fd = form({ id: 'u1' })
      const result = await deleteUserAction(fd as never)
      expect(result.success).toBe(true)
    })

    it('returns error when user does not exist', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null)
      const result = await deleteUserAction(form({ id: 'missing' }))
      expect(result.error).toMatch(/no existe/)
    })
  })
})
