'use server'

import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import { requireAdmin } from '@/lib/auth-helpers'
import {
  MAX_UPLOAD_SIZE,
  extensionFromMime,
  isAllowedImage,
  matchesMagicBytes,
  publicUploadsDir,
} from '@/lib/utils/uploads'

/** Contract between this Server Action and the client form. */
export type UploadImageResult = { url: string } | { error: string }

/**
 * Uploads an image to /public/uploads and returns its public URL.
 *
 * FLOW:
 *  1. Require an authenticated SUPER_ADMIN or AGENT (`requireAdmin` redirects
 *     to /login otherwise — the first line of defense on top of middleware).
 *  2. Read the file field: must be an actual `File` with an allowed MIME type
 *     and a size of at most 5MB.
 *  3. Write it to the uploads dir under a `crypto.randomUUID()` name — the
 *     server-generated name makes path traversal impossible (the client never
 *     controls the final path).
 *  4. Return the public URL (`/uploads/<filename>`). The `public` dir is
 *     served statically by Next.js, so the file is immediately reachable.
 */
export async function uploadImageAction(
  formData: FormData,
): Promise<UploadImageResult> {
  await requireAdmin()

  const entry = formData.get('file')
  if (!(entry instanceof File)) {
    return { error: 'Selecciona una imagen para subir.' }
  }

  if (!isAllowedImage(entry)) {
    return {
      error: 'Formato de imagen no permitido. Usa JPG, PNG, WebP, GIF o AVIF.',
    }
  }

  if (entry.size > MAX_UPLOAD_SIZE) {
    return { error: 'La imagen supera el máximo de 5MB.' }
  }

  // Verificación de contenido real (magic bytes): el MIME declarado por el
  // cliente es controlable, así que comprobamos que el archivo ES la imagen
  // que dice ser (evita subir HTML/JS disfrazado de imagen).
  if (!(await matchesMagicBytes(entry))) {
    return {
      error: 'El archivo no es una imagen válida. Usa JPG, PNG, WebP, GIF o AVIF.',
    }
  }

  // Safe: isAllowedImage(entry) guarantees the MIME is in the allowlist.
  const extension = extensionFromMime(entry.type)
  if (extension === null) {
    return {
      error: 'Formato de imagen no permitido. Usa JPG, PNG, WebP, GIF o AVIF.',
    }
  }

  const filename = `${randomUUID()}${extension}`

  try {
    const buffer = Buffer.from(await entry.arrayBuffer())
    await writeFile(path.join(publicUploadsDir(), filename), buffer)
  } catch (error) {
    // Log the root cause for operators, but keep the user-facing message generic.
    console.error('No se pudo guardar la imagen', error)
    return { error: 'No se pudo guardar la imagen. Intenta de nuevo.' }
  }

  return { url: `/uploads/${filename}` }
}
