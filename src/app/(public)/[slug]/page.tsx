import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { BlocksRenderer, isCmsBlock, type CmsBlock } from '@/components/shared/block-renderer'
import { db } from '@/lib/db'

export const revalidate = 300 // ISR: 5 min (page.actions revalida /[slug] tras cada write)

interface PublicPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PublicPageProps): Promise<Metadata> {
  const { slug } = await params
  const page = await db.page.findUnique({ where: { slug } })
  if (!page || !page.published) return { title: 'No encontrado | JR Realty' }
  return {
    title: page.metaTitle ?? `${page.title} | JR Realty`,
    description: page.metaDescription ?? undefined,
  }
}

export default async function PublicPage({ params }: PublicPageProps) {
  const { slug } = await params
  const page = await db.page.findUnique({ where: { slug } })

  if (!page || !page.published) notFound()

  const blocks = Array.isArray(page.content)
    ? page.content.filter(isCmsBlock).map((b) => b as CmsBlock)
    : []

  return (
    <div className="min-h-[50vh]">
      <BlocksRenderer blocks={blocks} />
    </div>
  )
}
