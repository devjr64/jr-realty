'use client'

import { useActionState, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Save, X } from 'lucide-react'
import { toast } from 'sonner'

import { FormField } from '@/components/shared/form-field'
import { Button } from '@/components/ui/button'
import { SubmitButton } from '@/components/ui/submit-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  createProjectAction,
  updateProjectAction,
  type ProjectFormState,
} from '@/server/actions/project.actions'

export interface ProjectFormValue {
  id?: string
  name: string
  description: string
  developer: string | null
  zoneId: string
  agentId: string | null
  deliveryDate: string | null
  priceRangeMin: number | null
  priceRangeMax: number | null
  coverImage: string | null
  gallery: { url: string; alt?: string }[]
  status: string
}

interface ProjectFormProps {
  zones: { id: string; name: string }[]
  agents: { id: string; name: string }[]
  isSuperAdmin: boolean
  initial?: ProjectFormValue | null
}

const selectClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'

export function ProjectForm({ zones, agents, isSuperAdmin, initial }: ProjectFormProps) {
  const isEdit = Boolean(initial?.id)
  const action = isEdit ? updateProjectAction : createProjectAction
  const [state, formAction, isPending] = useActionState<ProjectFormState, FormData>(action, {})
  const [gallery, setGallery] = useState<{ url: string; alt?: string }[]>(initial?.gallery ?? [])
  const [galleryInput, setGalleryInput] = useState('')
  const fieldErrors = state.fieldErrors ?? {}

  // For AGENT users, resolve their agentId from the agents list
  const currentAgentId = isSuperAdmin ? null : (agents[0]?.id ?? null)

  useEffect(() => {
    if (state.success) toast.success('Proyecto guardado correctamente.')
    if (state.error) toast.error(state.error)
  }, [state])

  function addGalleryItem() {
    const url = galleryInput.trim()
    if (!url) return
    setGallery((prev) => [...prev, { url, alt: '' }])
    setGalleryInput('')
  }

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
          <span>Proyecto guardado correctamente.</span>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Información del proyecto</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Nombre" htmlFor="name" required error={fieldErrors.name}>
            <Input
              id="name"
              name="name"
              defaultValue={initial?.name}
              placeholder="Ej: Torre Miranda"
              required
              disabled={isPending}
            />
          </FormField>

          <FormField label="Desarrolladora" htmlFor="developer" error={fieldErrors.developer}>
            <Input
              id="developer"
              name="developer"
              defaultValue={initial?.developer ?? ''}
              placeholder="Ej: Grupo XYZ"
              disabled={isPending}
            />
          </FormField>

          <FormField label="Zona" htmlFor="zoneId" required error={fieldErrors.zoneId}>
            <select
              id="zoneId"
              name="zoneId"
              className={selectClass}
              defaultValue={initial?.zoneId ?? ''}
              disabled={isPending}
              required
            >
              <option value="" disabled>
                Selecciona una zona
              </option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </FormField>

          {isSuperAdmin ? (
            <FormField label="Agente responsable" htmlFor="agentId" error={fieldErrors.agentId}>
              <select
                id="agentId"
                name="agentId"
                className={selectClass}
                defaultValue={initial?.agentId ?? ''}
                disabled={isPending}
              >
                <option value="">Sin agente asignado</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </FormField>
          ) : (
            <input type="hidden" name="agentId" value={currentAgentId ?? ''} />
          )}

          <FormField label="Estado" htmlFor="status" error={fieldErrors.status}>
            <select
              id="status"
              name="status"
              className={selectClass}
              defaultValue={initial?.status ?? 'ACTIVE'}
              disabled={isPending}
            >
              <option value="ACTIVE">Activo</option>
              <option value="SOLD_OUT">Agotado</option>
              <option value="COMING_SOON">Próximamente</option>
            </select>
          </FormField>

          <FormField
            label="Fecha de entrega"
            htmlFor="deliveryDate"
            error={fieldErrors.deliveryDate}
          >
            <Input
              id="deliveryDate"
              name="deliveryDate"
              type="date"
              defaultValue={initial?.deliveryDate ?? ''}
              disabled={isPending}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Precio desde (USD)"
              htmlFor="priceRangeMin"
              error={fieldErrors.priceRangeMin}
            >
              <Input
                id="priceRangeMin"
                name="priceRangeMin"
                type="number"
                min="0"
                defaultValue={initial?.priceRangeMin ?? ''}
                placeholder="150000"
                disabled={isPending}
              />
            </FormField>
            <FormField
              label="Precio hasta (USD)"
              htmlFor="priceRangeMax"
              error={fieldErrors.priceRangeMax}
            >
              <Input
                id="priceRangeMax"
                name="priceRangeMax"
                type="number"
                min="0"
                defaultValue={initial?.priceRangeMax ?? ''}
                placeholder="400000"
                disabled={isPending}
              />
            </FormField>
          </div>

          <div className="sm:col-span-2">
            <FormField
              label="URL de imagen de portada"
              htmlFor="coverImage"
              error={fieldErrors.coverImage}
            >
              <Input
                id="coverImage"
                name="coverImage"
                defaultValue={initial?.coverImage ?? ''}
                placeholder="https://… (opcional)"
                disabled={isPending}
              />
            </FormField>
          </div>

          <div className="sm:col-span-2">
            <FormField
              label="Descripción"
              htmlFor="description"
              required
              error={fieldErrors.description}
            >
              <Textarea
                id="description"
                name="description"
                defaultValue={initial?.description}
                rows={6}
                placeholder="Describe el proyecto, las unidades, amenidades…"
                required
                disabled={isPending}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Galería</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <input type="hidden" name="gallery" value={JSON.stringify(gallery)} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={galleryInput}
              onChange={(e) => setGalleryInput(e.target.value)}
              placeholder="URL de imagen https://…"
              disabled={isPending}
              className="flex-1"
            />
            <Button type="button" variant="outline" onClick={addGalleryItem} disabled={isPending}>
              Agregar
            </Button>
          </div>

          {gallery.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {gallery.map((item, index) => (
                <div
                  key={`${item.url}-${index}`}
                  className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm"
                >
                  <span className="max-w-[200px] truncate">{item.url}</span>
                  <button
                    type="button"
                    aria-label="Quitar imagen"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setGallery((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Agrega URLs de imágenes para la galería del proyecto.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <SubmitButton isPending={isPending} pendingText="Guardando…" size="lg">
          <Save className="size-4" aria-hidden="true" />
          {isEdit ? 'Guardar cambios' : 'Crear proyecto'}
        </SubmitButton>
      </div>
    </form>
  )
}
