import { z } from 'zod'

/**
 * Lead validation schemas (zod v4).
 *
 * Follows the project convention from `auth.schema.ts` / `property.schema.ts`:
 * - Top-level format schemas are preferred (`z.email()`, not the deprecated
 *   `z.string().email()`).
 * - ENUM VALUES mirror `prisma/schema.prisma` exactly. They are defined
 *   locally (not imported from `@prisma/client`) so this module stays
 *   importable from client components without pulling in the Prisma runtime.
 * - Optional form fields go through `emptyToNull`: untouched blank inputs
 *   become `null` so nullable DB columns stay clean (never stored as '').
 */

// === Enums (mirror prisma/schema.prisma) ===

export const leadStatusValues = [
  'NEW',
  'CONTACTED',
  'FOLLOWING_UP',
  'VISIT_SCHEDULED',
  'NEGOTIATING',
  'CLOSED_WON',
  'CLOSED_LOST',
] as const

export const leadSourceValues = [
  'WEBSITE',
  'WHATSAPP',
  'PHONE',
  'REFERRAL',
  'SOCIAL_MEDIA',
  'WALK_IN',
] as const

// === Helpers ===

/** Converts an empty string (untouched optional form input) into null. */
const emptyToNull = (value: unknown): unknown => (value === '' ? null : value)

/** Optional form field: blank/missing input stays null/undefined (never ''). */
const optionalField = (inner: z.ZodType<string>) =>
  z.preprocess(emptyToNull, inner.nullable().optional())

// === Schemas ===

/** Public website lead-capture form. `source` is forced server-side. */
export const createLeadSchema = z.object({
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(120, 'El nombre no puede superar los 120 caracteres'),
  email: z.email('Ingresa un correo electrónico válido'),
  phone: optionalField(z.string().max(30, 'El teléfono no puede superar los 30 caracteres')),
  message: optionalField(
    z.string().max(2000, 'El mensaje no puede superar los 2000 caracteres'),
  ),
  propertyId: optionalField(z.string()),
})

/** Internal CRM note attached to a lead (admin only). */
export const leadNoteSchema = z.object({
  text: z
    .string()
    .min(1, 'La nota no puede estar vacía')
    .max(1000, 'La nota no puede superar los 1000 caracteres'),
})

/** Lead pipeline status change (admin only). */
export const updateLeadStatusSchema = z.object({
  status: z.enum(leadStatusValues, 'Selecciona un estado válido'),
})

/**
 * Agent assignment for a lead. A blank select (`''`) means "unassign" and is
 * transformed to `null` so `assignedAgentId` is cleared in the DB.
 */
export const assignLeadSchema = z.object({
  agentId: z.string().transform((value) => (value === '' ? null : value)),
})

// === Inferred types ===

export type CreateLeadInput = z.infer<typeof createLeadSchema>
export type LeadNoteInput = z.infer<typeof leadNoteSchema>
export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>
export type AssignLeadInput = z.infer<typeof assignLeadSchema>

// === Form options (Spanish labels) ===

export const leadStatusLabels: Record<(typeof leadStatusValues)[number], string> = {
  NEW: 'Nuevo',
  CONTACTED: 'Contactado',
  FOLLOWING_UP: 'En seguimiento',
  VISIT_SCHEDULED: 'Visita agendada',
  NEGOTIATING: 'Negociación',
  CLOSED_WON: 'Cerrado ganado',
  CLOSED_LOST: 'Cerrado perdido',
}

export const leadSourceLabels: Record<(typeof leadSourceValues)[number], string> = {
  WEBSITE: 'Web',
  WHATSAPP: 'WhatsApp',
  PHONE: 'Teléfono',
  REFERRAL: 'Referido',
  SOCIAL_MEDIA: 'Redes sociales',
  WALK_IN: 'Presencial',
}
