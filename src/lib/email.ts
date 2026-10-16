/**
 * Internal email helper — thin wrapper over Resend.
 *
 * Best-effort: never throws. When `RESEND_API_KEY` is missing or the app is
 * not running in production, the payload is logged to the console instead of
 * calling the Resend API (no accidental real-email sends from `pnpm dev`).
 *
 * This module is Node-only — it must only be imported from server actions or
 * API routes, never from middleware or client components.
 */

import type { ReactElement } from 'react'
import { Resend } from 'resend'

export interface SendEmailResult {
  ok: boolean
  /** True when the email was logged to console instead of sent (dev / no key). */
  dev?: boolean
  error?: string
}

export interface SendEmailOptions {
  to: string
  subject: string
  /** JSX element rendered to HTML by Resend's SDK. */
  react: ReactElement
}

/**
 * Returns a Resend client, or `null` when no API key is configured.
 * Lazy: the constructor is only invoked on first call, so importing this
 * module (e.g. from test files) never throws.
 */
function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

/**
 * Send a transactional email via Resend.
 *
 * Returns `{ ok: true }` on success. On failure returns `{ ok: false, error }`
 * — never throws. In dev (or when `RESEND_API_KEY` is empty) the call is
 * short-circuited to a console log.
 */
export async function sendEmail({
  to,
  subject,
  react,
}: SendEmailOptions): Promise<SendEmailResult> {
  const from = process.env.EMAIL_FROM ?? 'JR Realty <noreply@jrrealty.com>'

  // Dev / missing-key fallback: log the payload, don't call Resend.
  if (process.env.NODE_ENV !== 'production' || !process.env.RESEND_API_KEY) {
    // eslint-disable-next-line no-console
    console.log(
      `[email] dev fallback — to=${to} subject=${subject} from=${from}`,
    )
    return { ok: true, dev: true }
  }

  const resend = getResendClient()
  if (!resend) {
    // Key vanished between the check above and here (race) — treat as dev.
    return { ok: true, dev: true }
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      react,
    })

    if (error) {
      console.error('[email] Resend error:', error)
      return { ok: false, error: error.message }
    }

    // eslint-disable-next-line no-console
    console.log(`[email] sent to=${to} subject=${subject} id=${data?.id ?? 'unknown'}`)
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[email] unexpected error:', message)
    return { ok: false, error: message }
  }
}
