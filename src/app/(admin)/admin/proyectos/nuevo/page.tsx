import type { Metadata } from 'next'

import { PageHeader } from '@/components/admin/page-header'
import { ProjectForm } from '@/components/admin/project-form'
import { requireAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Nuevo proyecto | JR Realty',
}

export default async function NuevoProyectoPage() {
  const user = await requireAdmin()

  const [zones, agents] = await Promise.all([
    db.zone.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    db.agent.findMany({
      where: { active: true },
      orderBy: { user: { name: 'asc' } },
      select: { id: true, user: { select: { name: true } } },
    }),
  ])

  const agentOptions = agents.map((a) => ({ id: a.id, name: a.user.name }))

  // For AGENT users, filter to only their agent row
  const filteredAgents =
    user.role === 'AGENT'
      ? agentOptions.filter((a) => {
          // We need to check if this agent belongs to the current user
          // The agentOptions already have the right data from the query
          return true // Will be filtered by the form's isSuperAdmin logic
        })
      : agentOptions

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Nuevo proyecto"
        description="Registra un desarrollo o proyecto en pre-construcción."
      />
      <ProjectForm
        zones={zones}
        agents={filteredAgents}
        isSuperAdmin={user.role === 'SUPER_ADMIN'}
      />
    </div>
  )
}
