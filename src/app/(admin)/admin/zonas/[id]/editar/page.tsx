import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/admin/page-header'
import { ZoneForm } from '@/components/admin/zone-form'
import { requireAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Editar zona | JR Realty',
}

interface EditarZonaPageProps {
  params: Promise<{ id: string }>
}

export default async function EditarZonaPage({ params }: EditarZonaPageProps) {
  await requireAdmin()
  const { id } = await params

  const [zona, parentZones] = await Promise.all([
    db.zone.findUnique({ where: { id } }),
    db.zone.findMany({
      where: { NOT: { id } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  if (!zona) notFound()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Editar zona" description={zona.name} />
      <ZoneForm
        parentZones={parentZones}
        initial={{
          id: zona.id,
          name: zona.name,
          description: zona.description,
          imageUrl: zona.imageUrl,
          parentId: zona.parentId,
        }}
      />
    </div>
  )
}
