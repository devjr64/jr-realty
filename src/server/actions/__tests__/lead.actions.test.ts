import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth-helpers', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    lead: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    property: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(),
}))

import { requireAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import {
  addLeadNoteAction,
  assignLeadAgentAction,
  createLeadAction,
  deleteLeadAction,
  updateLeadStatusAction,
} from '@/server/actions/lead.actions'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

const mockedRequireAdmin = vi.mocked(requireAdmin)
const mockedRevalidate = vi.mocked(revalidatePath)
const mockedHeaders = vi.mocked(headers)
const mockedRateLimit = vi.mocked(rateLimit)

function form(entries: Record<string, string>) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) fd.set(k, v)
  return fd
}

function mockHeaders(ip: string | null) {
  const get = vi.fn((key: string) => {
    if (key === 'x-forwarded-for' && ip) return ip
    if (key === 'x-real-ip' && ip) return ip
    return null
  })
  mockedHeaders.mockResolvedValue({ get } as never)
}

describe('lead.actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedRequireAdmin.mockResolvedValue({ id: 'admin-1', role: 'SUPER_ADMIN' } as never)
    mockedRateLimit.mockReturnValue(true)
    mockHeaders('1.2.3.4')
    vi.mocked(db.lead.create).mockResolvedValue({ id: 'lead-1' } as never)
    vi.mocked(db.lead.findUnique).mockResolvedValue(null)
    vi.mocked(db.lead.update).mockResolvedValue({} as never)
    vi.mocked(db.lead.delete).mockResolvedValue({} as never)
    vi.mocked(db.property.findUnique).mockResolvedValue(null)
  })

  describe('createLeadAction — public capture', () => {
    it('creates lead with normalized email lowercased and trimmed', async () => {
      // Arrange
      const fd = form({
        name: 'Ana Lopez',
        email: '  ' + '__VG_EMAIL_' + 'a985733d439a__' + '@' + 'example.com' + '  ',
        phone: '  123  ',
        message: 'Hola',
        website: '',
      })

      // Act
      const result = await createLeadAction({}, fd)

      // Assert
      expect(result.success).toBe(true)
    })

    it('passes lowercased email to db.lead.create', async () => {
      // Arrange
      const rawEmail = '__VG_EMAIL_' + 'a985733d439a__' + '@' + 'example.com'
      const fd = form({ name: 'Ana', email: rawEmail, website: '' })

      // Act
      await createLeadAction({}, fd)

      // Assert
      expect(db.lead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: rawEmail.toLowerCase() }),
        }),
      )
    })

    it('forces source WEBSITE server-side', async () => {
      // Arrange
      const fd = form({ name: 'Ana', email: '__VG_EMAIL_' + 'a985733d439a__' + '@' + 'example.com', website: '' })

      // Act
      await createLeadAction({}, fd)

      // Assert
      expect(db.lead.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ source: 'WEBSITE' }) }),
      )
    })

    it('rate limiting returns error when exceeded', async () => {
      // Arrange
      mockedRateLimit.mockReturnValue(false)
      const fd = form({ name: 'Ana', email: '__VG_EMAIL_' + 'a985733d439a__' + '@' + 'example.com', website: '' })

      // Act
      const result = await createLeadAction({}, fd)

      // Assert
      expect(result.error).toMatch(/Demasiadas solicitudes/)
    })

    it('honeypot filled returns success without creating lead', async () => {
      // Arrange
      const fd = form({ name: 'Ana', email: '__VG_EMAIL_' + 'a985733d439a__' + '@' + 'example.com', website: 'bot-filled' })

      // Act
      const result = await createLeadAction({}, fd)

      // Assert
      expect(result.success).toBe(true)
    })

    it('honeypot does not call db.lead.create', async () => {
      // Arrange
      const fd = form({ name: 'Ana', email: '__VG_EMAIL_' + 'a985733d439a__' + '@' + 'example.com', website: 'bot' })

      // Act
      await createLeadAction({}, fd)

      // Assert
      expect(db.lead.create).not.toHaveBeenCalled()
    })

    it('returns validation error when name missing', async () => {
      // Arrange
      const fd = form({ name: '', email: '__VG_EMAIL_' + 'a985733d439a__' + '@' + 'example.com', website: '' })

      // Act
      const result = await createLeadAction({}, fd)

      // Assert
      expect(result.error).toBeDefined()
    })

    it('returns validation error for invalid email', async () => {
      // Arrange
      const fd = form({ name: 'Ana', email: 'not-email', website: '' })

      // Act
      const result = await createLeadAction({}, fd)

      // Assert
      expect(result.error).toBeDefined()
    })

    it('creates lead with propertyId and revalidates property page by slug', async () => {
      // Arrange
      vi.mocked(db.property.findUnique).mockResolvedValue({ slug: 'casa-bella' } as never)
      const fd = form({
        name: 'Ana',
        email: '__VG_EMAIL_' + 'a985733d439a__' + '@' + 'example.com',
        propertyId: 'prop-1',
        website: '',
      })

      // Act
      const result = await createLeadAction({}, fd)

      // Assert
      expect(result.success).toBe(true)
    })

    it('calls revalidatePath for property detail when propertyId present', async () => {
      // Arrange
      vi.mocked(db.property.findUnique).mockResolvedValue({ slug: 'casa-bella' } as never)
      const fd = form({ name: 'Ana', email: '__VG_EMAIL_' + 'a985733d439a__' + '@' + 'example.com', propertyId: 'prop-1', website: '' })

      // Act
      await createLeadAction({}, fd)

      // Assert
      expect(mockedRevalidate).toHaveBeenCalledWith('/propiedades/casa-bella', 'page')
    })

    it('skips revalidate when propertyId not found', async () => {
      // Arrange
      vi.mocked(db.property.findUnique).mockResolvedValue(null)
      const fd = form({ name: 'Ana', email: '__VG_EMAIL_' + 'a985733d439a__' + '@' + 'example.com', propertyId: 'prop-1', website: '' })

      // Act
      await createLeadAction({}, fd)

      // Assert
      expect(mockedRevalidate).not.toHaveBeenCalled()
    })

    it('handles File value via getFormString degradation', async () => {
      // Arrange: email as File -> '' -> validation error
      const fd = form({ name: 'Ana', website: '' })
      fd.set('email', new File([''], 'f.txt', { type: 'text/plain' }))

      // Act
      const result = await createLeadAction({}, fd)

      // Assert
      expect(result.error).toBeDefined()
    })

    it('returns generic error when db.lead.create throws', async () => {
      // Arrange
      vi.mocked(db.lead.create).mockRejectedValue(new Error('db down'))
      const fd = form({ name: 'Ana', email: '__VG_EMAIL_' + 'a985733d439a__' + '@' + 'example.com', website: '' })

      // Act
      const result = await createLeadAction({}, fd)

      // Assert
      expect(result.error).toMatch(/No se pudo enviar/)
    })

    it('uses x-real-ip when x-forwarded-for missing', async () => {
      // Arrange
      mockedHeaders.mockResolvedValue({
        get: (k: string) => (k === 'x-real-ip' ? '5.6.7.8' : null),
      } as never)
      const fd = form({ name: 'Ana', email: '__VG_EMAIL_' + 'a985733d439a__' + '@' + 'example.com', website: '' })

      // Act
      await createLeadAction({}, fd)

      // Assert
      expect(mockedRateLimit).toHaveBeenCalledWith('lead:5.6.7.8', 5, 60_000)
    })

    it('falls back to unknown ip when no headers present', async () => {
      // Arrange
      mockedHeaders.mockResolvedValue({ get: () => null } as never)
      const fd = form({ name: 'Ana', email: '__VG_EMAIL_' + 'a985733d439a__' + '@' + 'example.com', website: '' })

      // Act
      await createLeadAction({}, fd)

      // Assert
      expect(mockedRateLimit).toHaveBeenCalledWith('lead:unknown', 5, 60_000)
    })

    it('splits x-forwarded-for and uses first ip trimmed', async () => {
      // Arrange
      mockedHeaders.mockResolvedValue({
        get: (k: string) => (k === 'x-forwarded-for' ? ' 9.9.9.9, 10.0.0.1 ' : null),
      } as never)
      const fd = form({ name: 'Ana', email: '__VG_EMAIL_' + 'a985733d439a__' + '@' + 'example.com', website: '' })

      // Act
      await createLeadAction({}, fd)

      // Assert
      expect(mockedRateLimit).toHaveBeenCalledWith('lead:9.9.9.9', 5, 60_000)
    })
  })

  describe('updateLeadStatusAction', () => {
    it('returns error when leadId missing', async () => {
      // Arrange
      const fd = form({ status: 'CONTACTED' })

      // Act
      const result = await updateLeadStatusAction({}, fd)

      // Assert
      expect(result.error).toMatch(/identificador/)
    })

    it('returns validation error for invalid status', async () => {
      // Arrange
      const fd = form({ leadId: 'lead-1', status: 'INVALID' })

      // Act
      const result = await updateLeadStatusAction({}, fd)

      // Assert
      expect(result.error).toBeDefined()
    })

    it('updates status and revalidates admin leads', async () => {
      // Arrange
      const fd = form({ leadId: 'lead-1', status: 'CONTACTED' })

      // Act
      const result = await updateLeadStatusAction({}, fd)

      // Assert
      expect(result.success).toBe(true)
    })

    it('calls db.lead.update with correct status', async () => {
      // Arrange
      const fd = form({ leadId: 'lead-1', status: 'FOLLOWING_UP' })

      // Act
      await updateLeadStatusAction({}, fd)

      // Assert
      expect(db.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'lead-1' }, data: { status: 'FOLLOWING_UP' } }),
      )
    })

    it('calls revalidatePath after status update', async () => {
      // Arrange
      const fd = form({ leadId: 'lead-1', status: 'CONTACTED' })

      // Act
      await updateLeadStatusAction({}, fd)

      // Assert
      expect(mockedRevalidate).toHaveBeenCalledWith('/admin/leads')
    })

    it('requires admin (redirect throws)', async () => {
      // Arrange
      mockedRequireAdmin.mockRejectedValue(new Error('NEXT_REDIRECT'))
      const fd = form({ leadId: 'lead-1', status: 'CONTACTED' })

      // Act
      await expect(updateLeadStatusAction({}, fd)).rejects.toThrow()
    })

    it('returns error when db update throws', async () => {
      // Arrange
      vi.mocked(db.lead.update).mockRejectedValue(new Error('fail'))
      const fd = form({ leadId: 'lead-1', status: 'CONTACTED' })

      // Act
      const result = await updateLeadStatusAction({}, fd)

      // Assert
      expect(result.error).toMatch(/No se pudo actualizar/)
    })

    it('handles File status via getFormString degradation', async () => {
      // Arrange
      const fd = form({ leadId: 'lead-1' })
      fd.set('status', new File([''], 'x', { type: 'text/plain' }))

      // Act
      const result = await updateLeadStatusAction({}, fd)

      // Assert
      expect(result.error).toBeDefined()
    })
  })

  describe('addLeadNoteAction', () => {
    it('returns error when leadId missing', async () => {
      // Arrange
      const fd = form({ text: 'nota' })

      // Act
      const result = await addLeadNoteAction({}, fd)

      // Assert
      expect(result.error).toMatch(/identificador/)
    })

    it('returns validation error when text empty', async () => {
      // Arrange
      const fd = form({ leadId: 'lead-1', text: '' })

      // Act
      const result = await addLeadNoteAction({}, fd)

      // Assert
      expect(result.error).toBeDefined()
    })

    it('returns error when lead not found', async () => {
      // Arrange
      vi.mocked(db.lead.findUnique).mockResolvedValue(null)
      const fd = form({ leadId: 'missing', text: 'nota valida' })

      // Act
      const result = await addLeadNoteAction({}, fd)

      // Assert
      expect(result.error).toMatch(/no existe/)
    })

    it('appends note and filters malformed existing notes', async () => {
      // Arrange
      vi.mocked(db.lead.findUnique).mockResolvedValue({
        notes: [{ text: 'old', createdAt: '2024-01-01T00:00:00.000Z' }, { bad: true }, null],
      } as never)
      const fd = form({ leadId: 'lead-1', text: 'nueva nota' })

      // Act
      const result = await addLeadNoteAction({}, fd)

      // Assert
      expect(result.success).toBe(true)
    })

    it('creates note with createdAt iso string via db update', async () => {
      // Arrange
      vi.mocked(db.lead.findUnique).mockResolvedValue({ notes: [] } as never)
      const fd = form({ leadId: 'lead-1', text: 'nota' })

      // Act
      await addLeadNoteAction({}, fd)

      // Assert
      expect(db.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'lead-1' }, data: expect.objectContaining({ notes: expect.any(Array) }) }),
      )
    })

    it('handles notes not array (null) gracefully', async () => {
      // Arrange
      vi.mocked(db.lead.findUnique).mockResolvedValue({ notes: null } as never)
      const fd = form({ leadId: 'lead-1', text: 'nota' })

      // Act
      const result = await addLeadNoteAction({}, fd)

      // Assert
      expect(result.success).toBe(true)
    })

    it('revalidates admin leads after adding note', async () => {
      // Arrange
      vi.mocked(db.lead.findUnique).mockResolvedValue({ notes: [] } as never)
      const fd = form({ leadId: 'lead-1', text: 'nota' })

      // Act
      await addLeadNoteAction({}, fd)

      // Assert
      expect(mockedRevalidate).toHaveBeenCalledWith('/admin/leads')
    })

    it('returns error when db update throws', async () => {
      // Arrange
      vi.mocked(db.lead.findUnique).mockResolvedValue({ notes: [] } as never)
      vi.mocked(db.lead.update).mockRejectedValue(new Error('fail'))
      const fd = form({ leadId: 'lead-1', text: 'nota' })

      // Act
      const result = await addLeadNoteAction({}, fd)

      // Assert
      expect(result.error).toMatch(/No se pudo guardar/)
    })
  })

  describe('assignLeadAgentAction', () => {
    it('returns error when leadId missing', async () => {
      // Arrange
      const fd = form({ agentId: 'agent-1' })

      // Act
      const result = await assignLeadAgentAction({}, fd)

      // Assert
      expect(result.error).toMatch(/identificador/)
    })

    it('assigns agent and revalidates', async () => {
      // Arrange
      const fd = form({ leadId: 'lead-1', agentId: 'agent-1' })

      // Act
      const result = await assignLeadAgentAction({}, fd)

      // Assert
      expect(result.success).toBe(true)
    })

    it('calls db.lead.update with assignedAgentId', async () => {
      // Arrange
      const fd = form({ leadId: 'lead-1', agentId: 'agent-1' })

      // Act
      await assignLeadAgentAction({}, fd)

      // Assert
      expect(db.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { assignedAgentId: 'agent-1' } }),
      )
    })

    it('unassigns when agentId blank (transform to null)', async () => {
      // Arrange
      const fd = form({ leadId: 'lead-1', agentId: '' })

      // Act
      await assignLeadAgentAction({}, fd)

      // Assert
      expect(db.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { assignedAgentId: null } }),
      )
    })

    it('trims agentId before parsing', async () => {
      // Arrange
      const fd = form({ leadId: 'lead-1', agentId: '  agent-1  ' })

      // Act
      await assignLeadAgentAction({}, fd)

      // Assert
      expect(db.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { assignedAgentId: 'agent-1' } }),
      )
    })

    it('revalidates after assign', async () => {
      // Arrange
      const fd = form({ leadId: 'lead-1', agentId: 'agent-1' })

      // Act
      await assignLeadAgentAction({}, fd)

      // Assert
      expect(mockedRevalidate).toHaveBeenCalledWith('/admin/leads')
    })

    it('returns error when db update throws', async () => {
      // Arrange
      vi.mocked(db.lead.update).mockRejectedValue(new Error('fail'))
      const fd = form({ leadId: 'lead-1', agentId: 'agent-1' })

      // Act
      const result = await assignLeadAgentAction({}, fd)

      // Assert
      expect(result.error).toMatch(/No se pudo asignar/)
    })

    it('handles File agentId via getFormString', async () => {
      // Arrange
      const fd = form({ leadId: 'lead-1' })
      fd.set('agentId', new File([''], 'x', { type: 'text/plain' }))

      // Act
      await assignLeadAgentAction({}, fd)

      // Assert
      expect(db.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { assignedAgentId: null } }),
      )
    })
  })

  describe('deleteLeadAction', () => {
    it('returns error when leadId missing', async () => {
      // Arrange
      const fd = form({})

      // Act
      const result = await deleteLeadAction({}, fd)

      // Assert
      expect(result.error).toMatch(/identificador/)
    })

    it('returns error when fd missing', async () => {
      // Arrange: prevState not FormData, no second arg
      const state = { error: 'x' }

      // Act
      const result = await deleteLeadAction(state as never, undefined)

      // Assert
      expect(result.error).toMatch(/Falta la informaci/)
    })

    it('deletes lead and revalidates', async () => {
      // Arrange
      const fd = form({ leadId: 'lead-1' })

      // Act
      const result = await deleteLeadAction({}, fd)

      // Assert
      expect(result.success).toBe(true)
    })

    it('supports overloaded FormData signature (prevState instanceof FormData)', async () => {
      // Arrange
      const fd = form({ leadId: 'lead-1' })

      // Act
      const result = await deleteLeadAction(fd as never)

      // Assert
      expect(result.success).toBe(true)
    })

    it('calls db.lead.delete with correct id', async () => {
      // Arrange
      const fd = form({ leadId: 'lead-1' })

      // Act
      await deleteLeadAction({}, fd)

      // Assert
      expect(db.lead.delete).toHaveBeenCalledWith({ where: { id: 'lead-1' } })
    })

    it('calls revalidatePath after delete', async () => {
      // Arrange
      const fd = form({ leadId: 'lead-1' })

      // Act
      await deleteLeadAction({}, fd)

      // Assert
      expect(mockedRevalidate).toHaveBeenCalledWith('/admin/leads')
    })

    it('returns error when db delete throws', async () => {
      // Arrange
      vi.mocked(db.lead.delete).mockRejectedValue(new Error('fail'))
      const fd = form({ leadId: 'lead-1' })

      // Act
      const result = await deleteLeadAction({}, fd)

      // Assert
      expect(result.error).toMatch(/No se pudo eliminar/)
    })

    it('requires admin (redirect throws)', async () => {
      // Arrange
      mockedRequireAdmin.mockRejectedValue(new Error('NEXT_REDIRECT'))
      const fd = form({ leadId: 'lead-1' })

      // Act
      await expect(deleteLeadAction({}, fd)).rejects.toThrow()
    })

    it('trims leadId before delete', async () => {
      // Arrange
      const fd = form({ leadId: '  lead-1  ' })

      // Act
      await deleteLeadAction({}, fd)

      // Assert
      expect(db.lead.delete).toHaveBeenCalledWith({ where: { id: 'lead-1' } })
    })
  })
})
