import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mockLeadAction, mockFormAction, mockUseActionState } = vi.hoisted(() => {
  const mockFormAction = vi.fn(async (...args: unknown[]) => {
    const _fd = args.find((a) => a instanceof FormData)
    void _fd
    return { success: true } as Record<string, unknown>
  })
  const mockUseActionState = vi.fn(
    () => [{}, mockFormAction, false] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean],
  )
  const mockLeadAction = vi.fn(async (...args: unknown[]) => {
    const _fd = args.find((a) => a instanceof FormData)
    void _fd
    return { success: true } as Record<string, unknown>
  })
  return { mockLeadAction, mockFormAction, mockUseActionState }
})

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('nextjs-toploader', () => ({ default: () => null }))

vi.mock('@/server/actions/lead.actions', () => ({
  createLeadAction: (...args: unknown[]) => mockLeadAction(...args),
}))

vi.mock('react', async () => {
  const actual = (await vi.importActual('react')) as Record<string, unknown>
  return {
    ...actual,
    useActionState: (...args: unknown[]) =>
      (mockUseActionState as unknown as (...a: unknown[]) => unknown)(...args),
  }
})

import { LeadForm } from '@/components/public/lead-form'

describe('LeadForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseActionState.mockImplementation(
      () => [{}, mockFormAction, false] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean],
    )
    mockFormAction.mockClear()
    mockLeadAction.mockClear()
  })

  it('renders public form with required name/email and optional phone/message (no auth)', () => {
    // Arrange & Act
    render(<LeadForm />)
    // Assert — getByRole verified, no auth guard visible
    expect(screen.getByRole('textbox', { name: /Nombre/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /Correo electrónico/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/Teléfono/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Mensaje/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Enviar solicitud/i })).toBeInTheDocument()
    // honeypot hidden field
    const honeypot = document.querySelector('input[name="website"]') as HTMLInputElement
    expect(honeypot).toBeInTheDocument()
    expect(honeypot.className).toContain('hidden')
    expect(honeypot.getAttribute('aria-hidden')).toBe('true')
  })

  it('validates required name/email via required attributes', () => {
    // Arrange & Act
    render(<LeadForm />)
    // Assert — HTML required attribute (client validation)
    expect(screen.getByRole('textbox', { name: /Nombre/i })).toBeRequired()
    expect(screen.getByLabelText(/Correo electrónico/i)).toBeRequired()
    expect(screen.getByLabelText(/Teléfono/i)).not.toBeRequired()
    expect(screen.getByLabelText(/Mensaje/i)).not.toBeRequired()
  })

  it('includes hidden propertyId field when propertyId prop provided', () => {
    // Arrange & Act
    const { container } = render(<LeadForm propertyId="prop-abc-123" />)
    // Assert — hidden field acceptance
    const hidden = container.querySelector('input[name="propertyId"]') as HTMLInputElement
    expect(hidden).toBeInTheDocument()
    expect(hidden.type).toBe('hidden')
    expect(hidden.value).toBe('prop-abc-123')
  })

  it('does not render propertyId hidden when not provided', () => {
    // Arrange & Act
    const { container } = render(<LeadForm />)
    // Assert
    expect(container.querySelector('input[name="propertyId"]')).toBeNull()
  })

  it('allows typing name/email via userEvent.type', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<LeadForm />)
    const nameInput = screen.getByRole('textbox', { name: /Nombre/i }) as HTMLInputElement
    const emailInput = screen.getByLabelText(/Correo electrónico/i) as HTMLInputElement
    // Act
    await user.type(nameInput, 'Valentina Pérez')
    await user.type(emailInput, 'valentina@test.com')
    // Assert
    expect(nameInput.value).toBe('Valentina Pérez')
    expect(emailInput.value).toBe('valentina@test.com')
  })

  it('submits with optional phone/message emptyToNull (empty strings sent, server converts to null)', async () => {
    // Arrange
    const user = userEvent.setup()
    const captured: FormData[] = []
    mockFormAction.mockImplementation(async (...args: unknown[]) => {
      const fd = args.find((a) => a instanceof FormData) as FormData | undefined
      if (fd) captured.push(fd)
      return { success: true } as Record<string, unknown>
    })
    render(<LeadForm propertyId="prop-xyz" />)

    const nameInput = screen.getByLabelText(/Nombre/i)
    const emailInput = screen.getByLabelText(/Correo electrónico/i)
    // Act — fill only required, leave phone/message empty (emptyToNull scenario)
    await user.type(nameInput, 'Juan Pérez')
    await user.type(emailInput, 'juan@test.com')
    // phone and message remain empty
    await user.click(screen.getByRole('button', { name: /Enviar solicitud/i }))

    // Assert — formAction called with FormData
    await waitFor(() => expect(mockFormAction).toHaveBeenCalled())
    const fd =
      (captured[0] ??
        (mockFormAction.mock.calls[0]?.[1] as FormData | undefined) ??
        (mockFormAction.mock.calls[0]?.[0] as FormData | undefined)) as FormData | undefined
    expect(fd).toBeInstanceOf(FormData)
    expect(fd?.get('name')).toBe('Juan Pérez')
    expect(fd?.get('email')).toBe('juan@test.com')
    // optional fields sent as empty string → server emptyToNull converts to null
    expect(fd?.get('phone')).toBe('')
    expect(fd?.get('message')).toBe('')
    expect(fd?.get('propertyId')).toBe('prop-xyz')
    // honeypot empty for humans
    expect(fd?.get('website')).toBe('')
  })

  it('submits with phone and message filled', async () => {
    // Arrange
    const user = userEvent.setup()
    const captured: FormData[] = []
    mockFormAction.mockImplementation(async (...args: unknown[]) => {
      const fd = args.find((a) => a instanceof FormData) as FormData | undefined
      if (fd) captured.push(fd)
      return { success: true } as Record<string, unknown>
    })
    render(<LeadForm />)

    // Act
    await user.type(screen.getByLabelText(/Nombre/i), 'Ana')
    await user.type(screen.getByLabelText(/Correo electrónico/i), 'ana@test.com')
    await user.type(screen.getByLabelText(/Teléfono/i), '+58 212-555-0000')
    await user.type(screen.getByLabelText(/Mensaje/i), 'Me interesa agendar visita')
    await user.click(screen.getByRole('button', { name: /Enviar solicitud/i }))

    // Assert
    await waitFor(() => expect(mockFormAction).toHaveBeenCalled())
    const fd =
      (captured[0] ??
        (mockFormAction.mock.calls[0]?.[1] as FormData | undefined) ??
        (mockFormAction.mock.calls[0]?.[0] as FormData | undefined)) as FormData | undefined
    expect(fd).toBeInstanceOf(FormData)
    expect(fd?.get('phone')).toBe('+58 212-555-0000')
    expect(fd?.get('message')).toBe('Me interesa agendar visita')
  })

  it('shows error banner when state.error present', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([
      { error: 'No se pudo enviar el formulario. Intenta de nuevo.' },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<LeadForm />)
    // Assert
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo enviar el formulario. Intenta de nuevo.')
  })

  it('shows success banner and hides form fields when state.success', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([{ success: true }, mockFormAction, false] as unknown as [
      Record<string, unknown>,
      typeof mockFormAction,
      boolean,
    ])
    // Act
    render(<LeadForm />)
    // Assert
    expect(screen.getByRole('status')).toHaveTextContent('¡Gracias! Un asesor te contactará')
    expect(screen.queryByRole('textbox', { name: /Nombre/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Enviar solicitud/i })).not.toBeInTheDocument()
  })

  it('uses compact rows for message when compact prop true', () => {
    // Arrange & Act
    render(<LeadForm compact />)
    // Assert
    const message = screen.getByLabelText(/Mensaje/i) as HTMLTextAreaElement
    expect(message.rows).toBe(3)
  })
})
