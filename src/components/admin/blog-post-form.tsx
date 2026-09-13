'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Save } from 'lucide-react'
import { toast } from 'sonner'

import { BlockEditor, type EditableBlock } from '@/components/admin/block-editor'
import { FormField } from '@/components/shared/form-field'
import { MarkdownRenderer } from '@/components/shared/markdown-renderer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SubmitButton } from '@/components/ui/submit-button'
import {
  createBlogPostAction,
  updateBlogPostAction,
  type BlogPostFormState,
} from '@/server/actions/blog-post.actions'

export interface BlogPostFormValue {
  id?: string
  title: string
  excerpt: string | null
  // content may be legacy markdown string or new blocks array (Json)
  content: string | EditableBlock[] | unknown
  coverImage: string | null
  published: boolean
}

interface BlogPostFormProps {
  initial?: BlogPostFormValue | null
}

function isBlockArray(value: unknown): value is EditableBlock[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) => typeof item === 'object' && item !== null && 'type' in (item as Record<string, unknown>),
    )
  )
}

function blocksFromContent(raw: unknown): EditableBlock[] {
  if (raw === null || raw === undefined) return []
  if (isBlockArray(raw)) return raw as EditableBlock[]
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return []
    // If string is JSON-encoded blocks array (from hidden input or DB stringified), parse it
    if (trimmed.startsWith('[')) {
      try {
        const parsed: unknown = JSON.parse(trimmed)
        if (isBlockArray(parsed)) return parsed
      } catch {
        // not JSON, treat as markdown
      }
    }
    return [{ type: 'markdown', content: raw }]
  }
  // Prisma Json may already be parsed array/object
  if (Array.isArray(raw) && isBlockArray(raw)) return raw as EditableBlock[]
  return []
}

function markdownFromBlocks(blocks: EditableBlock[]): string {
  if (blocks.length === 1 && blocks[0].type === 'markdown') return blocks[0].content ?? ''
  return blocks
    .filter((b) => b.type === 'markdown')
    .map((b) => b.content ?? '')
    .join('\n\n')
}

export function BlogPostForm({ initial }: BlogPostFormProps) {
  const isEdit = Boolean(initial?.id)
  const action = isEdit ? updateBlogPostAction : createBlogPostAction
  const [state, formAction, isPending] = useActionState<BlogPostFormState, FormData>(action, {})
  const fieldErrors = state.fieldErrors ?? {}

  const initialBlocks = useMemo(() => blocksFromContent(initial?.content), [initial?.content])
  const [blocks, setBlocks] = useState<EditableBlock[]>(initialBlocks)
  const [mode, setMode] = useState<'markdown' | 'bloques'>(() => {
    if (initialBlocks.length === 0) return 'markdown'
    if (initialBlocks.length === 1 && initialBlocks[0].type === 'markdown') return 'markdown'
    return 'bloques'
  })

  // Keep simple markdown textarea in sync with blocks when in markdown mode
  const simpleMarkdown = markdownFromBlocks(blocks)

  function handleSimpleChange(value: string) {
    setBlocks([{ type: 'markdown', content: value }])
  }

  useEffect(() => {
    if (state.success) toast.success('Publicación guardada correctamente.')
    if (state.error) toast.error(state.error)
  }, [state])

  return (
    <form action={formAction} className="space-y-6">
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}

      {state.error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{state.error}</span>
        </div>
      ) : null}

      {state.success ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-700 dark:text-emerald-300"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>Publicación guardada correctamente.</span>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Publicación</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <FormField label="Título" htmlFor="title" required error={fieldErrors.title}>
            <Input
              id="title"
              name="title"
              defaultValue={initial?.title}
              placeholder="Ej: Guía para comprar tu primer apartamento en Venezuela"
              required
              disabled={isPending}
            />
          </FormField>

          <FormField label="Extracto (resumen)" htmlFor="excerpt" error={fieldErrors.excerpt}>
            <Textarea
              id="excerpt"
              name="excerpt"
              defaultValue={initial?.excerpt ?? ''}
              rows={2}
              placeholder="Resumen corto que aparece en la lista…"
              disabled={isPending}
            />
          </FormField>

          <FormField label="URL de imagen de portada" htmlFor="coverImage" error={fieldErrors.coverImage}>
            <Input
              id="coverImage"
              name="coverImage"
              defaultValue={initial?.coverImage ?? ''}
              placeholder="https://… (opcional)"
              disabled={isPending}
            />
          </FormField>

          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="published"
              defaultChecked={initial?.published ?? false}
              className="size-4 accent-primary"
              disabled={isPending}
            />
            Publicar
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="font-heading text-lg">Contenido</CardTitle>
          <div className="flex gap-2" role="tablist" aria-label="Modo de edición">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'markdown'}
              onClick={() => setMode('markdown')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mode === 'markdown' ? 'bg-primary text-primary-foreground' : 'border border-input bg-background hover:bg-muted'}`}
            >
              Markdown simple
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'bloques'}
              onClick={() => setMode('bloques')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mode === 'bloques' ? 'bg-primary text-primary-foreground' : 'border border-input bg-background hover:bg-muted'}`}
            >
              Bloques
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {mode === 'markdown'
              ? 'Escribe en Markdown. Ideal para artículos rápidos.'
              : 'Combina bloques de Markdown, hero, texto, CTA y características.'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Hidden input shared API: both page-form and blog-post-form send JSON-stringified blocks */}
          <input type="hidden" name="content" value={JSON.stringify(blocks)} />
          {fieldErrors.content ? (
            <p className="text-sm text-destructive" role="alert">
              {fieldErrors.content}
            </p>
          ) : null}

          {mode === 'markdown' ? (
            <div className="space-y-3">
              <Textarea
                id="content-markdown"
                value={simpleMarkdown}
                onChange={(e) => handleSimpleChange(e.target.value)}
                rows={14}
                placeholder="Escribe el contenido en Markdown… ## Título, **negrita**, listas, enlaces"
                disabled={isPending}
                aria-label="Contenido Markdown"
              />
              {simpleMarkdown.trim() ? (
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Vista previa
                  </p>
                  <MarkdownRenderer content={simpleMarkdown} />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  La vista previa aparecerá aquí cuando escribas contenido.
                </p>
              )}
            </div>
          ) : (
            <BlockEditor value={blocks} onChange={setBlocks} />
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <SubmitButton isPending={isPending} pendingText="Guardando…" size="lg">
          <Save className="size-4" aria-hidden="true" />
          {isEdit ? 'Guardar cambios' : 'Publicar entrada'}
        </SubmitButton>
      </div>
    </form>
  )
}
