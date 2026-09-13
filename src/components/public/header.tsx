import Link from 'next/link'
import Image from 'next/image'
import { ChevronDown, Globe } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { navLinks } from '@/lib/nav-links'

import { MobileNav } from './mobile-nav'

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5"
          aria-label="JR Realty — Inicio"
        >
          <Image
            src="/images/logo.svg"
            alt=""
            width={500}
            height={500}
            priority
            className="size-9 rounded-md object-cover"
          />
          <span className="font-heading text-lg font-semibold tracking-tight">
            JR Realty <span className="text-primary">Venezuela</span>
          </span>
        </Link>

        <nav
          aria-label="Navegación principal"
          className="hidden items-center gap-1 lg:flex"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-foreground/75 transition-colors hover:bg-muted hover:text-foreground"
            >
              <link.icon className="size-4" aria-hidden="true" />
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <LanguageToggle />

          <Button
            variant="ghost"
            size="sm"
            render={<Link href="/login" />}
            className="hidden text-foreground/75 hover:text-foreground sm:inline-flex"
          >
            Iniciar sesión
          </Button>

          <MobileNav />
        </div>
      </div>
    </header>
  )
}

function LanguageToggle() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="inline-flex items-center gap-1.5"
            aria-label="Cambiar idioma"
          />
        }
      >
        <Globe className="size-4" aria-hidden="true" />
        <span>ES</span>
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-32">
        <DropdownMenuItem>Español</DropdownMenuItem>
        <DropdownMenuItem>English</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
