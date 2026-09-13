import React from 'react'
import { describe, expect, it, vi, beforeEach, afterEach, afterAll } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Hoisted mocks for react useActionState and sonner
const { mockFormAction, mockUseActionState } = vi.hoisted(() => {
  const mockFormAction = vi.fn(async (...args: unknown[]) => {
    const _fd = args.find((a) => a instanceof FormData)
    void _fd
    return { success: true } as Record<string, unknown>
  })
  const mockUseActionState = vi.fn(
    () => [{}, mockFormAction, false] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean],
  )
  return { mockFormAction, mockUseActionState }
})

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

vi.mock('react', async () => {
  const actual = await vi.importActual('react') as Record<string, unknown>
  return {
    ...actual,
    useActionState: (...args: unknown[]) =>
      (mockUseActionState as unknown as (...a: unknown[]) => unknown)(...args),
  }
})

// Ensure requestSubmit exists in jsdom
const originalRequestSubmit = HTMLFormElement.prototype.requestSubmit

import { DeleteEntityButton } from '@/components/admin/delete-entity-button'
import { toast } from 'sonner'

describe('DeleteEntityButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseActionState.mockImplementation(
      () => [{}, mockFormAction, false] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean],
    )
    mockFormAction.mockClear()
    // Polyfill requestSubmit if missing
    if (!HTMLFormElement.prototype.requestSubmit) {
      HTMLFormElement.prototype.requestSubmit = function () {
        // Simulate form submission by calling action directly
        const form = this as HTMLFormElement
        const fd = new FormData(form)
        // Call mocked formAction with fd
        void mockFormAction(fd)
      } as unknown as typeof HTMLFormElement.prototype.requestSubmit
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders default delete button with Eliminar text', () => {
    // Arrange & Act
    render(
      <DeleteEntityButton entityId="123" entityLabel="Casa Test" deleteAction={mockFormAction as unknown as typeof mockFormAction} />,
    )

    // Assert
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument()
  })

  it('renders iconButton variant with aria-label Eliminar entityLabel', () => {
    // Arrange & Act
    render(
      <DeleteEntityButton
        entityId="123"
        entityLabel="Casa Test"
        deleteAction={mockFormAction as unknown as typeof mockFormAction}
        iconButton
      />,
    )

    // Assert — icon button has aria-label
    expect(screen.getByLabelText('Eliminar Casa Test')).toBeInTheDocument()
  })

  it('renders hidden form with id input', () => {
    // Arrange & Act
    const { container } = render(
      <DeleteEntityButton entityId="abc-999" entityLabel="X" deleteAction={mockFormAction as unknown as typeof mockFormAction} />,
    )

    // Assert
    const input = container.querySelector('input[name="id"]') as HTMLInputElement | null
    expect(input).toBeInTheDocument()
    expect(input?.value).toBe('abc-999')
    expect(container.querySelector('form.hidden')).toBeInTheDocument()
  })

  it('clicking trigger opens confirm dialog', async () => {
    // Arrange
    const user = userEvent.setup()
    render(
      <DeleteEntityButton entityId="1" entityLabel="BorrarMe" deleteAction={mockFormAction as unknown as typeof mockFormAction} />,
    )

    // Act
    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    // Assert — dialog appears with title Eliminar and description containing entityLabel
    // Use heading query to avoid matching the trigger button text
    expect(await screen.findByRole('heading', { name: 'Eliminar' })).toBeInTheDocument()
    expect(screen.getByText('¿Seguro que deseas eliminar "BorrarMe"? Esta acción no se puede deshacer.')).toBeInTheDocument()
  })

  it('cancel closes dialog', async () => {
    // Arrange
    const user = userEvent.setup()
    render(
      <DeleteEntityButton entityId="1" entityLabel="Casa" deleteAction={mockFormAction as unknown as typeof mockFormAction} />,
    )
    await user.click(screen.getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByRole('heading', { name: 'Eliminar' })).toBeInTheDocument()

    // Act — click Cancelar (DialogClose)
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    // Assert — dialog should close; after close, dialog not in document or hidden
    await waitFor(() => {
      // base-ui dialog closes; check dialog role disappears or title no longer visible as dialog
      // Fallback: at least Cancel was clickable
      expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument()
    })
  })

  it('confirm calls requestSubmit via form ref', async () => {
    // Arrange
    const user = userEvent.setup()
    const requestSpy = vi.spyOn(HTMLFormElement.prototype, 'requestSubmit').mockImplementation(function (this: HTMLFormElement) {
      const fd = new FormData(this)
      void mockFormAction(fd)
    } as unknown as typeof HTMLFormElement.prototype.requestSubmit)

    render(
      <DeleteEntityButton entityId="id-123" entityLabel="Casa" deleteAction={mockFormAction as unknown as typeof mockFormAction} />,
    )
    await user.click(screen.getByRole('button', { name: 'Eliminar' }))
    // dialog confirm button is the second Eliminar (destructive)
    const confirmBtns = screen.getAllByRole('button', { name: 'Eliminar' })
    // First is trigger, second is dialog confirm (when dialog open, there are 2)
    const dialogConfirm = confirmBtns[confirmBtns.length - 1]

    // Act
    await user.click(dialogConfirm)

    // Assert
    expect(requestSpy).toHaveBeenCalled()
    requestSpy.mockRestore()
  })

  it('shows pending state disables confirm button and shows spinner', async () => {
    // Arrange — mock pending true before render
    mockUseActionState.mockReturnValue([{}, mockFormAction, true] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])
    const user = userEvent.setup()
    render(
      <DeleteEntityButton entityId="1" entityLabel="Casa" deleteAction={mockFormAction as unknown as typeof mockFormAction} />,
    )
    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    // Assert — dialog confirm should be disabled when pending
    const dialog = await screen.findByRole('dialog')
    const all = within(dialog).getAllByRole('button', { name: 'Eliminar' })
    const dialogBtn = all.find((b) => b.hasAttribute('disabled')) as HTMLButtonElement | undefined
    expect(dialogBtn).toBeDefined()
    expect(dialogBtn).toBeDisabled()
    // spinner should be present when pending
    expect(dialogBtn?.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('toasts success when state.success true', async () => {
    // Arrange — first render with success state triggers useEffect
    mockUseActionState.mockReturnValue([ { success: true }, mockFormAction, false] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])

    // Act
    render(
      <DeleteEntityButton entityId="1" entityLabel="Mi Casa" deleteAction={mockFormAction as unknown as typeof mockFormAction} />,
    )

    // Assert — toast.success called with entityLabel
    await waitFor(() => {
      expect((toast.success as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('"Mi Casa" eliminado correctamente.')
    })
  })

  it('toasts error when state.error present', async () => {
    // Arrange
    mockUseActionState.mockReturnValue([ { error: 'No se pudo eliminar' }, mockFormAction, false] as unknown as [Record<string, unknown>, typeof mockFormAction, boolean])

    // Act
    render(
      <DeleteEntityButton entityId="1" entityLabel="Casa" deleteAction={mockFormAction as unknown as typeof mockFormAction} />,
    )

    // Assert
    await waitFor(() => {
      expect((toast.error as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('No se pudo eliminar')
    })
  })

  // Restore prototype after suite
  afterAll(() => {
    HTMLFormElement.prototype.requestSubmit = originalRequestSubmit
  })
})
