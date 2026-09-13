'use client'

import { useActionState, useEffect } from 'react'
import { AlertCircle, CheckCircle2, Send } from 'lucide-react'
import { toast } from 'sonner'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/ui/submit-button'
import { Textarea } from '@/components/ui/textarea'
import { createLeadAction } from '@/server/actions/lead.actions'

interface LeadFormProps {
  propertyId?: string
  /** Compacto (dentro de una tarjeta) vs. normal. */
  compact?: boolean
}

/**
 * Formulario de captura de leads del sitio público.
 * Se muestra en la página de detalle de propiedad y en /contacto.
 */
export function LeadForm({ propertyId, compact = false }: LeadFormProps) {
  const [state, formAction, isPending] = useActionState(createLeadAction, {})

  useEffect(() => {
    if (state.success) toast.success('¡Gracias! Te contactaremos muy pronto.')
    if (state.error) toast.error(state.error)
  }, [state])

  return (
    <form action={formAction} className="space-y-3">
      {propertyId ? <input type="hidden" name="propertyId" value={propertyId} /> : null}

      {/* Honeypot anti-bot: oculto para humanos, visible para bots. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

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
          <span>
            ¡Gracias! Un asesor te contactará muy pronto. También puedes escribirnos
            por WhatsApp al +58 212-555-0140.
          </span>
        </div>
      ) : null}

      {!state.success ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lead-name">Nombre</Label>
              <Input
                id="lead-name"
                name="name"
                placeholder="Tu nombre"
                required
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lead-phone">Teléfono</Label>
              <Input
                id="lead-phone"
                name="phone"
                placeholder="+58 212-555-0000"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lead-email">Correo electrónico</Label>
            <Input
              id="lead-email"
              name="email"
              type="email"
              placeholder="tu@correo.com"
              required
              disabled={isPending}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lead-message">Mensaje</Label>
            <Textarea
              id="lead-message"
              name="message"
              rows={compact ? 3 : 4}
              placeholder={
                propertyId
                  ? 'Me interesa esta propiedad, me gustaría agendar una visita…'
                  : 'Cuéntanos qué estás buscando…'
              }
              disabled={isPending}
            />
          </div>

          <SubmitButton
            isPending={isPending}
            pendingText="Enviando…"
            size="lg"
            className="w-full"
          >
            <Send className="size-4" aria-hidden="true" />
            Enviar solicitud
          </SubmitButton>
        </>
      ) : null}
    </form>
  )
}
