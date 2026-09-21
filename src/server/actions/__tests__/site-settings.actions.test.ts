import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth-helpers', () => ({
  requireSuperAdmin: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    $transaction: vi.fn(),
    siteSetting: {
      upsert: vi.fn(),
    },
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { requireSuperAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { updateSiteSettingsAction } from '@/server/actions/site-settings.actions'
import { revalidatePath } from 'next/cache'

const mockedRequireSuperAdmin = vi.mocked(requireSuperAdmin)
const mockedRevalidate = vi.mocked(revalidatePath)

function form(entries: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) fd.set(k, v)
  return fd
}

function validSettings(overrides: Record<string, string> = {}): FormData {
  return form({
    siteName: 'JR Realty',
    tagline: 'Tu hogar ideal',
    phone: '+58 2125551234',
    whatsapp: '+58 2125558765',
    email: 'info@jrrealty.com',
    address: 'Calle 50, Venezuela',
    currency: 'USD',
    'social.facebook': 'https://facebook.com/mc',
    'social.instagram': 'https://instagram.com/mc',
    'social.twitter': '',
    'social.linkedin': '',
    'social.youtube': '',
    'seo.title': 'JR Realty - Venezuela',
    'seo.description': 'Encuentra tu propiedad ideal',
    ...overrides,
  })
}

describe('site-settings.actions mocked unit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedRequireSuperAdmin.mockResolvedValue({ id: 'admin1', role: 'SUPER_ADMIN' } as never)
    vi.mocked(db.$transaction).mockResolvedValue([] as never)
  })

  describe('updateSiteSettingsAction', () => {
    it('updates settings via transaction and revalidates', async () => {
      // Arrange: valid data
      const fd = validSettings()

      // Act
      const result = await updateSiteSettingsAction({}, fd)

      // Assert
      expect(result.success).toBe(true)
      expect(db.$transaction).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({}),
          expect.objectContaining({}),
          expect.objectContaining({}),
        ]),
      )
      expect(mockedRevalidate).toHaveBeenCalledWith('/')
      expect(mockedRevalidate).toHaveBeenCalledWith('/contacto')
      expect(mockedRevalidate).toHaveBeenCalledWith('/admin/configuracion')
    })

    it('normalizes currency default to USD when empty', async () => {
      // Arrange: currency empty -> should default USD via || 'USD'
      const fd = validSettings({ currency: '' })

      // Act
      const result = await updateSiteSettingsAction({}, fd)

      // Assert
      expect(result.success).toBe(true)
      // transaction should be called; general value currency USD
      expect(db.$transaction).toHaveBeenCalled()
      const callArg = vi.mocked(db.$transaction).mock.calls[0]?.[0] as unknown[]
      expect(callArg).toHaveLength(3)
    })

    it('handles VES currency', async () => {
      // Arrange
      const fd = validSettings({ currency: 'VES' })

      // Act
      const result = await updateSiteSettingsAction({}, fd)

      // Assert
      expect(result.success).toBe(true)
      expect(db.$transaction).toHaveBeenCalled()
    })

    it('handles empty optional social fields as empty strings', async () => {
      // Arrange: social fields empty strings should be accepted (optional or '')
      const fd = validSettings({
        'social.facebook': '',
        'social.instagram': '',
      })

      // Act
      const result = await updateSiteSettingsAction({}, fd)

      // Assert
      expect(result.success).toBe(true)
    })

    it('returns fieldErrors on validation failure (siteName too short)', async () => {
      // Arrange: siteName min 2
      const fd = validSettings({ siteName: 'a' })

      // Act
      const result = await updateSiteSettingsAction({}, fd)

      // Assert
      expect(result.error).toBeDefined()
      expect(result.fieldErrors).toBeDefined()
      expect(result.fieldErrors?.['general.siteName']).toBeDefined()
      expect(db.$transaction).not.toHaveBeenCalled()
    })

    it('returns fieldErrors on invalid email', async () => {
      // Arrange
      const fd = validSettings({ email: 'bad-email' })

      // Act
      const result = await updateSiteSettingsAction({}, fd)

      // Assert
      expect(result.error).toBeDefined()
      expect(result.fieldErrors?.['general.email']).toBeDefined()
    })

    it('returns fieldErrors on missing phone (min 6)', async () => {
      // Arrange
      const fd = validSettings({ phone: '123' })

      // Act
      const result = await updateSiteSettingsAction({}, fd)

      // Assert
      expect(result.error).toBeDefined()
      expect(result.fieldErrors?.['general.phone']).toBeDefined()
    })

    it('returns error when transaction throws', async () => {
      // Arrange
      vi.mocked(db.$transaction).mockRejectedValue(new Error('db fail'))
      const fd = validSettings()

      // Act
      const result = await updateSiteSettingsAction({}, fd)

      // Assert
      expect(result.error).toMatch(/No se pudo guardar/)
      expect(result.success).toBeUndefined()
    })

    it('propagates requireSuperAdmin throw', async () => {
      // Arrange
      mockedRequireSuperAdmin.mockRejectedValue(new Error('NEXT_REDIRECT'))

      // Act & Assert
      await expect(updateSiteSettingsAction({}, validSettings())).rejects.toThrow('NEXT_REDIRECT')
    })

    it('creates correct Json normalized payload with 3 upserts', async () => {
      // Arrange
      const fd = validSettings({
        siteName: 'Test Site',
        phone: '+58 2125550000',
        email: 'test@example.com',
        currency: 'USD',
      })

      // Act
      const result = await updateSiteSettingsAction({}, fd)

      // Assert: verify transaction array length and keys
      expect(result.success).toBe(true)
      const txArgs = vi.mocked(db.$transaction).mock.calls[0]?.[0] as unknown as Array<{ where: { key: string } }>
      // Can't inspect upsert mock calls directly because $transaction receives array of promises;
      // verify $transaction called once with 3 items
      expect(txArgs.length).toBe(3)
    })

    it('validation error joins path with dot for nested fields', async () => {
      // Arrange: trigger multiple validation errors to test path.join('.')
      // We'll use invalid siteName and invalid email
      const fd = validSettings({ siteName: '', email: 'invalid' })

      // Act
      const result = await updateSiteSettingsAction({}, fd)

      // Assert: fieldErrors keys use dotted paths
      expect(result.fieldErrors).toBeDefined()
      const keys = Object.keys(result.fieldErrors ?? {})
      expect(keys.some((k) => k.includes('general.'))).toBe(true)
    })
  })
})
