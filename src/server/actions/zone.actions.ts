'use server'

import type { ZodIssue } from 'zod'

import { revalidatePath } from 'next/cache'

import { requireSuperAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { zoneSchema, type ZoneInput } from '@/lib/validations/zone.schema'
import { slugify } from '@/lib/utils/slugify'
import { deleteUploadedFile } from '@/lib/utils/uploads'
import { wouldCreateCycle } from '@/lib/utils/zone-graph'

export interface ZoneFormState {
  error?: string
  success?: boolean
  fieldErrors?: Record<string, string>
}

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

function parseZoneForm(formData: FormData): ZoneInput {
  return {
    name: getFormString(formData, 'name'),
    slug: getFormString(formData, 'slug') || undefined,
    description: getFormString(formData, 'description') || null,
    imageUrl: getFormString(formData, 'imageUrl') || null,
    parentId: getFormString(formData, 'parentId') || null,
  }
}

function toFieldErrors(issues: ZodIssue[]) {
  const errors: Record<string, string> = {}
  for (const issue of issues) {
    const field = issue.path[0]
    if (typeof field === 'string' && errors[field] === undefined) {
      errors[field] = issue.message
    }
  }
  return errors
}

async function generateUniqueZoneSlug(name: string): Promise<string> {
  const base = slugify(name) || 'zona'
  const existing = await db.zone.findMany({
    where: { slug: { startsWith: base } },
    select: { slug: true },
  })
  let slug = base
  let counter = 2
  const taken = new Set(existing.map((z) => z.slug))
  while (taken.has(slug)) {
    slug = `${base}-${counter}`
    counter += 1
  }
  return slug
}

/**
 * Valida que `parentId` no cree un ciclo en la jerarquía de zonas
 * (auto-referencia o descendiente apuntando a un ancestro).
 * Devuelve un mensaje de error o null si es seguro.
 */
async function validateZoneParent(
  zoneId: string | null,
  parentId: string | null,
): Promise<string | null> {
  if (!parentId) return null

  const parent = await db.zone.findUnique({ where: { id: parentId } })
  if (!parent) return 'La zona padre seleccionada no existe.'

  if (zoneId) {
    // Cargar la cadena de padres completa para detectar ciclos.
    const allZones = await db.zone.findMany({ select: { id: true, parentId: true } })
    const parents = new Map(allZones.map((z) => [z.id, z.parentId]))
    if (wouldCreateCycle(parents, zoneId, parentId)) {
      return 'La zona padre seleccionada crearía un ciclo en la jerarquía.'
    }
  }

  return null
}

export async function createZoneAction(
  _prevState: ZoneFormState,
  formData: FormData,
): Promise<ZoneFormState> {
  await requireSuperAdmin()

  const parsed = zoneSchema.safeParse(parseZoneForm(formData))
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Revisa los campos del formulario.',
      fieldErrors: toFieldErrors(parsed.error.issues),
    }
  }

  const { slug: _, ...data } = parsed.data

  const parentError = await validateZoneParent(null, parsed.data.parentId ?? null)
  if (parentError) return { error: parentError }

  try {
    await db.zone.create({
      data: {
        ...data,
        slug: await generateUniqueZoneSlug(parsed.data.name),
        parentId: parsed.data.parentId || null,
      },
    })
    revalidatePath('/admin/zonas')
    revalidatePath('/zonas')
    return { success: true }
  } catch (error) {
    console.error('No se pudo crear la zona', error)
    return { error: 'No se pudo crear la zona. Intenta de nuevo.' }
  }
}

export async function updateZoneAction(
  _prevState: ZoneFormState,
  formData: FormData,
): Promise<ZoneFormState> {
  await requireSuperAdmin()

  const id = getFormString(formData, 'id').trim()
  if (!id) return { error: 'Falta el identificador de la zona.' }

  const parsed = zoneSchema.safeParse(parseZoneForm(formData))
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Revisa los campos del formulario.',
      fieldErrors: toFieldErrors(parsed.error.issues),
    }
  }

  const { slug: submittedSlug, ...data } = parsed.data

  const parentError = await validateZoneParent(id, parsed.data.parentId ?? null)
  if (parentError) return { error: parentError }

  try {
    await db.zone.update({
      where: { id },
      data: {
        ...data,
        // Mantener el slug estable; solo se genera en creación.
        parentId: parsed.data.parentId || null,
      },
    })
    revalidatePath('/admin/zonas')
    revalidatePath('/zonas')
    return { success: true }
  } catch (error) {
    console.error('No se pudo actualizar la zona', error)
    return { error: 'No se pudo actualizar la zona. Intenta de nuevo.' }
  }
}

export async function deleteZoneAction(
  prevState: ZoneFormState | FormData,
  formData?: FormData,
): Promise<ZoneFormState> {
  await requireSuperAdmin()

  const fd = prevState instanceof FormData ? prevState : formData
  if (!fd) return { error: 'Falta la información de la zona.' }

  const id = getFormString(fd, 'id').trim()
  if (!id) return { error: 'Falta el identificador de la zona.' }

  const existing = await db.zone.findUnique({
    where: { id },
    select: { imageUrl: true },
  })
  if (!existing) return { error: 'La zona no existe.' }

  try {
    await db.zone.delete({ where: { id } })
    if (existing.imageUrl) deleteUploadedFile(existing.imageUrl)
    revalidatePath('/admin/zonas')
    revalidatePath('/zonas')
    return { success: true }
  } catch (error) {
    console.error('No se pudo eliminar la zona', error)
    return {
      error:
        'No se pudo eliminar la zona. Asegúrate de que no tenga propiedades o proyectos asociados.',
    }
  }
}
