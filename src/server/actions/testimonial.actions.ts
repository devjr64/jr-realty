'use server'

import type { ZodIssue } from 'zod'

import { revalidatePath } from 'next/cache'

import { requireSuperAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import {
  testimonialSchema,
  type TestimonialInput,
} from '@/lib/validations/testimonial.schema'
import { deleteUploadedFile } from '@/lib/utils/uploads'

export interface TestimonialFormState {
  error?: string
  success?: boolean
  fieldErrors?: Record<string, string>
}

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

function parseTestimonialForm(formData: FormData): unknown {
  return {
    name: getFormString(formData, 'name'),
    role: getFormString(formData, 'role') || null,
    content: getFormString(formData, 'content'),
    rating: getFormString(formData, 'rating') || '5',
    active: formData.get('active') === 'on',
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

export async function createTestimonialAction(
  _prevState: TestimonialFormState,
  formData: FormData,
): Promise<TestimonialFormState> {
  await requireSuperAdmin()

  const parsed = testimonialSchema.safeParse(parseTestimonialForm(formData))
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Revisa los campos del formulario.',
      fieldErrors: toFieldErrors(parsed.error.issues),
    }
  }

  try {
    await db.testimonial.create({
      data: {
        ...parsed.data,
        role: parsed.data.role ?? null,
      },
    })
    revalidatePath('/admin/testimonios')
    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error('No se pudo crear el testimonio', error)
    return { error: 'No se pudo crear el testimonio. Intenta de nuevo.' }
  }
}

export async function updateTestimonialAction(
  _prevState: TestimonialFormState,
  formData: FormData,
): Promise<TestimonialFormState> {
  await requireSuperAdmin()

  const id = getFormString(formData, 'id').trim()
  if (!id) return { error: 'Falta el identificador del testimonio.' }

  const parsed = testimonialSchema.safeParse(parseTestimonialForm(formData))
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Revisa los campos del formulario.',
      fieldErrors: toFieldErrors(parsed.error.issues),
    }
  }

  try {
    await db.testimonial.update({
      where: { id },
      data: {
        ...parsed.data,
        role: parsed.data.role ?? null,
      },
    })
    revalidatePath('/admin/testimonios')
    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error('No se pudo actualizar el testimonio', error)
    return { error: 'No se pudo actualizar el testimonio. Intenta de nuevo.' }
  }
}

export async function deleteTestimonialAction(
  prevState: TestimonialFormState | FormData,
  formData?: FormData,
): Promise<TestimonialFormState> {
  await requireSuperAdmin()

  const fd = prevState instanceof FormData ? prevState : formData
  if (!fd) return { error: 'Falta la información del testimonio.' }

  const id = getFormString(fd, 'id').trim()
  if (!id) return { error: 'Falta el identificador del testimonio.' }

  const existing = await db.testimonial.findUnique({
    where: { id },
    select: { avatarUrl: true },
  })
  if (!existing) return { error: 'El testimonio no existe.' }

  try {
    await db.testimonial.delete({ where: { id } })
    if (existing.avatarUrl) deleteUploadedFile(existing.avatarUrl)
    revalidatePath('/admin/testimonios')
    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error('No se pudo eliminar el testimonio', error)
    return { error: 'No se pudo eliminar el testimonio. Intenta de nuevo.' }
  }
}
