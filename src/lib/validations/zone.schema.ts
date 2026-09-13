import { z } from 'zod'

/**
 * Validación para zonas/barriadas.
 * Todos los mensajes en español.
 */

export const zoneSchema = z.object({
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede superar los 100 caracteres'),
  slug: z.string().optional(),
  description: z
    .string()
    .max(2000, 'La descripción no puede superar los 2.000 caracteres')
    .optional()
    .nullable(),
  imageUrl: z
    .string()
    .max(500, 'La URL de la imagen es demasiado larga')
    .optional()
    .nullable(),
  parentId: z.string().optional().nullable(),
})

export type ZoneInput = z.infer<typeof zoneSchema>
