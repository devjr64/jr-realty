import type { Metadata } from 'next'
import { Quote, Plus } from 'lucide-react'
import Link from 'next/link'

import { DeleteEntityButton } from '@/components/admin/delete-entity-button'
import { EmptyState } from '@/components/admin/empty-state'
import { PageHeader } from '@/components/admin/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { requireSuperAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { deleteTestimonialAction } from '@/server/actions/testimonial.actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Testimonios | JR Realty',
}

export default async function AdminTestimoniosPage() {
  await requireSuperAdmin()

  const testimonials = await db.testimonial.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Testimonios"
        description="Testimonios de clientes que se muestran en el sitio."
        actions={
          <Button render={<Link href="/admin/testimonios/nuevo" />}>
            <Plus className="size-4" aria-hidden="true" />
            Nuevo testimonio
          </Button>
        }
      />

      {testimonials.length === 0 ? (
        <EmptyState
          title="No hay testimonios"
          description="Agrega el primer testimonio de un cliente satisfecho."
          icon={Quote}
          action={
            <Button render={<Link href="/admin/testimonios/nuevo" />}>
              <Plus className="size-4" aria-hidden="true" />
              Crear testimonio
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.id}>
              <CardContent className="space-y-3 pt-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.role ?? 'Cliente'} · {'★'.repeat(testimonial.rating)}
                    </p>
                  </div>
                  {testimonial.active ? (
                    <Badge className="shrink-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      Activo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="shrink-0">
                      Inactivo
                    </Badge>
                  )}
                </div>
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  “{testimonial.content}”
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    render={<Link href={`/admin/testimonios/${testimonial.id}/editar`} />}
                  >
                    Editar
                  </Button>
                  <DeleteEntityButton
                    entityId={testimonial.id}
                    entityLabel={testimonial.name}
                    deleteAction={deleteTestimonialAction}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
