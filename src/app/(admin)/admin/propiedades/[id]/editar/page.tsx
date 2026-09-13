import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { PageHeader } from '@/components/admin/page-header'
import { PropertyForm } from '@/components/admin/property-form'
import { requireAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Editar propiedad | JR Realty',
}

interface EditPropertyPageProps {
  params: Promise<{ id: string }>
}

export default async function EditarPropiedadPage({ params }: EditPropertyPageProps) {
  const user = await requireAdmin()
  const { id } = await params

  const [property, zones, agents] = await Promise.all([
    db.property.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        tags: { select: { tag: true } },
        zone: { select: { id: true, name: true } },
        agent: { select: { id: true, user: { select: { name: true } } } },
      },
    }),
    db.zone.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    db.agent.findMany({
      where: { active: true },
      orderBy: { user: { name: 'asc' } },
      select: { id: true, user: { select: { name: true } } },
    }),
  ])

  if (!property) notFound()

  // AGENT solo puede editar sus propias propiedades.
  if (user.role === 'AGENT') {
    const agent = await db.agent.findUnique({
      where: { userId: user.id },
      select: { id: true },
    })
    if (!agent || agent.id !== property.agentId) {
      redirect('/admin/propiedades')
    }
  }

  const features = Array.isArray(property.features)
    ? (property.features as unknown[]).filter((f): f is string => typeof f === 'string')
    : []

  const tags = property.tags.map((t) => t.tag)

  const initial = {
    id: property.id,
    title: property.title,
    description: property.description,
    type: property.type,
    operation: property.operation,
    price: Number(property.price),
    currency: property.currency,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    halfBathrooms: property.halfBathrooms,
    parkingSpots: property.parkingSpots,
    landAreaM2: property.landAreaM2 != null ? Number(property.landAreaM2) : null,
    buildAreaM2: property.buildAreaM2 != null ? Number(property.buildAreaM2) : null,
    yearBuilt: property.yearBuilt,
    address: property.address,
    latitude: property.latitude,
    longitude: property.longitude,
    zoneId: property.zoneId,
    features,
    tags,
    videoUrl: property.videoUrl,
    virtualTourUrl: property.virtualTourUrl,
    status: property.status,
    featured: property.featured,
    images: property.images.map((img, index) => ({
      url: img.url,
      alt: img.alt ?? '',
      sortOrder: index,
    })),
    agentId: property.agentId,
  }

  const agentOptions = agents.map((agent) => ({
    id: agent.id,
    name: agent.user.name,
  }))

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Editar propiedad"
        description={property.title}
      />
      <PropertyForm
        zones={zones}
        agents={agentOptions}
        isSuperAdmin={user.role === 'SUPER_ADMIN'}
        initial={initial}
      />
    </div>
  )
}
