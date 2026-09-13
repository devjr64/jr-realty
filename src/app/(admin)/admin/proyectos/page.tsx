import type { Metadata } from 'next'
import { FolderKanban, Plus } from 'lucide-react'
import Link from 'next/link'

import { DeleteEntityButton } from '@/components/admin/delete-entity-button'
import { EmptyState } from '@/components/admin/empty-state'
import { PageHeader } from '@/components/admin/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { requireAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { deleteProjectAction } from '@/server/actions/project.actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Proyectos | JR Realty',
}

const projectStatusLabels: Record<string, string> = {
  ACTIVE: 'Activo',
  SOLD_OUT: 'Agotado',
  COMING_SOON: 'Próximamente',
}

export default async function AdminProyectosPage() {
  const user = await requireAdmin()

  // AGENT users can only see projects assigned to them
  const where =
    user.role === 'AGENT'
      ? {
          agent: { userId: user.id },
        }
      : {}

  const projects = await db.project.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { zone: { select: { name: true } } },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proyectos"
        description="Administra los desarrollos y pre-construcción."
        actions={
          <Button render={<Link href="/admin/proyectos/nuevo" />}>
            <Plus className="size-4" aria-hidden="true" />
            Nuevo proyecto
          </Button>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          title="No hay proyectos"
          description="Crea el primer desarrollo inmobiliario."
          icon={FolderKanban}
          action={
            <Button render={<Link href="/admin/proyectos/nuevo" />}>
              <Plus className="size-4" aria-hidden="true" />
              Crear proyecto
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardContent className="space-y-3 pt-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{project.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {project.zone.name}
                      {project.developer ? ` · ${project.developer}` : ''}
                    </p>
                  </div>
                  <Badge
                    className={
                      project.status === 'ACTIVE'
                        ? 'shrink-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : 'shrink-0'
                    }
                  >
                    {projectStatusLabels[project.status] ?? project.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {project.priceRangeMin != null
                      ? formatCurrency(project.priceRangeMin)
                      : 'Precio no definido'}
                    {project.priceRangeMax != null
                      ? ` – ${formatCurrency(project.priceRangeMax)}`
                      : ''}
                  </span>
                  {project.deliveryDate ? (
                    <span>Entrega {formatDate(project.deliveryDate)}</span>
                  ) : null}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    render={<Link href={`/admin/proyectos/${project.id}/editar`} />}
                  >
                    Editar
                  </Button>
                  <DeleteEntityButton
                    entityId={project.id}
                    entityLabel={project.name}
                    deleteAction={deleteProjectAction}
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
