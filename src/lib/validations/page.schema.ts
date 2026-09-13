import { z } from 'zod'

/**
 * Validación para páginas CMS con editor de bloques.
 * El contenido es JSON versionado con un array de bloques.
 */

export const pageSchema = z.object({
  title: z
    .string()
    .min(2, 'El título debe tener al menos 2 caracteres')
    .max(150, 'El título no puede superar los 150 caracteres'),
  slug: z.string().optional(),
  metaTitle: z.string().max(160).optional().nullable(),
  metaDescription: z.string().max(300).optional().nullable(),
  published: z.boolean().default(false),
  content: z
    .array(z.record(z.string(), z.unknown()))
    .max(30, 'Máximo 30 bloques por página')
    .default([]),
})

export type PageInput = z.infer<typeof pageSchema>
