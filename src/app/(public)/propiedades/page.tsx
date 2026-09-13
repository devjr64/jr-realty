import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PropertyCard, type PublicPropertyCardData } from '@/components/public/property-card'
import { PropertyFilters } from '@/components/public/property-filters'
import { Skeleton } from '@/components/ui/skeleton'
import { db } from '@/lib/db'
import {
  operationValues,
  propertyTypeValues,
  statusValues,
  tagValues,
} from '@/lib/validations/property.schema'

export const metadata: Metadata = {
  title: 'Propiedades | JR Realty',
  description:
    'Apartamentos, casas, oficinas y locales comerciales en venta y alquiler en Venezuela.',
}

// Dinámica por diseño: los filtros viven en searchParams (API dinámica),
// así que cada request consulta la DB con los filtros aplicados.
export const dynamic = 'force-dynamic'

interface PropiedadesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function PropiedadesPage({ searchParams }: PropiedadesPageProps) {
  const params = await searchParams
  const { where, filters } = buildWhere(params)

  const [properties, zones] = await Promise.all([
    db.property.findMany({
      where,
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      take: 60,
      include: {
        zone: { select: { name: true } },
        images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true } },
        tags: { select: { tag: true } },
      },
    }),
    db.zone.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  const cards: PublicPropertyCardData[] = properties.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    type: p.type,
    operation: p.operation,
    price: Number(p.price),
    currency: p.currency,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    parkingSpots: p.parkingSpots,
    buildAreaM2: p.buildAreaM2 != null ? Number(p.buildAreaM2) : null,
    address: p.address,
    zoneName: p.zone.name,
    coverImage: p.images[0]?.url ?? null,
    tags: p.tags.map((t) => t.tag),
    featured: p.featured,
  }))

  const availableTags = [...tagValues]
  const total = properties.length

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Propiedades en Venezuela
        </h1>
        <p className="mt-2 text-muted-foreground">
          Encuentra tu próximo hogar o inversión. {total} resultados.
        </p>
      </div>

      <PropertyFilters
        filters={filters}
        zones={zones}
        types={[...propertyTypeValues]}
        operations={[...operationValues]}
        statuses={[...statusValues]}
        tags={availableTags}
      />

      <Suspense fallback={<ResultsSkeleton />}>
        {cards.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-20 text-center">
            <p className="font-heading text-xl">No encontramos propiedades</p>
            <p className="mt-2 text-muted-foreground">
              Ajusta los filtros o contacta a un asesor para ayudarte a buscar.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </Suspense>
    </div>
  )
}

function firstParam(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : ''
}

function numParam(value: string | string[] | undefined): number | null {
  const str = firstParam(value)
  if (str === '') return null
  const n = Number(str)
  return Number.isFinite(n) ? n : null
}

interface FilterState {
  search: string
  type: string
  operation: string
  status: string
  zone: string
  tag: string
  minPrice: number | null
  maxPrice: number | null
  bedrooms: number | null
}

function buildWhere(searchParams: Record<string, string | string[] | undefined>): {
  where: object
  filters: FilterState
} {
  const filters: FilterState = {
    search: firstParam(searchParams.search).trim(),
    type: firstParam(searchParams.type),
    operation: firstParam(searchParams.operation),
    status: firstParam(searchParams.status),
    zone: firstParam(searchParams.zone),
    tag: firstParam(searchParams.tag),
    minPrice: numParam(searchParams.minPrice),
    maxPrice: numParam(searchParams.maxPrice),
    bedrooms: numParam(searchParams.bedrooms),
  }

  const conditions: Record<string, unknown>[] = []

  if (filters.search) {
    conditions.push({
      OR: [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { address: { contains: filters.search, mode: 'insensitive' } },
      ],
    })
  }
  if (propertyTypeValues.includes(filters.type as never)) {
    conditions.push({ type: filters.type })
  }
  if (operationValues.includes(filters.operation as never)) {
    conditions.push({ operation: filters.operation })
  }
  if (statusValues.includes(filters.status as never)) {
    conditions.push({ status: filters.status })
  }
  if (filters.zone) {
    conditions.push({ zoneId: filters.zone })
  }
  if (tagValues.includes(filters.tag as never)) {
    conditions.push({ tags: { some: { tag: filters.tag } } })
  }
  if (filters.minPrice != null) {
    conditions.push({ price: { gte: filters.minPrice } })
  }
  if (filters.maxPrice != null) {
    conditions.push({ price: { lte: filters.maxPrice } })
  }
  if (filters.bedrooms != null) {
    conditions.push({ bedrooms: { gte: filters.bedrooms } })
  }

  return {
    where: conditions.length > 0 ? { AND: conditions } : {},
    filters,
  }
}

function ResultsSkeleton() {
  return (
    <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="space-y-3">
          <Skeleton className="aspect-[4/3] w-full rounded-xl" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  )
}
