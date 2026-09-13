'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Upload, X } from 'lucide-react'
import Image from 'next/image'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { uploadImageAction } from '@/server/actions/upload.actions'
import { cn } from '@/lib/utils'

export interface ImageInput {
  url: string
  alt?: string
  sortOrder: number
}

interface UploadRecord {
  /** Client-generated id so pending thumbnails can be keyed before upload. */
  id: string
  name: string
  error: string | null
}

const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]

const DEFAULT_MAX = 15

function createUploadId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `upload-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export interface PropertyImageUploaderProps {
  /** Current images in display order (parent owns the state). */
  value: ImageInput[]
  /** Emits the full array re-normalized with sortOrder = index. */
  onChange: (images: ImageInput[]) => void
  /** Maximum number of images allowed. Defaults to 15. */
  max?: number
}

/**
 * Admin image picker + uploader for properties (client component).
 *
 * - Hidden multi-file input driven by the drop zone and the "Subir imágenes"
 *   button. Accepted types mirror the server action allowlist.
 * - Files are uploaded concurrently through the `uploadImageAction` server
 *   action (imported directly — Next wires the client reference). Each file
 *   shows a skeleton + spinner while in flight; failures stay in the grid
 *   with their inline Spanish error; successes are committed in one
 *   `onChange` with `sortOrder` re-assigned sequentially.
 * - The grid preview supports remove and move up/down. Every mutation emits a
 *   fresh array in display order so the parent can persist it to a hidden
 *   field (sortOrder = index is the contract).
 */
export function PropertyImageUploader({
  value,
  onChange,
  max = DEFAULT_MAX,
}: PropertyImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  // Mirrors the latest committed value so an in-flight upload batch appends
  // against the freshest state (safe against concurrent user reorders).
  const imagesRef = useRef(value)

  const [pending, setPending] = useState<UploadRecord[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    imagesRef.current = value
  }, [value])

  const images = useMemo(
    () => [...value].sort((a, b) => a.sortOrder - b.sortOrder),
    [value],
  )

  const visibleCount = images.length + pending.length
  const atLimit = visibleCount >= max

  /* ------------------------------------------------------------------ */
  /* Upload flow                                                         */
  /* ------------------------------------------------------------------ */

  async function uploadFiles(files: File[]) {
    const records: UploadRecord[] = files.map((file) => ({
      id: createUploadId(),
      name: file.name,
      error: null,
    }))

    setPending(records)
    setIsUploading(true)

    const results = await Promise.all(
      files.map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        try {
          const result = await uploadImageAction(formData)
          if ('url' in result) {
            return { ok: true as const, url: result.url }
          }
          return { ok: false as const, error: result.error }
        } catch {
          return {
            ok: false as const,
            error: 'No se pudo subir la imagen. Intenta de nuevo.',
          }
        }
      }),
    )

    const uploaded: ImageInput[] = []
    const failed: UploadRecord[] = []

    results.forEach((result, index) => {
      if (result.ok) {
        uploaded.push({ url: result.url, alt: '', sortOrder: 0 })
      } else {
        failed.push({ ...records[index], error: result.error })
      }
    })

    if (uploaded.length > 0) {
      const base = imagesRef.current
      onChange(
        [...base, ...uploaded].map((image, index) => ({
          ...image,
          sortOrder: index,
        })),
      )
    }

    setPending(failed)
    setIsUploading(false)
  }

  function handleFiles(files: File[]) {
    const allowed = files.filter((file) => ACCEPTED_TYPES.includes(file.type))
    const typeSkipped = files.length - allowed.length
    const capacity = Math.max(0, max - images.length - pending.length)
    const selected = allowed.slice(0, capacity)
    const capacitySkipped = allowed.length - selected.length
    const skipped = typeSkipped + capacitySkipped

    if (skipped > 0) {
      const reasons: string[] = []
      if (typeSkipped > 0) reasons.push('con formato no permitido')
      if (capacitySkipped > 0) reasons.push(`el máximo es ${max} imágenes`)
      setNotice(
        `Se ignoraron ${skipped} archivo${skipped === 1 ? '' : 's'}: ${reasons.join(' y ')}.`,
      )
    } else {
      setNotice(null)
    }

    if (selected.length > 0) {
      void uploadFiles(selected)
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    // Reset so selecting the same file again still fires `change`.
    event.target.value = ''
    if (files.length > 0) handleFiles(files)
  }

  /* ------------------------------------------------------------------ */
  /* Reorder / remove                                                    */
  /* ------------------------------------------------------------------ */

  function handleRemove(index: number) {
    onChange(
      images
        .filter((_, i) => i !== index)
        .map((image, i) => ({ ...image, sortOrder: i })),
    )
  }

  function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= images.length) return
    const next = [...images]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(
      next.map((image, i) => ({ ...image, sortOrder: i })),
    )
  }

  /* ------------------------------------------------------------------ */
  /* Drag & drop                                                         */
  /* ------------------------------------------------------------------ */

  function handleDragOver(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    if (!isUploading && !atLimit) setIsDragging(true)
  }

  function handleDragLeave(event: DragEvent<HTMLButtonElement>) {
    // Ignore leaves that move into a child of the zone (avoids flicker).
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
    setIsDragging(false)
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    setIsDragging(false)
    if (isUploading || atLimit) return
    const files = Array.from(event.dataTransfer.files ?? [])
    if (files.length > 0) handleFiles(files)
  }

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Label>Fotos de la propiedad</Label>
          <p className="text-xs text-muted-foreground">
            {visibleCount} de {max} imágenes · JPG, PNG, WebP, GIF o AVIF ·
            máx. 5 MB
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading || atLimit}
        >
          <ImagePlus aria-hidden="true" />
          Subir imágenes
        </Button>
      </div>

      {/* Drop zone — also acts as the keyboard-accessible picker trigger */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        disabled={isUploading || atLimit}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-background px-4 py-8 text-center transition-colors',
          'cursor-pointer outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          'disabled:pointer-events-none disabled:opacity-60',
          isDragging && 'border-primary bg-primary/5',
        )}
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          {isUploading ? (
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="size-5" aria-hidden="true" />
          )}
        </span>
        <span className="text-sm font-medium">
          {isUploading
            ? 'Subiendo imágenes…'
            : atLimit
              ? `Has alcanzado el máximo de ${max} imágenes.`
              : isDragging
                ? 'Suelta las imágenes aquí'
                : 'Arrastra y suelta tus imágenes aquí'}
        </span>
        {!isUploading && !atLimit ? (
          <span className="text-xs text-muted-foreground">
            o haz clic para seleccionar archivos
          </span>
        ) : null}
      </button>

      {/* Hidden multi-file input (triggered by the zone / button) */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleFileChange}
      />

      {notice ? (
        <p
          role="status"
          className="rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground"
        >
          {notice}
        </p>
      ) : null}

      {visibleCount > 0 ? (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {images.map((image, index) => (
            <li key={image.url} className="group relative">
              <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-muted">
                {image.url.startsWith('/uploads/') ? (
                  // Local runtime uploads: plain <img> on purpose — next/image
                  // cannot optimize files written to public/ after the build
                  // (dev/standalone), and the admin preview needs them fresh.
                  // External URLs below still go through next/image.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image.url}
                    alt={image.alt?.trim() ? image.alt : `Imagen ${index + 1}`}
                    className="absolute inset-0 size-full object-cover"
                  />
                ) : (
                  <Image
                    src={image.url}
                    alt={image.alt?.trim() ? image.alt : `Imagen ${index + 1}`}
                    fill
                    sizes="(min-width: 1024px) 15vw, (min-width: 640px) 23vw, 30vw"
                    className="object-cover"
                  />
                )}

                <span className="absolute left-1 top-1 rounded bg-background/85 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                  {index + 1}
                </span>

                <Button
                  type="button"
                  variant="destructive"
                  size="icon-sm"
                  aria-label={`Eliminar imagen ${index + 1}`}
                  onClick={() => handleRemove(index)}
                  className="absolute right-1 top-1 bg-background/90 opacity-100 hover:bg-background focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <X aria-hidden="true" />
                </Button>

                <div className="absolute inset-x-0 bottom-1 flex justify-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Mover imagen ${index + 1} hacia arriba`}
                    disabled={index === 0}
                    onClick={() => handleMove(index, -1)}
                    className="bg-background/90 hover:bg-background"
                  >
                    <ArrowUp aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Mover imagen ${index + 1} hacia abajo`}
                    disabled={index === images.length - 1}
                    onClick={() => handleMove(index, 1)}
                    className="bg-background/90 hover:bg-background"
                  >
                    <ArrowDown aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </li>
          ))}

          {pending.map((record) => (
            <li key={record.id} className="relative">
              <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-muted">
                <Skeleton className="absolute inset-0 size-full rounded-none" />
                <Loader2
                  className="absolute inset-0 m-auto size-6 animate-spin text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
              <p className="mt-1 truncate text-[10px] text-muted-foreground">
                {record.name}
              </p>
              {record.error ? (
                <p
                  role="alert"
                  className="mt-1 text-[11px] leading-snug text-destructive"
                >
                  {record.error}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Aún no hay imágenes. Sube las fotos de la propiedad para que se
          muestren en la galería.
        </p>
      )}
    </div>
  )
}
