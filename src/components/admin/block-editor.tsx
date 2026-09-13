'use client'

import React, { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { MarkdownRenderer } from '@/components/shared/markdown-renderer'

/**
 * Editor de bloques CMS (estilo Notion simplificado).
 *
 * Soporta: hero, text, cta, features. Permite agregar, editar, reordenar y
 * eliminar bloques. Emite el JSON de bloques vía onChange para que el padre lo
 * guarde en el campo oculto `content`.
 */

export type EditableBlock = {
  type: 'hero' | 'text' | 'cta' | 'features' | 'markdown'
  title?: string
  subtitle?: string
  body?: string
  content?: string
  description?: string
  ctaText?: string
  ctaHref?: string
  buttonText?: string
  buttonHref?: string
  items?: { title: string; description?: string }[]
}

const blockTypes: { type: EditableBlock['type']; label: string }[] = [
  { type: 'hero', label: 'Hero (portada)' },
  { type: 'text', label: 'Texto' },
  { type: 'markdown', label: 'Markdown' },
  { type: 'cta', label: 'Llamada a la acción' },
  { type: 'features', label: 'Características' },
]

const emptyBlock: Record<EditableBlock['type'], EditableBlock> = {
  hero: { type: 'hero', title: 'Título del hero', subtitle: '' },
  text: { type: 'text', title: '', body: '' },
  markdown: { type: 'markdown', content: '' },
  cta: { type: 'cta', title: 'Título CTA', description: '', buttonText: '', buttonHref: '' },
  features: { type: 'features', title: '', items: [] },
}

interface BlockEditorProps {
  value: EditableBlock[]
  onChange: (blocks: EditableBlock[]) => void
}

export function BlockEditor({ value, onChange }: BlockEditorProps) {
  const [addType, setAddType] = useState<EditableBlock['type']>('hero')

  function addBlock() {
    const base = emptyBlock[addType]
    const block: EditableBlock =
      addType === 'features' ? { ...base, items: [] } : { ...base }
    // Ensure markdown starts with empty content field
    if (addType === 'markdown' && block.content === undefined) block.content = ''
    onChange([...value, block])
  }

  function updateBlock(index: number, patch: Partial<EditableBlock>) {
    onChange(
      value.map((block, i) => (i === index ? { ...block, ...patch } : block)),
    )
  }

  function moveBlock(index: number, delta: -1 | 1) {
    const next = [...value]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  function removeBlock(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  function updateFeature(
    blockIndex: number,
    itemIndex: number,
    patch: Partial<{ title: string; description?: string }>,
  ) {
    const block = value[blockIndex]
    if (block.type !== 'features' || !block.items) return
    const items = block.items.map((item, i) =>
      i === itemIndex ? { ...item, ...patch } : item,
    )
    updateBlock(blockIndex, { items })
  }

  function addFeature(blockIndex: number) {
    const block = value[blockIndex]
    if (block.type !== 'features') return
    updateBlock(blockIndex, {
      items: [...(block.items ?? []), { title: 'Característica', description: '' }],
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          value={addType}
          onChange={(e) => setAddType(e.target.value as EditableBlock['type'])}
          className="h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
          aria-label="Tipo de bloque"
        >
          {blockTypes.map((blockType) => (
            <option key={blockType.type} value={blockType.type}>
              {blockType.label}
            </option>
          ))}
        </select>
        <Button type="button" variant="outline" onClick={addBlock}>
          <Plus className="size-4" aria-hidden="true" />
          Agregar bloque
        </Button>
      </div>

      {value.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Aún no hay bloques. Agrega el primero para comenzar a construir la página.
        </p>
      ) : (
        <div className="space-y-4">
          {value.map((block, index) => (
            <div key={index} className="rounded-xl border border-border p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {index + 1}. {blockTypes.find((t) => t.type === block.type)?.label}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Mover arriba"
                    disabled={index === 0}
                    onClick={() => moveBlock(index, -1)}
                  >
                    <ArrowUp aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Mover abajo"
                    disabled={index === value.length - 1}
                    onClick={() => moveBlock(index, 1)}
                  >
                    <ArrowDown aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Eliminar bloque"
                    className="text-destructive"
                    onClick={() => removeBlock(index)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {block.type === 'hero' || block.type === 'text' ? (
                  <>
                    <Input
                      value={block.title ?? ''}
                      onChange={(e) => updateBlock(index, { title: e.target.value })}
                      placeholder="Título"
                    />
                    {block.type === 'text' ? (
                      <Textarea
                        value={block.body ?? ''}
                        onChange={(e) => updateBlock(index, { body: e.target.value })}
                        placeholder="Contenido…"
                        rows={4}
                      />
                    ) : (
                      <Input
                        value={block.subtitle ?? ''}
                        onChange={(e) => updateBlock(index, { subtitle: e.target.value })}
                        placeholder="Subtítulo"
                      />
                    )}
                    {(block.type === 'hero' && block.ctaText) || block.type === 'hero' ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          value={block.ctaText ?? ''}
                          onChange={(e) => updateBlock(index, { ctaText: e.target.value })}
                          placeholder="Texto del botón (opcional)"
                        />
                        <Input
                          value={block.ctaHref ?? ''}
                          onChange={(e) => updateBlock(index, { ctaHref: e.target.value })}
                          placeholder="Destino del botón (ej: /contacto)"
                        />
                      </div>
                    ) : null}
                  </>
                ) : null}

                {block.type === 'markdown' ? (
                  <div className="space-y-3">
                    <Textarea
                      value={block.content ?? ''}
                      onChange={(e) => updateBlock(index, { content: e.target.value })}
                      placeholder="Escribe en Markdown… (ej: ## Título, **negrita**, listas)"
                      rows={8}
                    />
                    {block.content?.trim() ? (
                      <div className="rounded-lg border border-border bg-muted/30 p-4">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Vista previa
                        </p>
                        <MarkdownRenderer content={block.content} />
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        La vista previa aparecerá aquí cuando escribas contenido.
                      </p>
                    )}
                  </div>
                ) : null}

                {block.type === 'cta' ? (
                  <>
                    <Input
                      value={block.title ?? ''}
                      onChange={(e) => updateBlock(index, { title: e.target.value })}
                      placeholder="Título"
                    />
                    <Textarea
                      value={block.description ?? ''}
                      onChange={(e) => updateBlock(index, { description: e.target.value })}
                      placeholder="Descripción…"
                      rows={3}
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        value={block.buttonText ?? ''}
                        onChange={(e) => updateBlock(index, { buttonText: e.target.value })}
                        placeholder="Texto del botón"
                      />
                      <Input
                        value={block.buttonHref ?? ''}
                        onChange={(e) => updateBlock(index, { buttonHref: e.target.value })}
                        placeholder="Destino del botón"
                      />
                    </div>
                  </>
                ) : null}

                {block.type === 'features' ? (
                  <div className="space-y-2">
                    <Input
                      value={block.title ?? ''}
                      onChange={(e) => updateBlock(index, { title: e.target.value })}
                      placeholder="Título de la sección (opcional)"
                    />
                    {(block.items ?? []).map((item, itemIndex) => (
                      <div
                        key={itemIndex}
                        className="flex items-center gap-2 rounded-lg border border-border p-2"
                      >
                        <Input
                          value={item.title}
                          onChange={(e) =>
                            updateFeature(index, itemIndex, { title: e.target.value })
                          }
                          placeholder="Título"
                          className="flex-1"
                        />
                        <Input
                          value={item.description ?? ''}
                          onChange={(e) =>
                            updateFeature(index, itemIndex, { description: e.target.value })
                          }
                          placeholder="Descripción (opcional)"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Quitar característica"
                          className="text-destructive"
                          onClick={() =>
                            updateBlock(index, {
                              items: (block.items ?? []).filter(
                                (_, i) => i !== itemIndex,
                              ),
                            })
                          }
                        >
                          <X aria-hidden="true" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => addFeature(index)}>
                      <Plus className="size-4" aria-hidden="true" />
                      Agregar característica
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
