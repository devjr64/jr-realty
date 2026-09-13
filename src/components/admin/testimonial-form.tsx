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
  createTestimonialAction,
  updateTestimonialAction,
  type TestimonialFormState,
} from '@/server/actions/testimonial.actions'

export interface TestimonialFormValue {
  id?: string
  name: string
  role: string | null
  content: string
  rating: number
  active: boolean
}

interface TestimonialFormProps {
  initial?: TestimonialFormValue | null
}

const selectClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'

export function TestimonialForm({ initial }: TestimonialFormProps) {
  const isEdit = Boolean(initial?.id)
  const action = isEdit ? updateTestimonialAction : createTestimonialAction
  const [state, formAction, isPending] = useActionState<TestimonialFormState, FormData>(
    action,
    {},
  )
  const fieldErrors = state.fieldErrors ?? {}

  useEffect(() => {
    if (state.success) toast.success('Testimonio guardado correctamente.')
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
          <span>Testimonio guardado correctamente.</span>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Testimonio</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Nombre" htmlFor="name" required error={fieldErrors.name}>
              <Input
                id="name"
                name="name"
                defaultValue={initial?.name}
                placeholder="Ej: María González"
                required
                disabled={isPending}
              />
            </FormField>

            <FormField label="Rol / perfil" htmlFor="role" error={fieldErrors.role}>
              <Input
                id="role"
                name="role"
                defaultValue={initial?.role ?? ''}
                placeholder="Ej: Propietario"
                disabled={isPending}
              />
            </FormField>
          </div>

          <FormField label="Calificación" htmlFor="rating" error={fieldErrors.rating}>
            <select
              id="rating"
              name="rating"
              className={selectClass}
              defaultValue={initial?.rating ?? 5}
              disabled={isPending}
            >
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {'★'.repeat(value)}
                  {'☆'.repeat(5 - value)}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Testimonio" htmlFor="content" required error={fieldErrors.content}>
            <Textarea
              id="content"
              name="content"
              defaultValue={initial?.content}
              rows={5}
              placeholder="Cuéntanos la experiencia del cliente…"
              required
              disabled={isPending}
            />
          </FormField>

          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="active"
              defaultChecked={initial?.active ?? true}
              className="size-4 accent-primary"
              disabled={isPending}
            />
            Activo (visible en el sitio)
          </label>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <SubmitButton isPending={isPending} pendingText="Guardando…" size="lg">
          <Save className="size-4" aria-hidden="true" />
          {isEdit ? 'Guardar cambios' : 'Crear testimonio'}
        </SubmitButton>
      </div>
    </form>
  )
}
