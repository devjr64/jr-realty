import {
  Building2,
  FileText,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  MapPin,
  PenLine,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react'

import type { UserRole } from '@/types/next-auth'

export interface AdminNavItem {
  href: string
  label: string
  icon: LucideIcon
  /** Only SUPER_ADMIN can see/access this section. */
  superAdminOnly?: boolean
}

/**
 * Shared navigation data for the admin sidebar and the mobile sheet.
 * Keeping it in a single module guarantees both surfaces never drift apart.
 */
export const adminNavItems: readonly AdminNavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/propiedades', label: 'Propiedades', icon: Building2 },
  { href: '/admin/proyectos', label: 'Proyectos', icon: FolderKanban },
  { href: '/admin/agentes', label: 'Agentes', icon: Users, superAdminOnly: true },
  { href: '/admin/zonas', label: 'Zonas', icon: MapPin, superAdminOnly: true },
  { href: '/admin/leads', label: 'Leads', icon: Inbox },
  { href: '/admin/cms', label: 'CMS', icon: FileText, superAdminOnly: true },
  { href: '/admin/blog', label: 'Blog', icon: PenLine },
  {
    href: '/admin/usuarios',
    label: 'Usuarios',
    icon: ShieldCheck,
    superAdminOnly: true,
  },
  { href: '/admin/configuracion', label: 'Configuración', icon: Settings, superAdminOnly: true },
]

/**
 * Returns the nav items a given role is allowed to see.
 * AGENT users never get the super-admin-only entries (Agentes, Usuarios, Zonas, CMS, Testimonios, Configuración).
 */
export function filterAdminNavItems(role: UserRole): AdminNavItem[] {
  if (role === 'SUPER_ADMIN') return [...adminNavItems]
  return adminNavItems.filter((item) => !item.superAdminOnly)
}
