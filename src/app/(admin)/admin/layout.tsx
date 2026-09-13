import type { Metadata } from 'next'

import { AdminHeader } from '@/components/admin/admin-header'
import { Sidebar } from '@/components/admin/sidebar'
import { requireAdmin } from '@/lib/auth-helpers'

export const metadata: Metadata = {
  title: 'Panel de administración | JR Realty',
}

/**
 * Admin layout — dark espresso sidebar (desktop), sticky header with the
 * mobile sheet + user menu, and a cream content area.
 *
 * `requireAdmin()` re-checks the session server-side (defense in depth on top
 * of src/middleware.ts) and redirects to /login when the user is not
 * SUPER_ADMIN/AGENT. The returned user is passed down for role-gating.
 */
export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = await requireAdmin()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar role={user.role} />
      <div className="flex min-h-screen flex-col lg:pl-72">
        <AdminHeader user={user} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
