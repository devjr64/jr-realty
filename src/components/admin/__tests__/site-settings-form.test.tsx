import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mockFormAction, mockUseActionState, mockUpdateAction, mockClearCacheAction } = vi.hoisted(() => {
  const mockFormAction = vi.fn(async (...args: unknown[]) => {
    const _fd = args.find((a) => a instanceof FormData)
    void _fd
    return { success: true } as Record<string, unknown>
  })
  const mockUseActionState = vi.fn(
    () => [{}, mockFormAction, false] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean],
  )
  const mockUpdateAction = vi.fn(async (...args: unknown[]) => {
    const _fd = args.find((a) => a instanceof FormData)
    void _fd
    return { success: true } as Record<string, unknown>
  })
  const mockClearCacheAction = vi.fn(async (...args: unknown[]) => {
    const _fd = args.find((a) => a instanceof FormData)
    void _fd
    return { success: true, deletedCount: 0 } as Record<string, unknown>
  })
  return { mockFormAction, mockUseActionState, mockUpdateAction, mockClearCacheAction }
})

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

vi.mock('@/server/actions/site-settings.actions', () => ({
  updateSiteSettingsAction: (...args: unknown[]) => mockUpdateAction(...args),
  clearImageCacheAction: (...args: unknown[]) => mockClearCacheAction(...args),
}))

vi.mock('react', async () => {
  const actual = (await vi.importActual('react')) as Record<string, unknown>
  return {
    ...actual,
    useActionState: (...args: unknown[]) =>
      (mockUseActionState as unknown as (...a: unknown[]) => unknown)(...args),
  }
})

import { SiteSettingsForm } from '@/components/admin/site-settings-form'
import type { SiteSettingsInput } from '@/lib/validations/site-settings.schema'

const defaultInitial: SiteSettingsInput = {
  general: {
    siteName: 'JR Realty',
    tagline: 'Tu hogar en Venezuela',
    phone: '+58 212-555-5678',
    whatsapp: '+58 212-555-0000',
    email: '__VG_EMAIL_e827a977fd16__',
    address: 'Las Mercedes, Venezuela',
    currency: 'USD',
  },
  social: {
    facebook: 'https://facebook.com/mc',
    instagram: 'https://instagram.com/mc',
    twitter: '',
    linkedin: '',
    youtube: '',
  },
  seo: {
    title: 'JR Realty',
    description: 'Inmobiliaria líder en Venezuela',
  },
}

describe('SiteSettingsForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseActionState.mockImplementation(
      () => [{}, mockFormAction, false] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean],
    )
  })

  it('renders all general fields siteName/email/phone etc', () => {
    // Arrange & Act
    render(<SiteSettingsForm initial={defaultInitial} />)
    // Assert
    expect(screen.getByLabelText(/Nombre del sitio/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Eslogan/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Teléfono/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/WhatsApp/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Correo electrónico/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Dirección/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Moneda/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Guardar configuración/i })).toBeInTheDocument()
  })

  it('renders social fields and seo fields', () => {
    // Arrange & Act
    render(<SiteSettingsForm initial={defaultInitial} />)
    // Assert
    expect(screen.getByLabelText(/^Facebook/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Instagram/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/X \(Twitter\)/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/LinkedIn/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/YouTube/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Título por defecto/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Descripción por defecto/i)).toBeInTheDocument()
  })

  it('populates defaults from initial', () => {
    // Arrange & Act
    render(<SiteSettingsForm initial={defaultInitial} />)
    // Assert
    expect(screen.getByLabelText(/Nombre del sitio/i)).toHaveValue('JR Realty')
    expect(screen.getByLabelText(/Correo electrónico/i)).toHaveValue('__VG_EMAIL_e827a977fd16__')
    expect(screen.getByLabelText(/^Teléfono/i)).toHaveValue('+58 212-555-5678')
    expect((screen.getByLabelText(/Moneda/i) as HTMLSelectElement).value).toBe('USD')
    expect(screen.getByLabelText(/^Facebook/i)).toHaveValue('https://facebook.com/mc')
    expect(screen.getByLabelText(/Título por defecto/i)).toHaveValue('JR Realty')
  })

  it('allows changing currency to VES', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<SiteSettingsForm initial={defaultInitial} />)
    const currency = screen.getByLabelText(/Moneda/i) as HTMLSelectElement
    // Act
    await user.selectOptions(currency, 'VES')
    // Assert
    expect(currency.value).toBe('VES')
  })

  it('allows typing siteName and email', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<SiteSettingsForm initial={defaultInitial} />)
    const siteName = screen.getByLabelText(/Nombre del sitio/i) as HTMLInputElement
    const email = screen.getByLabelText(/Correo electrónico/i) as HTMLInputElement
    // Act
    await user.clear(siteName)
    await user.type(siteName, 'Nuevo Sitio')
    await user.clear(email)
    await user.type(email, '__VG_EMAIL_91042f75f6d6__')
    // Assert
    expect(siteName.value).toBe('Nuevo Sitio')
    expect(email.value).toBe('__VG_EMAIL_91042f75f6d6__')
  })

  it('submits with FormData containing general fields', async () => {
    // Arrange
    const user = userEvent.setup()
    const captured: FormData[] = []
    mockFormAction.mockImplementation(async (...args: unknown[]) => {
      const fd = args.find((a) => a instanceof FormData) as FormData | undefined
      if (fd) captured.push(fd)
      return { success: true } as Record<string, unknown>
    })
    render(<SiteSettingsForm initial={defaultInitial} />)
    // Act
    const siteName = screen.getByLabelText(/Nombre del sitio/i)
    await user.clear(siteName)
    await user.type(siteName, 'JR Realty Test')
    await user.click(screen.getByRole('button', { name: /Guardar configuración/i }))
    // Assert
    await waitFor(() => expect(mockFormAction).toHaveBeenCalled())
    const fd =
      (captured[0] ??
        (mockFormAction.mock.calls[0]?.[1] as FormData | undefined) ??
        (mockFormAction.mock.calls[0]?.[0] as FormData | undefined)) as FormData | undefined
    expect(fd).toBeInstanceOf(FormData)
    expect(fd?.get('siteName')).toBe('JR Realty Test')
    expect(fd?.get('email')).toBe('__VG_EMAIL_e827a977fd16__')
    expect(fd?.get('phone')).toBe('+58 212-555-5678')
  })

  it('displays fieldErrors with dot notation keys', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([
      {
        error: 'Revisa los campos del formulario.',
        fieldErrors: {
          'general.siteName': 'El nombre debe tener al menos 2 caracteres',
          'general.email': 'Ingresa un correo válido',
          'general.phone': 'Ingresa un teléfono válido',
          'social.facebook': 'URL inválida',
        },
      },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<SiteSettingsForm initial={defaultInitial} />)
    // Assert
    expect(screen.getByText('El nombre debe tener al menos 2 caracteres')).toBeInTheDocument()
    expect(screen.getByText('Ingresa un correo válido')).toBeInTheDocument()
    expect(screen.getByText('Ingresa un teléfono válido')).toBeInTheDocument()
    expect(screen.getByText('URL inválida')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Revisa los campos del formulario.')
    expect(screen.getByLabelText(/Nombre del sitio/i)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText(/Correo electrónico/i)).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows success banner', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([{ success: true }, mockFormAction, false] as unknown as [
      Record<string, unknown>,
      typeof mockFormAction,
      boolean,
    ])
    // Act
    render(<SiteSettingsForm initial={defaultInitial} />)
    // Assert
    expect(screen.getByRole('status')).toHaveTextContent('Configuración guardada correctamente.')
  })

  it('disables inputs when pending', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([{}, mockFormAction, true] as unknown as [
      Record<string, unknown>,
      typeof mockFormAction,
      boolean,
    ])
    // Act
    render(<SiteSettingsForm initial={defaultInitial} />)
    // Assert
    expect(screen.getByLabelText(/Nombre del sitio/i)).toBeDisabled()
    expect(screen.getByLabelText(/Correo electrónico/i)).toBeDisabled()
    expect(screen.getByLabelText(/^Teléfono/i)).toBeDisabled()
    expect(screen.getByRole('button', { name: /Guardando/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Guardando/i })).toHaveAttribute('aria-busy', 'true')
  })

  it('handles empty optional fields whatsapp/tagline/address', () => {
    // Arrange
    const emptyOptional: SiteSettingsInput = {
      ...defaultInitial,
      general: { ...defaultInitial.general, tagline: '', whatsapp: '', address: '' },
      social: { facebook: '', instagram: '', twitter: '', linkedin: '', youtube: '' },
      seo: { title: '', description: '' },
    }
    // Act
    render(<SiteSettingsForm initial={emptyOptional} />)
    // Assert
    expect(screen.getByLabelText(/^Eslogan/i)).toHaveValue('')
    expect(screen.getByLabelText(/WhatsApp/i)).toHaveValue('')
    expect(screen.getByLabelText(/Dirección/i)).toHaveValue('')
  })
})
