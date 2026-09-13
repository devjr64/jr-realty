'use server'

import bcrypt from 'bcryptjs'
import type { ZodIssue } from 'zod'

import { revalidatePath } from 'next/cache'

import { requireAdmin, requireSuperAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { agentSchema, type AgentInput } from '@/lib/validations/agent.schema'
import { deleteUploadedFile } from '@/lib/utils/uploads'

export interface AgentFormState {
  error?: string
  success?: boolean
  fieldErrors?: Record<string, string>
}

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

function parseAgentForm(formData: FormData): AgentInput {
  return {
    name: getFormString(formData, 'name'),
    email: getFormString(formData, 'email').trim().toLowerCase(),
    password: getFormString(formData, 'password'),
    title: getFormString(formData, 'title') || null,
    phone: getFormString(formData, 'phone'),
    whatsapp: getFormString(formData, 'whatsapp') || null,
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

/**
 * Crea un agente: crea el User (rol AGENT) + el registro Agent vinculado.
 * Solo SUPER_ADMIN puede gestionar agentes.
 */
export async function createAgentAction(
  _prevState: AgentFormState,
  formData: FormData,
): Promise<AgentFormState> {
  await requireSuperAdmin()

  const parsed = agentSchema.safeParse(parseAgentForm(formData))
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Revisa los campos del formulario.',
      fieldErrors: toFieldErrors(parsed.error.issues),
    }
  }

  const { name, email, password, title, phone, whatsapp, active } = parsed.data

  if (!password) {
    return { error: 'La contraseña es obligatoria al crear un agente.' }
  }

  const existingUser = await db.user.findUnique({ where: { email } })
  if (existingUser) {
    return { error: 'Ya existe un usuario con este correo electrónico.' }
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12)
    await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'AGENT',
        phone,
        agent: {
          create: {
            title: title ?? null,
            phone,
            whatsapp: whatsapp ?? null,
            active,
          },
        },
      },
    })
    revalidatePath('/admin/agentes')
    return { success: true }
  } catch (error) {
    console.error('No se pudo crear el agente', error)
    return { error: 'No se pudo crear el agente. Intenta de nuevo.' }
  }
}

export async function updateAgentAction(
  _prevState: AgentFormState,
  formData: FormData,
): Promise<AgentFormState> {
  await requireSuperAdmin()

  const id = getFormString(formData, 'id').trim()
  if (!id) return { error: 'Falta el identificador del agente.' }

  const parsed = agentSchema.safeParse(parseAgentForm(formData))
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Revisa los campos del formulario.',
      fieldErrors: toFieldErrors(parsed.error.issues),
    }
  }

  const { name, email, password, title, phone, whatsapp, active } = parsed.data

  const existing = await db.agent.findUnique({
    where: { id },
    include: { user: { select: { id: true, email: true } } },
  })
  if (!existing) return { error: 'El agente no existe.' }

  // Email único (excluye el propio).
  const emailTaken = await db.user.findFirst({
    where: { email, NOT: { id: existing.userId } },
  })
  if (emailTaken) {
    return { error: 'Ya existe un usuario con este correo electrónico.' }
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existing.userId },
        data: {
          name,
          email,
          phone,
          ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
        },
      })
      await tx.agent.update({
        where: { id },
        data: {
          title: title ?? null,
          phone,
          whatsapp: whatsapp ?? null,
          active,
        },
      })
    })
    revalidatePath('/admin/agentes')
    return { success: true }
  } catch (error) {
    console.error('No se pudo actualizar el agente', error)
    return { error: 'No se pudo actualizar el agente. Intenta de nuevo.' }
  }
}

export async function deleteAgentAction(
  prevState: AgentFormState | FormData,
  formData?: FormData,
): Promise<AgentFormState> {
  await requireSuperAdmin()

  const fd = prevState instanceof FormData ? prevState : formData
  if (!fd) return { error: 'Falta la información del agente.' }

  const id = getFormString(fd, 'id').trim()
  if (!id) return { error: 'Falta el identificador del agente.' }

  const existing = await db.agent.findUnique({
    where: { id },
    include: { user: { select: { id: true, avatarUrl: true } } },
  })
  if (!existing) return { error: 'El agente no existe.' }

  try {
    // La FK Agent_userId es ON DELETE RESTRICT: hay que borrar el registro
    // Agent antes que el User asociado (en una transacción).
    await db.$transaction(async (tx) => {
      await tx.agent.delete({ where: { id } })
      await tx.user.delete({ where: { id: existing.userId } })
    })
    // Limpieza del avatar local si se subió a /uploads.
    if (existing.user.avatarUrl) deleteUploadedFile(existing.user.avatarUrl)
    revalidatePath('/admin/agentes')
    return { success: true }
  } catch (error) {
    console.error('No se pudo eliminar el agente', error)
    return {
      error:
        'No se pudo eliminar el agente. Asegúrate de que no tenga propiedades asociadas.',
    }
  }
}
