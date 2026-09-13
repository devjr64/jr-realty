import type {
  Currency,
  LeadSource,
  LeadStatus,
  PropertyStatus,
  PropertyType,
} from '@prisma/client'
import {
  ArrowRight,
  Building2,
  Eye,
  Inbox,
  Plus,
  Users,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { KpiCard, KpiCardSkeleton } from '@/components/admin/kpi-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { db } from '@/lib/db'
import { formatCurrency, formatRelativeTime } from '@/lib/utils/format'
import { leadSourceLabels, leadStatusLabels } from '@/lib/validations/lead.schema'
import {
  propertyTypeLabels,
  statusLabels,
} from '@/lib/validations/property.schema'

/* ------------------------------------------------------------------ */
/* Labels & formatting helpers (fuente única: schemas + lib/utils)     */
/* ------------------------------------------------------------------ */

const PROPERTY_TYPE_LABELS = propertyTypeLabels
const PROPERTY_STATUS_LABELS = statusLabels
const LEAD_SOURCE_LABELS = leadSourceLabels
const LEAD_STATUS_LABELS = leadStatusLabels

/* ------------------------------------------------------------------ */
/* Data shapes                                                         */
/* ------------------------------------------------------------------ */

interface RecentProperty {
  id: string
  title: string
  type: PropertyType
  status: PropertyStatus
  price: number
  currency: Currency
  createdAt: Date
}

interface RecentLead {
  id: string
  name: string
  email: string
  source: LeadSource
  status: LeadStatus
  createdAt: Date
}

/* ------------------------------------------------------------------ */
/* Dashboard stats (server component)                                  */
/* ------------------------------------------------------------------ */

/**
 * Fetches all dashboard aggregates in parallel and renders the KPI grid
 * plus the recent properties/leads panels. Handles an empty database
 * gracefully with friendly empty states.
 */
export async function DashboardStats() {
  const startOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  )

  const [
    activeProperties,
    leadsThisMonth,
    viewsAggregate,
    activeAgents,
    propertyRows,
    leadRows,
  ] = await Promise.all([
    db.property.count({ where: { status: 'AVAILABLE' } }),
    db.lead.count({ where: { createdAt: { gte: startOfMonth } } }),
    db.property.aggregate({ _sum: { viewsCount: true } }),
    db.agent.count({ where: { active: true } }),
    db.property.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        price: true,
        currency: true,
        createdAt: true,
      },
    }),
    db.lead.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        source: true,
        status: true,
        createdAt: true,
      },
    }),
  ])

  const totalViews = viewsAggregate._sum.viewsCount ?? 0
  const monthName = new Date().toLocaleDateString('es-VE', {
    month: 'long',
  })

  const recentProperties: RecentProperty[] = propertyRows.map((property) => ({
    ...property,
    price: Number(property.price),
  }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Propiedades activas"
          value={activeProperties}
          icon={Building2}
          description="Disponibles para venta o alquiler"
        />
        <KpiCard
          title="Leads del mes"
          value={leadsThisMonth}
          icon={Inbox}
          description={`Contactos recibidos en ${monthName}`}
        />
        <KpiCard
          title="Vistas totales"
          value={totalViews.toLocaleString('es-VE')}
          icon={Eye}
          description="Visualizaciones acumuladas de propiedades"
        />
        <KpiCard
          title="Agentes activos"
          value={activeAgents}
          icon={Users}
          description="Asesores con perfil público"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <RecentProperties properties={recentProperties} />
        <RecentLeads leads={leadRows} />
      </div>
    </div>
  )
}

/** Suspense fallback: KPI grid + two list panels as skeletons. */
export function DashboardStatsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <KpiCardSkeleton key={index} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ListCardSkeleton />
        <ListCardSkeleton />
      </div>
    </div>
  )
}

function ListCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <Skeleton className="h-5 w-44" />
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Empty state & list panels                                           */
/* ------------------------------------------------------------------ */

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <CardContent>
      <div className="flex flex-col items-center gap-3 py-10 text-center sm:py-14">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Icon className="size-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="max-w-xs space-y-1">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {action ? <div className="mt-1">{action}</div> : null}
      </div>
    </CardContent>
  )
}

function RecentProperties({ properties }: { properties: RecentProperty[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Propiedades recientes</CardTitle>
        {properties.length > 0 ? (
          <CardAction>
            <Link
              href="/admin/propiedades"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Ver todas
              <ArrowRight className="size-3" aria-hidden="true" />
            </Link>
          </CardAction>
        ) : null}
      </CardHeader>

      {properties.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aún no hay propiedades publicadas"
          description="Publica tu primera propiedad para que aparezca en el sitio y empieces a recibir contactos."
          action={
            <Button
              size="lg"
              render={<Link href="/admin/propiedades/nueva" />}
            >
              <Plus className="size-4" aria-hidden="true" />
              Nueva propiedad
            </Button>
          }
        />
      ) : (
        <CardContent>
          <ul className="divide-y divide-border">
            {properties.map((property) => (
              <li
                key={property.id}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {property.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {PROPERTY_TYPE_LABELS[property.type]} ·{' '}
                    {formatCurrency(property.price, property.currency)}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {PROPERTY_STATUS_LABELS[property.status]}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  )
}

function RecentLeads({ leads }: { leads: RecentLead[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Leads recientes</CardTitle>
        {leads.length > 0 ? (
          <CardAction>
            <Link
              href="/admin/leads"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Ver todos
              <ArrowRight className="size-3" aria-hidden="true" />
            </Link>
          </CardAction>
        ) : null}
      </CardHeader>

      {leads.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Aún no hay leads registrados"
          description="Los contactos que lleguen desde el formulario de propiedades, WhatsApp o llamadas aparecerán aquí."
        />
      ) : (
        <CardContent>
          <ul className="divide-y divide-border">
            {leads.map((lead) => (
              <li
                key={lead.id}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{lead.name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {lead.email} · {LEAD_SOURCE_LABELS[lead.source]}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge variant="secondary">{LEAD_STATUS_LABELS[lead.status]}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(lead.createdAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  )
}
