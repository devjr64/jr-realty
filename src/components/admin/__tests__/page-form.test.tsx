import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mockFormAction, mockUseActionState, mockCreateAction, mockUpdateAction } = vi.hoisted(() => {
  const mockFormAction = vi.fn(async (...args: unknown[]) => {
    const fd = args.find((a) => a instanceof FormData)
    void fd
    return { success: true } as Record<string, unknown>
  })
  const mockUseActionState = vi.fn(
    () => [{}, mockFormAction, false] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean],
  )
  const mockCreateAction = vi.fn(async (...args: unknown[]) => {
    const fd = args.find((a) => a instanceof FormData)
    void fd
    return { success: true } as Record<string, unknown>
  })
  const mockUpdateAction = vi.fn(async (...args: unknown[]) => {
    const fd = args.find((a) => a instanceof FormData)
    void fd
    return { success: true } as Record<string, unknown>
  })
  return { mockFormAction, mockUseActionState, mockCreateAction, mockUpdateAction }
})

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

vi.mock('@/server/actions/page.actions', () => ({
  createPageAction: (...args: unknown[]) => mockCreateAction(...args),
  updatePageAction: (...args: unknown[]) => mockUpdateAction(...args),
}))

vi.mock('@/components/admin/block-editor', () => ({
  BlockEditor: ({ value }: { value: unknown[] }) =>
    React.createElement('div', {
      'data-testid': 'block-editor',
      'data-count': String(value.length),
    }),
}))

vi.mock('react', async () => {
  const actual = (await vi.importActual('react')) as Record<string, unknown>
  return {
    ...actual,
    useActionState: (...args: unknown[]) =>
      (mockUseActionState as unknown as (...a: unknown[]) => unknown)(...args),
  }
})

import { PageForm } from '@/components/admin/page-form'
import { toast } from 'sonner'

describe('PageForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseActionState.mockImplementation(
      () => [{}, mockFormAction, false] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean],
    )
    mockFormAction.mockClear()
    mockCreateAction.mockClear()
    mockUpdateAction.mockClear()
  })

  it('renders create mode with Crear página button', () => {
    // Arrange & Act
    render(<PageForm />)
    // Assert
    expect(screen.getByRole('button', { name: /Crear página/i })).toBeInTheDocument()
  })

  it('renders title and meta fields in create mode', () => {
    // Arrange & Act
    render(<PageForm />)
    // Assert
    expect(screen.getByLabelText(/^Título/i)).toBeInTheDocument()
  })

  it('does not render hidden id in create mode', () => {
    // Arrange & Act
    const { container } = render(<PageForm />)
    // Assert
    expect(container.querySelector('input[name="id"]')).toBeNull()
  })

  it('renders hidden content input with empty array default', () => {
    // Arrange & Act
    const { container } = render(<PageForm />)
    // Assert
    expect(container.querySelector('input[name="content"]')).toHaveAttribute('value', '[]')
  })

  it('renders edit mode with hidden id and Guardar cambios', () => {
    // Arrange
    const initial = {
      id: 'page-1',
      title: 'Sobre nosotros',
      metaTitle: 'Sobre',
      metaDescription: 'Desc',
      published: true,
      content: [{ type: 'text', title: 'Hola', body: 'mundo' }] as never[],
    }
    // Act
    const { container } = render(<PageForm initial={initial} />)
    // Assert
    expect(container.querySelector('input[name="id"]')).toHaveValue('page-1')
  })

  it('shows Guardar cambios button in edit mode', () => {
    // Arrange
    const initial = {
      id: 'page-1',
      title: 'Sobre nosotros',
      metaTitle: null,
      metaDescription: null,
      published: false,
      content: [],
    }
    // Act
    render(<PageForm initial={initial} />)
    // Assert
    expect(screen.getByRole('button', { name: /Guardar cambios/i })).toBeInTheDocument()
  })

  it('pre-fills title and meta in edit mode', () => {
    // Arrange
    const initial = {
      id: 'page-1',
      title: 'Sobre nosotros',
      metaTitle: 'Meta title',
      metaDescription: 'Meta desc',
      published: true,
      content: [],
    }
    // Act
    render(<PageForm initial={initial} />)
    // Assert
    expect(screen.getByLabelText(/^Título/i)).toHaveValue('Sobre nosotros')
  })

  it('checks published when initial published true', () => {
    // Arrange
    const initial = {
      id: 'page-1',
      title: 'Test',
      metaTitle: null,
      metaDescription: null,
      published: true,
      content: [],
    }
    // Act
    render(<PageForm initial={initial} />)
    // Assert
    expect(screen.getByLabelText(/Publicar página/i)).toBeChecked()
  })

  it('renders block editor with correct count from initial', () => {
    // Arrange
    const initial = {
      id: 'page-1',
      title: 'Test',
      metaTitle: null,
      metaDescription: null,
      published: false,
      content: [{ type: 'hero', title: 'H1' }] as never[],
    }
    // Act
    render(<PageForm initial={initial} />)
    // Assert
    expect(screen.getByTestId('block-editor')).toHaveAttribute('data-count', '1')
  })

  it('disables inputs and shows Guardando… when pending', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([{}, mockFormAction, true] as unknown as [
      Record<string, unknown>,
      typeof mockFormAction,
      boolean,
    ])
    // Act
    render(<PageForm />)
    // Assert
    expect(screen.getByRole('button', { name: /Guardando…/i })).toBeInTheDocument()
  })

  it('disables title input when pending', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([{}, mockFormAction, true] as unknown as [
      Record<string, unknown>,
      typeof mockFormAction,
      boolean,
    ])
    // Act
    render(<PageForm />)
    // Assert
    expect(screen.getByLabelText(/^Título/i)).toBeDisabled()
  })

  it('displays fieldErrors for title', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([
      { fieldErrors: { title: 'El título debe tener al menos 2 caracteres' } },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<PageForm />)
    // Assert
    expect(screen.getByText('El título debe tener al menos 2 caracteres')).toBeInTheDocument()
  })

  it('displays fieldErrors for metaDescription', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([
      { fieldErrors: { metaDescription: 'Meta descripción demasiado larga' } },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<PageForm />)
    // Assert
    expect(screen.getByText('Meta descripción demasiado larga')).toBeInTheDocument()
  })

  it('displays fieldErrors for metaTitle', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([
      { fieldErrors: { metaTitle: 'Meta título demasiado largo' } },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<PageForm />)
    // Assert
    expect(screen.getByText('Meta título demasiado largo')).toBeInTheDocument()
  })

  it('marks title with aria-invalid when fieldError present', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([
      { fieldErrors: { title: 'El título debe tener al menos 2 caracteres' } },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<PageForm />)
    // Assert
    expect(screen.getByLabelText(/^Título/i)).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows error alert when state.error present', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([
      { error: 'Revisa los campos del formulario.' },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<PageForm />)
    // Assert
    expect(screen.getByRole('alert')).toHaveTextContent('Revisa los campos del formulario.')
  })

  it('shows success banner when state.success true', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([{ success: true }, mockFormAction, false] as unknown as [
      Record<string, unknown>,
      typeof mockFormAction,
      boolean,
    ])
    // Act
    render(<PageForm />)
    // Assert
    expect(screen.getByRole('status')).toHaveTextContent('Página guardada correctamente.')
  })

  it('triggers toast success on state.success', async () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([{ success: true }, mockFormAction, false] as unknown as [
      Record<string, unknown>,
      typeof mockFormAction,
      boolean,
    ])
    // Act
    render(<PageForm />)
    // Assert
    await waitFor(() => expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Página guardada correctamente.'))
  })

  it('triggers toast error on state.error', async () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([
      { error: 'No se pudo crear la página. Intenta de nuevo.' },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<PageForm />)
    // Assert
    await waitFor(() => expect(vi.mocked(toast.error)).toHaveBeenCalledWith('No se pudo crear la página. Intenta de nuevo.'))
  })

  it('fills valid title and submits with FormData containing title and slug behavior', async () => {
    // Arrange
    const user = userEvent.setup()
    const captured: FormData[] = []
    mockFormAction.mockImplementation(async (...args: unknown[]) => {
      const fd = args.find((a) => a instanceof FormData) as FormData | undefined
      if (fd) captured.push(fd)
      return { success: true } as Record<string, unknown>
    })
    render(<PageForm />)
    // Act
    await user.type(screen.getByLabelText(/^Título/i), 'Sobre nosotros')
    await user.type(screen.getByLabelText(/Meta título/i), 'SEO title')
    await user.type(screen.getByLabelText(/Meta descripción/i), 'SEO desc')
    await user.click(screen.getByLabelText(/Publicar página/i))
    await user.click(screen.getByRole('button', { name: /Crear página/i }))
    // Assert
    await waitFor(() => expect(mockFormAction).toHaveBeenCalled())
    const fd =
      (captured[0] ??
        (mockFormAction.mock.calls[0]?.[1] as FormData | undefined) ??
        (mockFormAction.mock.calls[0]?.[0] as FormData | undefined)) as FormData | undefined
    expect(fd).toBeInstanceOf(FormData)
    expect(fd?.get('title')).toBe('Sobre nosotros')
    expect(fd?.get('metaTitle')).toBe('SEO title')
    expect(fd?.get('published')).toBe('on')
    expect(fd?.get('content')).toBe('[]')
  })

  it('does not toast success when fieldErrors present', async () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([
      { error: 'Revisa los campos del formulario.', fieldErrors: { title: 'El título debe tener al menos 2 caracteres' } },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<PageForm />)
    // Assert
    await waitFor(() => expect(vi.mocked(toast.error)).toHaveBeenCalled())
    expect(vi.mocked(toast.success)).not.toHaveBeenCalled()
  })

  it('renders hidden content input with initial blocks JSON', () => {
    // Arrange
    const blocks = [{ type: 'text', title: 'A', body: 'B' }] as never[]
    const initial = {
      id: 'page-1',
      title: 'T',
      metaTitle: null,
      metaDescription: null,
      published: false,
      content: blocks,
    }
    // Act
    const { container } = render(<PageForm initial={initial} />)
    // Assert
    expect(container.querySelector('input[name="content"]')).toHaveAttribute('value', JSON.stringify(blocks))
  })
})
