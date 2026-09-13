import type { Metadata } from 'next'
import { ShieldCheck, Plus } from 'lucide-react'
import Link from 'next/link'

import { DeleteEntityButton } from '@/components/admin/delete-entity-button'
import { EmptyState } from '@/components/admin/empty-state'
import { PageHeader } from '@/components/admin/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { requireSuperAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { deleteUserAction } from '@/server/actions/user.actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Usuarios | JR Realty',
}

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  AGENT: 'Agente',
  CLIENT: 'Cliente',
}

export default async function AdminUsuariosPage() {
  await requireSuperAdmin()

  const users = await db.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, email: true, role: true, active: true },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        description="Gestiona los usuarios y sus roles de acceso."
        actions={
          <Button render={<Link href="/admin/usuarios/nuevo" />}>
            <Plus className="size-4" aria-hidden="true" />
            Nuevo usuario
          </Button>
        }
      />

      {users.length === 0 ? (
        <EmptyState
          title="No hay usuarios"
          description="Crea el primer usuario del sistema."
          icon={ShieldCheck}
          action={
            <Button render={<Link href="/admin/usuarios/nuevo" />}>
              <Plus className="size-4" aria-hidden="true" />
              Crear usuario
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="space-y-3 pt-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{user.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  {user.active ? (
                    <Badge className="shrink-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      Activo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="shrink-0">
                      Inactivo
                    </Badge>
                  )}
                </div>
                <Badge variant="secondary">{roleLabels[user.role] ?? user.role}</Badge>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    render={<Link href={`/admin/usuarios/${user.id}/editar`} />}
                  >
                    Editar
                  </Button>
                  <DeleteEntityButton
                    entityId={user.id}
                    entityLabel={user.name}
                    deleteAction={deleteUserAction}
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
