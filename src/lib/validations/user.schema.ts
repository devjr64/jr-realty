import { z } from 'zod'

/**
 * Zod schema for user creation/editing from the admin panel.
 * When role = 'AGENT', phone is required (for both User.phone and Agent.phone).
 * title/whatsapp are optional agent-specific fields.
 */
export const userSchema = z
  .object({
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
    role: z.enum(['SUPER_ADMIN', 'AGENT', 'CLIENT'], {
      error: 'Selecciona un rol válido',
    }),
    active: z.boolean().default(true),
    // Agent-specific fields — always strings from FormData
    phone: z.string().default(''),
    title: z.string().max(100, 'El cargo no puede superar los 100 caracteres').optional().or(z.literal('')),
    whatsapp: z.string().max(30).optional().or(z.literal('')),
  })
  .refine(
    (data) => {
      if (data.role === 'AGENT') {
        return data.phone.trim().length >= 6
      }
      return true
    },
    {
      message: 'El teléfono es obligatorio para agentes (mínimo 6 caracteres)',
      path: ['phone'],
    },
  )

export type UserInput = z.infer<typeof userSchema>
