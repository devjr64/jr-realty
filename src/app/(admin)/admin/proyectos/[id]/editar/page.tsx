import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/admin/page-header'
import { ProjectForm } from '@/components/admin/project-form'
import { requireAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Editar proyecto | JR Realty',
}

interface EditarProyectoPageProps {
  params: Promise<{ id: string }>
}

export default async function EditarProyectoPage({ params }: EditarProyectoPageProps) {
  const user = await requireAdmin()
  const { id } = await params

  const [project, zones, agents] = await Promise.all([
    db.project.findUnique({ where: { id } }),
    db.zone.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    db.agent.findMany({
      where: { active: true },
      orderBy: { user: { name: 'asc' } },
      select: { id: true, user: { select: { name: true } } },
    }),
  ])

  if (!project) notFound()

  // AGENT users can only edit projects assigned to them
  if (user.role === 'AGENT') {
    const agent = await db.agent.findUnique({
      where: { userId: user.id },
      select: { id: true },
    })
    if (project.agentId !== agent?.id) {
      notFound()
    }
  }

  const agentOptions = agents.map((a) => ({ id: a.id, name: a.user.name }))

  const gallery = Array.isArray(project.gallery)
    ? (project.gallery as { url: string; alt?: string }[])
    : []

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Editar proyecto" description={project.name} />
      <ProjectForm
        zones={zones}
        agents={agentOptions}
        isSuperAdmin={user.role === 'SUPER_ADMIN'}
        initial={{
          id: project.id,
          name: project.name,
          description: project.description,
          developer: project.developer,
          zoneId: project.zoneId,
          agentId: project.agentId,
          deliveryDate: project.deliveryDate
            ? project.deliveryDate.toISOString().slice(0, 10)
            : null,
          priceRangeMin: project.priceRangeMin != null ? Number(project.priceRangeMin) : null,
          priceRangeMax: project.priceRangeMax != null ? Number(project.priceRangeMax) : null,
          coverImage: project.coverImage,
          gallery,
          status: project.status,
        }}
      />
    </div>
  )
}
