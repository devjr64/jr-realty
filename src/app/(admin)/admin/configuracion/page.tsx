import type { Metadata } from 'next'

import { PageHeader } from '@/components/admin/page-header'
import { SiteSettingsForm } from '@/components/admin/site-settings-form'
import { requireSuperAdmin } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import type { SiteSettingsInput } from '@/lib/validations/site-settings.schema'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Configuración | JR Realty',
}

export default async function ConfiguracionPage() {
  await requireSuperAdmin()

  const settings = await db.siteSetting.findMany()

  const byKey = new Map(settings.map((s) => [s.key, s.value]))

  const generalValue =
    (byKey.get('general') as Record<string, unknown> | null) ?? {}
  const socialValue = (byKey.get('social') as Record<string, unknown> | null) ?? {}
  const seoValue = (byKey.get('seo') as Record<string, unknown> | null) ?? {}

  const initial: SiteSettingsInput = {
    general: {
      siteName: str(generalValue.siteName, 'JR Realty'),
      tagline: str(generalValue.tagline, ''),
      phone: str(generalValue.phone, '+58 212-555-0140'),
      whatsapp: str(generalValue.whatsapp, ''),
      email: str(generalValue.email, ''),
      address: str(generalValue.address, ''),
      currency: generalValue.currency === 'VES' ? 'VES' : 'USD',
    },
    social: {
      facebook: str(socialValue.facebook, ''),
      instagram: str(socialValue.instagram, ''),
      twitter: str(socialValue.twitter, ''),
      linkedin: str(socialValue.linkedin, ''),
      youtube: str(socialValue.youtube, ''),
    },
    seo: {
      title: str(seoValue.title, ''),
      description: str(seoValue.description, ''),
    },
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Configuración"
        description="Ajustes generales del sitio."
      />
      <SiteSettingsForm initial={initial} />
    </div>
  )
}

function str(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}
