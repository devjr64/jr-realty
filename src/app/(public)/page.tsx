import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { PropertyCard, type PublicPropertyCardData } from '@/components/public/property-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { db } from '@/lib/db'

export const metadata: Metadata = {
  title: 'JR Realty | Venta y Alquiler de Propiedades',
  description:
    'Agencia inmobiliaria en Caracas. Venta, alquiler y administración de apartamentos, casas, oficinas y locales comerciales.',
}

export const dynamic = 'force-dynamic'
export const revalidate = 300 // ISR: 5 min (las acciones revalidan tras cada write)

export default async function HomePage() {
  const [destacadas, proyectos, zonas, testimonios, settings] = await Promise.all([
    db.property.findMany({
      where: { status: 'AVAILABLE' },
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      take: 6,
      include: {
        zone: { select: { name: true } },
        images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true } },
        tags: { select: { tag: true } },
      },
    }),
    db.project.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: { zone: { select: { name: true } } },
    }),
    db.zone.findMany({
      orderBy: { name: 'asc' },
      take: 6,
      include: { _count: { select: { properties: true } } },
    }),
    db.testimonial.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
      take: 3,
    }),
    db.siteSetting.findUnique({ where: { key: 'general' } }),
  ])

  const general =
    settings && typeof settings.value === 'object' && settings.value !== null
      ? (settings.value as Record<string, unknown>)
      : {}
  const phone =
    typeof general.phone === 'string' ? general.phone : '+58 212-555-0140'

  const featuredCards: PublicPropertyCardData[] = destacadas.map((p) => ({
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

  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[75vh] flex-col items-center justify-center overflow-hidden px-4 py-20 text-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(198,146,60,0.18),transparent_70%)]"
        />
        <Badge variant="secondary" className="mb-6 gap-2 rounded-full px-4 py-1">
          <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
          Venta y alquiler de propiedades en Venezuela
        </Badge>
        <h1 className="max-w-3xl font-heading text-4xl leading-tight font-semibold tracking-tight sm:text-5xl lg:text-6xl">
          Tu mejor aliado en el{' '}
          <span className="text-primary">mercado inmobiliario</span>
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Compra, venta y alquiler de propiedades en las mejores zonas de Venezuela,
          con asesoría experta y acompañamiento en cada paso del proceso.
        </p>
        <div className="mt-10 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Button size="lg" className="px-6" render={<Link href="/propiedades" />}>
            Explorar Propiedades
            <ArrowRight data-icon="inline-end" className="size-4" aria-hidden="true" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="px-6"
            render={<Link href="/contacto" />}
          >
            Contáctanos
          </Button>
        </div>
      </section>

      {/* Propiedades destacadas */}
      {featuredCards.length > 0 ? (
        <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
                Propiedades destacadas
              </h2>
              <p className="mt-2 text-muted-foreground">
                Selección de las mejores oportunidades del momento.
              </p>
            </div>
            <Button variant="outline" render={<Link href="/propiedades" />}>
              Ver todas
              <ArrowRight data-icon="inline-end" className="size-4" aria-hidden="true" />
            </Button>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredCards.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Zonas */}
      {zonas.length > 0 ? (
        <section className="bg-muted/40 py-16">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Zonas populares
            </h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {zonas.map((zona) => (
                <Link
                  key={zona.id}
                  href={`/propiedades?zone=${zona.id}`}
                  className="rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
                >
                  {zona.name}
                  <span className="ml-1.5 text-muted-foreground">
                    ({zona._count.properties})
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Proyectos */}
      {proyectos.length > 0 ? (
        <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Proyectos destacados
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {proyectos.map((project) => (
              <Card key={project.id}>
                <CardContent className="space-y-2 pt-6">
                  <h3 className="font-heading text-xl font-semibold">{project.name}</h3>
                  <p className="text-sm text-muted-foreground">{project.zone.name}</p>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {project.description}
                  </p>
                  <Link
                    href="/proyectos"
                    className="inline-block pt-1 text-sm font-medium text-primary hover:underline"
                  >
                    Ver proyecto →
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {/* Testimonios */}
      {testimonios.length > 0 ? (
        <section className="bg-sidebar py-16 text-sidebar-foreground">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Clientes satisfechos
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {testimonios.map((testimonial) => (
                <Card key={testimonial.id} className="bg-sidebar-accent text-sidebar-accent-foreground">
                  <CardContent className="space-y-3 pt-6">
                    <p className="text-primary" aria-hidden="true">
                      {'★'.repeat(testimonial.rating)}
                    </p>
                    <p className="text-sm leading-relaxed">
                      &ldquo;{testimonial.content}&rdquo;
                    </p>
                    <p className="font-medium">
                      {testimonial.name}
                      {testimonial.role ? (
                        <span className="text-sm text-muted-foreground">
                          {' '}· {testimonial.role}
                        </span>
                      ) : null}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* CTA */}
      <section className="mx-auto w-full max-w-4xl px-4 py-20 text-center sm:px-6">
        <h2 className="font-heading text-3xl font-semibold tracking-tight">
          ¿Buscas comprar, vender o alquilar?
        </h2>
        <p className="mt-3 text-muted-foreground">
          Comunícate con uno de nuestros expertos. Le brindaremos la asesoría
          necesaria para tu próxima operación inmobiliaria.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            size="lg"
            render={<Link href="https://wa.me/582125550140" target="_blank" />}
          >
            Escribir por WhatsApp
          </Button>
          <Button
            size="lg"
            variant="outline"
            render={<Link href="/contacto" />}
          >
            Contáctanos
          </Button>
        </div>
      </section>
    </>
  )
}
