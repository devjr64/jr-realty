'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { filterAdminNavItems } from '@/components/admin/nav-items'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types/next-auth'

interface AdminNavLinksProps {
  /** Current user role — gates super-admin-only items (Usuarios). */
  role: UserRole
  /** Called after clicking a link (e.g. to close the mobile sheet). */
  onNavigate?: () => void
  className?: string
}

/**
 * Client-only nav list shared by the desktop sidebar and the mobile sheet.
 *
 * Needs `usePathname` for active-route highlighting, so it must stay a client
 * component. Active state uses the dark espresso tokens: gold `bg-sidebar-primary`
 * for the current page, subtle `bg-sidebar-accent` on hover otherwise.
 */
export function AdminNavLinks({
  role,
  onNavigate,
  className,
}: AdminNavLinksProps) {
  const pathname = usePathname()
  const items = filterAdminNavItems(role)

  return (
    <nav
      aria-label="Navegación del panel"
      className={cn('flex-1 overflow-y-auto px-3 py-3', className)}
    >
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )}
              >
                <item.icon className="size-4 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
