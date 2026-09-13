'use client'

import { useActionState, useEffect } from 'react'
import { AlertCircle, CheckCircle2, Save } from 'lucide-react'
import { toast } from 'sonner'

import { FormField } from '@/components/shared/form-field'
import { SubmitButton } from '@/components/ui/submit-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  createZoneAction,
  updateZoneAction,
  type ZoneFormState,
} from '@/server/actions/zone.actions'

export interface ZoneFormValue {
  id?: string
  name: string
  description: string | null
  imageUrl: string | null
  parentId: string | null
}

interface ZoneFormProps {
  parentZones: { id: string; name: string }[]
  initial?: ZoneFormValue | null
}

const selectClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'

export function ZoneForm({ parentZones, initial }: ZoneFormProps) {
  const isEdit = Boolean(initial?.id)
  const action = isEdit ? updateZoneAction : createZoneAction
  const [state, formAction, isPending] = useActionState<ZoneFormState, FormData>(
    action,
    {},
  )
  const fieldErrors = state.fieldErrors ?? {}

  useEffect(() => {
    if (state.success) toast.success('Zona guardada correctamente.')
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
          <span>Zona guardada correctamente.</span>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Información de la zona</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <FormField label="Nombre" htmlFor="name" required error={fieldErrors.name}>
            <Input
              id="name"
              name="name"
              defaultValue={initial?.name}
              placeholder="Ej: Las Mercedes"
              required
              disabled={isPending}
            />
          </FormField>

          <FormField label="Descripción" htmlFor="description" error={fieldErrors.description}>
            <Textarea
              id="description"
              name="description"
              defaultValue={initial?.description ?? ''}
              rows={3}
              placeholder="Describe brevemente la zona…"
              disabled={isPending}
            />
          </FormField>

          <FormField label="URL de imagen" htmlFor="imageUrl" error={fieldErrors.imageUrl}>
            <Input
              id="imageUrl"
              name="imageUrl"
              defaultValue={initial?.imageUrl ?? ''}
              placeholder="https://… (opcional)"
              disabled={isPending}
            />
          </FormField>

          <FormField label="Zona padre" htmlFor="parentId" error={fieldErrors.parentId}>
            <select
              id="parentId"
              name="parentId"
              className={selectClass}
              defaultValue={initial?.parentId ?? ''}
              disabled={isPending}
            >
              <option value="">Sin zona padre</option>
              {parentZones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </FormField>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <SubmitButton isPending={isPending} pendingText="Guardando…" size="lg">
          <Save className="size-4" aria-hidden="true" />
          {isEdit ? 'Guardar cambios' : 'Crear zona'}
        </SubmitButton>
      </div>
    </form>
  )
}
