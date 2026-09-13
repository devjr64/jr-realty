import type { Metadata } from 'next'
import { Suspense } from 'react'
import { MapPin, Plus } from 'lucide-react'
import Link from 'next/link'

import { DeleteEntityButton } from '@/components/admin/delete-entity-button'
import { EmptyState } from '@/components/admin/empty-state'
import { PageHeader } from '@/components/admin/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { requireSuperAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { deleteZoneAction } from '@/server/actions/zone.actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Zonas | JR Realty',
}

export default async function AdminZonasPage() {
  await requireSuperAdmin()

  const [zonas, counts] = await Promise.all([
    db.zone.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { properties: true, projects: true } },
      },
    }),
    db.property.groupBy({
      by: ['zoneId'],
      _count: { _all: true },
    }),
  ])

  const propertyCountByZone = new Map(
    counts.map((c) => [c.zoneId, c._count._all]),
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Zonas"
        description="Administra las zonas y barriadas del catálogo."
        actions={
          <Button render={<Link href="/admin/zonas/nueva" />}>
            <Plus className="size-4" aria-hidden="true" />
            Nueva zona
          </Button>
        }
      />

      <Suspense fallback={<ZoneListSkeleton />}>
        {zonas.length === 0 ? (
          <EmptyState
            title="No hay zonas"
            description="Crea la primera zona para organizar tus propiedades."
            icon={MapPin}
            action={
              <Button render={<Link href="/admin/zonas/nueva" />}>
                <Plus className="size-4" aria-hidden="true" />
                Crear zona
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {zonas.map((zona) => (
              <Card key={zona.id}>
                <CardContent className="flex items-center justify-between gap-4 pt-6">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{zona.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {propertyCountByZone.get(zona.id) ?? zona._count.properties}{' '}
                      propiedades · {zona._count.projects} proyectos
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      render={<Link href={`/admin/zonas/${zona.id}/editar`} />}
                    >
                      Editar
                    </Button>
                    <DeleteEntityButton
                      entityId={zona.id}
                      entityLabel={zona.name}
                      deleteAction={deleteZoneAction}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Suspense>
    </div>
  )
}

function ZoneListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-24 rounded-xl" />
      ))}
    </div>
  )
}
