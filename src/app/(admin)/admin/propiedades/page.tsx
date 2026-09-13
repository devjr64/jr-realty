import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import {
  Prisma,
  type OperationType,
  type PropertyStatus,
  type PropertyType,
} from '@prisma/client'

import { PageHeader } from '@/components/admin/page-header'
import {
  PropertyList,
  type AdminProperty,
} from '@/components/admin/property-list'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { requireAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import {
  operationValues,
  propertyTypeValues,
  statusValues,
} from '@/lib/validations/property.schema'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Propiedades | JR Realty',
}

const PAGE_SIZE = 10

/**
 * /admin/propiedades — paginated property inventory with URL-synced filters.
 *
 * Server component:
 *  - `requireAdmin()` guards the route (defense in depth on top of the admin
 *    layout) and gives us the session user.
 *  - AGENT scope: agents only ever see (and are revalidated on) their own
 *    properties; SUPER_ADMIN sees everything.
 *  - Filters (search/type/operation/status/zone/page) are read from the URL,
 *    so the list is fully shareable/bookmarkable and the client filter bar
 *    submits a plain GET to the same route.
 *  - Prisma `Decimal`/`Date` values are serialized (Number / ISO string)
 *    before crossing the Server → Client boundary.
 */
export default async function AdminPropertiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireAdmin()
  const params = await searchParams

  const search = firstParam(params.search).trim()
  const type = firstParam(params.type)
  const operation = firstParam(params.operation)
  const status = firstParam(params.status)
  const zone = firstParam(params.zone)

  const pageNumber = Number(firstParam(params.page))
  const page = Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1

  // AGENT scope: resolve the caller's Agent row and pin the where clause to
  // their own properties. A user with role AGENT but no Agent row owns
  // nothing, so an impossible id yields an empty result set.
  const conditions: Prisma.PropertyWhereInput[] = []
  if (user.role === 'AGENT') {
    const agent = await db.agent.findUnique({
      where: { userId: user.id },
      select: { id: true },
    })
    conditions.push({ agentId: agent?.id ?? '' })
  }

  if (search) {
    conditions.push({
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ],
    })
  }
  if (isPropertyType(type)) conditions.push({ type })
  if (isOperation(operation)) conditions.push({ operation })
  if (isPropertyStatus(status)) conditions.push({ status })
  if (zone) conditions.push({ zoneId: zone })

  const where: Prisma.PropertyWhereInput =
    conditions.length > 0 ? { AND: conditions } : {}

  const [rows, total, zones] = await Promise.all([
    db.property.findMany({
      where,
      include: {
        zone: { select: { name: true } },
        agent: {
          select: {
            title: true,
            user: { select: { name: true } },
          },
        },
        images: {
          take: 1,
          orderBy: { sortOrder: 'asc' },
          select: { url: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    db.property.count({ where }),
    db.zone.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  // Serialize Prisma types before passing them to the client component.
  const properties: AdminProperty[] = rows.map((property) => ({
    id: property.id,
    title: property.title,
    type: property.type,
    operation: property.operation,
    price: Number(property.price),
    currency: property.currency,
    status: property.status,
    featured: property.featured,
    zoneName: property.zone.name,
    agentName: property.agent.user.name,
    coverImage: property.images[0]?.url ?? null,
    createdAt: property.createdAt.toISOString(),
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Propiedades"
        description="Administra el inventario de propiedades publicadas en el sitio."
        actions={
          <Button render={<Link href="/admin/propiedades/nuevo" />}>
            <Plus className="size-4" aria-hidden="true" />
            Nueva propiedad
          </Button>
        }
      />

      <Suspense fallback={<PropertyTableSkeleton />}>
        <PropertyList
          properties={properties}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          filters={{ search, type, operation, status, zone }}
          zones={zones}
          isSuperAdmin={user.role === 'SUPER_ADMIN'}
        />
      </Suspense>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** searchParams values can be `string | string[] | undefined`. */
function firstParam(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : ''
}

const propertyTypeSet = new Set<string>(propertyTypeValues)
const operationSet = new Set<string>(operationValues)
const statusSet = new Set<string>(statusValues)

/** Guards: only push enum filters onto the where clause when valid. */
function isPropertyType(value: string): value is PropertyType {
  return propertyTypeSet.has(value)
}

function isOperation(value: string): value is OperationType {
  return operationSet.has(value)
}

function isPropertyStatus(value: string): value is PropertyStatus {
  return statusSet.has(value)
}

/** Suspense fallback that mirrors the table layout while data resolves. */
function PropertyTableSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-4">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex items-center gap-4">
            <Skeleton className="size-12 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="hidden h-5 w-20 rounded-full sm:block" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
