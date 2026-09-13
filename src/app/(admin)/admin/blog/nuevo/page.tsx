import type { Metadata } from 'next'

import { BlogPostForm } from '@/components/admin/blog-post-form'
import { PageHeader } from '@/components/admin/page-header'
import { requireAdmin } from '@/lib/auth-helpers'

export const metadata: Metadata = {
  title: 'Nueva entrada | JR Realty',
}

export default async function NuevoBlogPostPage() {
  await requireAdmin()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Nueva entrada"
        description="Crea una publicación para el blog."
      />
      <BlogPostForm />
    </div>
  )
}
