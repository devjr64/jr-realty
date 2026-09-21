import Link from 'next/link'
import Image from 'next/image'
import {
  AtSign,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
} from 'lucide-react'

import { navLinks } from '@/lib/nav-links'

const services = [
  'Venta de propiedades',
  'Alquiler de propiedades',
  'Proyectos nuevos',
  'Avalúos y tasaciones',
  'Asesoría inmobiliaria',
]

const socialLinks = [
  { href: '#', label: 'Facebook', icon: Share2 },
  { href: '#', label: 'Instagram', icon: AtSign },
  { href: '#', label: 'X (Twitter)', icon: Globe },
  { href: '#', label: 'LinkedIn', icon: Share2 },
]

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-sidebar text-sidebar-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-5">
            <Link
              href="/"
              className="flex items-center gap-3"
              aria-label="JR Realty — Inicio"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white">
                <Image
                  src="/images/logo.svg"
                  alt=""
                  width={500}
                  height={500}
                  className="size-8 rounded-full"
                />
              </span>
              <span className="font-heading text-lg font-semibold">
                JR Realty
              </span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-sidebar-foreground/70">
              Tu mejor aliado en el mercado inmobiliario venezolano: compra, venta
              y alquiler con asesoría experta y acompañamiento en cada paso.
            </p>
            <div className="flex items-center gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="grid size-10 place-items-center rounded-full text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-primary"
                >
                  <social.icon className="size-4" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="font-heading text-sm font-semibold tracking-wider uppercase text-sidebar-foreground/90">
              Enlaces rápidos
            </h3>
            <ul className="mt-4 space-y-2.5">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-sidebar-foreground/70 transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-heading text-sm font-semibold tracking-wider uppercase text-sidebar-foreground/90">
              Servicios
            </h3>
            <ul className="mt-4 space-y-2.5">
              {services.map((service) => (
                <li key={service} className="text-sm text-sidebar-foreground/70">
                  {service}
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-heading text-sm font-semibold tracking-wider uppercase text-sidebar-foreground/90">
              Contacto
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-sidebar-foreground/70">
              <li>
                <a
                  href="tel:+582125550140"
                  className="inline-flex items-center gap-2.5 transition-colors hover:text-primary"
                >
                  <Phone className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  +58 212-555-0140
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/582125550140"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 transition-colors hover:text-primary"
                >
                  <MessageCircle className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  WhatsApp
                </a>
              </li>
              <li>
                <a
                  href="mailto:admin@jrrealty.com"
                  className="inline-flex items-center gap-2.5 transition-colors hover:text-primary"
                >
                  <Mail className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  admin@jrrealty.com
                </a>
              </li>
              <li className="inline-flex items-center gap-2.5">
                <MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />
                Caracas, Venezuela
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-sidebar-border pt-6 text-center">
          <p className="text-sm text-sidebar-foreground/60">
            © {year} JR Realty. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
