'use server'

import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

import { requireSuperAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { siteSettingsSchema, type SiteSettingsInput } from '@/lib/validations/site-settings.schema'
import type { ZodIssue } from 'zod'

export interface SiteSettingsFormState {
  error?: string
  success?: boolean
  fieldErrors?: Record<string, string>
}

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

function parseSettingsForm(formData: FormData): SiteSettingsInput {
  return {
    general: {
      siteName: getFormString(formData, 'siteName'),
      tagline: getFormString(formData, 'tagline'),
      phone: getFormString(formData, 'phone'),
      whatsapp: getFormString(formData, 'whatsapp'),
      email: getFormString(formData, 'email'),
      address: getFormString(formData, 'address'),
      currency: (getFormString(formData, 'currency') as 'USD' | 'VES') || 'USD',
    },
    social: {
      facebook: getFormString(formData, 'social.facebook'),
      instagram: getFormString(formData, 'social.instagram'),
      twitter: getFormString(formData, 'social.twitter'),
      linkedin: getFormString(formData, 'social.linkedin'),
      youtube: getFormString(formData, 'social.youtube'),
    },
    seo: {
      title: getFormString(formData, 'seo.title'),
      description: getFormString(formData, 'seo.description'),
    },
  }
}

export async function updateSiteSettingsAction(
  _prevState: SiteSettingsFormState,
  formData: FormData,
): Promise<SiteSettingsFormState> {
  await requireSuperAdmin()

  const parsed = siteSettingsSchema.safeParse(parseSettingsForm(formData))
  if (!parsed.success) {
    const issues: ZodIssue[] = parsed.error.issues
    return {
      error: issues[0]?.message ?? 'Revisa los campos del formulario.',
      fieldErrors: Object.fromEntries(
        issues.map((issue) => [issue.path.join('.'), issue.message]),
      ),
    }
  }

  const { general, social, seo } = parsed.data

  try {
    await db.$transaction([
      db.siteSetting.upsert({
        where: { key: 'general' },
        update: { value: general as Prisma.InputJsonValue },
        create: { key: 'general', value: general as Prisma.InputJsonValue },
      }),
      db.siteSetting.upsert({
        where: { key: 'social' },
        update: { value: social as Prisma.InputJsonValue },
        create: { key: 'social', value: social as Prisma.InputJsonValue },
      }),
      db.siteSetting.upsert({
        where: { key: 'seo' },
        update: { value: seo as Prisma.InputJsonValue },
        create: { key: 'seo', value: seo as Prisma.InputJsonValue },
      }),
    ])
    revalidatePath('/')
    revalidatePath('/contacto')
    revalidatePath('/admin/configuracion')
    return { success: true }
  } catch (error) {
    console.error('No se pudo guardar la configuración', error)
    return { error: 'No se pudo guardar la configuración. Intenta de nuevo.' }
  }
}

export interface ClearCacheFormState {
  error?: string
  success?: boolean
  deletedCount?: number
}

export async function clearImageCacheAction(
  _prevState: ClearCacheFormState,
  _formData: FormData,
): Promise<ClearCacheFormState> {
  await requireSuperAdmin()

  try {
    const cacheDir = join(process.cwd(), '.next', 'cache', 'images')

    // Check if directory exists
    let entries: string[]
    try {
      entries = await readdir(cacheDir)
    } catch {
      // Directory doesn't exist — nothing to clear
      return { success: true, deletedCount: 0 }
    }

    const count = entries.length

    // Remove all subdirectories (each is a cached image hash)
    await Promise.all(
      entries.map((entry) => rm(join(cacheDir, entry), { recursive: true, force: true })),
    )

    revalidatePath('/admin/configuracion')
    return { success: true, deletedCount: count }
  } catch (error) {
    console.error('No se pudo limpiar la caché de imágenes', error)
    return { error: 'No se pudo limpiar la caché de imágenes. Intenta de nuevo.' }
  }
}
