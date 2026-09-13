import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/admin/page-header'
import { TestimonialForm } from '@/components/admin/testimonial-form'
import { requireAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Editar testimonio | JR Realty',
}

interface EditarTestimonioPageProps {
  params: Promise<{ id: string }>
}

export default async function EditarTestimonioPage({ params }: EditarTestimonioPageProps) {
  await requireAdmin()
  const { id } = await params

  const testimonial = await db.testimonial.findUnique({ where: { id } })
  if (!testimonial) notFound()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Editar testimonio" description={testimonial.name} />
      <TestimonialForm
        initial={{
          id: testimonial.id,
          name: testimonial.name,
          role: testimonial.role,
          content: testimonial.content,
          rating: testimonial.rating,
          active: testimonial.active,
        }}
      />
    </div>
  )
}
