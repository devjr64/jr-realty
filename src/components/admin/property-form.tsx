'use client'

import { useActionState, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Save } from 'lucide-react'
import { toast } from 'sonner'

import { PropertyImageUploader, type ImageInput } from '@/components/admin/property-image-uploader'
import { FormField } from '@/components/shared/form-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SubmitButton } from '@/components/ui/submit-button'
import {
  createPropertyAction,
  updatePropertyAction,
  type PropertyFormState,
} from '@/server/actions/property.actions'
import {
  currencyValues,
  operationLabels,
  operationValues,
  propertyFeatureOptions,
  propertyTypeLabels,
  propertyTypeValues,
  statusLabels,
  statusValues,
  tagLabels,
  tagValues,
} from '@/lib/validations/property.schema'

export interface PropertyFormValue {
  id?: string
  title: string
  description: string
  type: string
  operation: string
  price: number
  currency: string
  bedrooms: number | null
  bathrooms: number | null
  halfBathrooms: number | null
  parkingSpots: number | null
  landAreaM2: number | null
  buildAreaM2: number | null
  yearBuilt: number | null
  address: string
  latitude: number | null
  longitude: number | null
  zoneId: string
  features: string[]
  tags: string[]
  videoUrl: string | null
  virtualTourUrl: string | null
  status: string
  featured: boolean
  images: ImageInput[]
  agentId: string | null
}

interface PropertyFormProps {
  zones: { id: string; name: string }[]
  agents: { id: string; name: string }[]
  isSuperAdmin: boolean
  currentAgentId?: string
  initial?: PropertyFormValue | null
}

const selectClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'

const checkboxGrid =
  'flex flex-wrap gap-2'

const featureChip =
  'inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm transition-colors has-checked:border-primary has-checked:bg-primary/10 has-checked:text-primary'

export function PropertyForm({
  zones,
  agents,
  isSuperAdmin,
  currentAgentId,
  initial,
}: PropertyFormProps) {
  const isEdit = Boolean(initial?.id)
  const action = isEdit ? updatePropertyAction : createPropertyAction

  const [state, formAction, isPending] = useActionState<PropertyFormState, FormData>(
    action,
    {},
  )

  const [features, setFeatures] = useState<string[]>(initial?.features ?? [])
  const [tags, setTags] = useState<string[]>(initial?.tags ?? [])
  const [images, setImages] = useState<ImageInput[]>(initial?.images ?? [])
  const [featured, setFeatured] = useState(initial?.featured ?? false)

  const fieldErrors = state.fieldErrors ?? {}

  useEffect(() => {
    if (state.success) toast.success('Propiedad guardada correctamente.')
    if (state.error) toast.error(state.error)
  }, [state])

  function toggleFeature(feature: string) {
    setFeatures((prev) =>
      prev.includes(feature)
        ? prev.filter((f) => f !== feature)
        : [...prev, feature],
    )
  }

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  return (
    <form action={formAction} className="space-y-6">
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      {isSuperAdmin && initial?.agentId ? (
        <input type="hidden" name="agentId" value={initial.agentId} />
      ) : null}

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
          <span>Propiedad guardada correctamente.</span>
        </div>
      ) : null}

      {/* Información básica */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Información básica</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Título" htmlFor="title" required error={fieldErrors.title}>
            <Input
              id="title"
              name="title"
              defaultValue={initial?.title}
              placeholder="Ej: Apartamento en Las Mercedes"
              required
              disabled={isPending}
            />
          </FormField>

          <FormField label="Tipo de propiedad" htmlFor="type" required error={fieldErrors.type}>
            <select id="type" name="type" className={selectClass} defaultValue={initial?.type ?? ''} disabled={isPending} required>
              <option value="" disabled>
                Selecciona un tipo
              </option>
              {propertyTypeValues.map((value) => (
                <option key={value} value={value}>
                  {propertyTypeLabels[value]}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Operación" htmlFor="operation" required error={fieldErrors.operation}>
            <select id="operation" name="operation" className={selectClass} defaultValue={initial?.operation ?? ''} disabled={isPending} required>
              <option value="" disabled>
                Selecciona la operación
              </option>
              {operationValues.map((value) => (
                <option key={value} value={value}>
                  {operationLabels[value]}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Estado" htmlFor="status" error={fieldErrors.status}>
            <select id="status" name="status" className={selectClass} defaultValue={initial?.status ?? 'AVAILABLE'} disabled={isPending}>
              {statusValues.map((value) => (
                <option key={value} value={value}>
                  {statusLabels[value]}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Precio (USD)" htmlFor="price" required error={fieldErrors.price}>
            <Input
              id="price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              defaultValue={initial?.price ?? ''}
              placeholder="250000"
              required
              disabled={isPending}
            />
          </FormField>

          <FormField label="Moneda" htmlFor="currency" error={fieldErrors.currency}>
            <select id="currency" name="currency" className={selectClass} defaultValue={initial?.currency ?? 'USD'} disabled={isPending}>
              {currencyValues.map((value) => (
                <option key={value} value={value}>
                  {value === 'USD' ? 'USD $' : 'VES Bs.'}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Año de construcción" htmlFor="yearBuilt" error={fieldErrors.yearBuilt}>
            <Input
              id="yearBuilt"
              name="yearBuilt"
              type="number"
              min="1800"
              defaultValue={initial?.yearBuilt ?? ''}
              placeholder="2020"
              disabled={isPending}
            />
          </FormField>

          <div className="flex items-end gap-2 pb-1">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                name="featured"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="size-4 accent-primary"
              />
              Propiedad destacada
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Detalles */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Detalles</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {(
            [
              ['bedrooms', 'Habitaciones'],
              ['bathrooms', 'Baños'],
              ['halfBathrooms', 'Medio baño'],
              ['parkingSpots', 'Estacionamientos'],
              ['landAreaM2', 'Área de terreno (m²)'],
              ['buildAreaM2', 'Área de construcción (m²)'],
            ] as const
          ).map(([key, label]) => (
            <FormField
              key={key}
              label={label}
              htmlFor={key}
              error={fieldErrors[key] ?? fieldErrors.landAreaM2 ?? fieldErrors.buildAreaM2}
            >
              <Input
                id={key}
                name={key}
                type="number"
                min="0"
                step="0.01"
                defaultValue={initial?.[key] ?? ''}
                disabled={isPending}
              />
            </FormField>
          ))}
        </CardContent>
      </Card>

      {/* Ubicación */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Ubicación</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Dirección" htmlFor="address" required error={fieldErrors.address}>
            <Input
              id="address"
              name="address"
              defaultValue={initial?.address}
              placeholder="Ej: Calle 79, Los Palos Grandes"
              required
              disabled={isPending}
            />
          </FormField>

          <FormField label="Zona" htmlFor="zoneId" required error={fieldErrors.zoneId}>
            <select id="zoneId" name="zoneId" className={selectClass} defaultValue={initial?.zoneId ?? ''} disabled={isPending} required>
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

          <FormField label="Latitud" htmlFor="latitude" error={fieldErrors.latitude}>
            <Input
              id="latitude"
              name="latitude"
              type="number"
              step="any"
              defaultValue={initial?.latitude ?? ''}
              placeholder="8.9767"
              disabled={isPending}
            />
          </FormField>

          <FormField label="Longitud" htmlFor="longitude" error={fieldErrors.longitude}>
            <Input
              id="longitude"
              name="longitude"
              type="number"
              step="any"
              defaultValue={initial?.longitude ?? ''}
              placeholder="-79.5180"
              disabled={isPending}
            />
          </FormField>

          {isSuperAdmin ? (
            <FormField label="Agente responsable" htmlFor="agentId" required error={fieldErrors.agentId}>
              <select id="agentId" name="agentId" className={selectClass} defaultValue={initial?.agentId ?? ''} disabled={isPending} required>
                <option value="" disabled>
                  Selecciona un agente
                </option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </FormField>
          ) : currentAgentId ? (
            <input type="hidden" name="agentId" value={currentAgentId} />
          ) : null}
        </CardContent>
      </Card>

      {/* Características */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Características</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <input type="hidden" name="features" value={JSON.stringify(features)} />
          <div className={checkboxGrid}>
            {propertyFeatureOptions.map((feature) => (
              <label key={feature} className={featureChip}>
                <input
                  type="checkbox"
                  className="sr-only has-checked:border-primary"
                  checked={features.includes(feature)}
                  onChange={() => toggleFeature(feature)}
                  disabled={isPending}
                />
                {feature}
              </label>
            ))}
          </div>

          <div>
            <Label className="mb-2 block">Etiquetas</Label>
            <input type="hidden" name="tags" value={JSON.stringify(tags)} />
            <div className={checkboxGrid}>
              {tagValues.map((tag) => (
                <label key={tag} className={featureChip}>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={tags.includes(tag)}
                    onChange={() => toggleTag(tag)}
                    disabled={isPending}
                  />
                  {tagLabels[tag]}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Multimedia */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Multimedia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <input type="hidden" name="images" value={JSON.stringify(images)} />
          <PropertyImageUploader value={images} onChange={setImages} />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="URL de video" htmlFor="videoUrl" error={fieldErrors.videoUrl}>
              <Input
                id="videoUrl"
                name="videoUrl"
                defaultValue={initial?.videoUrl ?? ''}
                placeholder="https://youtube.com/watch?v=..."
                disabled={isPending}
              />
            </FormField>
            <FormField label="URL de tour virtual" htmlFor="virtualTourUrl" error={fieldErrors.virtualTourUrl}>
              <Input
                id="virtualTourUrl"
                name="virtualTourUrl"
                defaultValue={initial?.virtualTourUrl ?? ''}
                placeholder="https://my.matterport.com/..."
                disabled={isPending}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      {/* Descripción */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Descripción</CardTitle>
        </CardHeader>
        <CardContent>
          <FormField label="Descripción" htmlFor="description" required error={fieldErrors.description}>
            <Textarea
              id="description"
              name="description"
              defaultValue={initial?.description}
              rows={8}
              placeholder="Describe la propiedad, sus espacios, la zona y las ventajas…"
              required
              disabled={isPending}
            />
          </FormField>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <SubmitButton
          isPending={isPending}
          pendingText="Guardando…"
          size="lg"
          className="w-full sm:w-auto"
        >
          <Save className="size-4" aria-hidden="true" />
          {isEdit ? 'Guardar cambios' : 'Crear propiedad'}
        </SubmitButton>
      </div>
    </form>
  )
}
