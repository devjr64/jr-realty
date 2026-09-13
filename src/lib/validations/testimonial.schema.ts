import { z } from 'zod'

/**
 * Validación para testimonios de clientes.
 * Todos los mensajes en español.
 */

export const testimonialSchema = z.object({
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(120, 'El nombre no puede superar los 120 caracteres'),
  role: z.string().max(100).optional().nullable(),
  content: z
    .string()
    .min(10, 'El testimonio debe tener al menos 10 caracteres')
    .max(2000, 'El testimonio no puede superar los 2.000 caracteres'),
  rating: z.coerce.number().int().min(1).max(5).default(5),
  active: z.boolean().default(true),
})

export type TestimonialInput = z.infer<typeof testimonialSchema>
