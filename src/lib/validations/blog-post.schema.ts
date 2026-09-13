import { z } from 'zod'

/**
 * Validación para publicaciones de blog.
 * El contenido acepta dos formas para paridad CMS/Blog:
 * - string Markdown (legado / modo simple)
 * - array de bloques JSON (modo bloques, incluye type:'markdown')
 * Esto permite round-trip sin pérdida entre editor simple y editor de bloques.
 */

const blockShape = z.record(z.string(), z.unknown())

const contentSchema = z.union([
  z
    .string()
    .min(20, 'El contenido debe tener al menos 20 caracteres')
    .max(50000, 'El contenido no puede superar los 50.000 caracteres'),
  z.array(blockShape).min(1, 'Agrega al menos un bloque').max(30, 'Máximo 30 bloques'),
])

export const blogPostSchema = z.object({
  title: z
    .string()
    .min(3, 'El título debe tener al menos 3 caracteres')
    .max(200, 'El título no puede superar los 200 caracteres'),
  excerpt: z.string().max(500).optional().nullable(),
  content: contentSchema,
  coverImage: z.string().max(500).optional().nullable(),
  published: z.boolean().default(false),
})

export type BlogPostInput = z.infer<typeof blogPostSchema>
