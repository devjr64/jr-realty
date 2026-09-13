import { mkdirSync } from 'node:fs'
import { unlink } from 'node:fs/promises'
import path from 'node:path'

/**
 * MIME → file extension map. Single source of truth for the uploader:
 * `ALLOWED_IMAGE_TYPES` and `extensionFromMime` are both derived from it.
 */
const EXTENSION_BY_MIME: ReadonlyMap<string, string> = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
  ['image/avif', '.avif'],
])

/** MIME types accepted by the image uploader. */
export const ALLOWED_IMAGE_TYPES: string[] = [...EXTENSION_BY_MIME.keys()]

/** Maximum accepted upload size: 5MB. */
export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024

/** Maps a MIME type to its file extension (with dot), or null if unsupported. */
export function extensionFromMime(mime: string): string | null {
  return EXTENSION_BY_MIME.get(mime) ?? null
}

/** True when the file's MIME type is in the upload allowlist. */
export function isAllowedImage(file: File): boolean {
  return extensionFromMime(file.type) !== null
}

/**
 * Magic-byte signatures per allowed MIME. The declared `File.type` is
 * client-controlled, so we verify the actual file content before storing it.
 * This prevents uploading HTML/JS disguised as an image (content-sniffing XSS).
 */
const MAGIC_BYTE_CHECK: ReadonlyMap<string, (buf: Uint8Array) => boolean> = new Map([
  // FF D8 FF
  ['image/jpeg', (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff],
  // 89 50 4E 47 0D 0A 1A 0A
  ['image/png', (buf) =>
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a],
  // RIFF .... WEBP
  ['image/webp', (buf) =>
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50],
  // GIF87a / GIF89a
  ['image/gif', (buf) =>
    buf.length >= 6 &&
    buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 &&
    buf[3] === 0x38 && (buf[4] === 0x37 || buf[4] === 0x39) && buf[5] === 0x61],
  // .... ftyp avif / avis
  ['image/avif', (buf) =>
    buf.length >= 12 &&
    buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70 &&
    ((buf[8] === 0x61 && buf[9] === 0x76 && buf[10] === 0x69 && buf[11] === 0x66) ||
      (buf[8] === 0x61 && buf[9] === 0x76 && buf[10] === 0x69 && buf[11] === 0x73))],
])

/**
 * True when the buffer's magic bytes match the declared MIME type.
 * Reads only the first 64 bytes (enough for all signatures above).
 */
export async function matchesMagicBytes(file: File): Promise<boolean> {
  const check = MAGIC_BYTE_CHECK.get(file.type)
  if (!check) return false
  const head = new Uint8Array(await file.slice(0, 64).arrayBuffer())
  return check(head)
}

/**
 * Absolute path to the public uploads directory (created if missing).
 *
 * `process.cwd()` is always the project root in both dev (`next dev`) and
 * production (`next start` via pm2), so `public/uploads` is resolved
 * consistently across environments.
 */
export function publicUploadsDir(): string {
  const dir = path.resolve(process.cwd(), 'public', 'uploads')
  mkdirSync(dir, { recursive: true })
  return dir
}

/**
 * Deletes a locally-uploaded file given its public URL (`/uploads/<name>`).
 * External URLs (picsum, R2, Cloudinary, or any absolute `http(s)://…` URL)
 * are ignored — only local-path references can delete from `publicUploadsDir()`.
 * Path traversal is impossible: only a bare filename is accepted.
 *
 * SECURITY: we check that the URL *starts* with `/uploads/` exactly. A
 * substring `indexOf('/uploads/')` would also match arbitrary inputs like
 * `/tmp/uploads/evil.jpg` or `https://attacker.example/uploads/anything`
 * and attempt to delete from `publicUploadsDir()`. That would let a caller
 * control which local file gets unlinked by crafting a URL whose `/uploads/`
 * segment happens to match an existing file in `public/uploads/`. See
 * uploads.test.ts > security guards.
 */
export function deleteUploadedFile(publicUrl: string): void {
  const uploadsPath = '/uploads/'
  if (!publicUrl.startsWith(uploadsPath)) return
  const filename = publicUrl.slice(uploadsPath.length)
  if (
    filename === '' ||
    filename.includes('/') ||
    filename.includes('..') ||
    filename.includes('\0') ||
    filename.includes('\x00')
  )
    return
  unlink(path.join(publicUploadsDir(), filename)).catch(() => undefined)
}

/** Deletes several uploaded files (best-effort, ignores missing files). */
export function deleteUploadedFiles(urls: string[]): void {
  for (const url of urls) deleteUploadedFile(url)
}