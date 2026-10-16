import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock DB
const findUniqueMock = vi.fn()
vi.mock('@/lib/db', () => ({
  db: {
    siteSetting: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
    },
  },
}))

// Mock sendEmail
const sendEmailMock = vi.fn().mockResolvedValue({ ok: true, dev: true })
vi.mock('@/lib/email', () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}))

// Mock templates
vi.mock('@/emails/lead-confirm', () => ({
  LeadConfirmTemplate: vi.fn((props: unknown) => props),
}))
vi.mock('@/emails/lead-notify', () => ({
  LeadNotifyTemplate: vi.fn((props: unknown) => props),
}))

import { sendLeadEmails } from '@/lib/lead-emails'

describe('sendLeadEmails', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    findUniqueMock.mockReset()
    sendEmailMock.mockClear()
    process.env = { ...originalEnv }
    process.env.EMAIL_FROM = 'test@jrrealty.com'
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
  })

  const mockLead = {
    id: 'lead-1',
    name: 'Ana Lopez',
    email: 'ana@example.com',
    phone: '+58 414 1234567',
    message: 'Me interesa la propiedad',
    propertyId: 'prop-1',
  }

  const mockProperty = {
    slug: 'casa-bella',
    title: 'Casa Bella',
  }

  it('sends confirmation to submitter and notification to admin from site settings', async () => {
    // Arrange
    findUniqueMock.mockResolvedValue({
      value: { email: 'admin@jrrealty.com', phone: '+58 212 5550140', whatsapp: '+58 414 9999999' },
    })
    sendEmailMock.mockResolvedValue({ ok: true })

    // Act
    await sendLeadEmails({ lead: mockLead, property: mockProperty })

    // Assert
    expect(sendEmailMock).toHaveBeenCalledTimes(2)

    // First call: confirmation to submitter
    expect(sendEmailMock).toHaveBeenNthCalledWith(1, {
      to: 'ana@example.com',
      subject: 'JR Realty — Recibimos tu mensaje',
      react: expect.objectContaining({
        name: 'Ana Lopez',
        messagePreview: 'Me interesa la propiedad',
        phone: '+58 212 5550140',
        whatsapp: '+58 414 9999999',
      }),
    })

    // Second call: notification to admin
    expect(sendEmailMock).toHaveBeenNthCalledWith(2, {
      to: 'admin@jrrealty.com',
      subject: 'Nuevo lead: Ana Lopez',
      react: expect.objectContaining({
        name: 'Ana Lopez',
        email: 'ana@example.com',
        phone: '+58 414 1234567',
        message: 'Me interesa la propiedad',
        property: mockProperty,
        appUrl: 'http://localhost:3000',
      }),
    })
  })

  it('falls back to EMAIL_FROM when site settings have no email', async () => {
    // Arrange
    findUniqueMock.mockResolvedValue({ value: { phone: '+58 212 5550140' } })
    sendEmailMock.mockResolvedValue({ ok: true })

    // Act
    await sendLeadEmails({ lead: mockLead })

    // Assert
    expect(sendEmailMock).toHaveBeenCalledTimes(2)
    expect(sendEmailMock).toHaveBeenNthCalledWith(2, {
      to: 'test@jrrealty.com',
      subject: 'Nuevo lead: Ana Lopez',
      react: expect.any(Object),
    })
  })

  it('skips admin notification when no admin email available', async () => {
    // Arrange
    delete process.env.EMAIL_FROM
    findUniqueMock.mockResolvedValue({ value: {} })
    sendEmailMock.mockResolvedValue({ ok: true })

    // Act
    await sendLeadEmails({ lead: mockLead })

    // Assert
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(sendEmailMock).toHaveBeenCalledWith({
      to: 'ana@example.com',
      subject: 'JR Realty — Recibimos tu mensaje',
      react: expect.any(Object),
    })
  })

  it('truncates messagePreview to 200 chars in confirmation email', async () => {
    // Arrange
    const longMessage = 'x'.repeat(250)
    findUniqueMock.mockResolvedValue({
      value: { email: 'admin@jrrealty.com' },
    })
    sendEmailMock.mockResolvedValue({ ok: true })

    // Act
    await sendLeadEmails({
      lead: { ...mockLead, message: longMessage },
    })

    // Assert
    const confirmCall = sendEmailMock.mock.calls.find(
      (call) => call[0].to === 'ana@example.com',
    )
    expect(confirmCall).toBeDefined()
    const reactProps = confirmCall[0].react
    expect(reactProps.messagePreview).toBe('x'.repeat(200) + '…')
  })

  it('omits phone and message when empty', async () => {
    // Arrange
    findUniqueMock.mockResolvedValue({
      value: { email: 'admin@jrrealty.com' },
    })
    sendEmailMock.mockResolvedValue({ ok: true })

    // Act
    await sendLeadEmails({
      lead: { ...mockLead, phone: null, message: null },
    })

    // Assert
    const notifyCall = sendEmailMock.mock.calls.find(
      (call) => call[0].to === 'admin@jrrealty.com',
    )
    expect(notifyCall).toBeDefined()
    const reactProps = notifyCall[0].react
    expect(reactProps.phone).toBeUndefined()
    expect(reactProps.message).toBeUndefined()
  })

  it('handles DB error gracefully and uses EMAIL_FROM fallback', async () => {
    // Arrange
    findUniqueMock.mockRejectedValue(new Error('DB connection failed'))
    sendEmailMock.mockResolvedValue({ ok: true })
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Act
    await sendLeadEmails({ lead: mockLead })

    // Assert
    expect(sendEmailMock).toHaveBeenCalledTimes(2)
    expect(sendEmailMock).toHaveBeenNthCalledWith(2, {
      to: 'test@jrrealty.com',
      subject: 'Nuevo lead: Ana Lopez',
      react: expect.any(Object),
    })
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('logs rejections from Promise.allSettled', async () => {
    // Arrange
    findUniqueMock.mockResolvedValue({
      value: { email: 'admin@jrrealty.com' },
    })
    sendEmailMock.mockRejectedValueOnce(new Error('Email send failed'))
    sendEmailMock.mockResolvedValueOnce({ ok: true })
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Act
    await sendLeadEmails({ lead: mockLead })

    // Assert
    expect(consoleSpy).toHaveBeenCalledWith(
      '[email] lead-emails dispatch rejected:',
      expect.any(Error),
    )
    consoleSpy.mockRestore()
  })

  it('uses default phone/whatsapp when site settings have no values', async () => {
    // Arrange
    findUniqueMock.mockResolvedValue({ value: {} })
    sendEmailMock.mockResolvedValue({ ok: true })

    // Act
    await sendLeadEmails({ lead: mockLead })

    // Assert
    const confirmCall = sendEmailMock.mock.calls.find(
      (call) => call[0].to === 'ana@example.com',
    )
    expect(confirmCall).toBeDefined()
    const reactProps = confirmCall[0].react
    expect(reactProps.phone).toBe('+58 212-555-0140')
    expect(reactProps.whatsapp).toBe('+58 212-555-0140')
  })

  it('passes property info to notification template', async () => {
    // Arrange
    findUniqueMock.mockResolvedValue({
      value: { email: 'admin@jrrealty.com' },
    })
    sendEmailMock.mockResolvedValue({ ok: true })

    // Act
    await sendLeadEmails({ lead: mockLead, property: mockProperty })

    // Assert
    const notifyCall = sendEmailMock.mock.calls.find(
      (call) => call[0].to === 'admin@jrrealty.com',
    )
    expect(notifyCall).toBeDefined()
    const reactProps = notifyCall[0].react
    expect(reactProps.property).toEqual(mockProperty)
    expect(reactProps.appUrl).toBe('http://localhost:3000')
  })
})
