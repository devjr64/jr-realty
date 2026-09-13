import type { Metadata } from 'next'

import { PageHeader } from '@/components/admin/page-header'
import { ZoneForm } from '@/components/admin/zone-form'
import { requireAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Nueva zona | JR Realty',
}

export default async function NuevaZonaPage() {
  await requireAdmin()

  const parentZones = await db.zone.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Nueva zona"
        description="Crea una zona o barriada para organizar las propiedades."
      />
      <ZoneForm parentZones={parentZones} />
    </div>
  )
}
