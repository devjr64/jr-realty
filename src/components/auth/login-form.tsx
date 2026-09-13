'use client'

import { useActionState, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/ui/submit-button'
import { loginAction } from '@/server/actions/auth.actions'

/**
 * Login form (client component).
 *
 * Uses `useActionState` to drive the `loginAction` server action: `state`
 * carries the error message, `formAction` is bound to the <form>, and
 * `isPending` disables the fields + shows the spinner while submitting.
 *
 * `noValidate` is set so the browser's native tooltips never run — zod
 * validation happens server-side and the friendly Spanish messages are shown
 * in the alert banner below the fields.
 */
export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, {})
  const [showPassword, setShowPassword] = useState(false)
  const searchParams = useSearchParams()
  // W7: el middleware pone ?callbackUrl=... al redirigir; se envía como campo
  // oculto y el server action solo lo honra si es una ruta interna segura.
  const callbackUrl = searchParams.get('callbackUrl') ?? ''

  // Sonner toast on error — not silent failure (acceptance criterion)
  useEffect(() => {
    if (state?.error) toast.error(state.error)
  }, [state])

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder={'nombre' + '@empresa' + '.com'}
          required
          disabled={isPending}
          className="h-10 px-3.5"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Contraseña</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            required
            disabled={isPending}
            className="h-10 px-3.5 pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={
              showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
            }
            onClick={() => setShowPassword((visible) => !visible)}
            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>

      {state?.error ? (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <SubmitButton
        isPending={isPending}
        pendingText="Ingresando…"
        size="lg"
        className="w-full min-h-11"
      >
        Iniciar sesión
      </SubmitButton>
    </form>
  )
}
