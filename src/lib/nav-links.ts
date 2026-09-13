import {
  Building2,
  FolderKanban,
  MapPin,
  Newspaper,
  Phone,
  type LucideIcon,
} from 'lucide-react'

export interface NavLink {
  href: string
  label: string
  icon: LucideIcon
}

/**
 * Main navigation links shared by the desktop header and the mobile menu.
 */
export const navLinks: NavLink[] = [
  { href: '/propiedades', label: 'Propiedades', icon: Building2 },
  { href: '/proyectos', label: 'Proyectos', icon: FolderKanban },
  { href: '/zonas', label: 'Zonas', icon: MapPin },
  { href: '/blog', label: 'Blog', icon: Newspaper },
  { href: '/contacto', label: 'Contacto', icon: Phone },
]
