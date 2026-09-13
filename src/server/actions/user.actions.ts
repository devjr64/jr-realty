'use server'

import bcrypt from 'bcryptjs'
import type { ZodIssue } from 'zod'
import { revalidatePath } from 'next/cache'

import { requireSuperAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { userSchema, type UserInput } from '@/lib/validations/user.schema'

export interface UserFormState {
  error?: string
  success?: boolean
  fieldErrors?: Record<string, string>
}

function getFormString(formData: FormData, key: string): string {
  const v = formData.get(key)
  return typeof v === 'string' ? v : ''
}

function parseUserForm(formData: FormData): UserInput {
  return {
    name: getFormString(formData, 'name'),
    email: getFormString(formData, 'email').trim().toLowerCase(),
    password: getFormString(formData, 'password'),
    role: getFormString(formData, 'role') as UserInput['role'],
    active: formData.get('active') === 'on',
    phone: getFormString(formData, 'phone'),
    title: getFormString(formData, 'title'),
    whatsapp: getFormString(formData, 'whatsapp'),
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

export async function createUserAction(
  _prevState: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  await requireSuperAdmin()
  const parsed = userSchema.safeParse(parseUserForm(formData))
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Revisa los campos.',
      fieldErrors: toFieldErrors(parsed.error.issues),
    }
  }
  const { name, email, password, role, active, phone, title, whatsapp } = parsed.data
  if (!password) return { error: 'La contraseña es obligatoria al crear un usuario.' }
  const existing = await db.user.findUnique({ where: { email } })
  if (existing) return { error: 'Ya existe un usuario con este correo.' }
  try {
    const passwordHash = await bcrypt.hash(password, 12)
    if (role === 'AGENT') {
      // Create both User + Agent records atomically (same pattern as createAgentAction)
      const trimmedPhone = phone.trim()
      await db.user.create({
        data: {
          name,
          email,
          passwordHash,
          role,
          active,
          phone: trimmedPhone,
          agent: {
            create: {
              phone: trimmedPhone,
              title: title?.trim() || null,
              whatsapp: whatsapp?.trim() || null,
              active,
            },
          },
        },
      })
    } else {
      await db.user.create({
        data: { name, email, passwordHash, role, active },
      })
    }
    revalidatePath('/admin/usuarios')
    if (role === 'AGENT') revalidatePath('/admin/agentes')
    return { success: true }
  } catch (e) {
    console.error('No se pudo crear el usuario', e)
    return { error: 'No se pudo crear el usuario. Intenta de nuevo.' }
  }
}

export async function updateUserAction(
  _prevState: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const currentUser = await requireSuperAdmin()
  const id = getFormString(formData, 'id').trim()
  if (!id) return { error: 'Falta el identificador del usuario.' }

  const parsed = userSchema.safeParse(parseUserForm(formData))
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Revisa los campos.',
      fieldErrors: toFieldErrors(parsed.error.issues),
    }
  }
  const { name, email, password, role, active, phone, title, whatsapp } = parsed.data
  const existing = await db.user.findUnique({ where: { id } })
  if (!existing) return { error: 'El usuario no existe.' }

  // Prevent self-demotion: a SUPER_ADMIN cannot change their own role
  if (id === currentUser.id && role !== 'SUPER_ADMIN') {
    return {
      error:
        'No puedes cambiar tu propio rol de Super Admin. Solicita a otro administrador que realice este cambio.',
    }
  }

  const taken = await db.user.findFirst({ where: { email, NOT: { id } } })
  if (taken) return { error: 'Ya existe un usuario con este correo.' }

  // Check if role is changing involving AGENT (need to create or delete Agent record)
  const previousRole = existing.role
  const roleChanged = previousRole !== role
  const becomingAgent = roleChanged && role === 'AGENT'
  const ceasingAgent = roleChanged && previousRole === 'AGENT'

  try {
    await db.$transaction(async (tx) => {
      // 1. Update the User record
      await tx.user.update({
        where: { id },
        data: {
          name,
          email,
          role,
          active,
          phone: role === 'AGENT' ? phone.trim() : null,
          ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
        },
      })

      // 2. Handle Agent record based on role change
      if (role === 'AGENT') {
        const trimmedPhone = phone.trim()
        if (becomingAgent) {
          // non-AGENT → AGENT: create new Agent record
          await tx.agent.create({
            data: {
              userId: id,
              phone: trimmedPhone,
              title: title?.trim() || null,
              whatsapp: whatsapp?.trim() || null,
              active,
            },
          })
        } else {
          // AGENT → AGENT: update existing Agent record
          const agent = await tx.agent.findUnique({ where: { userId: id } })
          if (agent) {
            await tx.agent.update({
              where: { id: agent.id },
              data: {
                phone: trimmedPhone,
                title: title?.trim() || null,
                whatsapp: whatsapp?.trim() || null,
                active,
              },
            })
          }
        }
      } else if (ceasingAgent) {
        // AGENT → non-AGENT: delete Agent record
        // This may fail if properties/leads are associated (FK RESTRICT)
        const agent = await tx.agent.findUnique({ where: { userId: id } })
        if (agent) {
          await tx.agent.delete({ where: { id: agent.id } })
        }
      }
    })

    revalidatePath('/admin/usuarios')
    if (role === 'AGENT' || previousRole === 'AGENT') {
      revalidatePath('/admin/agentes')
    }
    return { success: true }
  } catch (e) {
    console.error('No se pudo actualizar el usuario', e)
    // Provide a more helpful error when the Agent FK blocks the role change
    if (ceasingAgent) {
      return {
        error:
          'No se puede cambiar el rol porque este agente tiene propiedades o leads asociados. Primero reasigna o elimina esos registros.',
      }
    }
    return { error: 'No se pudo actualizar el usuario. Intenta de nuevo.' }
  }
}

export async function listUsers() {
  await requireSuperAdmin()
  return db.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, email: true, role: true, active: true },
  })
}

export async function getUserById(id: string) {
  await requireSuperAdmin()
  if (!id) return null
  return db.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, active: true },
  })
}

export async function deleteUserAction(
  prevState: UserFormState | FormData,
  formData?: FormData,
): Promise<UserFormState> {
  await requireSuperAdmin()
  const fd = prevState instanceof FormData ? prevState : formData
  if (!fd) return { error: 'Falta información del usuario.' }
  const id = getFormString(fd, 'id').trim()
  if (!id) return { error: 'Falta el identificador del usuario.' }
  const existing = await db.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  })
  if (!existing) return { error: 'El usuario no existe.' }
  // Prevent self-deletion? Allow but DB will handle; optionally count super admins
  if (existing.role === 'SUPER_ADMIN') {
    const count = await db.user.count({ where: { role: 'SUPER_ADMIN' } })
    if (count <= 1) return { error: 'No se puede eliminar al último super administrador.' }
  }
  try {
    // Agent FK is RESTRICT — delete agent row first if exists
    const agent = await db.agent.findUnique({ where: { userId: id } })
    if (agent) await db.agent.delete({ where: { id: agent.id } })
    await db.user.delete({ where: { id } })
    revalidatePath('/admin/usuarios')
    return { success: true }
  } catch (e) {
    console.error('No se pudo eliminar el usuario', e)
    return { error: 'No se pudo eliminar el usuario. Verifica que no tenga registros asociados.' }
  }
}
