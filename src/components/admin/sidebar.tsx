import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

import { AdminBrand } from '@/components/admin/admin-brand'
import { AdminNavLinks } from '@/components/admin/admin-nav-links'
import type { UserRole } from '@/types/next-auth'

interface SidebarProps {
  role: UserRole
}

/**
 * Desktop sidebar — dark warm espresso (`--sidebar` tokens), fixed to the left,
 * hidden below `lg`. The mobile equivalent is the Sheet rendered in
 * `AdminHeader`.
 */
export function Sidebar({ role }: SidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-4">
        <Link
          href="/admin/dashboard"
          aria-label="JR Realty — Panel de administración"
          className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <AdminBrand />
        </Link>
      </div>

      <AdminNavLinks role={role} />

      <div className="shrink-0 border-t border-sidebar-border p-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
          Ver sitio
        </Link>
      </div>
    </aside>
  )
}
