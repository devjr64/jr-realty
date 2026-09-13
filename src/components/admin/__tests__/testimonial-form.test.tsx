import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mockFormAction, mockUseActionState, mockCreateAction, mockUpdateAction } = vi.hoisted(() => {
  const mockFormAction = vi.fn(async (...args: unknown[]) => {
    const _fd = args.find((a) => a instanceof FormData)
    void _fd
    return { success: true } as Record<string, unknown>
  })
  const mockUseActionState = vi.fn(
    () => [{}, mockFormAction, false] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean],
  )
  const mockCreateAction = vi.fn(async (...args: unknown[]) => {
    const _fd = args.find((a) => a instanceof FormData)
    void _fd
    return { success: true } as Record<string, unknown>
  })
  const mockUpdateAction = vi.fn(async (...args: unknown[]) => {
    const _fd = args.find((a) => a instanceof FormData)
    void _fd
    return { success: true } as Record<string, unknown>
  })
  return { mockFormAction, mockUseActionState, mockCreateAction, mockUpdateAction }
})

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

vi.mock('@/server/actions/testimonial.actions', () => ({
  createTestimonialAction: (...args: unknown[]) => mockCreateAction(...args),
  updateTestimonialAction: (...args: unknown[]) => mockUpdateAction(...args),
}))

vi.mock('react', async () => {
  const actual = (await vi.importActual('react')) as Record<string, unknown>
  return {
    ...actual,
    useActionState: (...args: unknown[]) =>
      (mockUseActionState as unknown as (...a: unknown[]) => unknown)(...args),
  }
})

import { TestimonialForm } from '@/components/admin/testimonial-form'

describe('TestimonialForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseActionState.mockImplementation(
      () => [{}, mockFormAction, false] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean],
    )
  })

  it('renders name, role, content, rating and active fields', () => {
    // Arrange & Act
    render(<TestimonialForm initial={null} />)
    // Assert
    expect(screen.getByLabelText(/Nombre/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Rol \/ perfil/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Calificación/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Testimonio/i)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Activo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Crear testimonio/i })).toBeInTheDocument()
  })

  it('defaults rating 5 and allows selecting 1-5 stars', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<TestimonialForm initial={null} />)
    const select = screen.getByLabelText(/Calificación/i) as HTMLSelectElement
    // Assert default 5
    expect(select.value).toBe('5')
    // Options 5..1 exist with star glyphs
    expect(screen.getByRole('option', { name: '★★★★★' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '★☆☆☆☆' })).toBeInTheDocument()
    // Act
    await user.selectOptions(select, '3')
    expect(select.value).toBe('3')
    await user.selectOptions(select, '1')
    expect(select.value).toBe('1')
  })

  it('renders with initial values including role and active false', () => {
    // Arrange
    const initial = {
      id: 't1',
      name: 'María González',
      role: 'Propietario',
      content: 'Excelente servicio, muy recomendado para todos.',
      rating: 4,
      active: false,
    }
    // Act
    render(<TestimonialForm initial={initial} />)
    // Assert
    expect(screen.getByLabelText(/Nombre/i)).toHaveValue('María González')
    expect(screen.getByLabelText(/Rol \/ perfil/i)).toHaveValue('Propietario')
    expect(screen.getByLabelText(/Testimonio/i)).toHaveValue('Excelente servicio, muy recomendado para todos.')
    expect((screen.getByLabelText(/Calificación/i) as HTMLSelectElement).value).toBe('4')
    expect(screen.getByRole('checkbox', { name: /Activo/i })).not.toBeChecked()
    expect(screen.getByRole('button', { name: /Guardar cambios/i })).toBeInTheDocument()
  })

  it('allows typing name, role, content', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<TestimonialForm initial={null} />)
    const name = screen.getByLabelText(/Nombre/i) as HTMLInputElement
    const role = screen.getByLabelText(/Rol \/ perfil/i) as HTMLInputElement
    const content = screen.getByLabelText(/Testimonio/i) as HTMLTextAreaElement
    // Act
    await user.type(name, 'Pedro Lopez')
    await user.type(role, 'Comprador')
    await user.type(content, 'Testimonio suficientemente largo con más de diez caracteres.')
    // Assert
    expect(name.value).toBe('Pedro Lopez')
    expect(role.value).toBe('Comprador')
    expect(content.value).toContain('Testimonio suficiente')
  })

  it('toggles active checkbox', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<TestimonialForm initial={null} />)
    const checkbox = screen.getByRole('checkbox', { name: /Activo/i }) as HTMLInputElement
    // Act & Assert - default true
    expect(checkbox.checked).toBe(true)
    await user.click(checkbox)
    expect(checkbox.checked).toBe(false)
  })

  it('fills and submits captures FormData with name/content/rating', async () => {
    // Arrange
    const user = userEvent.setup()
    const captured: FormData[] = []
    mockFormAction.mockImplementation(async (...args: unknown[]) => {
      const fd = args.find((a) => a instanceof FormData) as FormData | undefined
      if (fd) captured.push(fd)
      return { success: true } as Record<string, unknown>
    })
    render(<TestimonialForm initial={null} />)
    // Act
    await user.type(screen.getByLabelText(/Nombre/i), 'Carlos Rivera')
    await user.type(screen.getByLabelText(/Testimonio/i), 'Un servicio impecable, totalmente recomendado sin duda.')
    await user.selectOptions(screen.getByLabelText(/Calificación/i), '5')
    await user.click(screen.getByRole('button', { name: /Crear testimonio/i }))
    // Assert
    await waitFor(() => expect(mockFormAction).toHaveBeenCalled())
    const fd =
      (captured[0] ??
        (mockFormAction.mock.calls[0]?.[1] as FormData | undefined) ??
        (mockFormAction.mock.calls[0]?.[0] as FormData | undefined)) as FormData | undefined
    expect(fd).toBeInstanceOf(FormData)
    expect(fd?.get('name')).toBe('Carlos Rivera')
    expect(String(fd?.get('rating'))).toBe('5')
    expect(String(fd?.get('content'))).toContain('servicio impecable')
  })

  it('displays fieldErrors and alert on validation error', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([
      {
        error: 'Revisa los campos del formulario.',
        fieldErrors: {
          name: 'El nombre debe tener al menos 2 caracteres',
          content: 'El testimonio debe tener al menos 10 caracteres',
          rating: 'Calificación inválida',
        },
      },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<TestimonialForm initial={null} />)
    // Assert
    expect(screen.getByText('El nombre debe tener al menos 2 caracteres')).toBeInTheDocument()
    expect(screen.getByText('El testimonio debe tener al menos 10 caracteres')).toBeInTheDocument()
    expect(screen.getByText('Calificación inválida')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Revisa los campos del formulario.')
    expect(screen.getByLabelText(/Nombre/i)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText(/Testimonio/i)).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows success banner', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([{ success: true }, mockFormAction, false] as unknown as [
      Record<string, unknown>,
      typeof mockFormAction,
      boolean,
    ])
    // Act
    render(<TestimonialForm initial={null} />)
    // Assert
    expect(screen.getByRole('status')).toHaveTextContent('Testimonio guardado correctamente.')
  })

  it('disables inputs when pending', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([{}, mockFormAction, true] as unknown as [
      Record<string, unknown>,
      typeof mockFormAction,
      boolean,
    ])
    // Act
    render(<TestimonialForm initial={null} />)
    // Assert
    expect(screen.getByLabelText(/Nombre/i)).toBeDisabled()
    expect(screen.getByLabelText(/Testimonio/i)).toBeDisabled()
    expect(screen.getByLabelText(/Calificación/i)).toBeDisabled()
    expect(screen.getByRole('button', { name: /Guardando/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Guardando/i })).toHaveAttribute('aria-busy', 'true')
  })

  it('edit mode renders hidden id', () => {
    // Arrange
    const initial = { id: 'testi-1', name: 'Ana', role: null, content: 'Contenido largo suficiente aquí', rating: 5, active: true }
    // Act
    const { container } = render(<TestimonialForm initial={initial} />)
    // Assert
    expect(container.querySelector('input[name="id"]')).toHaveValue('testi-1')
  })
})
