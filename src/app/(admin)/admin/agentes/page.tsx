import type { Metadata } from 'next'
import { Users, Plus } from 'lucide-react'
import Link from 'next/link'

import { DeleteEntityButton } from '@/components/admin/delete-entity-button'
import { EmptyState } from '@/components/admin/empty-state'
import { PageHeader } from '@/components/admin/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { requireSuperAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { deleteAgentAction } from '@/server/actions/agent.actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Agentes | JR Realty',
}

export default async function AdminAgentesPage() {
  await requireSuperAdmin()

  const agents = await db.agent.findMany({
    orderBy: { user: { name: 'asc' } },
    include: {
      user: { select: { name: true, email: true } },
      _count: { select: { properties: true, leads: true } },
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agentes"
        description="Administra los asesores inmobiliarios de la agencia."
        actions={
          <Button render={<Link href="/admin/agentes/nuevo" />}>
            <Plus className="size-4" aria-hidden="true" />
            Nuevo agente
          </Button>
        }
      />

      {agents.length === 0 ? (
        <EmptyState
          title="No hay agentes"
          description="Crea el primer asesor para asignarle propiedades."
          icon={Users}
          action={
            <Button render={<Link href="/admin/agentes/nuevo" />}>
              <Plus className="size-4" aria-hidden="true" />
              Crear agente
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Card key={agent.id}>
              <CardContent className="space-y-3 pt-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{agent.user.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {agent.title ?? 'Asesor'} · {agent.user.email}
                    </p>
                  </div>
                  {agent.active ? (
                    <Badge className="shrink-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      Activo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="shrink-0">
                      Inactivo
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {agent._count.properties} propiedades · {agent._count.leads} leads ·{' '}
                  {agent.phone}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    render={<Link href={`/admin/agentes/${agent.id}/editar`} />}
                  >
                    Editar
                  </Button>
                  <DeleteEntityButton
                    entityId={agent.id}
                    entityLabel={agent.user.name}
                    deleteAction={deleteAgentAction}
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
