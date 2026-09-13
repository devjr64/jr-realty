'use client'

import { useActionState, useEffect } from 'react'
import { AlertCircle, CheckCircle2, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { FormField } from '@/components/shared/form-field'
import { SubmitButton } from '@/components/ui/submit-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  updateSiteSettingsAction,
  clearImageCacheAction,
  type SiteSettingsFormState,
  type ClearCacheFormState,
} from '@/server/actions/site-settings.actions'
import type { SiteSettingsInput } from '@/lib/validations/site-settings.schema'

interface SiteSettingsFormProps {
  initial: SiteSettingsInput
}

const selectClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

export function SiteSettingsForm({ initial }: SiteSettingsFormProps) {
  const [state, formAction, isPending] = useActionState<SiteSettingsFormState, FormData>(
    updateSiteSettingsAction,
    {},
  )
  const fieldErrors = state.fieldErrors ?? {}

  const [cacheState, cacheFormAction, isCachePending] = useActionState<
    ClearCacheFormState,
    FormData
  >(clearImageCacheAction, {})

  useEffect(() => {
    if (state.success) toast.success('Configuración guardada correctamente.')
    if (state.error) toast.error(state.error)
  }, [state])

  useEffect(() => {
    if (cacheState.success) {
      const msg =
        cacheState.deletedCount === 0
          ? 'La caché ya estaba vacía.'
          : `Se eliminaron ${cacheState.deletedCount} entradas de caché.`
      toast.success(msg)
    }
    if (cacheState.error) toast.error(cacheState.error)
  }, [cacheState])

  return (
    <>
      <form action={formAction} noValidate className="space-y-6">
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
            <span>Configuración guardada correctamente.</span>
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Información general</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField label="Nombre del sitio" htmlFor="siteName" required error={fieldErrors['general.siteName']}>
              <Input id="siteName" name="siteName" defaultValue={initial.general.siteName} required disabled={isPending} />
            </FormField>
            <FormField label="Eslogan" htmlFor="tagline" error={fieldErrors['general.tagline']}>
              <Input id="tagline" name="tagline" defaultValue={initial.general.tagline ?? ''} disabled={isPending} />
            </FormField>
            <FormField label="Teléfono" htmlFor="phone" required error={fieldErrors['general.phone']}>
              <Input id="phone" name="phone" defaultValue={initial.general.phone} required disabled={isPending} />
            </FormField>
            <FormField label="WhatsApp" htmlFor="whatsapp" error={fieldErrors['general.whatsapp']}>
              <Input id="whatsapp" name="whatsapp" defaultValue={initial.general.whatsapp ?? ''} disabled={isPending} />
            </FormField>
            <FormField label="Correo electrónico" htmlFor="email" required error={fieldErrors['general.email']}>
              <Input id="email" name="email" type="email" defaultValue={initial.general.email} required disabled={isPending} />
            </FormField>
            <FormField label="Dirección" htmlFor="address" error={fieldErrors['general.address']}>
              <Input id="address" name="address" defaultValue={initial.general.address ?? ''} disabled={isPending} />
            </FormField>
            <FormField label="Moneda" htmlFor="currency" error={fieldErrors['general.currency']}>
              <select id="currency" name="currency" className={selectClass} defaultValue={initial.general.currency} disabled={isPending}>
                <option value="USD">USD $</option>
                <option value="VES">VES Bs.</option>
              </select>
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Redes sociales</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField label="Facebook" htmlFor="social.facebook" error={fieldErrors['social.facebook']}>
              <Input id="social.facebook" name="social.facebook" defaultValue={initial.social.facebook ?? ''} placeholder="https://facebook.com/…" disabled={isPending} />
            </FormField>
            <FormField label="Instagram" htmlFor="social.instagram" error={fieldErrors['social.instagram']}>
              <Input id="social.instagram" name="social.instagram" defaultValue={initial.social.instagram ?? ''} placeholder="https://instagram.com/…" disabled={isPending} />
            </FormField>
            <FormField label="X (Twitter)" htmlFor="social.twitter" error={fieldErrors['social.twitter']}>
              <Input id="social.twitter" name="social.twitter" defaultValue={initial.social.twitter ?? ''} placeholder="https://x.com/…" disabled={isPending} />
            </FormField>
            <FormField label="LinkedIn" htmlFor="social.linkedin" error={fieldErrors['social.linkedin']}>
              <Input id="social.linkedin" name="social.linkedin" defaultValue={initial.social.linkedin ?? ''} placeholder="https://linkedin.com/…" disabled={isPending} />
            </FormField>
            <FormField label="YouTube" htmlFor="social.youtube" error={fieldErrors['social.youtube']}>
              <Input id="social.youtube" name="social.youtube" defaultValue={initial.social.youtube ?? ''} placeholder="https://youtube.com/…" disabled={isPending} />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">SEO</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FormField label="Título por defecto" htmlFor="seo.title" error={fieldErrors['seo.title']}>
              <Input id="seo.title" name="seo.title" defaultValue={initial.seo.title ?? ''} disabled={isPending} />
            </FormField>
            <FormField label="Descripción por defecto" htmlFor="seo.description" error={fieldErrors['seo.description']}>
              <Textarea id="seo.description" name="seo.description" defaultValue={initial.seo.description ?? ''} rows={3} disabled={isPending} />
            </FormField>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <SubmitButton isPending={isPending} pendingText="Guardando…" size="lg">
            <Save className="size-4" aria-hidden="true" />
            Guardar configuración
          </SubmitButton>
        </div>
      </form>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Mantenimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Elimina el caché de optimización de imágenes. Útil cuando las imágenes subidas no se
            muestran correctamente. Las imágenes se regenerarán automáticamente en la próxima visita.
          </p>
          <form action={cacheFormAction}>
            <SubmitButton isPending={isCachePending} pendingText="Eliminando…">
              <Trash2 className="size-4" aria-hidden="true" />
              Eliminar caché de imágenes
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
