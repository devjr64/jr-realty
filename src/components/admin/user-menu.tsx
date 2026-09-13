'use client'

import Link from 'next/link'
import { ChevronDown, ExternalLink, LogOut } from 'lucide-react'
import type { Session } from 'next-auth'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { logoutAction } from '@/server/actions/auth.actions'

interface UserMenuProps {
  user: Session['user']
}

function getInitials(name: string | null | undefined): string {
  if (!name) return 'MC'
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

/**
 * Admin user menu — avatar initials, name, role badge, and a dropdown with
 * "Ver sitio" + logout. Logout uses a plain <form> bound to the
 * `logoutAction` server action so it works without client JS.
 */
export function UserMenu({ user }: UserMenuProps) {
  const isSuperAdmin = user.role === 'SUPER_ADMIN'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="gap-2.5 px-1.5 hover:bg-muted sm:px-2"
            aria-label="Abrir menú de usuario"
          />
        }
      >
        <Avatar className="size-8">
          <AvatarFallback className="bg-primary/15 font-medium text-primary">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
        <span className="hidden text-sm font-medium sm:inline">
          {user.name ?? 'Usuario'}
        </span>
        <ChevronDown
          className="size-3.5 text-muted-foreground"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="flex flex-col gap-1 py-1">
              <span className="text-sm font-medium text-foreground">
                {user.name ?? 'Usuario'}
              </span>
              <span className="truncate text-xs font-normal text-muted-foreground">
                {user.email}
              </span>
              <Badge
                variant={isSuperAdmin ? 'default' : 'secondary'}
                className="mt-1 w-fit"
              >
                {isSuperAdmin ? 'Super Admin' : 'Agente'}
              </Badge>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem render={<Link href="/" />}>
          <ExternalLink className="size-4" aria-hidden="true" />
          Ver sitio
        </DropdownMenuItem>

        <form action={logoutAction}>
          <DropdownMenuItem
            variant="destructive"
            render={<button type="submit" className="w-full" />}
            nativeButton
          >
            <LogOut className="size-4" aria-hidden="true" />
            Cerrar sesión
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
