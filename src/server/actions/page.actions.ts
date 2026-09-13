'use server'

import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'

import { requireSuperAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { pageSchema } from '@/lib/validations/page.schema'
import { slugify } from '@/lib/utils/slugify'
import type { ZodIssue } from 'zod'

export interface PageFormState {
  error?: string
  success?: boolean
  fieldErrors?: Record<string, string>
}

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
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

function parsePageForm(formData: FormData): unknown {
  const rawContent = getFormString(formData, 'content')
  let content: unknown[] = []
  if (rawContent) {
    try {
      const parsed: unknown = JSON.parse(rawContent)
      if (Array.isArray(parsed)) content = parsed
    } catch {
      content = []
    }
  }
  return {
    title: getFormString(formData, 'title'),
    slug: getFormString(formData, 'slug') || undefined,
    metaTitle: getFormString(formData, 'metaTitle') || null,
    metaDescription: getFormString(formData, 'metaDescription') || null,
    published: formData.get('published') === 'on',
    content,
  }
}

async function generateUniquePageSlug(title: string): Promise<string> {
  const base = slugify(title) || 'pagina'
  const existing = await db.page.findMany({
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

export async function createPageAction(
  _prevState: PageFormState,
  formData: FormData,
): Promise<PageFormState> {
  await requireSuperAdmin()

  const parsed = pageSchema.safeParse(parsePageForm(formData))
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Revisa los campos del formulario.',
      fieldErrors: toFieldErrors(parsed.error.issues),
    }
  }

  const { slug: _, content, ...scalars } = parsed.data

  try {
    await db.page.create({
      data: {
        ...scalars,
        slug: await generateUniquePageSlug(parsed.data.title),
        content: content as Prisma.InputJsonValue,
      },
    })
    revalidatePath('/admin/cms')
    revalidatePath('/[slug]', 'page')
    return { success: true }
  } catch (error) {
    console.error('No se pudo crear la página', error)
    return { error: 'No se pudo crear la página. Intenta de nuevo.' }
  }
}

export async function updatePageAction(
  _prevState: PageFormState,
  formData: FormData,
): Promise<PageFormState> {
  await requireSuperAdmin()

  const id = getFormString(formData, 'id').trim()
  if (!id) return { error: 'Falta el identificador de la página.' }

  const parsed = pageSchema.safeParse(parsePageForm(formData))
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Revisa los campos del formulario.',
      fieldErrors: toFieldErrors(parsed.error.issues),
    }
  }

  const { slug: _, content, ...scalars } = parsed.data

  try {
    await db.page.update({
      where: { id },
      data: {
        ...scalars,
        content: content as Prisma.InputJsonValue,
      },
    })
    revalidatePath('/admin/cms')
    revalidatePath('/[slug]', 'page')
    return { success: true }
  } catch (error) {
    console.error('No se pudo actualizar la página', error)
    return { error: 'No se pudo actualizar la página. Intenta de nuevo.' }
  }
}

export async function deletePageAction(
  prevState: PageFormState | FormData,
  formData?: FormData,
): Promise<PageFormState> {
  await requireSuperAdmin()

  const fd = prevState instanceof FormData ? prevState : formData
  if (!fd) return { error: 'Falta la información de la página.' }

  const id = getFormString(fd, 'id').trim()
  if (!id) return { error: 'Falta el identificador de la página.' }

  try {
    await db.page.delete({ where: { id } })
    revalidatePath('/admin/cms')
    revalidatePath('/[slug]', 'page')
    return { success: true }
  } catch (error) {
    console.error('No se pudo eliminar la página', error)
    return { error: 'No se pudo eliminar la página. Intenta de nuevo.' }
  }
}
