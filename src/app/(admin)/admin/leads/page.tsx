import type { Metadata } from 'next'
import { Prisma } from '@prisma/client'
import { Inbox } from 'lucide-react'

import { EmptyState } from '@/components/admin/empty-state'
import { LeadsTable } from '@/components/admin/leads-table'
import { PageHeader } from '@/components/admin/page-header'
import { requireAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { leadSourceValues, leadStatusValues } from '@/lib/validations/lead.schema'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Leads | JR Realty',
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireAdmin()
  const params = await searchParams

  const search = firstParam(params.search).trim()
  const status = firstParam(params.status)
  const source = firstParam(params.source)

  const conditions: Prisma.LeadWhereInput[] = []

  // AGENT users can only see leads assigned to them
  if (user.role === 'AGENT') {
    const agent = await db.agent.findUnique({
      where: { userId: user.id },
      select: { id: true },
    })
    if (agent) {
      conditions.push({ assignedAgentId: agent.id })
    } else {
      // Agent row not found — return empty result
      return (
        <div className="space-y-6">
          <PageHeader
            title="Leads"
            description="Solicitudes de contacto y prospectos del sitio."
          />
          <EmptyState
            title="No hay leads"
            description="Los formularios de contacto del sitio aparecerán aquí."
            icon={Inbox}
          />
        </div>
      )
    }
  }

  if (search) {
    conditions.push({
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    })
  }
  if (status && leadStatusValues.includes(status as never)) {
    conditions.push({ status: status as never })
  }
  if (source && leadSourceValues.includes(source as never)) {
    conditions.push({ source: source as never })
  }

  const where: Prisma.LeadWhereInput =
    conditions.length > 0 ? { AND: conditions } : {}

  const [leads, agents] = await Promise.all([
    db.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        property: { select: { id: true, title: true, slug: true } },
        assignedAgent: { select: { id: true, user: { select: { name: true } } } },
      },
    }),
    db.agent.findMany({
      where: { active: true },
      orderBy: { user: { name: 'asc' } },
      select: { id: true, user: { select: { name: true } } },
    }),
  ])

  const serializedLeads = leads.map((lead) => ({
    id: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    message: lead.message,
    source: lead.source,
    status: lead.status,
    propertyTitle: lead.property?.title ?? null,
    propertySlug: lead.property?.slug ?? null,
    assignedAgentName: lead.assignedAgent?.user.name ?? null,
    createdAt: lead.createdAt.toISOString(),
  }))

  const agentOptions = agents.map((agent) => ({
    id: agent.id,
    name: agent.user.name,
  }))

  const counts = {
    total: leads.length,
    byStatus: Object.fromEntries(
      leadStatusValues.map((value) => [
        value,
        leads.filter((l) => l.status === value).length,
      ]),
    ),
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description="Solicitudes de contacto y prospectos del sitio."
      />

      {serializedLeads.length === 0 ? (
        <EmptyState
          title="No hay leads"
          description="Los formularios de contacto del sitio aparecerán aquí."
          icon={Inbox}
        />
      ) : (
        <LeadsTable
          leads={serializedLeads}
          agents={agentOptions}
          counts={counts}
          isSuperAdmin={user.role === 'SUPER_ADMIN'}
        />
      )}
    </div>
  )
}

function firstParam(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : ''
}
