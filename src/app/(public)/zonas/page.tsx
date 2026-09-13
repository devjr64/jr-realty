import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import { Card, CardContent } from '@/components/ui/card'
import { db } from '@/lib/db'

export const metadata: Metadata = {
  title: 'Zonas | JR Realty',
  description: 'Explora las zonas y barriadas donde tenemos propiedades en Venezuela.',
}

export const dynamic = 'force-dynamic'
export const revalidate = 300 // ISR: 5 min

export default async function ZonasPage() {
  const zonas = await db.zone.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { properties: true } },
    },
  })

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Zonas de Venezuela
        </h1>
        <p className="mt-2 text-muted-foreground">
          Explora propiedades por zona y barriada.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {zonas.map((zona) => (
          <Link key={zona.id} href={`/propiedades?zone=${zona.id}`} className="group block">
            <Card className="overflow-hidden transition-shadow group-hover:shadow-lg">
              <div className="relative aspect-[16/9] w-full bg-muted">
                {zona.imageUrl ? (
                  <Image
                    src={zona.imageUrl}
                    alt={zona.name}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="grid size-full place-items-center font-heading text-3xl text-muted-foreground">
                    {zona.name.charAt(0)}
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <h2 className="font-heading text-lg font-semibold group-hover:text-primary">
                  {zona.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {zona._count.properties} propiedades
                </p>
                {zona.description ? (
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {zona.description}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
