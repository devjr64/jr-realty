import type { Metadata } from 'next'
import { FileText, Plus } from 'lucide-react'
import Link from 'next/link'

import { DeleteEntityButton } from '@/components/admin/delete-entity-button'
import { EmptyState } from '@/components/admin/empty-state'
import { PageHeader } from '@/components/admin/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { requireSuperAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { formatDate } from '@/lib/utils/format'
import { deletePageAction } from '@/server/actions/page.actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'CMS | JR Realty',
}

export default async function AdminCmsPage() {
  await requireSuperAdmin()

  const pages = await db.page.findMany({
    orderBy: { updatedAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="CMS"
        description="Administra las páginas del sitio con el editor de bloques."
        actions={
          <Button render={<Link href="/admin/cms/nueva" />}>
            <Plus className="size-4" aria-hidden="true" />
            Nueva página
          </Button>
        }
      />

      {pages.length === 0 ? (
        <EmptyState
          title="No hay páginas"
          description="Crea la primera página (Nosotros, Servicios, etc.)."
          icon={FileText}
          action={
            <Button render={<Link href="/admin/cms/nueva" />}>
              <Plus className="size-4" aria-hidden="true" />
              Crear página
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <Card key={page.id}>
              <CardContent className="space-y-3 pt-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{page.title}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      /{page.slug} · Actualizada {formatDate(page.updatedAt)}
                    </p>
                  </div>
                  {page.published ? (
                    <Badge className="shrink-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      Publicada
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="shrink-0">
                      Borrador
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    render={<Link href={`/admin/cms/${page.id}`} />}
                  >
                    Editar
                  </Button>
                  {page.published ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      render={<Link href={`/${page.slug}`} />}
                    >
                      Ver
                    </Button>
                  ) : null}
                  <DeleteEntityButton
                    entityId={page.id}
                    entityLabel={page.title}
                    deleteAction={deletePageAction}
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
