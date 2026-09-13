import { z } from 'zod'

/**
 * Validación para la configuración del sitio (SiteSetting).
 * Tres grupos: general, social, seo.
 */

export const siteSettingsSchema = z.object({
  general: z.object({
    siteName: z.string().min(2, 'El nombre del sitio debe tener al menos 2 caracteres').max(100),
    tagline: z.string().max(200).optional(),
    phone: z.string().min(6, 'Ingresa un teléfono válido').max(30),
    whatsapp: z.string().max(30).optional(),
    email: z.email('Ingresa un correo válido'),
    address: z.string().max(300).optional(),
    currency: z.enum(['USD', 'VES']).default('USD'),
  }),
  social: z.object({
    facebook: z.string().max(300).optional().or(z.literal('')),
    instagram: z.string().max(300).optional().or(z.literal('')),
    twitter: z.string().max(300).optional().or(z.literal('')),
    linkedin: z.string().max(300).optional().or(z.literal('')),
    youtube: z.string().max(300).optional().or(z.literal('')),
  }),
  seo: z.object({
    title: z.string().max(200).optional(),
    description: z.string().max(500).optional(),
  }),
})

export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>
