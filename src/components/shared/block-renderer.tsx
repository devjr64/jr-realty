import Link from 'next/link'

import { MarkdownRenderer } from '@/components/shared/markdown-renderer'
import { Button } from '@/components/ui/button'

/**
 * Renderizador de bloques CMS → secciones públicas.
 *
 * Convierte el JSON de bloques almacenado en Page.content en secciones
 * estilizadas. Los bloques desconocidos se omiten silenciosamente.
 */

export type CmsBlock =
  | { type: 'hero'; title: string; subtitle?: string; ctaText?: string; ctaHref?: string }
  | { type: 'text'; title?: string; body: string }
  | { type: 'markdown'; content: string; title?: string }
  | { type: 'cta'; title: string; description?: string; buttonText?: string; buttonHref?: string }
  | { type: 'features'; title?: string; items: { title: string; description?: string }[] }
  | { type: 'properties-grid'; title?: string; limit?: number }
  | { type: 'testimonials-grid'; title?: string }
  | { type: 'zones-grid'; title?: string }
  | { type: string; [key: string]: unknown }

export function isCmsBlock(value: unknown): value is CmsBlock {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return typeof record.type === 'string'
}

/** Renderiza un solo bloque en su sección pública correspondiente. */
export function BlockView({ block }: { block: CmsBlock }) {
  switch (block.type) {
    case 'hero': {
      const b = block as { title: string; subtitle?: string; ctaText?: string; ctaHref?: string }
      return (
        <section className="bg-gradient-to-br from-background via-background to-primary/5 py-20">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
              {b.title}
            </h1>
            {b.subtitle ? (
              <p className="mt-4 text-lg text-muted-foreground">{b.subtitle}</p>
            ) : null}
            {b.ctaText ? (
              <div className="mt-8">
                <Button
                  size="lg"
                  render={<Link href={b.ctaHref || '/'} />}
                >
                  {b.ctaText}
                </Button>
              </div>
            ) : null}
          </div>
        </section>
      )
    }
    case 'text': {
      const b = block as { title?: string; body: string }
      return (
        <section className="py-16">
          <div className="mx-auto max-w-3xl px-4">
            {b.title ? (
              <h2 className="font-heading text-3xl font-semibold">{b.title}</h2>
            ) : null}
            <div className="mt-4 space-y-4 whitespace-pre-line leading-relaxed text-muted-foreground">
              {b.body}
            </div>
          </div>
        </section>
      )
    }
    case 'cta': {
      const b = block as {
        title: string
        description?: string
        buttonText?: string
        buttonHref?: string
      }
      return (
        <section className="bg-sidebar py-16 text-sidebar-foreground">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <h2 className="font-heading text-3xl font-semibold">{b.title}</h2>
            {b.description ? (
              <p className="mt-3 text-sidebar-foreground/70">{b.description}</p>
            ) : null}
            {b.buttonText ? (
              <div className="mt-8">
                <Button
                  size="lg"
                  render={<Link href={b.buttonHref || '/contacto'} />}
                >
                  {b.buttonText}
                </Button>
              </div>
            ) : null}
          </div>
        </section>
      )
    }
    case 'features': {
      const b = block as { title?: string; items: { title: string; description?: string }[] }
      return (
        <section className="py-16">
          <div className="mx-auto max-w-5xl px-4">
            {b.title ? (
              <h2 className="text-center font-heading text-3xl font-semibold">
                {b.title}
              </h2>
            ) : null}
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {b.items.map((item, index) => (
                <div
                  key={`${item.title}-${index}`}
                  className="rounded-xl border border-border p-5"
                >
                  <h3 className="font-semibold">{item.title}</h3>
                  {item.description ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      )
    }
    case 'markdown': {
      const b = block as { content?: string; body?: string; title?: string }
      const md = b.content ?? b.body ?? ''
      if (!md.trim()) return null
      return (
        <section className="py-8">
          <div className="mx-auto max-w-3xl px-4">
            {b.title ? (
              <h2 className="font-heading text-3xl font-semibold">{b.title}</h2>
            ) : null}
            <div className={b.title ? 'mt-4' : ''}>
              <MarkdownRenderer content={md} />
            </div>
          </div>
        </section>
      )
    }
    // Los grids de propiedades/testimonios/zonas se rellenan desde los
    // componentes públicos específicos (task pública) — placeholder.
    default:
      return null
  }
}

/** Renderiza una lista de bloques (versión estable para páginas públicas). */
export function BlocksRenderer({ blocks }: { blocks: CmsBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => (
        <BlockView key={`${block.type}-${index}`} block={block} />
      ))}
    </>
  )
}
