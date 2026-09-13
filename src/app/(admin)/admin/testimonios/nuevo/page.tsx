import type { Metadata } from 'next'

import { PageHeader } from '@/components/admin/page-header'
import { TestimonialForm } from '@/components/admin/testimonial-form'
import { requireAdmin } from '@/lib/auth-helpers'

export const metadata: Metadata = {
  title: 'Nuevo testimonio | JR Realty',
}

export default async function NuevoTestimonioPage() {
  await requireAdmin()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Nuevo testimonio"
        description="Agrega un testimonio de cliente satisfecho."
      />
      <TestimonialForm />
    </div>
  )
}
