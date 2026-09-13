'use client'

import Link from 'next/link'
import { Menu } from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { navLinks } from '@/lib/nav-links'

export function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            className="lg:hidden"
            aria-label="Abrir menú de navegación"
          />
        }
      >
        <Menu className="size-5" aria-hidden="true" />
      </SheetTrigger>

      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Menú</SheetTitle>
        </SheetHeader>

        <nav
          aria-label="Navegación móvil"
          className="flex-1 overflow-y-auto px-2 py-2"
        >
          <ul className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <SheetClose
                  render={
                    <Link
                      href={link.href}
                      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                    />
                  }
                >
                  <link.icon className="size-4" aria-hidden="true" />
                  {link.label}
                </SheetClose>
              </li>
            ))}
          </ul>
        </nav>

        <SheetFooter>
          <SheetClose
            render={
              <Link
                href="/login"
                className={buttonVariants({
                  variant: 'outline',
                  className: 'w-full',
                })}
              />
            }
          >
            Iniciar sesión
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
