import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { BlogPostForm } from '@/components/admin/blog-post-form'
import { PageHeader } from '@/components/admin/page-header'
import { requireAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Editar entrada | JR Realty',
}

interface EditarBlogPostPageProps {
  params: Promise<{ id: string }>
}

export default async function EditarBlogPostPage({ params }: EditarBlogPostPageProps) {
  await requireAdmin()
  const { id } = await params

  const post = await db.blogPost.findUnique({ where: { id } })
  if (!post) notFound()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Editar entrada" description={post.title} />
      <BlogPostForm
        initial={{
          id: post.id,
          title: post.title,
          excerpt: post.excerpt,
          // Preserve Json blocks array or markdown string for round-trip
          content: post.content as unknown,
          coverImage: post.coverImage,
          published: post.published,
        }}
      />
    </div>
  )
}
