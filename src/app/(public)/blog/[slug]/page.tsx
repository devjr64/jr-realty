import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { BlocksRenderer, isCmsBlock } from '@/components/shared/block-renderer'
import { MarkdownRenderer } from '@/components/shared/markdown-renderer'
import { db } from '@/lib/db'
import { formatDate } from '@/lib/utils/format'

interface BlogPostDetallePageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: BlogPostDetallePageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await db.blogPost.findUnique({ where: { slug } })
  if (!post || !post.published) return { title: 'No encontrado | JR Realty' }
  return {
    title: `${post.title} | JR Realty`,
    description: post.excerpt ?? undefined,
  }
}

export const revalidate = 300 // ISR: 5 min

export default async function BlogPostDetallePage({ params }: BlogPostDetallePageProps) {
  const { slug } = await params
  const post = await db.blogPost.findUnique({
    where: { slug },
    include: { author: { select: { name: true } } },
  })

  if (!post || !post.published) notFound()

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="mb-6 text-sm text-muted-foreground" aria-label="Miga de pan">
        <Link href="/" className="hover:text-primary">
          Inicio
        </Link>
        {' / '}
        <Link href="/blog" className="hover:text-primary">
          Blog
        </Link>
        {' / '}
        <span className="text-foreground">{post.title}</span>
      </nav>

      <header className="mb-8">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          {post.title}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {post.author.name} · {post.publishedAt ? formatDate(post.publishedAt) : ''}
        </p>
      </header>

      {post.coverImage ? (
        <div className="relative mb-8 aspect-[16/9] w-full overflow-hidden rounded-xl">
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            sizes="(min-width: 768px) 48rem, 100vw"
            className="object-cover"
          />
        </div>
      ) : null}

      {Array.isArray(post.content) && post.content.every(isCmsBlock) ? (
        <BlocksRenderer blocks={post.content as unknown as Parameters<typeof BlocksRenderer>[0]['blocks']} />
      ) : (
        <MarkdownRenderer content={post.content as unknown} />
      )}

      <div className="mt-12 rounded-xl bg-sidebar p-6 text-center text-sidebar-foreground">
        <h2 className="font-heading text-xl font-semibold">
          ¿Buscas tu próxima propiedad?
        </h2>
        <p className="mt-2 text-sm text-sidebar-foreground/70">
          Nuestros asesores te ayudan a encontrar el hogar ideal.
        </p>
        <Link
          href="/propiedades"
          className="mt-4 inline-block rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Ver propiedades
        </Link>
      </div>
    </article>
  )
}
