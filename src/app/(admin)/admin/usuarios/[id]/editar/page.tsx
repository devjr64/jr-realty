import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/admin/page-header'
import { UserForm } from '@/components/admin/user-form'
import { requireSuperAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Editar usuario | JR Realty',
}

interface EditarUsuarioPageProps {
  params: Promise<{ id: string }>
}

export default async function EditarUsuarioPage({ params }: EditarUsuarioPageProps) {
  const currentUser = await requireSuperAdmin()
  const { id } = await params

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      phone: true,
      agent: {
        select: {
          title: true,
          phone: true,
          whatsapp: true,
        },
      },
    },
  })
  if (!user) notFound()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Editar usuario" description={user.name} />
      <UserForm
        currentUserId={currentUser.id}
        initial={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          active: user.active,
          phone: user.agent?.phone ?? user.phone ?? '',
          title: user.agent?.title ?? '',
          whatsapp: user.agent?.whatsapp ?? '',
        }}
      />
    </div>
  )
}
