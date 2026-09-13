import type { Metadata } from 'next'
import { PenLine, Plus } from 'lucide-react'
import Link from 'next/link'

import { DeleteEntityButton } from '@/components/admin/delete-entity-button'
import { EmptyState } from '@/components/admin/empty-state'
import { PageHeader } from '@/components/admin/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { requireAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { formatDate } from '@/lib/utils/format'
import { deleteBlogPostAction } from '@/server/actions/blog-post.actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Blog | JR Realty',
}

export default async function AdminBlogPage() {
  const user = await requireAdmin()

  // AGENT users can only see their own posts
  const where =
    user.role === 'AGENT' ? { authorId: user.id } : {}

  const posts = await db.blogPost.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { author: { select: { name: true } } },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blog"
        description="Administra las publicaciones del blog."
        actions={
          <Button render={<Link href="/admin/blog/nuevo" />}>
            <Plus className="size-4" aria-hidden="true" />
            Nueva entrada
          </Button>
        }
      />

      {posts.length === 0 ? (
        <EmptyState
          title="No hay publicaciones"
          description="Crea la primera entrada del blog."
          icon={PenLine}
          action={
            <Button render={<Link href="/admin/blog/nuevo" />}>
              <Plus className="size-4" aria-hidden="true" />
              Crear entrada
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardContent className="flex items-center justify-between gap-4 pt-6">
                <div className="min-w-0">
                  <p className="truncate font-medium">{post.title}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {post.author.name} · {formatDate(post.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {post.published ? (
                    <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      Publicada
                    </Badge>
                  ) : (
                    <Badge variant="outline">Borrador</Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    render={<Link href={`/admin/blog/${post.id}/editar`} />}
                  >
                    Editar
                  </Button>
                  <DeleteEntityButton
                    entityId={post.id}
                    entityLabel={post.title}
                    deleteAction={deleteBlogPostAction}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
