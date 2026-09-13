'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { ConfirmDeleteDialog } from '@/components/admin/confirm-delete-dialog'
import { Button } from '@/components/ui/button'

interface DeleteEntityButtonProps {
  entityId: string
  entityLabel: string
  deleteAction: (
    prevState: { error?: string; success?: boolean },
    formData: FormData,
  ) => Promise<{ error?: string; success?: boolean }>
  iconButton?: boolean
}

/**
 * Botón de eliminar genérico para los CRUDs del panel.
 *
 * Envuelve ConfirmDeleteDialog con una action de servidor que recibe el id
 * vía un formulario oculto (mismo patrón que property-list.tsx). Al confirmar
 * se dispara requestSubmit() para que la action reciba FormData real.
 */
export function DeleteEntityButton({
  entityId,
  entityLabel,
  deleteAction,
  iconButton = false,
}: DeleteEntityButtonProps) {
  const [open, setOpen] = useState(false)
  const [state, formAction, isPending] = useActionState(deleteAction, {})
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.success) {
      toast.success(`"${entityLabel}" eliminado correctamente.`)
      setOpen(false)
    }
    if (state?.error) toast.error(state.error)
  }, [state, entityLabel])

  return (
    <>
      <form ref={formRef} action={formAction} className="hidden">
        <input type="hidden" name="id" value={entityId} />
      </form>

      {iconButton ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Eliminar ${entityLabel}`}
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setOpen(true)}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10"
          onClick={() => setOpen(true)}
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Eliminar
        </Button>
      )}

      <ConfirmDeleteDialog
        open={open}
        onOpenChange={setOpen}
        title="Eliminar"
        description={`¿Seguro que deseas eliminar "${entityLabel}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        pending={isPending}
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </>
  )
}
