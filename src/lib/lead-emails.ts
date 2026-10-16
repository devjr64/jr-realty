/**
 * Dispatches the two lead-related emails (submitter confirmation + admin
 * notification) in parallel. Failures are logged but never thrown — the caller
 * (createLeadAction) treats this as best-effort.
 *
 * This module is Node-only (imports `db`). Keep it out of any Edge path.
 */

import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { LeadConfirmTemplate } from '@/emails/lead-confirm'
import { LeadNotifyTemplate } from '@/emails/lead-notify'

export interface LeadForEmail {
  id: string
  name: string
  email: string
  phone: string | null
  message: string | null
  propertyId: string | null
}

export interface PropertyForEmail {
  slug: string
  title: string
}

interface SendLeadEmailsInput {
  lead: LeadForEmail
  property?: PropertyForEmail
}

/**
 * Resolves the admin recipient from site settings, falling back to
 * `EMAIL_FROM`. Sends both emails via `Promise.allSettled` so a failure in
 * one does not block the other.
 */
export async function sendLeadEmails({
  lead,
  property,
}: SendLeadEmailsInput): Promise<void> {
  // Resolve admin recipient from site settings.
  let adminEmail = process.env.EMAIL_FROM ?? ''
  try {
    const setting = await db.siteSetting.findUnique({
      where: { key: 'general' },
      select: { value: true },
    })
    const general =
      setting && typeof setting.value === 'object' && setting.value !== null
        ? (setting.value as Record<string, unknown>)
        : {}
    const settingEmail =
      typeof general.email === 'string' && general.email ? general.email : ''
    if (settingEmail) {
      adminEmail = settingEmail
    }
  } catch (err) {
    // Non-fatal: fall through to EMAIL_FROM fallback.
    console.error('[email] could not read site settings, using EMAIL_FROM', err)
  }

  const phone =
    typeof lead.phone === 'string' && lead.phone ? lead.phone : undefined
  const message =
    typeof lead.message === 'string' && lead.message ? lead.message : undefined
  const messagePreview = message
    ? message.length > 200
      ? `${message.slice(0, 200)}…`
      : message
    : undefined

  // Resolve site phone/whatsapp for the confirmation footer.
  let sitePhone = '+58 212-555-0140'
  let siteWhatsapp = sitePhone
  try {
    const setting = await db.siteSetting.findUnique({
      where: { key: 'general' },
      select: { value: true },
    })
    const general =
      setting && typeof setting.value === 'object' && setting.value !== null
        ? (setting.value as Record<string, unknown>)
        : {}
    if (typeof general.phone === 'string' && general.phone) sitePhone = general.phone
    if (typeof general.whatsapp === 'string' && general.whatsapp)
      siteWhatsapp = general.whatsapp
  } catch {
    // Use defaults.
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const results = await Promise.allSettled([
    // 1. Confirmation to the submitter.
    sendEmail({
      to: lead.email,
      subject: 'JR Realty — Recibimos tu mensaje',
      react: LeadConfirmTemplate({
        name: lead.name,
        messagePreview,
        phone: sitePhone,
        whatsapp: siteWhatsapp,
      }),
    }),

    // 2. Notification to the admin inbox (skip if no admin email resolved).
    ...(adminEmail
      ? [
          sendEmail({
            to: adminEmail,
            subject: `Nuevo lead: ${lead.name}`,
            react: LeadNotifyTemplate({
              name: lead.name,
              email: lead.email,
              phone,
              message,
              property,
              appUrl,
            }),
          }),
        ]
      : []),
  ])

  // Log any rejections (sendEmail itself shouldn't reject, but settle guards
  // against unexpected throws).
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('[email] lead-emails dispatch rejected:', result.reason)
    }
  }
}
