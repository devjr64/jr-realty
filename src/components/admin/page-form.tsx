'use client'

import { useActionState, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Save } from 'lucide-react'
import { toast } from 'sonner'

import { BlockEditor, type EditableBlock } from '@/components/admin/block-editor'
import { FormField } from '@/components/shared/form-field'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/ui/submit-button'
import {
  createPageAction,
  updatePageAction,
  type PageFormState,
} from '@/server/actions/page.actions'

export interface PageFormValue {
  id?: string
  title: string
  metaTitle: string | null
  metaDescription: string | null
  published: boolean
  content: EditableBlock[]
}

interface PageFormProps {
  initial?: PageFormValue | null
}

export function PageForm({ initial }: PageFormProps) {
  const isEdit = Boolean(initial?.id)
  const action = isEdit ? updatePageAction : createPageAction
  const [state, formAction, isPending] = useActionState<PageFormState, FormData>(
    action,
    {},
  )
  const [blocks, setBlocks] = useState<EditableBlock[]>(initial?.content ?? [])
  const fieldErrors = state.fieldErrors ?? {}

  useEffect(() => {
    if (state.success) toast.success('Página guardada correctamente.')
    if (state.error) toast.error(state.error)
  }, [state])

  return (
    <form action={formAction} className="space-y-6">
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}

      {state.error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{state.error}</span>
        </div>
      ) : null}

      {state.success ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-700 dark:text-emerald-300"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>Página guardada correctamente.</span>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Configuración de la página</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <FormField label="Título" htmlFor="title" required error={fieldErrors.title}>
            <Input
              id="title"
              name="title"
              defaultValue={initial?.title}
              placeholder="Ej: Sobre nosotros"
              required
              disabled={isPending}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Meta título (SEO)" htmlFor="metaTitle" error={fieldErrors.metaTitle}>
              <Input
                id="metaTitle"
                name="metaTitle"
                defaultValue={initial?.metaTitle ?? ''}
                placeholder="Título para buscadores (opcional)"
                disabled={isPending}
              />
            </FormField>
            <FormField label="Meta descripción (SEO)" htmlFor="metaDescription" error={fieldErrors.metaDescription}>
              <Input
                id="metaDescription"
                name="metaDescription"
                defaultValue={initial?.metaDescription ?? ''}
                placeholder="Descripción para buscadores (opcional)"
                disabled={isPending}
              />
            </FormField>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="published"
              defaultChecked={initial?.published ?? false}
              className="size-4 accent-primary"
              disabled={isPending}
            />
            Publicar página
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Contenido (bloques)</CardTitle>
        </CardHeader>
        <CardContent>
          <input type="hidden" name="content" value={JSON.stringify(blocks)} />
          <BlockEditor value={blocks} onChange={setBlocks} />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <SubmitButton isPending={isPending} pendingText="Guardando…" size="lg">
          <Save className="size-4" aria-hidden="true" />
          {isEdit ? 'Guardar cambios' : 'Crear página'}
        </SubmitButton>
      </div>
    </form>
  )
}
