import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { CalendarDays } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { db } from '@/lib/db'
import { formatCurrency, formatDate } from '@/lib/utils/format'

export const metadata: Metadata = {
  title: 'Proyectos | JR Realty',
  description:
    'Desarrollos inmobiliarios y pre-construcción en las mejores zonas de Venezuela.',
}

export const dynamic = 'force-dynamic'
export const revalidate = 300 // ISR: 5 min

const projectStatusLabels: Record<string, string> = {
  ACTIVE: 'Activo',
  SOLD_OUT: 'Agotado',
  COMING_SOON: 'Próximamente',
}

export default async function ProyectosPage() {
  const projects = await db.project.findMany({
    orderBy: { createdAt: 'desc' },
    include: { zone: { select: { name: true } } },
  })

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Proyectos y pre-construcción
        </h1>
        <p className="mt-2 text-muted-foreground">
          Desarrollos seleccionados para inversión y estilo de vida.
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-20 text-center">
          <p className="font-heading text-xl">Próximamente</p>
          <p className="mt-2 text-muted-foreground">
            Estamos preparando nuevos desarrollos.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="overflow-hidden">
              <div className="relative aspect-[16/9] w-full bg-muted">
                {project.coverImage ? (
                  <Image
                    src={project.coverImage}
                    alt={project.name}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="grid size-full place-items-center font-heading text-3xl text-muted-foreground">
                    {project.name.charAt(0)}
                  </div>
                )}
                <div className="absolute left-3 top-3">
                  <Badge
                    className={
                      project.status === 'ACTIVE'
                        ? 'bg-emerald-500/90 text-white'
                        : project.status === 'COMING_SOON'
                          ? 'bg-amber-500/90 text-white'
                          : 'bg-muted text-muted-foreground'
                    }
                  >
                    {projectStatusLabels[project.status] ?? project.status}
                  </Badge>
                </div>
              </div>
              <CardContent className="space-y-3 p-4">
                <h2 className="font-heading text-xl font-semibold">{project.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {project.zone.name}
                  {project.developer ? ` · ${project.developer}` : ''}
                </p>
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {project.description}
                </p>
                <div className="flex items-center justify-between pt-2 text-sm">
                  <p className="font-medium text-primary">
                    {project.priceRangeMin != null
                      ? `Desde ${formatCurrency(project.priceRangeMin)}`
                      : 'Precio por consultar'}
                  </p>
                  {project.deliveryDate ? (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <CalendarDays className="size-4" aria-hidden="true" />
                      {formatDate(project.deliveryDate)}
                    </span>
                  ) : null}
                </div>
                <Link
                  href="/contacto"
                  className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Solicitar información →
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
