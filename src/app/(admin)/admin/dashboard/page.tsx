import type { Metadata } from 'next'
import { Suspense } from 'react'

import {
  DashboardStats,
  DashboardStatsSkeleton,
} from '@/components/admin/dashboard-stats'
import { requireAdmin } from '@/lib/auth-helpers'

export const metadata: Metadata = {
  title: 'Dashboard | JR Realty',
}

/**
 * /admin/dashboard — KPI overview with real data from the database.
 *
 * Server component: `requireAdmin()` guards the route (defense in depth on
 * top of the layout/middleware) and gives us the logged-in user for the
 * welcome line. The stats block is wrapped in Suspense with skeleton
 * placeholders while the parallel Prisma queries resolve.
 */
export default async function AdminDashboardPage() {
  const user = await requireAdmin()

  const firstName = user.name?.trim().split(/\s+/)[0] ?? 'Administrador'

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Bienvenido de nuevo, {firstName}. Este es el resumen de tu
          portafolio en JR Realty.
        </p>
      </header>

      <Suspense fallback={<DashboardStatsSkeleton />}>
        <DashboardStats />
      </Suspense>
    </div>
  )
}
