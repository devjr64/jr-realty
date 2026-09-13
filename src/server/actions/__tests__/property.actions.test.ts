import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth-helpers', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    agent: {
      findUnique: vi.fn(),
    },
    property: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    propertyImage: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/utils/uploads', () => ({
  deleteUploadedFiles: vi.fn(),
  deleteUploadedFile: vi.fn(),
}))

import { requireAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import {
  createPropertyAction,
  deletePropertyAction,
  toggleFeaturedAction,
  updatePropertyAction,
} from '@/server/actions/property.actions'
import { revalidatePath } from 'next/cache'
import { deleteUploadedFiles } from '@/lib/utils/uploads'

const mockedRequireAdmin = vi.mocked(requireAdmin)
const mockedRevalidate = vi.mocked(revalidatePath)
const mockedDeleteFiles = vi.mocked(deleteUploadedFiles)

// helper to build FormData from string map
function form(entries: Record<string, string>) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) fd.set(k, v)
  return fd
}

// adds FormData entry as File to test getFormString degradation
function formWithFile(entries: Record<string, string>, fileKey: string, fileName: string) {
  const fd = form(entries)
  fd.set(fileKey, new File(['content'], fileName, { type: 'text/plain' }))
  return fd
}

function basePropertyForm(overrides: Record<string, string> = {}) {
  return {
    title: 'Casa Bella en Las Mercedes',
    description:
      'Hermosa casa con piscina y jardin amplio ubicada en zona exclusiva con seguridad 24/7 y amenidades completas.',
    type: 'HOUSE',
    operation: 'SALE',
    price: '250000',
    currency: 'USD',
    address: 'Las Mercedes, Venezuela',
    zoneId: 'zone-1',
    bedrooms: '3',
    bathrooms: '2',
    features: '["Piscina","Gimnasio"]',
    tags: '["FURNISHED"]',
    images: '[{"url":"https://example.com/img.jpg","alt":"Front","sortOrder":0}]',
    ...overrides,
  }
}

describe('property.actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedRequireAdmin.mockResolvedValue({ id: 'user-super', role: 'SUPER_ADMIN' } as never)
    vi.mocked(db.agent.findUnique).mockResolvedValue({ id: 'agent-1', active: true } as never)
    vi.mocked(db.property.findMany).mockResolvedValue([])
    vi.mocked(db.property.findUnique).mockResolvedValue(null)
    vi.mocked(db.propertyImage.findMany).mockResolvedValue([])
    // default $transaction delegates to a tx object that reuses the same mocks
    vi.mocked(db.$transaction).mockImplementation(async (cb: unknown) => {
      const fn = cb as (tx: unknown) => Promise<unknown>
      const tx = {
        property: {
          create: vi.mocked(db.property.create),
          update: vi.mocked(db.property.update),
          findMany: vi.mocked(db.property.findMany),
        },
        propertyImage: {
          findMany: vi.mocked(db.propertyImage.findMany),
        },
      }
      // ensure inner create/update resolve by default
      vi.mocked(db.property.create).mockResolvedValue({ id: 'new', slug: 'casa-bella' } as never)
      vi.mocked(db.property.update).mockResolvedValue({ id: 'p1' } as never)
      return fn(tx)
    })
  })

  describe('helpers: getFormString / parseJsonField / parseCheckbox / toFieldErrors', () => {
    it('creates with empty JSON fields defaults to [] and succeeds', async () => {
      // Arrange: images/tags/features empty string -> undefined -> defaults []
      const fd = form(basePropertyForm({ images: '', tags: '', features: '', agentId: 'agent-1' }))

      // Act
      const result = await createPropertyAction({}, fd)

      // Assert
      expect(result.success).toBe(true)
    })

    it('returns fieldErrors when images is invalid JSON (parseJsonField -> null)', async () => {
      // Arrange: invalid JSON should be rejected by schema (provide valid base + agentId)
      const fd = form(basePropertyForm({ images: 'not-json', agentId: 'agent-1' }))

      // Act
      const result = await createPropertyAction({}, fd)

      // Assert
      expect(result.fieldErrors).toBeDefined()
    })

    it('parses valid JSON images and passes to createMany', async () => {
      // Arrange
      const fd = form(basePropertyForm({ agentId: 'agent-1' }))

      // Act
      await createPropertyAction({}, fd)

      // Assert
      expect(db.property.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            images: expect.objectContaining({
              createMany: expect.objectContaining({
                data: [{ url: 'https://example.com/img.jpg', alt: 'Front', sortOrder: 0 }],
              }),
            }),
          }),
        }),
      )
    })

    it('degrades File value to empty string via getFormString and returns field error', async () => {
      // Arrange: title as File -> getFormString returns '' -> schema min 5 fails (need valid base + agentId)
      const fd = formWithFile(basePropertyForm({ agentId: 'agent-1' }), 'title', 'file.txt')

      // Act
      const result = await createPropertyAction({}, fd)

      // Assert
      expect(result.fieldErrors?.title).toBeDefined()
    })

    it('parseCheckbox treats "on" as checked (featured true)', async () => {
      // Arrange
      const fd = form({ ...basePropertyForm(), featured: 'on', agentId: 'agent-1' })

      // Act
      await createPropertyAction({}, fd)

      // Assert
      expect(db.property.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ featured: true }),
        }),
      )
    })

    it('parseCheckbox treats "false" as unchecked (featured false)', async () => {
      // Arrange
      const fd = form({ ...basePropertyForm(), featured: 'false', agentId: 'agent-1' })

      // Act
      await createPropertyAction({}, fd)

      // Assert
      expect(db.property.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ featured: false }),
        }),
      )
    })

    it('parseCheckbox treats missing featured as unchecked', async () => {
      // Arrange: omit featured
      const { featured: _omit, ...rest } = basePropertyForm()
      void _omit
      const fd = form({ ...rest, agentId: 'agent-1' })

      // Act
      await createPropertyAction({}, fd)

      // Assert
      expect(db.property.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ featured: false }),
        }),
      )
    })

    it('toFieldErrors maps first issue per field', async () => {
      // Arrange: title too short -> zod error mapping (valid base + agentId)
      const fd = form(basePropertyForm({ title: 'ab', agentId: 'agent-1' }))

      // Act
      const result = await createPropertyAction({}, fd)

      // Assert
      expect(result.fieldErrors?.title).toBeDefined()
    })
  })

  describe('resolveAgentId', () => {
    it('AGENT uses own agent id and ignores form agentId', async () => {
      // Arrange
      mockedRequireAdmin.mockResolvedValue({ id: 'agent-user', role: 'AGENT' } as never)
      vi.mocked(db.agent.findUnique).mockResolvedValue({ id: 'agent-own', active: true } as never)
      const fd = form({ ...basePropertyForm(), agentId: 'agent-other' })

      // Act
      await createPropertyAction({}, fd)

      // Assert
      expect(db.agent.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'agent-user' } }),
      )
    })

    it('AGENT returns error when no active agent row', async () => {
      // Arrange
      mockedRequireAdmin.mockResolvedValue({ id: 'agent-user', role: 'AGENT' } as never)
      vi.mocked(db.agent.findUnique).mockResolvedValue(null)
      const fd = form(basePropertyForm())

      // Act
      const result = await createPropertyAction({}, fd)

      // Assert
      expect(result.error).toMatch(/agente responsable/)
    })

    it('AGENT returns error when agent inactive', async () => {
      // Arrange
      mockedRequireAdmin.mockResolvedValue({ id: 'agent-user', role: 'AGENT' } as never)
      vi.mocked(db.agent.findUnique).mockResolvedValue({ id: 'agent-1', active: false } as never)
      const fd = form(basePropertyForm())

      // Act
      const result = await createPropertyAction({}, fd)

      // Assert
      expect(result.error).toMatch(/agente responsable/)
    })

    it('SUPER_ADMIN uses form agentId', async () => {
      // Arrange
      const fd = form({ ...basePropertyForm(), agentId: 'agent-1' })

      // Act
      await createPropertyAction({}, fd)

      // Assert
      expect(db.property.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ agentId: 'agent-1' }) }),
      )
    })

    it('SUPER_ADMIN returns error when agentId missing', async () => {
      // Arrange
      const fd = form(basePropertyForm())

      // Act
      const result = await createPropertyAction({}, fd)

      // Assert
      expect(result.error).toMatch(/agente responsable/)
    })

    it('SUPER_ADMIN trims agentId blank to null -> error', async () => {
      // Arrange
      const fd = form({ ...basePropertyForm(), agentId: '   ' })

      // Act
      const result = await createPropertyAction({}, fd)

      // Assert
      expect(result.error).toMatch(/agente responsable/)
    })
  })

  describe('generateUniqueSlug', () => {
    it('generates base slug when no collision', async () => {
      // Arrange
      vi.mocked(db.property.findMany).mockResolvedValue([])
      const fd = form({ ...basePropertyForm(), agentId: 'agent-1' })

      // Act
      await createPropertyAction({}, fd)

      // Assert
      expect(db.property.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ slug: 'casa-bella-en-las-mercedes' }) }),
      )
    })

    it('appends suffix when base slug collides', async () => {
      // Arrange
      vi.mocked(db.property.findMany).mockResolvedValue([
        { slug: 'casa-bella-en-las-mercedes' },
        { slug: 'casa-bella-en-las-mercedes-2' },
      ] as never)
      const fd = form({ ...basePropertyForm(), agentId: 'agent-1' })

      // Act
      await createPropertyAction({}, fd)

      // Assert
      expect(db.property.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ slug: 'casa-bella-en-las-mercedes-3' }) }),
      )
    })

    it('returns error when title produces no valid slug', async () => {
      // Arrange: title '!!!!!' slugify -> '' -> null (must be >=5 chars to pass schema)
      const fd = form({ ...basePropertyForm(), title: '!!!!!', agentId: 'agent-1' })

      // Act
      const result = await createPropertyAction({}, fd)

      // Assert
      expect(result.error).toMatch(/identificador/)
    })
  })

  describe('createPropertyAction happy path', () => {
    it('creates with Decimal price and images/tags createMany', async () => {
      // Arrange
      const fd = form({ ...basePropertyForm(), agentId: 'agent-1', price: '123456.50' })

      // Act
      const result = await createPropertyAction({}, fd)

      // Assert
      expect(result.success).toBe(true)
    })

    it('stores tags via createMany mapping', async () => {
      // Arrange
      const fd = form({ ...basePropertyForm(), agentId: 'agent-1', tags: '["FURNISHED","PREMIUM"]' })

      // Act
      await createPropertyAction({}, fd)

      // Assert
      expect(db.property.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tags: { createMany: { data: [{ tag: 'FURNISHED' }, { tag: 'PREMIUM' }] } },
          }),
        }),
      )
    })

    it('calls revalidatePath after create', async () => {
      // Arrange
      const fd = form({ ...basePropertyForm(), agentId: 'agent-1' })

      // Act
      await createPropertyAction({}, fd)

      // Assert
      expect(mockedRevalidate).toHaveBeenCalledWith('/admin/propiedades')
    })

    it('calls revalidate for catalog page after create', async () => {
      // Arrange
      const fd = form({ ...basePropertyForm(), agentId: 'agent-1' })

      // Act
      await createPropertyAction({}, fd)

      // Assert
      expect(mockedRevalidate).toHaveBeenCalledWith('/propiedades', 'page')
    })

    it('returns error when transaction throws', async () => {
      // Arrange
      vi.mocked(db.$transaction).mockRejectedValue(new Error('db fail'))
      const fd = form({ ...basePropertyForm(), agentId: 'agent-1' })

      // Act
      const result = await createPropertyAction({}, fd)

      // Assert
      expect(result.error).toMatch(/No se pudo crear/)
    })

    it('requires admin (redirect throws)', async () => {
      // Arrange
      mockedRequireAdmin.mockRejectedValue(new Error('NEXT_REDIRECT'))

      // Act
      await expect(createPropertyAction({}, form(basePropertyForm()))).rejects.toThrow()
    })
  })

  describe('updatePropertyAction', () => {
    it('returns error when id missing', async () => {
      // Arrange
      const fd = form(basePropertyForm())

      // Act
      const result = await updatePropertyAction({}, fd)

      // Assert
      expect(result.error).toMatch(/identificador/)
    })

    it('returns error when property not found', async () => {
      // Arrange
      vi.mocked(db.property.findUnique).mockResolvedValue(null)
      const fd = form({ ...basePropertyForm(), id: 'missing', agentId: 'agent-1' })

      // Act
      const result = await updatePropertyAction({}, fd)

      // Assert
      expect(result.error).toMatch(/no existe/)
    })

    it('AGENT cannot update other agent property', async () => {
      // Arrange
      mockedRequireAdmin.mockResolvedValue({ id: 'agent-user', role: 'AGENT' } as never)
      vi.mocked(db.agent.findUnique).mockResolvedValue({ id: 'agent-own', active: true } as never)
      vi.mocked(db.property.findUnique).mockResolvedValue({ agentId: 'agent-other', slug: 'casa' } as never)
      const fd = form({ ...basePropertyForm(), id: 'p1' })

      // Act
      const result = await updatePropertyAction({}, fd)

      // Assert
      expect(result.error).toMatch(/permisos/)
    })

    it('AGENT can update own property', async () => {
      // Arrange
      mockedRequireAdmin.mockResolvedValue({ id: 'agent-user', role: 'AGENT' } as never)
      vi.mocked(db.agent.findUnique).mockResolvedValue({ id: 'agent-own', active: true } as never)
      vi.mocked(db.property.findUnique).mockResolvedValue({ agentId: 'agent-own', slug: 'casa-bella' } as never)
      const fd = form({ ...basePropertyForm(), id: 'p1' })

      // Act
      const result = await updatePropertyAction({}, fd)

      // Assert
      expect(result.success).toBe(true)
    })

    it('revalidates with slug after update', async () => {
      // Arrange
      vi.mocked(db.property.findUnique).mockResolvedValue({ agentId: 'agent-1', slug: 'casa-bella' } as never)
      const fd = form({ ...basePropertyForm(), id: 'p1', agentId: 'agent-1' })

      // Act
      await updatePropertyAction({}, fd)

      // Assert
      expect(mockedRevalidate).toHaveBeenCalledWith('/propiedades/casa-bella', 'page')
    })

    it('replaces images and tags with deleteMany + createMany', async () => {
      // Arrange
      vi.mocked(db.property.findUnique).mockResolvedValue({ agentId: 'agent-1', slug: 'casa' } as never)
      const fd = form({ ...basePropertyForm(), id: 'p1', agentId: 'agent-1' })

      // Act
      await updatePropertyAction({}, fd)

      // Assert
      expect(db.property.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            images: expect.objectContaining({ deleteMany: {}, createMany: expect.any(Object) }),
          }),
        }),
      )
    })

    it('deletes orphaned uploaded files after update', async () => {
      // Arrange
      vi.mocked(db.property.findUnique).mockResolvedValue({ agentId: 'agent-1', slug: 'casa' } as never)
      vi.mocked(db.propertyImage.findMany).mockResolvedValue([{ url: '/uploads/old.jpg' }] as never)
      const fd = form({ ...basePropertyForm(), id: 'p1', agentId: 'agent-1' })

      // Act
      await updatePropertyAction({}, fd)

      // Assert
      expect(mockedDeleteFiles).toHaveBeenCalled()
    })

    it('returns fieldErrors on validation failure during update', async () => {
      // Arrange
      vi.mocked(db.property.findUnique).mockResolvedValue({ agentId: 'agent-1', slug: 'casa' } as never)
      const fd = form({ ...basePropertyForm(), id: 'p1', agentId: 'agent-1', price: '-5' })

      // Act
      const result = await updatePropertyAction({}, fd)

      // Assert
      expect(result.fieldErrors).toBeDefined()
    })

    it('returns error when transaction fails on update', async () => {
      // Arrange
      vi.mocked(db.property.findUnique).mockResolvedValue({ agentId: 'agent-1', slug: 'casa' } as never)
      vi.mocked(db.$transaction).mockRejectedValue(new Error('fail'))
      const fd = form({ ...basePropertyForm(), id: 'p1', agentId: 'agent-1' })

      // Act
      const result = await updatePropertyAction({}, fd)

      // Assert
      expect(result.error).toMatch(/No se pudo actualizar/)
    })
  })

  describe('deletePropertyAction', () => {
    it('returns error when id missing', async () => {
      // Arrange
      const fd = form({ agentId: 'agent-1' })

      // Act
      const result = await deletePropertyAction({}, fd)

      // Assert
      expect(result.error).toMatch(/identificador/)
    })

    it('returns error when fd missing (no args)', async () => {
      // Arrange: prevState not FormData and no second arg
      const state = { error: 'x' }

      // Act
      const result = await deletePropertyAction(state as never, undefined)

      // Assert
      expect(result.error).toMatch(/Falta la informaci/)
    })

    it('returns error when property not found', async () => {
      // Arrange
      vi.mocked(db.property.findUnique).mockResolvedValue(null)
      const fd = form({ id: 'missing', agentId: 'agent-1' })

      // Act
      const result = await deletePropertyAction({}, fd)

      // Assert
      expect(result.error).toMatch(/no existe/)
    })

    it('AGENT cannot delete other agent property', async () => {
      // Arrange
      mockedRequireAdmin.mockResolvedValue({ id: 'agent-user', role: 'AGENT' } as never)
      vi.mocked(db.agent.findUnique).mockResolvedValue({ id: 'agent-own', active: true } as never)
      vi.mocked(db.property.findUnique).mockResolvedValue({ agentId: 'agent-other' } as never)
      const fd = form({ id: 'p1' })

      // Act
      const result = await deletePropertyAction({}, fd)

      // Assert
      expect(result.error).toMatch(/permisos/)
    })

    it('deletes own property and revalidates', async () => {
      // Arrange
      mockedRequireAdmin.mockResolvedValue({ id: 'agent-user', role: 'AGENT' } as never)
      vi.mocked(db.agent.findUnique).mockResolvedValue({ id: 'agent-own', active: true } as never)
      vi.mocked(db.property.findUnique).mockResolvedValue({ agentId: 'agent-own' } as never)
      vi.mocked(db.propertyImage.findMany).mockResolvedValue([{ url: '/uploads/a.jpg' }] as never)
      vi.mocked(db.property.delete).mockResolvedValue({} as never)
      const fd = form({ id: 'p1' })

      // Act
      const result = await deletePropertyAction({}, fd)

      // Assert
      expect(result.success).toBe(true)
    })

    it('supports overloaded FormData signature (prevState instanceof FormData)', async () => {
      // Arrange
      vi.mocked(db.property.findUnique).mockResolvedValue({ agentId: 'agent-1' } as never)
      vi.mocked(db.property.delete).mockResolvedValue({} as never)
      const fd = form({ id: 'p1', agentId: 'agent-1' })

      // Act
      const result = await deletePropertyAction(fd as never)

      // Assert
      expect(result.success).toBe(true)
    })

    it('calls revalidatePath after delete', async () => {
      // Arrange
      vi.mocked(db.property.findUnique).mockResolvedValue({ agentId: 'agent-1' } as never)
      vi.mocked(db.property.delete).mockResolvedValue({} as never)
      const fd = form({ id: 'p1', agentId: 'agent-1' })

      // Act
      await deletePropertyAction({}, fd)

      // Assert
      expect(mockedRevalidate).toHaveBeenCalledWith('/admin/propiedades')
    })

    it('deletes uploaded files for property images', async () => {
      // Arrange
      vi.mocked(db.property.findUnique).mockResolvedValue({ agentId: 'agent-1' } as never)
      vi.mocked(db.propertyImage.findMany).mockResolvedValue([
        { url: '/uploads/a.jpg' },
        { url: 'https://example.com/external.jpg' },
      ] as never)
      vi.mocked(db.property.delete).mockResolvedValue({} as never)
      const fd = form({ id: 'p1', agentId: 'agent-1' })

      // Act
      await deletePropertyAction({}, fd)

      // Assert
      expect(mockedDeleteFiles).toHaveBeenCalled()
    })

    it('returns error when delete throws', async () => {
      // Arrange
      vi.mocked(db.property.findUnique).mockResolvedValue({ agentId: 'agent-1' } as never)
      vi.mocked(db.property.delete).mockRejectedValue(new Error('fail'))
      const fd = form({ id: 'p1', agentId: 'agent-1' })

      // Act
      const result = await deletePropertyAction({}, fd)

      // Assert
      expect(result.error).toMatch(/No se pudo eliminar/)
    })
  })

  describe('toggleFeaturedAction', () => {
    it('returns error when id missing', async () => {
      // Arrange
      const fd = form({ agentId: 'agent-1' })

      // Act
      const result = await toggleFeaturedAction({}, fd)

      // Assert
      expect(result.error).toMatch(/identificador/)
    })

    it('returns error when property not found', async () => {
      // Arrange
      vi.mocked(db.property.findUnique).mockResolvedValue(null)
      const fd = form({ id: 'missing', agentId: 'agent-1' })

      // Act
      const result = await toggleFeaturedAction({}, fd)

      // Assert
      expect(result.error).toMatch(/no existe/)
    })

    it('AGENT cannot toggle other agent property', async () => {
      // Arrange
      mockedRequireAdmin.mockResolvedValue({ id: 'agent-user', role: 'AGENT' } as never)
      vi.mocked(db.agent.findUnique).mockResolvedValue({ id: 'agent-own', active: true } as never)
      vi.mocked(db.property.findUnique).mockResolvedValue({
        agentId: 'agent-other',
        slug: 'casa',
        featured: false,
      } as never)
      const fd = form({ id: 'p1' })

      // Act
      const result = await toggleFeaturedAction({}, fd)

      // Assert
      expect(result.error).toMatch(/permisos/)
    })

    it('toggles featured true to false', async () => {
      // Arrange
      vi.mocked(db.property.findUnique).mockResolvedValue({
        agentId: 'agent-1',
        slug: 'casa',
        featured: true,
      } as never)
      vi.mocked(db.property.update).mockResolvedValue({} as never)
      const fd = form({ id: 'p1', agentId: 'agent-1' })

      // Act
      const result = await toggleFeaturedAction({}, fd)

      // Assert
      expect(result.success).toBe(true)
    })

    it('calls update with inverted featured value', async () => {
      // Arrange
      vi.mocked(db.property.findUnique).mockResolvedValue({
        agentId: 'agent-1',
        slug: 'casa',
        featured: false,
      } as never)
      const fd = form({ id: 'p1', agentId: 'agent-1' })

      // Act
      await toggleFeaturedAction({}, fd)

      // Assert
      expect(db.property.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { featured: true } }),
      )
    })

    it('revalidates with slug after toggle', async () => {
      // Arrange
      vi.mocked(db.property.findUnique).mockResolvedValue({
        agentId: 'agent-1',
        slug: 'casa-bella',
        featured: false,
      } as never)
      const fd = form({ id: 'p1', agentId: 'agent-1' })

      // Act
      await toggleFeaturedAction({}, fd)

      // Assert
      expect(mockedRevalidate).toHaveBeenCalledWith('/propiedades/casa-bella', 'page')
    })

    it('returns error when toggle transaction fails', async () => {
      // Arrange
      vi.mocked(db.property.findUnique).mockResolvedValue({
        agentId: 'agent-1',
        slug: 'casa',
        featured: false,
      } as never)
      vi.mocked(db.property.update).mockRejectedValue(new Error('fail'))
      const fd = form({ id: 'p1', agentId: 'agent-1' })

      // Act
      const result = await toggleFeaturedAction({}, fd)

      // Assert
      expect(result.error).toMatch(/No se pudo actualizar/)
    })

    it('returns error when AGENT has no active agent row', async () => {
      // Arrange
      mockedRequireAdmin.mockResolvedValue({ id: 'agent-user', role: 'AGENT' } as never)
      vi.mocked(db.agent.findUnique).mockResolvedValue(null)
      const fd = form({ id: 'p1' })

      // Act
      const result = await toggleFeaturedAction({}, fd)

      // Assert
      expect(result.error).toMatch(/agente responsable/)
    })
  })
})
