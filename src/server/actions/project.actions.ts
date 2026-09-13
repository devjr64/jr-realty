'use server'

import type { ZodIssue } from 'zod'

import { revalidatePath } from 'next/cache'

import { requireAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { projectSchema, type ProjectInput } from '@/lib/validations/project.schema'
import { slugify } from '@/lib/utils/slugify'
import { deleteUploadedFiles } from '@/lib/utils/uploads'

export interface ProjectFormState {
  error?: string
  success?: boolean
  fieldErrors?: Record<string, string>
}

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

function parseJsonField(formData: FormData, key: string): unknown {
  const raw = getFormString(formData, key)
  if (raw === '') return undefined
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

function parseProjectForm(formData: FormData): unknown {
  return {
    name: getFormString(formData, 'name'),
    description: getFormString(formData, 'description'),
    developer: getFormString(formData, 'developer') || null,
    zoneId: getFormString(formData, 'zoneId'),
    agentId: getFormString(formData, 'agentId') || null,
    deliveryDate: getFormString(formData, 'deliveryDate') || null,
    priceRangeMin: getFormString(formData, 'priceRangeMin') || null,
    priceRangeMax: getFormString(formData, 'priceRangeMax') || null,
    coverImage: getFormString(formData, 'coverImage') || null,
    gallery: parseJsonField(formData, 'gallery'),
    status: getFormString(formData, 'status') || undefined,
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

async function generateUniqueProjectSlug(name: string): Promise<string> {
  const base = slugify(name) || 'proyecto'
  const existing = await db.project.findMany({
    where: { slug: { startsWith: base } },
    select: { slug: true },
  })
  let slug = base
  let counter = 2
  const taken = new Set(existing.map((p) => p.slug))
  while (taken.has(slug)) {
    slug = `${base}-${counter}`
    counter += 1
  }
  return slug
}

export async function createProjectAction(
  _prevState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const user = await requireAdmin()

  // For AGENT users, force agentId to their own agent row
  if (user.role === 'AGENT') {
    const agent = await db.agent.findUnique({
      where: { userId: user.id },
      select: { id: true, active: true },
    })
    if (!agent || !agent.active) {
      return { error: 'No se encontró un perfil de agente activo.' }
    }
    // Override the form value with the agent's own ID
    formData.set('agentId', agent.id)
  }

  const parsed = projectSchema.safeParse(parseProjectForm(formData))
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Revisa los campos del formulario.',
      fieldErrors: toFieldErrors(parsed.error.issues),
    }
  }

  const { gallery, ...scalars } = parsed.data

  try {
    await db.project.create({
      data: {
        ...scalars,
        slug: await generateUniqueProjectSlug(parsed.data.name),
        coverImage: parsed.data.coverImage ?? '',
        gallery: Array.isArray(gallery) ? gallery : [],
        priceRangeMin: parsed.data.priceRangeMin ?? null,
        priceRangeMax: parsed.data.priceRangeMax ?? null,
        agentId: parsed.data.agentId || null,
      },
    })
    revalidatePath('/admin/proyectos')
    revalidatePath('/proyectos')
    return { success: true }
  } catch (error) {
    console.error('No se pudo crear el proyecto', error)
    return { error: 'No se pudo crear el proyecto. Intenta de nuevo.' }
  }
}

export async function updateProjectAction(
  _prevState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const user = await requireAdmin()

  const id = getFormString(formData, 'id').trim()
  if (!id) return { error: 'Falta el identificador del proyecto.' }

  // AGENT users can only update projects assigned to them
  if (user.role === 'AGENT') {
    const agent = await db.agent.findUnique({
      where: { userId: user.id },
      select: { id: true },
    })
    const project = await db.project.findUnique({
      where: { id },
      select: { agentId: true },
    })
    if (!project || project.agentId !== agent?.id) {
      return { error: 'No tienes permisos para modificar este proyecto.' }
    }
    // Force agentId to their own
    formData.set('agentId', agent.id)
  }

  const parsed = projectSchema.safeParse(parseProjectForm(formData))
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Revisa los campos del formulario.',
      fieldErrors: toFieldErrors(parsed.error.issues),
    }
  }

  const { gallery, ...scalars } = parsed.data

  try {
    await db.project.update({
      where: { id },
      data: {
        ...scalars,
        coverImage: parsed.data.coverImage ?? '',
        gallery: Array.isArray(gallery) ? gallery : [],
        priceRangeMin: parsed.data.priceRangeMin ?? null,
        priceRangeMax: parsed.data.priceRangeMax ?? null,
        agentId: parsed.data.agentId || null,
      },
    })
    revalidatePath('/admin/proyectos')
    revalidatePath('/proyectos')
    return { success: true }
  } catch (error) {
    console.error('No se pudo actualizar el proyecto', error)
    return { error: 'No se pudo actualizar el proyecto. Intenta de nuevo.' }
  }
}

export async function deleteProjectAction(
  prevState: ProjectFormState | FormData,
  formData?: FormData,
): Promise<ProjectFormState> {
  const user = await requireAdmin()

  const fd = prevState instanceof FormData ? prevState : formData
  if (!fd) return { error: 'Falta la información del proyecto.' }

  const id = getFormString(fd, 'id').trim()
  if (!id) return { error: 'Falta el identificador del proyecto.' }

  // AGENT users can only delete projects assigned to them
  if (user.role === 'AGENT') {
    const agent = await db.agent.findUnique({
      where: { userId: user.id },
      select: { id: true },
    })
    const project = await db.project.findUnique({
      where: { id },
      select: { agentId: true },
    })
    if (!project || project.agentId !== agent?.id) {
      return { error: 'No tienes permisos para eliminar este proyecto.' }
    }
  }

  const existing = await db.project.findUnique({
    where: { id },
    select: { coverImage: true, gallery: true },
  })
  if (!existing) return { error: 'El proyecto no existe.' }

  try {
    await db.project.delete({ where: { id } })
    const galleryUrls = Array.isArray(existing.gallery)
      ? (existing.gallery as unknown[]).filter((u): u is string => typeof u === 'string')
      : []
    deleteUploadedFiles([existing.coverImage, ...galleryUrls])
    revalidatePath('/admin/proyectos')
    revalidatePath('/proyectos')
    return { success: true }
  } catch (error) {
    console.error('No se pudo eliminar el proyecto', error)
    return { error: 'No se pudo eliminar el proyecto. Intenta de nuevo.' }
  }
}
