import type { Metadata } from 'next'

import { PageHeader } from '@/components/admin/page-header'
import { UserForm } from '@/components/admin/user-form'
import { requireSuperAdmin } from '@/lib/auth-helpers'

export const metadata: Metadata = {
  title: 'Nuevo usuario | JR Realty',
}

export default async function NuevoUsuarioPage() {
  await requireSuperAdmin()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Nuevo usuario" description="Crea un nuevo usuario y asigna su rol." />
      <UserForm />
    </div>
  )
}
