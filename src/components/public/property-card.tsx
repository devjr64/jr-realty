import Image from 'next/image'
import Link from 'next/link'

import { StatusBadge } from '@/components/shared/status-badge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/format'
import { propertyTypeLabels } from '@/lib/validations/property.schema'

export interface PublicPropertyCardData {
  id: string
  title: string
  slug: string
  type: string
  operation: string
  price: number
  currency: string
  bedrooms: number | null
  bathrooms: number | null
  parkingSpots: number | null
  buildAreaM2: number | null
  address: string
  zoneName: string
  coverImage: string | null
  tags: string[]
  featured: boolean
}

/**
 * Tarjeta de propiedad para el catálogo público.
 * Se usa en /propiedades, homepage y zonas.
 */
export function PropertyCard({ property }: { property: PublicPropertyCardData }) {
  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-lg">
      <Link href={`/propiedades/${property.slug}`} className="block">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          {property.coverImage ? (
            <Image
              src={property.coverImage}
              alt={property.title}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="grid size-full place-items-center text-muted-foreground">
              <span className="font-heading text-2xl">MC</span>
            </div>
          )}
          <div className="absolute left-3 top-3 flex gap-2">
            <Badge className="bg-primary text-primary-foreground">
              {property.operation === 'SALE'
                ? 'Venta'
                : property.operation === 'RENT'
                  ? 'Alquiler'
                  : 'Venta / Alquiler'}
            </Badge>
            {property.featured ? (
              <Badge className="bg-amber-500/90 text-white">Destacada</Badge>
            ) : null}
          </div>
        </div>

        <CardContent className="space-y-3 p-4">
          <div>
            <p className="font-heading text-xl font-semibold text-primary">
              {formatCurrency(property.price, property.currency as 'USD' | 'VES')}
            </p>
            <h3 className="mt-1 line-clamp-2 font-medium leading-snug group-hover:text-primary">
              {property.title}
            </h3>
          </div>

          <p className="line-clamp-1 text-sm text-muted-foreground">
            {property.address}
            {property.zoneName ? ` · ${property.zoneName}` : ''}
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>{propertyTypeLabels[property.type as keyof typeof propertyTypeLabels] ?? property.type}</span>
            {property.bedrooms != null ? (
              <span>{property.bedrooms} hab</span>
            ) : null}
            {property.bathrooms != null ? (
              <span>{property.bathrooms} baños</span>
            ) : null}
            {property.parkingSpots != null ? (
              <span>{property.parkingSpots} parq</span>
            ) : null}
            {property.buildAreaM2 != null ? (
              <span>{Math.round(property.buildAreaM2)} m²</span>
            ) : null}
          </div>

          {property.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {property.tags.slice(0, 3).map((tag) => (
                <StatusBadge key={tag} status={tag} />
              ))}
            </div>
          ) : null}
        </CardContent>
      </Link>
    </Card>
  )
}
