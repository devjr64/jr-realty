import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth-helpers', () => ({
  requireSuperAdmin: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    testimonial: {
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

import { requireSuperAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { deleteUploadedFile } from '@/lib/utils/uploads'
import {
  createTestimonialAction,
  deleteTestimonialAction,
  updateTestimonialAction,
} from '@/server/actions/testimonial.actions'
import { revalidatePath } from 'next/cache'

const mockedRequireSuperAdmin = vi.mocked(requireSuperAdmin)
const mockedRevalidate = vi.mocked(revalidatePath)
const mockedDeleteFile = vi.mocked(deleteUploadedFile)

function form(entries: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) fd.set(k, v)
  return fd
}

function validBase(overrides: Record<string, string> = {}): FormData {
  return form({
    name: 'Carlos Ruiz',
    role: 'Cliente satisfecho',
    content: 'Excelente servicio, muy profesionales y atentos en todo momento.',
    rating: '5',
    active: 'on',
    ...overrides,
  })
}

describe('testimonial.actions mocked unit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedRequireSuperAdmin.mockResolvedValue({ id: 'admin1', role: 'AGENT' } as never)
    vi.mocked(db.testimonial.create).mockResolvedValue({ id: 'new' } as never)
    vi.mocked(db.testimonial.update).mockResolvedValue({} as never)
    vi.mocked(db.testimonial.delete).mockResolvedValue({} as never)
    vi.mocked(db.testimonial.findUnique).mockResolvedValue(null as never)
  })

  describe('createTestimonialAction', () => {
    it('creates testimonial with active toggle on', async () => {
      // Arrange: active on
      const fd = validBase()

      // Act
      const result = await createTestimonialAction({}, fd)

      // Assert
      expect(result.success).toBe(true)
      expect(db.testimonial.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Carlos Ruiz',
            rating: 5,
            active: true,
          }),
        }),
      )
      expect(mockedRevalidate).toHaveBeenCalledWith('/admin/testimonios')
      expect(mockedRevalidate).toHaveBeenCalledWith('/')
    })

    it('creates with active off when checkbox missing', async () => {
      // Arrange: no active field
      const fd = form({
        name: 'Carlos Ruiz',
        content: 'Excelente servicio, muy profesionales y atentos en todo momento.',
        rating: '5',
      })

      // Act
      const result = await createTestimonialAction({}, fd)

      // Assert
      expect(result.success).toBe(true)
      expect(db.testimonial.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ active: false }) }),
      )
    })

    it('handles rating coercion from string', async () => {
      // Arrange: rating 3
      const fd = validBase({ rating: '3' })

      // Act
      const result = await createTestimonialAction({}, fd)

      // Assert
      expect(result.success).toBe(true)
      expect(db.testimonial.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ rating: 3 }) }),
      )
    })

    it('handles role null when missing', async () => {
      // Arrange: no role
      const fd = form({
        name: 'Carlos Ruiz',
        content: 'Excelente servicio, muy profesionales y atentos en todo momento.',
        rating: '5',
      })

      // Act
      const result = await createTestimonialAction({}, fd)

      // Assert
      expect(result.success).toBe(true)
      expect(db.testimonial.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ role: null }) }),
      )
    })

    it('returns fieldErrors on validation failure (name too short)', async () => {
      // Arrange
      const fd = validBase({ name: 'a' })

      // Act
      const result = await createTestimonialAction({}, fd)

      // Assert
      expect(result.error).toBeDefined()
      expect(result.fieldErrors?.name).toBeDefined()
      expect(db.testimonial.create).not.toHaveBeenCalled()
    })

    it('returns fieldErrors on content too short', async () => {
      // Arrange
      const fd = validBase({ content: 'short' })

      // Act
      const result = await createTestimonialAction({}, fd)

      // Assert
      expect(result.error).toBeDefined()
      expect(result.fieldErrors?.content).toBeDefined()
    })

    it('returns fieldErrors on invalid rating', async () => {
      // Arrange: rating 10 > max 5
      const fd = validBase({ rating: '10' })

      // Act
      const result = await createTestimonialAction({}, fd)

      // Assert
      expect(result.error).toBeDefined()
      expect(result.fieldErrors?.rating).toBeDefined()
    })

    it('returns error when db create throws', async () => {
      // Arrange
      vi.mocked(db.testimonial.create).mockRejectedValue(new Error('db fail'))

      // Act
      const result = await createTestimonialAction({}, validBase())

      // Assert
      expect(result.error).toMatch(/No se pudo crear/)
    })

    it('propagates requireAdmin throw', async () => {
      // Arrange
      mockedRequireSuperAdmin.mockRejectedValue(new Error('NEXT_REDIRECT'))

      // Act & Assert
      await expect(createTestimonialAction({}, validBase())).rejects.toThrow()
    })
  })

  describe('updateTestimonialAction', () => {
    it('returns error when id missing', async () => {
      // Act
      const result = await updateTestimonialAction({}, validBase())

      // Assert
      expect(result.error).toMatch(/identificador/)
    })

    it('returns error when id empty trimmed', async () => {
      // Arrange
      const fd = validBase()
      fd.set('id', '   ')

      // Act
      const result = await updateTestimonialAction({}, fd)

      // Assert
      expect(result.error).toMatch(/identificador/)
    })

    it('returns fieldErrors on validation failure', async () => {
      // Arrange
      const fd = validBase({ name: '' })
      fd.set('id', 'id1')

      // Act
      const result = await updateTestimonialAction({}, fd)

      // Assert
      expect(result.error).toBeDefined()
      expect(result.fieldErrors).toBeDefined()
    })

    it('updates testimonial successfully', async () => {
      // Arrange
      const fd = validBase({ rating: '4' })
      fd.set('id', 'id1')

      // Act
      const result = await updateTestimonialAction({}, fd)

      // Assert
      expect(result.success).toBe(true)
      expect(db.testimonial.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'id1' },
          data: expect.objectContaining({ rating: 4, name: 'Carlos Ruiz' }),
        }),
      )
      expect(mockedRevalidate).toHaveBeenCalledWith('/admin/testimonios')
    })

    it('toggles active off when checkbox not sent', async () => {
      // Arrange: no active field
      const fd = form({
        name: 'Carlos Ruiz',
        content: 'Excelente servicio, muy profesionales y atentos en todo momento.',
        rating: '5',
      })
      fd.set('id', 'id1')

      // Act
      const result = await updateTestimonialAction({}, fd)

      // Assert
      expect(result.success).toBe(true)
      expect(db.testimonial.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ active: false }) }),
      )
    })

    it('returns error when db update throws', async () => {
      // Arrange
      vi.mocked(db.testimonial.update).mockRejectedValue(new Error('db fail'))
      const fd = validBase()
      fd.set('id', 'id1')

      // Act
      const result = await updateTestimonialAction({}, fd)

      // Assert
      expect(result.error).toMatch(/No se pudo actualizar/)
    })
  })

  describe('deleteTestimonialAction', () => {
    it('returns error when fd missing', async () => {
      // Act
      const result = await deleteTestimonialAction({}, undefined)

      // Assert
      expect(result.error).toMatch(/Falta la información/)
    })

    it('returns error when id missing', async () => {
      // Act
      const result = await deleteTestimonialAction({}, form({}))

      // Assert
      expect(result.error).toMatch(/identificador/)
    })

    it('returns error when testimonial not found', async () => {
      // Arrange
      vi.mocked(db.testimonial.findUnique).mockResolvedValue(null as never)

      // Act
      const result = await deleteTestimonialAction({}, form({ id: 'missing' }))

      // Assert
      expect(result.error).toMatch(/no existe/)
    })

    it('deletes and calls deleteUploadedFile when avatarUrl exists', async () => {
      // Arrange
      vi.mocked(db.testimonial.findUnique).mockResolvedValue({ avatarUrl: '/uploads/avatar.jpg' } as never)

      // Act
      const result = await deleteTestimonialAction({}, form({ id: 'id1' }))

      // Assert
      expect(result.success).toBe(true)
      expect(db.testimonial.delete).toHaveBeenCalledWith({ where: { id: 'id1' } })
      expect(mockedDeleteFile).toHaveBeenCalledWith('/uploads/avatar.jpg')
      expect(mockedRevalidate).toHaveBeenCalledWith('/admin/testimonios')
    })

    it('deletes without calling deleteUploadedFile when avatarUrl null', async () => {
      // Arrange
      vi.mocked(db.testimonial.findUnique).mockResolvedValue({ avatarUrl: null } as never)

      // Act
      const result = await deleteTestimonialAction({}, form({ id: 'id1' }))

      // Assert
      expect(result.success).toBe(true)
      expect(mockedDeleteFile).not.toHaveBeenCalled()
    })

    it('supports overloaded FormData as first arg', async () => {
      // Arrange
      vi.mocked(db.testimonial.findUnique).mockResolvedValue({ avatarUrl: null } as never)
      const fd = form({ id: 'id1' })

      // Act
      const result = await deleteTestimonialAction(fd as never)

      // Assert
      expect(result.success).toBe(true)
      expect(db.testimonial.delete).toHaveBeenCalled()
    })

    it('returns error when db delete throws', async () => {
      // Arrange
      vi.mocked(db.testimonial.findUnique).mockResolvedValue({ avatarUrl: null } as never)
      vi.mocked(db.testimonial.delete).mockRejectedValue(new Error('db fail'))

      // Act
      const result = await deleteTestimonialAction({}, form({ id: 'id1' }))

      // Assert
      expect(result.error).toMatch(/No se pudo eliminar/)
    })
  })
})
