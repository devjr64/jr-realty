import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'

import { LeadDetail } from '@/components/admin/lead-detail'
import { PageHeader } from '@/components/admin/page-header'
import { Button } from '@/components/ui/button'
import { requireAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Detalle de lead | JR Realty',
}

interface LeadDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  await requireAdmin()
  const { id } = await params

  const lead = await db.lead.findUnique({
    where: { id },
    include: {
      property: { select: { id: true, title: true, slug: true } },
      assignedAgent: { select: { id: true, user: { select: { name: true } } } },
    },
  })

  if (!lead) notFound()

  const agents = await db.agent.findMany({
    where: { active: true },
    orderBy: { user: { name: 'asc' } },
    select: { id: true, user: { select: { name: true } } },
  })

  const notes = Array.isArray(lead.notes)
    ? (lead.notes as unknown[]).filter(
        (n): n is { text: string; createdAt: string } =>
          typeof n === 'object' &&
          n !== null &&
          typeof (n as { text?: unknown }).text === 'string' &&
          typeof (n as { createdAt?: unknown }).createdAt === 'string',
      )
    : []

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={lead.name}
        description={`Lead recibido ${lead.createdAt.toLocaleString('es-VE')}`}
        actions={
          lead.property ? (
            <Button
              variant="outline"
              render={<Link href={`/admin/propiedades/${lead.property.id}/editar`} />}
            >
              Ver propiedad
            </Button>
          ) : null
        }
      />

      <LeadDetail
        lead={{
          id: lead.id,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          message: lead.message,
          source: lead.source,
          status: lead.status,
          propertyTitle: lead.property?.title ?? null,
          propertySlug: lead.property?.slug ?? null,
          assignedAgentId: lead.assignedAgentId,
          assignedAgentName: lead.assignedAgent?.user.name ?? null,
        }}
        notes={notes}
        agents={agents.map((agent) => ({ id: agent.id, name: agent.user.name }))}
      />
    </div>
  )
}
