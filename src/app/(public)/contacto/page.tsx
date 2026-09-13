import type { Metadata } from 'next'
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react'

import { LeadForm } from '@/components/public/lead-form'
import { Card, CardContent } from '@/components/ui/card'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 300 // ISR: 5 min

export const metadata: Metadata = {
  title: 'Contacto | JR Realty',
  description: 'Contacta a JR Realty para comprar, vender o alquilar propiedades en Venezuela.',
}

export default async function ContactoPage() {
  const setting = await db.siteSetting.findUnique({ where: { key: 'general' } })
  const general =
    setting && typeof setting.value === 'object' && setting.value !== null
      ? (setting.value as Record<string, unknown>)
      : {}

  const phone = typeof general.phone === 'string' ? general.phone : '+58 212-555-0140'
  const whatsapp =
    typeof general.whatsapp === 'string' && general.whatsapp
      ? general.whatsapp
      : phone
  const email =
    typeof general.email === 'string' && general.email ? general.email : ''
  const address =
    typeof general.address === 'string' ? general.address : 'Caracas, Venezuela'

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Contáctanos
        </h1>
        <p className="mt-2 text-muted-foreground">
          Cuéntanos qué estás buscando y un asesor te acompañará en todo el proceso.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <h2 className="mb-4 font-heading text-xl font-semibold">
              Envíanos un mensaje
            </h2>
            <LeadForm />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <h2 className="font-heading text-xl font-semibold">
                Información de contacto
              </h2>
              <a
                href={`tel:${phone.replace(/\s/g, '')}`}
                className="flex items-center gap-3 text-muted-foreground hover:text-primary"
              >
                <Phone className="size-5 shrink-0 text-primary" aria-hidden="true" />
                {phone}
              </a>
              {email ? (
                <a
                  href={`mailto:${email}`}
                  className="flex items-center gap-3 text-muted-foreground hover:text-primary"
                >
                  <Mail className="size-5 shrink-0 text-primary" aria-hidden="true" />
                  {email}
                </a>
              ) : null}
              <a
                href={`https://wa.me/${whatsapp.replace(/\s/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-muted-foreground hover:text-primary"
              >
                <MessageCircle className="size-5 shrink-0 text-primary" aria-hidden="true" />
                WhatsApp directo
              </a>
              <p className="flex items-center gap-3 text-muted-foreground">
                <MapPin className="size-5 shrink-0 text-primary" aria-hidden="true" />
                {address}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h2 className="font-heading text-xl font-semibold">Servicios</h2>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>· Administración de propiedades</li>
                <li>· Venta y compra de inmuebles</li>
                <li>· Alquiler de propiedades</li>
                <li>· Asesoría para inversionistas</li>
                <li>· Gestión de propiedades para Airbnb</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
