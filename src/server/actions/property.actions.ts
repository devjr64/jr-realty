'use server'

import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import type { Session } from 'next-auth'
import type { ZodIssue } from 'zod'

import { requireAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { propertySchema } from '@/lib/validations/property.schema'
import { slugify, slugifyUnique } from '@/lib/utils/slugify'
import { deleteUploadedFiles } from '@/lib/utils/uploads'

/** Contract between these Server Actions and the client useActionState forms. */
export interface PropertyFormState {
  error?: string
  success?: boolean
  fieldErrors?: Record<string, string>
}

/**
 * Reads a string field from FormData. Files/other values degrade to '' so the
 * zod schema always receives typed strings (it rejects them with the field
 * message when required). Same pattern as auth.actions.ts.
 */
function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

/**
 * Parses a JSON-encoded hidden field (features, tags, images).
 * - Empty string → undefined so the schema defaults ([]) apply.
 * - Invalid JSON → null so the schema rejects the field instead of silently
 *   dropping data.
 */
function parseJsonField(formData: FormData, key: string): unknown {
  const raw = getFormString(formData, key)
  if (raw === '') return undefined
  try {
    const parsed: unknown = JSON.parse(raw)
    return parsed
  } catch {
    return null
  }
}

/**
 * Checkbox fields are only submitted when checked. Any present, non-empty,
 * non-"false" value ("on", "true", "1", …) counts as checked.
 */
function parseCheckbox(formData: FormData, key: string): boolean {
  const value = formData.get(key)
  return typeof value === 'string' && value !== '' && value !== 'false'
}

/** Flattens zod issues into a field → first-message map for useActionState. */
function toFieldErrors(issues: ZodIssue[]): Record<string, string> {
  const fieldErrors: Record<string, string> = {}
  for (const issue of issues) {
    const field = issue.path[0]
    if (typeof field === 'string' && fieldErrors[field] === undefined) {
      fieldErrors[field] = issue.message
    }
  }
  return fieldErrors
}

/**
 * Resolves the agent responsible for a property:
 * - AGENT: always their own Agent row (any form value is overridden, so an
 *   agent can never assign property to someone else).
 * - SUPER_ADMIN: reads agentId from the form (the select is only shown to
 *   SUPER_ADMIN).
 * Returns null when no valid agent could be determined.
 */
async function resolveAgentId(
  user: Session['user'],
  formData: FormData,
): Promise<string | null> {
  if (user.role === 'AGENT') {
    const agent = await db.agent.findUnique({
      where: { userId: user.id },
      select: { id: true, active: true },
    })
    return agent !== null && agent.active ? agent.id : null
  }
  const agentId = getFormString(formData, 'agentId').trim()
  return agentId || null
}

/**
 * Generates a unique slug for a title: existing slugs get a numeric suffix
 * (`-2`, `-3`, …) so the @unique column never collides. Returns null when the
 * title produces no valid slug (shouldn't happen — title is required).
 */
async function generateUniqueSlug(title: string): Promise<string | null> {
  const base = slugify(title)
  if (!base) return null
  const existing = await db.property.findMany({
    where: { slug: { startsWith: base } },
    select: { slug: true },
  })
  return slugifyUnique(title, existing.map((p) => p.slug))
}

/**
 * Marks the admin list + public catalog pages stale so they re-render with
 * fresh data after a write. The detail pages are revalidated when the slug is
 * known (update/toggle), keeping URLs stable.
 */
function revalidatePropertyPaths(slug?: string): void {
  revalidatePath('/admin/propiedades')
  revalidatePath('/propiedades', 'page')
  if (slug) {
    revalidatePath(`/propiedades/${slug}`, 'page')
    revalidatePath('/admin/propiedades/[id]', 'page')
  }
}

/** Builds the property form object from the raw FormData (validated later). */
function parsePropertyForm(formData: FormData) {
  return {
    title: getFormString(formData, 'title'),
    description: getFormString(formData, 'description'),
    type: getFormString(formData, 'type'),
    operation: getFormString(formData, 'operation'),
    price: getFormString(formData, 'price'),
    // Empty select strings fall back to the schema defaults (USD / AVAILABLE).
    currency: getFormString(formData, 'currency') || undefined,
    bedrooms: getFormString(formData, 'bedrooms'),
    bathrooms: getFormString(formData, 'bathrooms'),
    halfBathrooms: getFormString(formData, 'halfBathrooms'),
    parkingSpots: getFormString(formData, 'parkingSpots'),
    landAreaM2: getFormString(formData, 'landAreaM2'),
    buildAreaM2: getFormString(formData, 'buildAreaM2'),
    yearBuilt: getFormString(formData, 'yearBuilt'),
    address: getFormString(formData, 'address'),
    latitude: getFormString(formData, 'latitude'),
    longitude: getFormString(formData, 'longitude'),
    zoneId: getFormString(formData, 'zoneId'),
    features: parseJsonField(formData, 'features'),
    tags: parseJsonField(formData, 'tags'),
    videoUrl: getFormString(formData, 'videoUrl'),
    virtualTourUrl: getFormString(formData, 'virtualTourUrl'),
    status: getFormString(formData, 'status') || undefined,
    featured: parseCheckbox(formData, 'featured'),
    images: parseJsonField(formData, 'images'),
  }
}

/**
 * Creates a property. Flow:
 *  1. requireAdmin() (redirects to /login otherwise).
 *  2. Resolve the responsible agent (AGENT → own row; SUPER_ADMIN → form).
 *  3. Validate the FormData against propertySchema; on failure return the
 *     first issue message + per-field errors.
 *  4. Generate a unique slug from the title.
 *  5. Single transaction: Property + images (createMany) + tags (createMany).
 *     Decimal columns (price/landAreaM2/buildAreaM2) are stored as Prisma.Decimal.
 */
export async function createPropertyAction(
  _prevState: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const user = await requireAdmin()

  const agentId = await resolveAgentId(user, formData)
  if (!agentId) {
    return { error: 'Debes seleccionar un agente responsable.' }
  }

  const parsed = propertySchema.safeParse(parsePropertyForm(formData))
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Revisa los campos del formulario.',
      fieldErrors: toFieldErrors(parsed.error.issues),
    }
  }

  const slug = await generateUniqueSlug(parsed.data.title)
  if (!slug) {
    return { error: 'No se pudo generar un identificador único para la propiedad.' }
  }

  const { images, tags, ...scalars } = parsed.data

  try {
    await db.$transaction(async (tx) => {
      await tx.property.create({
        data: {
          ...scalars,
          slug,
          agentId,
          price: new Prisma.Decimal(parsed.data.price),
          landAreaM2:
            parsed.data.landAreaM2 != null
              ? new Prisma.Decimal(parsed.data.landAreaM2)
              : null,
          buildAreaM2:
            parsed.data.buildAreaM2 != null
              ? new Prisma.Decimal(parsed.data.buildAreaM2)
              : null,
          images: { createMany: { data: images } },
          tags: { createMany: { data: tags.map((tag) => ({ tag })) } },
        },
      })
    })
    revalidatePropertyPaths()
    return { success: true }
  } catch (error) {
    console.error('No se pudo crear la propiedad', error)
    return { error: 'No se pudo crear la propiedad. Intenta de nuevo.' }
  }
}

/**
 * Updates a property by id (hidden field). Same validation as create, plus:
 *  - AGENT scope: only properties assigned to the caller can be updated.
 *  - Transaction performs a full image/tag replace: deleteMany + createMany.
 *  - The slug is intentionally preserved so public URLs stay stable when the
 *    title changes.
 */
export async function updatePropertyAction(
  _prevState: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const user = await requireAdmin()

  const id = getFormString(formData, 'id').trim()
  if (!id) {
    return { error: 'Falta el identificador de la propiedad.' }
  }

  const agentId = await resolveAgentId(user, formData)
  if (!agentId) {
    return { error: 'Debes seleccionar un agente responsable.' }
  }

  const existing = await db.property.findUnique({
    where: { id },
    select: { agentId: true, slug: true },
  })
  if (!existing) {
    return { error: 'La propiedad no existe.' }
  }
  if (user.role === 'AGENT' && existing.agentId !== agentId) {
    return { error: 'No tienes permisos para modificar esta propiedad.' }
  }

  const parsed = propertySchema.safeParse(parsePropertyForm(formData))
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Revisa los campos del formulario.',
      fieldErrors: toFieldErrors(parsed.error.issues),
    }
  }

  const { images, tags, ...scalars } = parsed.data

  try {
    await db.$transaction(async (tx) => {
      // Full replace pattern: drop old rows, insert the submitted set.
      // Antes de borrar, capturamos las URLs locales que quedarán huérfanas.
      const oldImages = await tx.propertyImage.findMany({
        where: { propertyId: id },
        select: { url: true },
      })
      await tx.property.update({
        where: { id },
        data: {
          ...scalars,
          agentId,
          price: new Prisma.Decimal(parsed.data.price),
          landAreaM2:
            parsed.data.landAreaM2 != null
              ? new Prisma.Decimal(parsed.data.landAreaM2)
              : null,
          buildAreaM2:
            parsed.data.buildAreaM2 != null
              ? new Prisma.Decimal(parsed.data.buildAreaM2)
              : null,
          images: { deleteMany: {}, createMany: { data: images } },
          tags: { deleteMany: {}, createMany: { data: tags.map((tag) => ({ tag })) } },
        },
      })
      // Limpieza de archivos locales que ya no se referencian.
      const kept = new Set(images.map((img) => img.url))
      deleteUploadedFiles(oldImages.map((img) => img.url).filter((url) => !kept.has(url)))
    })
    revalidatePropertyPaths(existing.slug)
    return { success: true }
  } catch (error) {
    console.error('No se pudo actualizar la propiedad', error)
    return { error: 'No se pudo actualizar la propiedad. Intenta de nuevo.' }
  }
}

/**
 * Deletes a property (images/tags cascade via onDelete: Cascade).
 *
 * Accepts both call styles:
 *  - useActionState forms: (prevState, formData)
 *  - plain <form action={...}>: only the FormData
 */
export async function deletePropertyAction(
  prevState: PropertyFormState | FormData,
  formData?: FormData,
): Promise<PropertyFormState> {
  const user = await requireAdmin()

  const fd = prevState instanceof FormData ? prevState : formData
  if (!fd) {
    return { error: 'Falta la información de la propiedad.' }
  }

  const id = getFormString(fd, 'id').trim()
  if (!id) {
    return { error: 'Falta el identificador de la propiedad.' }
  }

  const agentId = await resolveAgentId(user, fd)
  if (!agentId) {
    return { error: 'Debes seleccionar un agente responsable.' }
  }

  const existing = await db.property.findUnique({
    where: { id },
    select: { agentId: true },
  })
  if (!existing) {
    return { error: 'La propiedad no existe.' }
  }
  if (user.role === 'AGENT' && existing.agentId !== agentId) {
    return { error: 'No tienes permisos para eliminar esta propiedad.' }
  }

  try {
    // Limpieza de archivos locales de las imágenes antes de borrar la fila.
    const imageRows = await db.propertyImage.findMany({
      where: { propertyId: id },
      select: { url: true },
    })
    await db.property.delete({ where: { id } })
    deleteUploadedFiles(imageRows.map((img) => img.url))
    revalidatePropertyPaths()
    return { success: true }
  } catch (error) {
    console.error('No se pudo eliminar la propiedad', error)
    return { error: 'No se pudo eliminar la propiedad. Intenta de nuevo.' }
  }
}

/**
 * Flips the `featured` flag. Same authz flow as update (AGENT scoped to own
 * properties, SUPER_ADMIN to all).
 */
export async function toggleFeaturedAction(
  _prevState: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const user = await requireAdmin()

  const id = getFormString(formData, 'id').trim()
  if (!id) {
    return { error: 'Falta el identificador de la propiedad.' }
  }

  const agentId = await resolveAgentId(user, formData)
  if (!agentId) {
    return { error: 'Debes seleccionar un agente responsable.' }
  }

  const existing = await db.property.findUnique({
    where: { id },
    select: { agentId: true, slug: true, featured: true },
  })
  if (!existing) {
    return { error: 'La propiedad no existe.' }
  }
  if (user.role === 'AGENT' && existing.agentId !== agentId) {
    return { error: 'No tienes permisos para modificar esta propiedad.' }
  }

  try {
    await db.property.update({
      where: { id },
      data: { featured: !existing.featured },
    })
    revalidatePropertyPaths(existing.slug)
    return { success: true }
  } catch (error) {
    console.error('No se pudo actualizar el estado destacado', error)
    return { error: 'No se pudo actualizar la propiedad. Intenta de nuevo.' }
  }
}
