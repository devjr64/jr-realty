'use server'

import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'

import { requireAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { blogPostSchema } from '@/lib/validations/blog-post.schema'
import { slugify } from '@/lib/utils/slugify'
import { deleteUploadedFile } from '@/lib/utils/uploads'
import type { ZodIssue } from 'zod'

export interface BlogPostFormState {
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

function parseContent(raw: string): unknown {
  const trimmed = raw.trim()
  if (!trimmed) return raw
  // Detect JSON blocks array: starts with [ and parses to array with type fields
  if (trimmed.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(trimmed)
      if (Array.isArray(parsed) && parsed.every((b) => typeof b === 'object' && b !== null && 'type' in (b as Record<string, unknown>))) {
        return parsed
      }
    } catch {
      // fall through to string
    }
  }
  return raw
}

function parseBlogPostForm(formData: FormData): unknown {
  const rawContent = getFormString(formData, 'content')
  return {
    title: getFormString(formData, 'title'),
    excerpt: getFormString(formData, 'excerpt') || null,
    content: parseContent(rawContent),
    coverImage: getFormString(formData, 'coverImage') || null,
    published: formData.get('published') === 'on',
  }
}

async function generateUniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || 'post'
  const existing = await db.blogPost.findMany({
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

export async function createBlogPostAction(
  _prevState: BlogPostFormState,
  formData: FormData,
): Promise<BlogPostFormState> {
  const user = await requireAdmin()

  const parsed = blogPostSchema.safeParse(parseBlogPostForm(formData))
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Revisa los campos del formulario.',
      fieldErrors: toFieldErrors(parsed.error.issues),
    }
  }

  try {
    await db.blogPost.create({
      data: {
        ...parsed.data,
        slug: await generateUniqueSlug(parsed.data.title),
        authorId: user.id,
        // El contenido se guarda como JSON (string Markdown) en la columna Json.
        content: parsed.data.content as Prisma.InputJsonValue,
        publishedAt: parsed.data.published ? new Date() : null,
      },
    })
    revalidatePath('/admin/blog')
    revalidatePath('/blog')
    return { success: true }
  } catch (error) {
    console.error('No se pudo crear la publicación', error)
    return { error: 'No se pudo crear la publicación. Intenta de nuevo.' }
  }
}

export async function updateBlogPostAction(
  _prevState: BlogPostFormState,
  formData: FormData,
): Promise<BlogPostFormState> {
  const user = await requireAdmin()

  const id = getFormString(formData, 'id').trim()
  if (!id) return { error: 'Falta el identificador de la publicación.' }

  // AGENT users can only edit their own posts
  if (user.role === 'AGENT') {
    const post = await db.blogPost.findUnique({
      where: { id },
      select: { authorId: true },
    })
    if (!post || post.authorId !== user.id) {
      return { error: 'No tienes permisos para modificar esta publicación.' }
    }
  }

  const parsed = blogPostSchema.safeParse(parseBlogPostForm(formData))
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Revisa los campos del formulario.',
      fieldErrors: toFieldErrors(parsed.error.issues),
    }
  }

  const existing = await db.blogPost.findUnique({
    where: { id },
    select: { published: true },
  })
  if (!existing) return { error: 'La publicación no existe.' }

  try {
    await db.blogPost.update({
      where: { id },
      data: {
        ...parsed.data,
        content: parsed.data.content as Prisma.InputJsonValue,
        // Al publicar por primera vez se fija publishedAt.
        publishedAt: parsed.data.published && !existing.published ? new Date() : undefined,
      },
    })
    revalidatePath('/admin/blog')
    revalidatePath('/blog')
    return { success: true }
  } catch (error) {
    console.error('No se pudo actualizar la publicación', error)
    return { error: 'No se pudo actualizar la publicación. Intenta de nuevo.' }
  }
}

export async function deleteBlogPostAction(
  prevState: BlogPostFormState | FormData,
  formData?: FormData,
): Promise<BlogPostFormState> {
  const user = await requireAdmin()

  const fd = prevState instanceof FormData ? prevState : formData
  if (!fd) return { error: 'Falta la información de la publicación.' }

  const id = getFormString(fd, 'id').trim()
  if (!id) return { error: 'Falta el identificador de la publicación.' }

  // AGENT users can only delete their own posts
  if (user.role === 'AGENT') {
    const post = await db.blogPost.findUnique({
      where: { id },
      select: { authorId: true },
    })
    if (!post || post.authorId !== user.id) {
      return { error: 'No tienes permisos para eliminar esta publicación.' }
    }
  }

  const existing = await db.blogPost.findUnique({
    where: { id },
    select: { coverImage: true },
  })
  if (!existing) return { error: 'La publicación no existe.' }

  try {
    await db.blogPost.delete({ where: { id } })
    if (existing.coverImage) deleteUploadedFile(existing.coverImage)
    revalidatePath('/admin/blog')
    revalidatePath('/blog')
    return { success: true }
  } catch (error) {
    console.error('No se pudo eliminar la publicación', error)
    return { error: 'No se pudo eliminar la publicación. Intenta de nuevo.' }
  }
}
