import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/admin/page-header'
import { AgentForm } from '@/components/admin/agent-form'
import { requireSuperAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Editar agente | JR Realty',
}

interface EditarAgentePageProps {
  params: Promise<{ id: string }>
}

export default async function EditarAgentePage({ params }: EditarAgentePageProps) {
  await requireSuperAdmin()
  const { id } = await params

  const agent = await db.agent.findUnique({
    where: { id },
    include: { user: { select: { name: true, email: true } } },
  })
  if (!agent) notFound()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Editar agente" description={agent.user.name} />
      <AgentForm
        initial={{
          id: agent.id,
          name: agent.user.name,
          email: agent.user.email,
          title: agent.title,
          phone: agent.phone,
          whatsapp: agent.whatsapp,
          active: agent.active,
        }}
      />
    </div>
  )
}
