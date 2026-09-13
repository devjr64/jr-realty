import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth-helpers', () => ({
  requireSuperAdmin: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    page: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { requireSuperAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { createPageAction, deletePageAction, updatePageAction } from '@/server/actions/page.actions'
import { revalidatePath } from 'next/cache'

const mockedRequireSuperAdmin = vi.mocked(requireSuperAdmin)
const mockedRevalidate = vi.mocked(revalidatePath)

function form(entries: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) fd.set(k, v)
  return fd
}

function validBase(overrides: Record<string, string> = {}): FormData {
  return form({
    title: 'Sobre Nosotros',
    slug: '',
    metaTitle: 'Meta Title',
    metaDescription: 'Meta description here',
    content: JSON.stringify([{ type: 'hero', text: 'hola' }]),
    ...overrides,
  })
}

describe('page.actions mocked unit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedRequireSuperAdmin.mockResolvedValue({ id: 'admin1', role: 'AGENT' } as never)
    vi.mocked(db.page.findMany).mockResolvedValue([] as never)
    vi.mocked(db.page.create).mockResolvedValue({ id: 'new' } as never)
    vi.mocked(db.page.update).mockResolvedValue({} as never)
    vi.mocked(db.page.delete).mockResolvedValue({} as never)
  })

  describe('createPageAction', () => {
    it('creates page with JSON content and generates unique slug', async () => {
      // Arrange
      vi.mocked(db.page.findMany).mockResolvedValue([] as never)

      // Act
      const result = await createPageAction({}, validBase())

      // Assert
      expect(result.success).toBe(true)
      expect(db.page.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'sobre-nosotros',
            content: [{ type: 'hero', text: 'hola' }],
            title: 'Sobre Nosotros',
          }),
        }),
      )
      expect(mockedRevalidate).toHaveBeenCalledWith('/admin/cms')
      expect(mockedRevalidate).toHaveBeenCalledWith('/[slug]', 'page')
    })

    it('handles empty content defaults to []', async () => {
      // Arrange: no content field
      const fd = form({ title: 'Pagina Test', content: '' })
      vi.mocked(db.page.findMany).mockResolvedValue([] as never)

      // Act
      const result = await createPageAction({}, fd)

      // Assert
      expect(result.success).toBe(true)
      expect(db.page.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ content: [] }) }),
      )
    })

    it('handles invalid JSON content defaults to []', async () => {
      // Arrange: invalid JSON
      const fd = validBase({ content: 'not json' })
      vi.mocked(db.page.findMany).mockResolvedValue([] as never)

      // Act
      const result = await createPageAction({}, fd)

      // Assert
      expect(result.success).toBe(true)
      expect(db.page.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ content: [] }) }))
    })

    it('handles non-array JSON content defaults to []', async () => {
      // Arrange: JSON object not array
      const fd = validBase({ content: JSON.stringify({ type: 'block' }) })
      vi.mocked(db.page.findMany).mockResolvedValue([] as never)

      // Act
      const result = await createPageAction({}, fd)

      // Assert
      expect(result.success).toBe(true)
      expect(db.page.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ content: [] }) }))
    })

    it('handles published flag on', async () => {
      // Arrange
      const fd = validBase()
      fd.set('published', 'on')
      vi.mocked(db.page.findMany).mockResolvedValue([] as never)

      // Act
      const result = await createPageAction({}, fd)

      // Assert
      expect(result.success).toBe(true)
      expect(db.page.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ published: true }) }),
      )
    })

    it('handles slug collision', async () => {
      // Arrange
      vi.mocked(db.page.findMany).mockResolvedValue([{ slug: 'sobre-nosotros' }] as never)

      // Act
      const result = await createPageAction({}, validBase())

      // Assert
      expect(result.success).toBe(true)
      expect(db.page.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ slug: 'sobre-nosotros-2' }) }),
      )
    })

    it('falls back to pagina when slugify empty', async () => {
      // Arrange: title with symbols only
      vi.mocked(db.page.findMany).mockResolvedValue([{ slug: 'pagina' }] as never)

      // Act
      const result = await createPageAction({}, validBase({ title: '!!!', content: '[]' }))

      // Assert
      expect(result.success).toBe(true)
      expect(db.page.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ slug: 'pagina-2' }) }),
      )
    })

    it('returns fieldErrors on validation failure', async () => {
      // Arrange: title too short
      const fd = validBase({ title: 'a' })

      // Act
      const result = await createPageAction({}, fd)

      // Assert
      expect(result.error).toBeDefined()
      expect(result.fieldErrors).toBeDefined()
      expect(db.page.create).not.toHaveBeenCalled()
    })

    it('returns error when db create throws', async () => {
      // Arrange
      vi.mocked(db.page.findMany).mockResolvedValue([] as never)
      vi.mocked(db.page.create).mockRejectedValue(new Error('db fail'))

      // Act
      const result = await createPageAction({}, validBase())

      // Assert
      expect(result.error).toMatch(/No se pudo crear/)
    })

    it('propagates requireAdmin throw', async () => {
      // Arrange
      mockedRequireSuperAdmin.mockRejectedValue(new Error('NEXT_REDIRECT'))

      // Act & Assert
      await expect(createPageAction({}, validBase())).rejects.toThrow('NEXT_REDIRECT')
    })

    it('handles too many blocks validation error', async () => {
      // Arrange: 31 blocks > max 30
      const many = JSON.stringify(Array.from({ length: 31 }, (_, i) => ({ type: 'b', i })))
      const fd = validBase({ content: many })

      // Act
      const result = await createPageAction({}, fd)

      // Assert
      expect(result.error).toBeDefined()
      expect(result.fieldErrors?.content).toBeDefined()
    })
  })

  describe('updatePageAction', () => {
    it('returns error when id missing', async () => {
      // Act
      const result = await updatePageAction({}, validBase())

      // Assert
      expect(result.error).toMatch(/identificador/)
    })

    it('returns error when id empty trimmed', async () => {
      // Arrange
      const fd = validBase()
      fd.set('id', '   ')

      // Act
      const result = await updatePageAction({}, fd)

      // Assert
      expect(result.error).toMatch(/identificador/)
    })

    it('returns fieldErrors on validation failure', async () => {
      // Arrange
      const fd = validBase({ title: '' })
      fd.set('id', 'id1')

      // Act
      const result = await updatePageAction({}, fd)

      // Assert
      expect(result.error).toBeDefined()
      expect(result.fieldErrors).toBeDefined()
    })

    it('updates page successfully and revalidates', async () => {
      // Arrange
      const fd = validBase()
      fd.set('id', 'id1')

      // Act
      const result = await updatePageAction({}, fd)

      // Assert
      expect(result.success).toBe(true)
      expect(db.page.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'id1' },
          data: expect.objectContaining({ title: 'Sobre Nosotros' }),
        }),
      )
      expect(mockedRevalidate).toHaveBeenCalledWith('/admin/cms')
    })

    it('updates with empty content defaults to []', async () => {
      // Arrange
      const fd = form({ title: 'Pagina Test', content: '' })
      fd.set('id', 'id1')
      // need valid title min 2

      // Act
      const result = await updatePageAction({}, fd)

      // Assert
      expect(result.success).toBe(true)
      expect(db.page.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ content: [] }) }),
      )
    })

    it('returns error when db update throws', async () => {
      // Arrange
      vi.mocked(db.page.update).mockRejectedValue(new Error('db fail'))
      const fd = validBase()
      fd.set('id', 'id1')

      // Act
      const result = await updatePageAction({}, fd)

      // Assert
      expect(result.error).toMatch(/No se pudo actualizar/)
    })

    it('ignores slug field from form (uses title-generated slug only on create)', async () => {
      // Arrange: send slug field, should be ignored (destructured as _)
      const fd = validBase({ slug: 'custom-slug' })
      fd.set('id', 'id1')

      // Act
      const result = await updatePageAction({}, fd)

      // Assert
      expect(result.success).toBe(true)
      expect(db.page.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.not.objectContaining({ slug: 'custom-slug' }) }),
      )
    })
  })

  describe('deletePageAction', () => {
    it('returns error when fd missing', async () => {
      // Act
      const result = await deletePageAction({}, undefined)

      // Assert
      expect(result.error).toMatch(/Falta la información/)
    })

    it('returns error when id missing', async () => {
      // Act
      const result = await deletePageAction({}, form({}))

      // Assert
      expect(result.error).toMatch(/identificador/)
    })

    it('deletes successfully', async () => {
      // Act
      const result = await deletePageAction({}, form({ id: 'id1' }))

      // Assert
      expect(result.success).toBe(true)
      expect(db.page.delete).toHaveBeenCalledWith({ where: { id: 'id1' } })
      expect(mockedRevalidate).toHaveBeenCalledWith('/admin/cms')
      expect(mockedRevalidate).toHaveBeenCalledWith('/[slug]', 'page')
    })

    it('supports overloaded FormData as first arg', async () => {
      // Arrange
      const fd = form({ id: 'id1' })

      // Act
      const result = await deletePageAction(fd as never)

      // Assert
      expect(result.success).toBe(true)
      expect(db.page.delete).toHaveBeenCalled()
    })

    it('returns error when db delete throws', async () => {
      // Arrange
      vi.mocked(db.page.delete).mockRejectedValue(new Error('db fail'))

      // Act
      const result = await deletePageAction({}, form({ id: 'id1' }))

      // Assert
      expect(result.error).toMatch(/No se pudo eliminar/)
    })

    it('propagates requireAdmin throw', async () => {
      // Arrange
      mockedRequireSuperAdmin.mockRejectedValue(new Error('NEXT_REDIRECT'))

      // Act & Assert
      await expect(deletePageAction({}, form({ id: 'id1' }))).rejects.toThrow()
    })
  })
})
