import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock resend module — hoisted by vitest before imports.
const sendMock = vi.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null })
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: sendMock },
  })),
}))

import { sendEmail } from '@/lib/email'

describe('sendEmail', () => {
  const originalEnv = process.env

  beforeEach(() => {
    sendMock.mockClear()
    sendMock.mockResolvedValue({ data: { id: 'test-id' }, error: null })
    process.env = { ...originalEnv }
  })

  it('returns { ok: true, dev: true } when RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY
    process.env.NODE_ENV = 'production'
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      react: <div>test</div>,
    })

    expect(result.ok).toBe(true)
    expect(result.dev).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[email] dev fallback'),
    )
    consoleSpy.mockRestore()
  })

  it('logs to console in dev mode even with API key', async () => {
    process.env.RESEND_API_KEY = 're_test'
    process.env.NODE_ENV = 'development'
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      react: <div>test</div>,
    })

    expect(result.ok).toBe(true)
    expect(result.dev).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[email] dev fallback'),
    )
    consoleSpy.mockRestore()
  })

  it('calls Resend API when key is set and in production', async () => {
    process.env.RESEND_API_KEY = 're_test'
    process.env.NODE_ENV = 'production'
    process.env.EMAIL_FROM = 'test@jrrealty.com'

    const result = await sendEmail({
      to: 'user@example.com',
      subject: 'Test Subject',
      react: <div>Hello</div>,
    })

    expect(result.ok).toBe(true)
    expect(result.dev).toBeUndefined()
    expect(sendMock).toHaveBeenCalledWith({
      from: 'test@jrrealty.com',
      to: 'user@example.com',
      subject: 'Test Subject',
      react: expect.any(Object),
    })
  })

  it('returns { ok: false, error } when Resend returns an error', async () => {
    process.env.RESEND_API_KEY = 're_test'
    process.env.NODE_ENV = 'production'
    sendMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid API key' },
    })
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      react: <div>test</div>,
    })

    expect(result.ok).toBe(false)
    expect(result.error).toBe('Invalid API key')
    consoleSpy.mockRestore()
  })

  it('returns { ok: false, error } on unexpected throw', async () => {
    process.env.RESEND_API_KEY = 're_test'
    process.env.NODE_ENV = 'production'
    sendMock.mockRejectedValueOnce(new Error('Network error'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      react: <div>test</div>,
    })

    expect(result.ok).toBe(false)
    expect(result.error).toBe('Network error')
    consoleSpy.mockRestore()
  })
})
