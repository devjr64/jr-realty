import { z } from 'zod'

/**
 * Login form validation schema.
 *
 * zod v4: uses the top-level `z.email()` API. The legacy
 * `z.string().email()` form is deprecated (but still functional) in zod 4,
 * so we prefer the recommended `z.email()` syntax.
 *
 * NOTE: normalization (trim + lowercase) is intentionally NOT done here —
 * zod runs format checks before string transforms, so `.trim()` on the email
 * would not help whitespace-padded input. The server action trims the raw
 * FormData values before parsing.
 */
export const loginSchema = z.object({
  email: z.email('Ingresa un correo electrónico válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

/** Type-safe shape of validated login credentials. */
export type LoginInput = z.infer<typeof loginSchema>

/**
 * Friendly, user-facing error messages.
 *
 * Keys mirror Auth.js error types (`AuthError.type`, e.g. `CredentialsSignin`)
 * plus two app-level keys: `validation` and `default`.
 *
 * SECURITY: these are the ONLY strings a user ever sees — raw error details
 * (DB errors, stack traces, provider internals) are never exposed.
 */
export const authErrorMessages: Record<string, string> = {
  CredentialsSignin: 'Credenciales inválidas. Verifica tu correo y contraseña.',
  validation: 'Revisa los campos e inténtalo de nuevo.',
  default: 'Ocurrió un error al iniciar sesión. Inténtalo de nuevo.',
}
