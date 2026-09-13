import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/admin/page-header'
import { PageForm, type PageFormValue } from '@/components/admin/page-form'
import { requireAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import type { EditableBlock } from '@/components/admin/block-editor'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Editar página | JR Realty',
}

interface EditarPaginaCmsPageProps {
  params: Promise<{ id: string }>
}

export default async function EditarPaginaCmsPage({ params }: EditarPaginaCmsPageProps) {
  await requireAdmin()
  const { id } = await params

  const page = await db.page.findUnique({ where: { id } })
  if (!page) notFound()

  const content = Array.isArray(page.content)
    ? (page.content as EditableBlock[])
    : []

  const initial: PageFormValue = {
    id: page.id,
    title: page.title,
    metaTitle: page.metaTitle,
    metaDescription: page.metaDescription,
    published: page.published,
    content,
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Editar página" description={page.title} />
      <PageForm initial={initial} />
    </div>
  )
}
