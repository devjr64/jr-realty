import { z } from 'zod'

/**
 * Validación para agentes/asesores inmobiliarios.
 * Todos los mensajes en español.
 */

export const agentSchema = z.object({
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(120, 'El nombre no puede superar los 120 caracteres'),
  email: z.email('Ingresa un correo electrónico válido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .optional()
    .or(z.literal('')),
  title: z
    .string()
    .max(100, 'El cargo no puede superar los 100 caracteres')
    .optional()
    .nullable(),
  phone: z.string().min(6, 'Ingresa un teléfono válido').max(30),
  whatsapp: z.string().max(30).optional().nullable(),
  active: z.boolean().default(true),
})

export type AgentInput = z.infer<typeof agentSchema>
