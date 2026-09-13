import type { Metadata } from 'next'

import { PageHeader } from '@/components/admin/page-header'
import { AgentForm } from '@/components/admin/agent-form'
import { requireSuperAdmin } from '@/lib/auth-helpers'

export const metadata: Metadata = {
  title: 'Nuevo agente | JR Realty',
}

export default async function NuevoAgentePage() {
  await requireSuperAdmin()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Nuevo agente"
        description="Crea un usuario con rol de agente y su perfil de asesor."
      />
      <AgentForm />
    </div>
  )
}
