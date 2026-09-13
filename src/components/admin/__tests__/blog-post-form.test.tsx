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

vi.mock('@/components/admin/block-editor', () => ({
  BlockEditor: ({ value }: { value: unknown[] }) =>
    React.createElement('div', { 'data-testid': 'block-editor', 'data-count': String(value.length) }),
}))

vi.mock('@/components/shared/markdown-renderer', () => ({
  MarkdownRenderer: ({ content }: { content: string }) =>
    React.createElement('div', { 'data-testid': 'markdown-preview' }, content),
}))

vi.mock('@/server/actions/blog-post.actions', () => ({
  createBlogPostAction: (...args: unknown[]) => mockCreateAction(...args),
  updateBlogPostAction: (...args: unknown[]) => mockUpdateAction(...args),
}))

vi.mock('react', async () => {
  const actual = (await vi.importActual('react')) as Record<string, unknown>
  return {
    ...actual,
    useActionState: (...args: unknown[]) =>
      (mockUseActionState as unknown as (...a: unknown[]) => unknown)(...args),
  }
})

import { BlogPostForm } from '@/components/admin/blog-post-form'

describe('BlogPostForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseActionState.mockImplementation(
      () => [{}, mockFormAction, false] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean],
    )
  })

  it('renders title, excerpt, coverImage, published and markdown toggle', () => {
    // Arrange & Act
    render(<BlogPostForm initial={null} />)
    // Assert
    expect(screen.getByLabelText(/Título/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Extracto/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/imagen de portada/i)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Publicar/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Markdown simple/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /Bloques/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Contenido Markdown')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Publicar entrada/i })).toBeInTheDocument()
  })

  it('renders with string content as markdown and shows preview', () => {
    // Arrange
    const initial = {
      title: 'Post existente',
      excerpt: 'Resumen',
      content: '## Hola\nContenido con más de veinte caracteres.',
      coverImage: null,
      published: false,
    }
    // Act
    render(<BlogPostForm initial={initial} />)
    // Assert
    expect(screen.getByLabelText('Contenido Markdown')).toHaveValue('## Hola\nContenido con más de veinte caracteres.')
    expect(screen.getByTestId('markdown-preview')).toBeInTheDocument()
  })

  it('renders blocks array and switches mode to bloques', () => {
    // Arrange
    const initial = {
      title: 'Con bloques',
      excerpt: null,
      content: [
        { type: 'hero', title: 'Hero' },
        { type: 'text', title: 'Sección', body: 'Texto' },
      ],
      coverImage: null,
      published: true,
    }
    // Act
    render(<BlogPostForm initial={initial as unknown as typeof initial} />)
    // Assert
    expect(screen.getByRole('tab', { name: /Bloques/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('block-editor')).toBeInTheDocument()
    expect(screen.getByTestId('block-editor')).toHaveAttribute('data-count', '2')
  })

  it('toggles between markdown and bloques modes', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<BlogPostForm initial={null} />)
    const markdownTab = screen.getByRole('tab', { name: /Markdown simple/i })
    const bloquesTab = screen.getByRole('tab', { name: /Bloques/i })
    // Act & Assert - initially markdown
    expect(markdownTab).toHaveAttribute('aria-selected', 'true')
    await user.click(bloquesTab)
    expect(bloquesTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('block-editor')).toBeInTheDocument()
    await user.click(markdownTab)
    expect(markdownTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('Contenido Markdown')).toBeInTheDocument()
  })

  it('typing in markdown textarea updates hidden content', async () => {
    // Arrange
    const user = userEvent.setup()
    const { container } = render(<BlogPostForm initial={null} />)
    const textarea = screen.getByLabelText('Contenido Markdown')
    // Act
    await user.type(textarea, 'Nuevo contenido markdown largo suficiente')
    // Assert
    const hidden = container.querySelector('input[name="content"]') as HTMLInputElement
    expect(hidden).toBeInTheDocument()
    const parsed = JSON.parse(hidden.value) as Array<Record<string, unknown>>
    expect(parsed[0].type).toBe('markdown')
    expect(parsed[0].content).toContain('Nuevo contenido')
  })

  it('parses JSON-encoded blocks string and handles empty/invalid strings', () => {
    // Arrange - JSON stringified blocks should be parsed into blocks
    const jsonBlocks = JSON.stringify([{ type: 'markdown', content: 'Desde JSON' }])
    const initialJson = {
      title: 'JSON',
      excerpt: null,
      content: jsonBlocks,
      coverImage: null,
      published: false,
    }
    // Act
    const { rerender, unmount, container } = render(<BlogPostForm initial={initialJson as unknown as typeof initialJson} />)
    // Assert - parsed to markdown mode with value From JSON
    expect(screen.getByLabelText('Contenido Markdown')).toHaveValue('Desde JSON')
    // Empty string -> no blocks -> markdown mode empty
    rerender(
      <BlogPostForm
        initial={{ title: 'Vacio', excerpt: null, content: '   ', coverImage: null, published: false }}
      />,
    )
    expect(container.querySelector('input[name="content"]')).toBeInTheDocument()
    // Invalid JSON starting with [ should fallback to markdown single block (catch branch)
    unmount()
    const { rerender: rerender2, container: container2 } = render(
      <BlogPostForm
        initial={{ title: 'Inv', excerpt: null, content: '[no-json', coverImage: null, published: false }}
      />,
    )
    expect(screen.getByLabelText('Contenido Markdown')).toHaveValue('[no-json')
    // Non-block array fallback
    rerender2(
      <BlogPostForm
        initial={{
          title: 'Bad array',
          excerpt: null,
          content: [{ foo: 'bar' }],
          coverImage: null,
          published: false,
        }}
      />,
    )
    expect(container2.querySelector('input[name="content"]')).toBeInTheDocument()
  })

  it('fills required fields and submits triggers formAction with FormData', async () => {
    // Arrange
    const user = userEvent.setup()
    const captured: FormData[] = []
    mockFormAction.mockImplementation(async (...args: unknown[]) => {
      const fd = args.find((a) => a instanceof FormData) as FormData | undefined
      if (fd) captured.push(fd)
      return { success: true } as Record<string, unknown>
    })
    render(<BlogPostForm initial={null} />)
    const title = screen.getByLabelText(/Título/i)
    const markdown = screen.getByLabelText('Contenido Markdown')
    // Act
    await user.type(title, 'Guía para comprar apartamento en Venezuela')
    await user.type(markdown, 'Contenido markdown suficiente con más de veinte caracteres.')
    await user.click(screen.getByRole('button', { name: /Publicar entrada/i }))
    // Assert
    await waitFor(() => expect(mockFormAction).toHaveBeenCalled())
    const fd =
      (captured[0] ??
        (mockFormAction.mock.calls[0]?.[1] as FormData | undefined) ??
        (mockFormAction.mock.calls[0]?.[0] as FormData | undefined)) as FormData | undefined
    expect(fd).toBeInstanceOf(FormData)
    expect(fd?.get('title')).toBe('Guía para comprar apartamento en Venezuela')
    const content = fd?.get('content') as string
    expect(content).toContain('Contenido markdown')
  })

  it('displays fieldErrors and alert on validation failure', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([
      {
        error: 'Revisa los campos del formulario.',
        fieldErrors: {
          title: 'El título debe tener al menos 3 caracteres',
          content: 'El contenido debe tener al menos 20 caracteres',
        },
      },
      mockFormAction,
      false,
    ] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    // Act
    render(<BlogPostForm initial={null} />)
    // Assert
    expect(screen.getByText('El título debe tener al menos 3 caracteres')).toBeInTheDocument()
    expect(screen.getByText('El contenido debe tener al menos 20 caracteres')).toBeInTheDocument()
    const alerts = screen.getAllByRole('alert')
    expect(alerts.some((el) => el.textContent?.includes('Revisa los campos del formulario.'))).toBe(true)
    expect(screen.getByLabelText(/Título/i)).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows success status banner', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([{ success: true }, mockFormAction, false] as unknown as [
      Record<string, unknown>,
      typeof mockFormAction,
      boolean,
    ])
    // Act
    render(<BlogPostForm initial={null} />)
    // Assert
    expect(screen.getByRole('status')).toHaveTextContent('Publicación guardada correctamente.')
  })

  it('disables inputs and shows pendingText when isPending true', () => {
    // Arrange
    mockUseActionState.mockReturnValueOnce([{}, mockFormAction, true] as unknown as [
      Record<string, unknown>,
      typeof mockFormAction,
      boolean,
    ])
    // Act
    render(<BlogPostForm initial={null} />)
    // Assert
    expect(screen.getByLabelText(/Título/i)).toBeDisabled()
    expect(screen.getByLabelText('Contenido Markdown')).toBeDisabled()
    expect(screen.getByRole('button', { name: /Guardando/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Guardando/i })).toHaveAttribute('aria-busy', 'true')
  })

  it('edit mode renders hidden id and save label', () => {
    // Arrange
    const initial = {
      id: 'post-123',
      title: 'Existente',
      excerpt: 'Resumen',
      content: 'Contenido existente suficiente largo',
      coverImage: 'https://example.com/img.jpg',
      published: true,
    }
    // Act
    const { container } = render(<BlogPostForm initial={initial} />)
    // Assert
    expect(container.querySelector('input[name="id"]')).toHaveValue('post-123')
    expect(screen.getByRole('button', { name: /Guardar cambios/i })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Publicar/i })).toBeChecked()
  })

  it('includes hidden content JSON field', () => {
    // Arrange & Act
    const { container } = render(<BlogPostForm initial={null} />)
    // Assert
    expect(container.querySelector('input[name="content"]')).toBeInTheDocument()
  })
})
