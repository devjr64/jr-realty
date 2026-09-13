import type { Metadata } from 'next'

import { PageHeader } from '@/components/admin/page-header'
import { PropertyForm } from '@/components/admin/property-form'
import { requireAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Nueva propiedad | JR Realty',
}

export default async function NuevaPropiedadPage() {
  const user = await requireAdmin()

  const [zones, agents] = await Promise.all([
    db.zone.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    db.agent.findMany({
      where: { active: true },
      orderBy: { user: { name: 'asc' } },
      select: { id: true, user: { select: { name: true } } },
    }),
  ])

  const agentOptions = agents.map((agent) => ({
    id: agent.id,
    name: agent.user.name,
  }))

  let currentAgentId: string | undefined
  if (user.role === 'AGENT') {
    const agent = await db.agent.findUnique({
      where: { userId: user.id },
      select: { id: true },
    })
    currentAgentId = agent?.id
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Nueva propiedad"
        description="Registra una nueva propiedad en el catálogo."
      />
      <PropertyForm
        zones={zones}
        agents={agentOptions}
        isSuperAdmin={user.role === 'SUPER_ADMIN'}
        currentAgentId={currentAgentId}
      />
    </div>
  )
}
