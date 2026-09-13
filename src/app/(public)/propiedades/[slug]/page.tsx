import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { Bath, BedDouble, Building2, Car, Mail, MapPin, MessageCircle, Phone, Ruler } from 'lucide-react'

import { LeadForm } from '@/components/public/lead-form'
import { PropertyCard, type PublicPropertyCardData } from '@/components/public/property-card'
import { StatusBadge } from '@/components/shared/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { db } from '@/lib/db'
import { formatCurrency } from '@/lib/utils/format'
import {
  operationLabels,
  propertyTypeLabels,
  tagLabels,
} from '@/lib/validations/property.schema'

// Dinámica por diseño: mantiene el contador de vistas preciso por visita.
export const dynamic = 'force-dynamic'

interface PropiedadDetallePageProps {
  params: Promise<{ slug: string }>
}

/**
 * `cache()` deduplica la consulta entre generateMetadata y el componente de
 * página (mismo render pass) → el incremento de vistas se ejecuta UNA vez
 * por visita, no dos.
 */
const getProperty = cache(async (slug: string) => {
  const property = await db.property.findUnique({
    where: { slug },
    include: {
      zone: { select: { name: true, slug: true } },
      agent: { include: { user: { select: { name: true, email: true } } } },
      images: { orderBy: { sortOrder: 'asc' } },
      tags: { select: { tag: true } },
    },
  })

  if (!property) return null

  // Incrementar vistas de forma no bloqueante.
  void db.property
    .update({ where: { id: property.id }, data: { viewsCount: { increment: 1 } } })
    .catch(() => undefined)

  return property
})

export async function generateMetadata({
  params,
}: PropiedadDetallePageProps): Promise<Metadata> {
  const { slug } = await params
  const property = await getProperty(slug)
  if (!property) return { title: 'Propiedad no encontrada | JR Realty' }

  return {
    title: `${property.title} | JR Realty`,
    description: property.description.slice(0, 160),
  }
}

export default async function PropiedadDetallePage({ params }: PropiedadDetallePageProps) {
  const { slug } = await params
  const property = await getProperty(slug)
  if (!property) notFound()

  const features = Array.isArray(property.features)
    ? (property.features as unknown[]).filter((f): f is string => typeof f === 'string')
    : []

  // Propiedades similares (misma zona o tipo).
  const similaresRaw = await db.property.findMany({
    where: {
      id: { not: property.id },
      status: 'AVAILABLE',
      OR: [{ zoneId: property.zoneId }, { type: property.type }],
    },
    take: 3,
    include: {
      zone: { select: { name: true } },
      images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true } },
      tags: { select: { tag: true } },
    },
  })

  const similares: PublicPropertyCardData[] = similaresRaw.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    type: p.type,
    operation: p.operation,
    price: Number(p.price),
    currency: p.currency,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    parkingSpots: p.parkingSpots,
    buildAreaM2: p.buildAreaM2 != null ? Number(p.buildAreaM2) : null,
    address: p.address,
    zoneName: p.zone.name,
    coverImage: p.images[0]?.url ?? null,
    tags: p.tags.map((t) => t.tag),
    featured: p.featured,
  }))

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: property.title,
    description: property.description,
    url: `https://jrrealty.com.ve/propiedades/${property.slug}`,
    offers: {
      '@type': 'Offer',
      price: Number(property.price),
      priceCurrency: property.currency === 'VES' ? 'VES' : 'USD',
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: property.address,
    },
  }

  const detailItems = [
    { icon: BedDouble, label: 'Habitaciones', value: property.bedrooms },
    { icon: Bath, label: 'Baños', value: property.bathrooms },
    { icon: Car, label: 'Estacionamientos', value: property.parkingSpots },
    { icon: Ruler, label: 'Área construida', value: property.buildAreaM2 ? `${Math.round(Number(property.buildAreaM2))} m²` : null },
    { icon: Ruler, label: 'Área de terreno', value: property.landAreaM2 ? `${Math.round(Number(property.landAreaM2))} m²` : null },
  ].filter((item) => item.value != null)

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-muted-foreground" aria-label="Miga de pan">
        <Link href="/" className="hover:text-primary">
          Inicio
        </Link>
        {' / '}
        <Link href="/propiedades" className="hover:text-primary">
          Propiedades
        </Link>
        {' / '}
        <span className="text-foreground">{property.title}</span>
      </nav>

      {/* Galería */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
          {property.images[0] ? (
            <Image
              src={property.images[0].url}
              alt={property.images[0].alt ?? property.title}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              priority
              className="object-cover"
            />
          ) : (
            <div className="grid size-full place-items-center text-muted-foreground">
              <Building2 className="size-16" aria-hidden="true" />
            </div>
          )}
        </div>
        {property.images[1] || property.images[2] ? (
          <div className="grid grid-cols-2 gap-4">
            {property.images.slice(1, 5).map((image, index) => (
              <div
                key={image.id}
                className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted"
              >
                <Image
                  src={image.url}
                  alt={image.alt ?? `${property.title} - imagen ${index + 2}`}
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Contenido */}
      <div className="mt-10 grid gap-10 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary text-primary-foreground">
                {operationLabels[property.operation as keyof typeof operationLabels]}
              </Badge>
              <StatusBadge status={property.status} />
              {property.tags.map((t) => (
                <StatusBadge key={t.tag} status={t.tag} />
              ))}
            </div>
            <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              {property.title}
            </h1>
            <p className="mt-2 flex items-center gap-2 text-muted-foreground">
              <MapPin className="size-4 text-primary" aria-hidden="true" />
              {property.address} · {property.zone.name}
            </p>
            <p className="mt-4 font-heading text-3xl font-semibold text-primary">
              {formatCurrency(property.price, property.currency as 'USD' | 'VES')}
            </p>
            <p className="text-sm text-muted-foreground">
              {propertyTypeLabels[property.type as keyof typeof propertyTypeLabels]}
            </p>
          </div>

          {/* Detalles clave */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {detailItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-xl border border-border p-4"
              >
                <item.icon className="size-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Descripción */}
          <div>
            <h2 className="font-heading text-2xl font-semibold">Descripción</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">
              {property.description}
            </p>
          </div>

          {/* Características */}
          {features.length > 0 ? (
            <div>
              <h2 className="font-heading text-2xl font-semibold">Características</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {features.map((feature) => (
                  <li
                    key={feature}
                    className="rounded-full border border-border px-3 py-1.5 text-sm"
                  >
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Ubicación */}
          <div>
            <h2 className="font-heading text-2xl font-semibold">Ubicación</h2>
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-border p-4">
              <MapPin className="size-5 text-primary" aria-hidden="true" />
              <div>
                <p className="font-medium">{property.zone.name}</p>
                <p className="text-sm text-muted-foreground">{property.address}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar: agente + contacto */}
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-full bg-primary/10 font-heading text-lg font-semibold text-primary">
                  {property.agent.user.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium">{property.agent.user.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {property.agent.title ?? 'Asesor inmobiliario'}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <a
                  href={`tel:${property.agent.phone}`}
                  className="flex items-center gap-2 text-muted-foreground hover:text-primary"
                >
                  <Phone className="size-4 text-primary" aria-hidden="true" />
                  {property.agent.phone}
                </a>
                <a
                  href={`mailto:${property.agent.user.email}`}
                  className="flex items-center gap-2 text-muted-foreground hover:text-primary"
                >
                  <Mail className="size-4 text-primary" aria-hidden="true" />
                  {property.agent.user.email}
                </a>
                <a
                  href={`https://wa.me/${property.agent.whatsapp ?? property.agent.phone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground hover:text-primary"
                >
                  <MessageCircle className="size-4 text-primary" aria-hidden="true" />
                  WhatsApp directo
                </a>
              </div>

              <Button
                className="w-full"
                render={
                  <Link
                    href={`https://wa.me/${property.agent.whatsapp ?? property.agent.phone}?text=${encodeURIComponent(`Hola, me interesa "${property.title}" (${formatCurrency(property.price)}) y me gustaría más información.`)}`}
                    target="_blank"
                  />
                }
              >
                <MessageCircle className="size-4" aria-hidden="true" />
                Contactar por WhatsApp
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h2 className="mb-4 font-heading text-lg font-semibold">
                ¿Te interesa esta propiedad?
              </h2>
              <LeadForm propertyId={property.id} compact />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Similares */}
      {similares.length > 0 ? (
        <div className="mt-16">
          <h2 className="font-heading text-2xl font-semibold">Propiedades similares</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {similares.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
