import { beforeEach, describe, expect, it, vi } from 'vitest'

// Hoisted mocks — isolated per file, parallel-safe
vi.mock('@/lib/auth-helpers', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    blogPost: {
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

vi.mock('@/lib/utils/uploads', () => ({
  deleteUploadedFile: vi.fn(),
}))

import { requireAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { deleteUploadedFile } from '@/lib/utils/uploads'
import {
  createBlogPostAction,
  deleteBlogPostAction,
  updateBlogPostAction,
} from '@/server/actions/blog-post.actions'
import { revalidatePath } from 'next/cache'

const mockedRequireAdmin = vi.mocked(requireAdmin)
const mockedRevalidate = vi.mocked(revalidatePath)
const mockedDeleteFile = vi.mocked(deleteUploadedFile)

function form(entries: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) fd.set(k, v)
  return fd
}

function validBase(overrides: Record<string, string> = {}): FormData {
  return form({
    title: 'Mi Post de Prueba',
    excerpt: 'Resumen corto',
    content: 'Este es un contenido markdown suficientemente largo para validar schema',
    coverImage: '',
    ...overrides,
  })
}

const longMarkdown = 'Este es un contenido markdown suficientemente largo para validar el schema de blog post con mas de veinte caracteres.'

describe('blog-post.actions mocked unit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedRequireAdmin.mockResolvedValue({ id: 'admin1', role: 'SUPER_ADMIN' } as never)
    vi.mocked(db.blogPost.findMany).mockResolvedValue([] as never)
    vi.mocked(db.blogPost.create).mockResolvedValue({ id: 'new' } as never)
    vi.mocked(db.blogPost.update).mockResolvedValue({} as never)
    vi.mocked(db.blogPost.delete).mockResolvedValue({} as never)
    vi.mocked(db.blogPost.findUnique).mockResolvedValue(null as never)
  })

  describe('createBlogPostAction', () => {
    it('creates with markdown string content and generates slug', async () => {
      // Arrange: no existing slugs
      vi.mocked(db.blogPost.findMany).mockResolvedValue([] as never)

      // Act
      const result = await createBlogPostAction({}, validBase({ content: longMarkdown }))

      // Assert
      expect(result.success).toBe(true)
      expect(db.blogPost.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'mi-post-de-prueba',
            authorId: 'admin1',
            content: longMarkdown,
          }),
        }),
      )
      expect(mockedRevalidate).toHaveBeenCalledWith('/admin/blog')
      expect(mockedRevalidate).toHaveBeenCalledWith('/blog')
    })

    it('creates with block[] JSON content via parseContent', async () => {
      // Arrange
      const blocks = JSON.stringify([
        { type: 'markdown', content: 'bloque 1' },
        { type: 'image', url: '/img.jpg' },
      ])
      vi.mocked(db.blogPost.findMany).mockResolvedValue([] as never)

      // Act
      const result = await createBlogPostAction({}, validBase({ content: blocks }))

      // Assert
      expect(result.success).toBe(true)
      expect(db.blogPost.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            content: [
              { type: 'markdown', content: 'bloque 1' },
              { type: 'image', url: '/img.jpg' },
            ],
          }),
        }),
      )
    })

    it('handles published=true sets publishedAt', async () => {
      // Arrange
      vi.mocked(db.blogPost.findMany).mockResolvedValue([] as never)
      const fd = validBase({ content: longMarkdown })
      fd.set('published', 'on')

      // Act
      const result = await createBlogPostAction({}, fd)

      // Assert
      expect(result.success).toBe(true)
      expect(db.blogPost.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            published: true,
            publishedAt: expect.any(Date),
          }),
        }),
      )
    })

    it('handles slug collision by appending counter', async () => {
      // Arrange: base slug taken
      vi.mocked(db.blogPost.findMany).mockResolvedValue([
        { slug: 'mi-post-de-prueba' },
        { slug: 'mi-post-de-prueba-2' },
      ] as never)

      // Act
      const result = await createBlogPostAction({}, validBase({ content: longMarkdown }))

      // Assert
      expect(result.success).toBe(true)
      expect(db.blogPost.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: 'mi-post-de-prueba-3' }),
        }),
      )
    })

    it('falls back to "post" when slugify returns empty', async () => {
      // Arrange: title with only symbols -> slugify('!!!') => ''
      vi.mocked(db.blogPost.findMany).mockResolvedValue([{ slug: 'post' }] as never)

      // Act
      const result = await createBlogPostAction({}, validBase({ title: '!!!', content: longMarkdown }))

      // Assert
      expect(result.success).toBe(true)
      expect(db.blogPost.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ slug: 'post-2' }) }),
      )
    })

    it('returns fieldErrors on validation failure (title too short)', async () => {
      // Arrange: invalid title
      const fd = validBase({ title: 'ab', content: longMarkdown })

      // Act
      const result = await createBlogPostAction({}, fd)

      // Assert
      expect(result.error).toBeDefined()
      expect(result.fieldErrors).toBeDefined()
      expect(result.fieldErrors?.title).toBeDefined()
      expect(db.blogPost.create).not.toHaveBeenCalled()
    })

    it('parseContent falls through on invalid JSON with "[" prefix', async () => {
      // Arrange: starts with [ but invalid JSON -> treated as string
      const invalidJson = '[not valid json'
      // needs to be >=20 chars to pass string content validation
      const padded = invalidJson + ' xxxxxxxxxx largo suficiente'
      vi.mocked(db.blogPost.findMany).mockResolvedValue([] as never)

      // Act
      const result = await createBlogPostAction({}, validBase({ content: padded }))

      // Assert: should still succeed as string content
      expect(result.success).toBe(true)
      expect(db.blogPost.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ content: padded }) }),
      )
    })

    it('parseContent falls through when JSON array lacks type field', async () => {
      // Arrange: valid JSON array but objects without "type"
      const raw = JSON.stringify([{ noType: 123 }, { foo: 'bar' }])
      // raw length <20? ensure padded: JSON string is ~30, but string content check is via union: array path requires objects with type, else returns raw string which must be >=20
      // The raw string length is >20, so validation passes as string
      vi.mocked(db.blogPost.findMany).mockResolvedValue([] as never)

      // Act
      const result = await createBlogPostAction({}, validBase({ content: raw }))

      // Assert: treated as string not blocks
      expect(result.success).toBe(true)
      expect(db.blogPost.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ content: raw }) }),
      )
    })

    it('parseContent returns raw for empty trimmed content', async () => {
      // Arrange: empty content -> parseContent returns raw '' -> schema fails min 20
      const fd = validBase({ content: '   ' })

      // Act
      const result = await createBlogPostAction({}, fd)

      // Assert
      expect(result.error).toBeDefined()
      expect(result.fieldErrors?.content).toBeDefined()
    })

    it('returns error when db create throws', async () => {
      // Arrange
      vi.mocked(db.blogPost.findMany).mockResolvedValue([] as never)
      vi.mocked(db.blogPost.create).mockRejectedValue(new Error('db fail'))

      // Act
      const result = await createBlogPostAction({}, validBase({ content: longMarkdown }))

      // Assert
      expect(result.error).toMatch(/No se pudo crear/)
      expect(result.success).toBeUndefined()
    })

    it('propagates requireAdmin redirect throw', async () => {
      // Arrange
      mockedRequireAdmin.mockRejectedValue(new Error('NEXT_REDIRECT'))

      // Act & Assert
      await expect(createBlogPostAction({}, validBase())).rejects.toThrow('NEXT_REDIRECT')
    })
  })

  describe('updateBlogPostAction', () => {
    it('returns error when id missing', async () => {
      // Arrange: no id
      const fd = validBase({ content: longMarkdown })

      // Act
      const result = await updateBlogPostAction({}, fd)

      // Assert
      expect(result.error).toMatch(/identificador/)
    })

    it('returns error when id empty trimmed', async () => {
      // Arrange
      const fd = validBase({ content: longMarkdown })
      fd.set('id', '   ')

      // Act
      const result = await updateBlogPostAction({}, fd)

      // Assert
      expect(result.error).toMatch(/identificador/)
    })

    it('returns error when post not found', async () => {
      // Arrange
      vi.mocked(db.blogPost.findUnique).mockResolvedValue(null as never)
      const fd = validBase({ content: longMarkdown })
      fd.set('id', 'missing')

      // Act
      const result = await updateBlogPostAction({}, fd)

      // Assert
      expect(result.error).toMatch(/no existe/)
    })

    it('returns fieldErrors on validation failure', async () => {
      // Arrange
      vi.mocked(db.blogPost.findUnique).mockResolvedValue({ published: false } as never)
      const fd = validBase({ title: '', content: longMarkdown })
      fd.set('id', 'id1')

      // Act
      const result = await updateBlogPostAction({}, fd)

      // Assert
      expect(result.error).toBeDefined()
      expect(result.fieldErrors).toBeDefined()
    })

    it('sets publishedAt when publishing first time', async () => {
      // Arrange: existing not published, new published on
      vi.mocked(db.blogPost.findUnique).mockResolvedValue({ published: false } as never)
      const fd = validBase({ content: longMarkdown })
      fd.set('id', 'id1')
      fd.set('published', 'on')

      // Act
      const result = await updateBlogPostAction({}, fd)

      // Assert
      expect(result.success).toBe(true)
      expect(db.blogPost.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'id1' },
          data: expect.objectContaining({ publishedAt: expect.any(Date) }),
        }),
      )
    })

    it('does not set publishedAt when already published', async () => {
      // Arrange: existing already published
      vi.mocked(db.blogPost.findUnique).mockResolvedValue({ published: true } as never)
      const fd = validBase({ content: longMarkdown })
      fd.set('id', 'id1')
      fd.set('published', 'on')

      // Act
      const result = await updateBlogPostAction({}, fd)

      // Assert: publishedAt should be undefined (not set)
      expect(result.success).toBe(true)
      expect(db.blogPost.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ publishedAt: undefined }),
        }),
      )
    })

    it('succeeds when unpublishing (published false, existing true)', async () => {
      // Arrange: existing published true, new published false
      vi.mocked(db.blogPost.findUnique).mockResolvedValue({ published: true } as never)
      const fd = validBase({ content: longMarkdown })
      fd.set('id', 'id1')
      // no published on

      // Act
      const result = await updateBlogPostAction({}, fd)

      // Assert
      expect(result.success).toBe(true)
      expect(db.blogPost.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ published: false }) }),
      )
      expect(mockedRevalidate).toHaveBeenCalledWith('/admin/blog')
    })

    it('returns error when db update throws', async () => {
      // Arrange
      vi.mocked(db.blogPost.findUnique).mockResolvedValue({ published: false } as never)
      vi.mocked(db.blogPost.update).mockRejectedValue(new Error('db fail'))
      const fd = validBase({ content: longMarkdown })
      fd.set('id', 'id1')

      // Act
      const result = await updateBlogPostAction({}, fd)

      // Assert
      expect(result.error).toMatch(/No se pudo actualizar/)
    })

    it('handles block[] content on update', async () => {
      // Arrange
      vi.mocked(db.blogPost.findUnique).mockResolvedValue({ published: false } as never)
      const blocks = JSON.stringify([{ type: 'markdown', text: 'hola' }])
      const fd = validBase({ content: blocks })
      fd.set('id', 'id1')

      // Act
      const result = await updateBlogPostAction({}, fd)

      // Assert
      expect(result.success).toBe(true)
      expect(db.blogPost.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ content: [{ type: 'markdown', text: 'hola' }] }) }),
      )
    })
  })

  describe('deleteBlogPostAction', () => {
    it('returns error when fd missing', async () => {
      // Act: pass empty state and no formData
      const result = await deleteBlogPostAction({}, undefined)

      // Assert
      expect(result.error).toMatch(/Falta la información/)
    })

    it('returns error when id missing', async () => {
      // Arrange
      const fd = form({})

      // Act
      const result = await deleteBlogPostAction({}, fd)

      // Assert
      expect(result.error).toMatch(/identificador/)
    })

    it('returns error when post not found', async () => {
      // Arrange
      vi.mocked(db.blogPost.findUnique).mockResolvedValue(null as never)

      // Act
      const result = await deleteBlogPostAction({}, form({ id: 'missing' }))

      // Assert
      expect(result.error).toMatch(/no existe/)
    })

    it('deletes and calls deleteUploadedFile when coverImage exists', async () => {
      // Arrange
      vi.mocked(db.blogPost.findUnique).mockResolvedValue({ coverImage: '/uploads/img.jpg' } as never)

      // Act
      const result = await deleteBlogPostAction({}, form({ id: 'id1' }))

      // Assert
      expect(result.success).toBe(true)
      expect(db.blogPost.delete).toHaveBeenCalledWith({ where: { id: 'id1' } })
      expect(mockedDeleteFile).toHaveBeenCalledWith('/uploads/img.jpg')
      expect(mockedRevalidate).toHaveBeenCalledWith('/admin/blog')
      expect(mockedRevalidate).toHaveBeenCalledWith('/blog')
    })

    it('deletes without calling deleteUploadedFile when coverImage null', async () => {
      // Arrange
      vi.mocked(db.blogPost.findUnique).mockResolvedValue({ coverImage: null } as never)

      // Act
      const result = await deleteBlogPostAction({}, form({ id: 'id1' }))

      // Assert
      expect(result.success).toBe(true)
      expect(mockedDeleteFile).not.toHaveBeenCalled()
    })

    it('supports overloaded FormData as first arg', async () => {
      // Arrange: called as deleteBlogPostAction(fd)
      vi.mocked(db.blogPost.findUnique).mockResolvedValue({ coverImage: null } as never)
      const fd = form({ id: 'id1' })

      // Act
      const result = await deleteBlogPostAction(fd as never)

      // Assert
      expect(result.success).toBe(true)
      expect(db.blogPost.delete).toHaveBeenCalled()
    })

    it('returns error when db delete throws', async () => {
      // Arrange
      vi.mocked(db.blogPost.findUnique).mockResolvedValue({ coverImage: null } as never)
      vi.mocked(db.blogPost.delete).mockRejectedValue(new Error('db fail'))

      // Act
      const result = await deleteBlogPostAction({}, form({ id: 'id1' }))

      // Assert
      expect(result.error).toMatch(/No se pudo eliminar/)
    })
  })
})
