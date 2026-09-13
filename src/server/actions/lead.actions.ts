'use server'

import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

import { requireAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import {
  assignLeadSchema,
  createLeadSchema,
  leadNoteSchema,
  updateLeadStatusSchema,
} from '@/lib/validations/lead.schema'

/** Contract between these Server Actions and the client useActionState forms. */
export interface LeadFormState {
  error?: string
  success?: boolean
}

/**
 * Reads a string field from FormData. Files/other values degrade to '' so the
 * zod schema always receives typed strings. Same pattern as auth.actions.ts.
 */
function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

/** Shape of a single note stored in the lead `notes` Json array. */
interface LeadNote {
  text: string
  createdAt: string
}

/**
 * Type guard for well-formed notes. When appending we only carry forward
 * entries that are `{ text, createdAt }` (all writes go through this action),
 * so the Json array never accumulates malformed/legacy values and the result
 * typechecks as `InputJsonValue` without casts.
 */
function isLeadNote(value: unknown): value is LeadNote {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return typeof record.text === 'string' && typeof record.createdAt === 'string'
}

/**
 * Public lead-capture action (website form, NO auth guard).
 *
 * FLOW:
 *  1. Rate limit por IP (5/min) para frenar spam/abuso del formulario.
 *  2. Honeypot: si el campo oculto `website` viene relleno, se descarta la
 *     petición silenciosamente (bot) devolviendo éxito sin crear nada.
 *  3. Normalize raw FormData (trim; email lowercased).
 *  4. Validate with `createLeadSchema`; on failure return the first zod issue
 *     message (friendly, already localized).
 *  5. Create the Lead with `source: 'WEBSITE'` forced server-side (never
 *     trusted from the client); `status` defaults to NEW in the DB.
 *  6. If the form came from a property page (`propertyId`), revalidate the
 *     specific public property detail page (by slug) so it re-renders fresh.
 *
 * SECURITY: Server Actions only accept POSTs from the same origin; still, no
 * internals are ever returned — failures map to a generic Spanish message.
 */
export async function createLeadAction(
  _prevState: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  // Rate limit: 5 peticiones/minuto por IP (formulario público).
  const headerStore = await headers()
  const ip =
    headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headerStore.get('x-real-ip') ??
    'unknown'
  if (!rateLimit(`lead:${ip}`, 5, 60_000)) {
    return { error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' }
  }

  // Honeypot anti-bot: los bots rellenan campos ocultos; los humanos no.
  if (getFormString(formData, 'website').trim() !== '') {
    return { success: true }
  }

  const parsed = createLeadSchema.safeParse({
    name: getFormString(formData, 'name').trim(),
    email: getFormString(formData, 'email').trim().toLowerCase(),
    phone: getFormString(formData, 'phone').trim(),
    message: getFormString(formData, 'message').trim(),
    propertyId: getFormString(formData, 'propertyId').trim(),
  })

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    return { error: firstIssue?.message ?? 'Revisa los campos del formulario.' }
  }

  const { name, email, phone, message, propertyId } = parsed.data

  try {
    await db.lead.create({
      data: {
        name,
        email,
        phone: phone ?? null,
        message: message ?? null,
        source: 'WEBSITE', // forced server-side
        propertyId: propertyId ?? null,
        // status: Prisma default NEW
      },
    })
  } catch (error) {
    console.error('No se pudo crear el lead', error)
    return { error: 'No se pudo enviar el formulario. Intenta de nuevo.' }
  }

  // Property-page leads: refresh the specific public property detail page.
  // We only know the id, so resolve the slug first (cheap indexed lookup).
  if (propertyId) {
    const property = await db.property.findUnique({
      where: { id: propertyId },
      select: { slug: true },
    })
    if (property) {
      revalidatePath(`/propiedades/${property.slug}`, 'page')
    }
  }

  return { success: true }
}

/**
 * Updates a lead's pipeline status. Admin only (`requireAdmin` redirects to
 * /login otherwise — first line of defense on top of middleware).
 */
export async function updateLeadStatusAction(
  _prevState: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const user = await requireAdmin()

  const leadId = getFormString(formData, 'leadId').trim()
  if (!leadId) {
    return { error: 'Falta el identificador del lead.' }
  }

  // AGENT users can only update leads assigned to them
  if (user.role === 'AGENT') {
    const agent = await db.agent.findUnique({
      where: { userId: user.id },
      select: { id: true },
    })
    const lead = await db.lead.findUnique({
      where: { id: leadId },
      select: { assignedAgentId: true },
    })
    if (!lead || lead.assignedAgentId !== agent?.id) {
      return { error: 'No tienes permisos para modificar este lead.' }
    }
  }

  const parsed = updateLeadStatusSchema.safeParse({
    status: getFormString(formData, 'status').trim(),
  })
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    return { error: firstIssue?.message ?? 'Selecciona un estado válido.' }
  }

  try {
    await db.lead.update({
      where: { id: leadId },
      data: { status: parsed.data.status },
    })
  } catch (error) {
    console.error('No se pudo actualizar el estado del lead', error)
    return { error: 'No se pudo actualizar el estado. Intenta de nuevo.' }
  }

  revalidatePath('/admin/leads')
  return { success: true }
}

/**
 * Appends an internal note to a lead.
 *
 * NOTES JSON (safe append): Prisma does not document an atomic `push`
 * operator for `Json` fields, so this is a read-modify-write — read the
 * current array, append `{ text, createdAt }`, write it back. The `isLeadNote`
 * guard keeps only well-formed entries, so the array never accumulates
 * malformed JSON and the write typechecks as `InputJsonValue` without casts.
 */
export async function addLeadNoteAction(
  _prevState: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const user = await requireAdmin()

  const leadId = getFormString(formData, 'leadId').trim()
  if (!leadId) {
    return { error: 'Falta el identificador del lead.' }
  }

  // AGENT users can only add notes to leads assigned to them
  if (user.role === 'AGENT') {
    const agent = await db.agent.findUnique({
      where: { userId: user.id },
      select: { id: true },
    })
    const lead = await db.lead.findUnique({
      where: { id: leadId },
      select: { assignedAgentId: true },
    })
    if (!lead || lead.assignedAgentId !== agent?.id) {
      return { error: 'No tienes permisos para modificar este lead.' }
    }
  }

  const parsed = leadNoteSchema.safeParse({
    text: getFormString(formData, 'text').trim(),
  })
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    return { error: firstIssue?.message ?? 'Revisa la nota.' }
  }

  const note: LeadNote = { text: parsed.data.text, createdAt: new Date().toISOString() }

  try {
    const current = await db.lead.findUnique({
      where: { id: leadId },
      select: { notes: true },
    })
    if (!current) {
      return { error: 'El lead no existe.' }
    }

    const existingNotes: unknown[] = Array.isArray(current.notes)
      ? current.notes
      : []

    const notes: Prisma.InputJsonValue = [
      ...(existingNotes.filter(isLeadNote) as unknown as Prisma.InputJsonValue[]),
      note,
    ] as Prisma.InputJsonValue

    await db.lead.update({
      where: { id: leadId },
      data: { notes },
    })
  } catch (error) {
    console.error('No se pudo agregar la nota al lead', error)
    return { error: 'No se pudo guardar la nota. Intenta de nuevo.' }
  }

  revalidatePath('/admin/leads')
  return { success: true }
}

/**
 * Assigns (or unassigns) the agent responsible for a lead. `agentId` from a
 * blank select (`''`) is transformed to `null` by the schema, clearing the
 * assignment.
 */
export async function assignLeadAgentAction(
  _prevState: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const user = await requireAdmin()

  // Only SUPER_ADMIN can assign/reassign agents
  if (user.role !== 'SUPER_ADMIN') {
    return { error: 'No tienes permisos para asignar agentes.' }
  }

  const leadId = getFormString(formData, 'leadId').trim()
  if (!leadId) {
    return { error: 'Falta el identificador del lead.' }
  }

  const parsed = assignLeadSchema.safeParse({
    agentId: getFormString(formData, 'agentId').trim(),
  })
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    return { error: firstIssue?.message ?? 'Selecciona un agente válido.' }
  }

  // Schema output: '' → null (unassign), otherwise the agent id.
  const assignedAgentId = parsed.data.agentId

  try {
    await db.lead.update({
      where: { id: leadId },
      data: { assignedAgentId },
    })
  } catch (error) {
    console.error('No se pudo asignar el agente del lead', error)
    return { error: 'No se pudo asignar el agente. Intenta de nuevo.' }
  }

  revalidatePath('/admin/leads')
  return { success: true }
}

/**
 * Deletes a lead.
 *
 * Accepts both call styles (same as deletePropertyAction):
 *  - useActionState forms: (prevState, formData)
 *  - plain <form action={...}>: only the FormData
 */
export async function deleteLeadAction(
  prevState: LeadFormState | FormData,
  formData?: FormData,
): Promise<LeadFormState> {
  const user = await requireAdmin()

  const fd = prevState instanceof FormData ? prevState : formData
  if (!fd) {
    return { error: 'Falta la información del lead.' }
  }

  const leadId = getFormString(fd, 'leadId').trim()
  if (!leadId) {
    return { error: 'Falta el identificador del lead.' }
  }

  // AGENT users can only delete leads assigned to them
  if (user.role === 'AGENT') {
    const agent = await db.agent.findUnique({
      where: { userId: user.id },
      select: { id: true },
    })
    const lead = await db.lead.findUnique({
      where: { id: leadId },
      select: { assignedAgentId: true },
    })
    if (!lead || lead.assignedAgentId !== agent?.id) {
      return { error: 'No tienes permisos para eliminar este lead.' }
    }
  }

  try {
    await db.lead.delete({ where: { id: leadId } })
  } catch (error) {
    console.error('No se pudo eliminar el lead', error)
    return { error: 'No se pudo eliminar el lead. Intenta de nuevo.' }
  }

  revalidatePath('/admin/leads')
  return { success: true }
}
