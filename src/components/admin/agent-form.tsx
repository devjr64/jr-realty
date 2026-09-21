'use client'

import { useActionState, useEffect } from 'react'
import { AlertCircle, CheckCircle2, Save } from 'lucide-react'
import { toast } from 'sonner'

import { FormField } from '@/components/shared/form-field'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/ui/submit-button'
import {
  createAgentAction,
  updateAgentAction,
  type AgentFormState,
} from '@/server/actions/agent.actions'

export interface AgentFormValue {
  id?: string
  name: string
  email: string
  title: string | null
  phone: string
  whatsapp: string | null
  active: boolean
}

interface AgentFormProps {
  initial?: AgentFormValue | null
}

export function AgentForm({ initial }: AgentFormProps) {
  const isEdit = Boolean(initial?.id)
  const action = isEdit ? updateAgentAction : createAgentAction
  const [state, formAction, isPending] = useActionState<AgentFormState, FormData>(
    action,
    {},
  )
  const fieldErrors = state.fieldErrors ?? {}

  useEffect(() => {
    if (state.success) toast.success('Agente guardado correctamente.')
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
          <span>Agente guardado correctamente.</span>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Información del agente</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Nombre completo" htmlFor="name" required error={fieldErrors.name}>
            <Input
              id="name"
              name="name"
              defaultValue={initial?.name}
              placeholder="Ej: Andreína Salas"
              required
              disabled={isPending}
            />
          </FormField>

          <FormField label="Correo electrónico" htmlFor="email" required error={fieldErrors.email}>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={initial?.email}
              placeholder="correo@jrrealty.com"
              required
              disabled={isPending}
            />
          </FormField>

          {!isEdit ? (
            <FormField
              label="Contraseña"
              htmlFor="password"
              required
              error={fieldErrors.password}
            >
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                required
                disabled={isPending}
              />
            </FormField>
          ) : (
            <FormField
              label="Nueva contraseña (opcional)"
              htmlFor="password"
              error={fieldErrors.password}
            >
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Dejar en blanco para no cambiar"
                disabled={isPending}
              />
            </FormField>
          )}

          <FormField label="Cargo" htmlFor="title" error={fieldErrors.title}>
            <Input
              id="title"
              name="title"
              defaultValue={initial?.title ?? ''}
              placeholder="Ej: Asesor Inmobiliario"
              disabled={isPending}
            />
          </FormField>

          <FormField label="Teléfono" htmlFor="phone" required error={fieldErrors.phone}>
            <Input
              id="phone"
              name="phone"
              defaultValue={initial?.phone}
              placeholder="+58 212-555-0000"
              required
              disabled={isPending}
            />
          </FormField>

          <FormField label="WhatsApp" htmlFor="whatsapp" error={fieldErrors.whatsapp}>
            <Input
              id="whatsapp"
              name="whatsapp"
              defaultValue={initial?.whatsapp ?? ''}
              placeholder="+58 212-555-0000"
              disabled={isPending}
            />
          </FormField>

          <div className="flex items-end gap-2 pb-1 sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                name="active"
                defaultChecked={initial?.active ?? true}
                className="size-4 accent-primary"
                disabled={isPending}
              />
              Agente activo
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <SubmitButton isPending={isPending} pendingText="Guardando…" size="lg">
          <Save className="size-4" aria-hidden="true" />
          {isEdit ? 'Guardar cambios' : 'Crear agente'}
        </SubmitButton>
      </div>
    </form>
  )
}
