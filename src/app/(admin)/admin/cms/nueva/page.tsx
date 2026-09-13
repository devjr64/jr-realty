import type { Metadata } from 'next'

import { PageHeader } from '@/components/admin/page-header'
import { PageForm } from '@/components/admin/page-form'
import { requireAdmin } from '@/lib/auth-helpers'

export const metadata: Metadata = {
  title: 'Nueva página | JR Realty',
}

export default async function NuevaPaginaCmsPage() {
  await requireAdmin()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Nueva página"
        description="Crea una página con el editor de bloques."
      />
      <PageForm />
    </div>
  )
}
