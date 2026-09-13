import { z } from 'zod'

/**
 * Validación para proyectos / pre-construcción.
 * Todos los mensajes en español.
 */

export const projectSchema = z.object({
  name: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(150, 'El nombre no puede superar los 150 caracteres'),
  description: z
    .string()
    .min(20, 'La descripción debe tener al menos 20 caracteres')
    .max(10000, 'La descripción no puede superar los 10.000 caracteres'),
  developer: z.string().max(150).optional().nullable(),
  zoneId: z.string().min(1, 'Selecciona una zona'),
  agentId: z.string().optional().nullable(),
  deliveryDate: z.coerce.date().optional().nullable(),
  priceRangeMin: z.coerce.number().positive().max(100_000_000).optional().nullable(),
  priceRangeMax: z.coerce.number().positive().max(100_000_000).optional().nullable(),
  coverImage: z.string().max(500).optional().nullable(),
  gallery: z
    .array(z.object({ url: z.string(), alt: z.string().optional() }))
    .max(30)
    .default([]),
  status: z.enum(['ACTIVE', 'SOLD_OUT', 'COMING_SOON']).default('ACTIVE'),
})

export type ProjectInput = z.infer<typeof projectSchema>
