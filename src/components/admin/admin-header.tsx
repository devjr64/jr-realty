'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import type { Session } from 'next-auth'
import { useState } from 'react'

import { AdminBrand } from '@/components/admin/admin-brand'
import { AdminNavLinks } from '@/components/admin/admin-nav-links'
import { filterAdminNavItems } from '@/components/admin/nav-items'
import { UserMenu } from '@/components/admin/user-menu'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

interface AdminHeaderProps {
  user: Session['user']
}

/**
 * Sticky admin top bar — mobile hamburger (opens the dark espresso Sheet with
 * the same nav as the desktop sidebar), current-section label, and the user
 * menu on the right.
 */
export function AdminHeader({ user }: AdminHeaderProps) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const section = filterAdminNavItems(user.role).find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  )

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-border/60 bg-background/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-2.5">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon-lg"
                className="-ml-2 lg:hidden"
                aria-label="Abrir menú de administración"
              />
            }
          >
            <Menu className="size-5" aria-hidden="true" />
          </SheetTrigger>

          <SheetContent
            side="left"
            showCloseButton={false}
            className="gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
          >
            <SheetTitle className="sr-only">Menú de administración</SheetTitle>

            <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border pl-4 pr-2">
              <Link
                href="/admin/dashboard"
                onClick={() => setMenuOpen(false)}
                aria-label="JR Realty — Panel de administración"
                className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              >
                <AdminBrand />
              </Link>
              <SheetClose
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    aria-label="Cerrar menú de administración"
                  />
                }
              >
                <X className="size-4" aria-hidden="true" />
              </SheetClose>
            </div>

            <AdminNavLinks
              role={user.role}
              onNavigate={() => setMenuOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">
            Panel de administración
          </p>
          <h1 className="truncate font-heading text-base font-semibold sm:text-lg">
            {section?.label ?? 'Dashboard'}
          </h1>
        </div>
      </div>

      <UserMenu user={user} />
    </header>
  )
}
