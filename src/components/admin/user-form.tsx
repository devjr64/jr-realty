'use client'

import { useActionState, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, AlertTriangle, Save } from 'lucide-react'
import { toast } from 'sonner'

import { FormField } from '@/components/shared/form-field'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/ui/submit-button'
import {
  createUserAction,
  updateUserAction,
  type UserFormState,
} from '@/server/actions/user.actions'
import type { UserRole } from '@/types/next-auth'

export interface UserFormValue {
  id?: string
  name: string
  email: string
  role: UserRole
  active: boolean
  // Agent-specific fields (shown when role = AGENT)
  phone?: string
  title?: string
  whatsapp?: string
}

interface UserFormProps {
  currentUserId?: string
  initial?: UserFormValue | null
}

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'AGENT', label: 'Agente' },
  { value: 'CLIENT', label: 'Cliente' },
]

export function UserForm({ currentUserId, initial }: UserFormProps) {
  const isEdit = Boolean(initial?.id)
  const isEditingSelf = isEdit && initial?.id === currentUserId
  const action = isEdit ? updateUserAction : createUserAction
  const [state, formAction, isPending] = useActionState<UserFormState, FormData>(action, {})
  const fieldErrors = state.fieldErrors ?? {}
  const [selectedRole, setSelectedRole] = useState<UserRole>(initial?.role ?? 'CLIENT')
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Detect self-demotion: editing self and changing role away from SUPER_ADMIN
  const isSelfDemotion = isEditingSelf && selectedRole !== 'SUPER_ADMIN' && initial?.role === 'SUPER_ADMIN'

  useEffect(() => {
    if (state.success) toast.success('Usuario guardado correctamente.')
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
          <span>Usuario guardado correctamente.</span>
        </div>
      ) : null}

      {isEditingSelf && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-300"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            Estás editando tu propia cuenta. Los cambios se aplicarán inmediatamente.
          </span>
        </div>
      )}

      {isSelfDemotion && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            <strong>Advertencia:</strong> Estás cambiando tu propio rol de Super Admin a{' '}
            {selectedRole === 'AGENT' ? 'Agente' : 'Cliente'}. Perderás acceso a las secciones
            de administración restringidas y no podrás revertir este cambio.
          </span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Información del usuario</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Nombre completo" htmlFor="name" required error={fieldErrors.name}>
            <Input
              id="name"
              name="name"
              defaultValue={initial?.name}
              placeholder="Ej: Juan Pérez"
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
              placeholder="correo@ejemplo.com"
              required
              disabled={isPending}
            />
          </FormField>

          {!isEdit ? (
            <FormField label="Contraseña" htmlFor="password" required error={fieldErrors.password}>
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

          <FormField label="Rol" htmlFor="role" required error={fieldErrors.role}>
            <select
              id="role"
              name="role"
              defaultValue={initial?.role ?? 'CLIENT'}
              disabled={isPending}
              onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
            >
              {roleOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </FormField>

          {selectedRole === 'AGENT' && (
            <>
              <FormField
                label="Teléfono"
                htmlFor="phone"
                required
                error={fieldErrors.phone}
              >
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={initial?.phone ?? ''}
                  placeholder="+58 212-555-0000"
                  required
                  disabled={isPending}
                />
              </FormField>

              <FormField label="Cargo" htmlFor="title" error={fieldErrors.title}>
                <Input
                  id="title"
                  name="title"
                  defaultValue={initial?.title ?? ''}
                  placeholder="Ej: Asesor Inmobiliario"
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
            </>
          )}

          <div className="flex items-end gap-2 pb-1 sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                name="active"
                defaultChecked={initial?.active ?? true}
                className="size-4 accent-primary"
                disabled={isPending}
              />
              Usuario activo
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <SubmitButton isPending={isPending} pendingText="Guardando…" size="lg">
          <Save className="size-4" aria-hidden="true" />
          {isEdit ? 'Guardar cambios' : 'Crear usuario'}
        </SubmitButton>
      </div>

      {isEditingSelf && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="font-heading text-lg text-destructive">
              Zona de peligro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Eliminar tu propia cuenta te cerrará la sesión inmediatamente y perderás
              acceso al panel de administración.
            </p>
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar mi cuenta
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm text-destructive">
                  ¿Estás seguro? Esta acción no se puede deshacer.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    // Trigger the delete action
                    const form = document.createElement('form')
                    form.method = 'POST'
                    const idInput = document.createElement('input')
                    idInput.type = 'hidden'
                    idInput.name = 'id'
                    idInput.value = initial?.id ?? ''
                    form.appendChild(idInput)
                    document.body.appendChild(form)
                    form.submit()
                  }}
                  className="inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
                >
                  Confirmar eliminación
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="inline-flex items-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                >
                  Cancelar
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </form>
  )
}
