'use client'

import { useRouter } from 'next/navigation'
import { Search, SlidersHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { propertyTypeLabels, operationLabels, statusLabels, tagLabels } from '@/lib/validations/property.schema'

export interface FilterState {
  search: string
  type: string
  operation: string
  status: string
  zone: string
  tag: string
  minPrice: number | null
  maxPrice: number | null
  bedrooms: number | null
}

interface PropertyFiltersProps {
  filters: FilterState
  zones: { id: string; name: string }[]
  types: string[]
  operations: string[]
  statuses: string[]
  tags: string[]
}

const selectClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

/**
 * Barra de filtros del catálogo público.
 *
 * Los filtros viven en la URL (searchParams) → SSR obtiene resultados iniciales
 * (SEO) y cada cambio de filtro hace router.replace() para sincronizar la URL.
 * El submit del form hace una navegación GET normal.
 */
export function PropertyFilters({ filters, zones, types, operations, statuses, tags }: PropertyFiltersProps) {
  const router = useRouter()

  function applyFilter(key: keyof FilterState, value: string) {
    const url = new URL(window.location.href)
    if (value === '' || value === '0') {
      url.searchParams.delete(key)
    } else {
      url.searchParams.set(key, value)
    }
    router.replace(`${url.pathname}${url.search}`)
  }

  function clearFilters() {
    router.replace('/propiedades')
  }

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="size-4 text-primary" aria-hidden="true" />
        <p className="text-sm font-medium">Filtros de búsqueda</p>
      </div>

      <form method="GET" action="/propiedades" className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            name="search"
            placeholder="Buscar por zona o dirección…"
            defaultValue={filters.search}
            className="pl-9"
          />
        </div>

        <select
          name="type"
          className={selectClass}
          value={filters.type}
          onChange={(e) => applyFilter('type', e.target.value)}
        >
          <option value="">Todos los tipos</option>
          {types.map((value) => (
            <option key={value} value={value}>
              {propertyTypeLabels[value as keyof typeof propertyTypeLabels]}
            </option>
          ))}
        </select>

        <select
          name="operation"
          className={selectClass}
          value={filters.operation}
          onChange={(e) => applyFilter('operation', e.target.value)}
        >
          <option value="">Venta o alquiler</option>
          {operations.map((value) => (
            <option key={value} value={value}>
              {operationLabels[value as keyof typeof operationLabels]}
            </option>
          ))}
        </select>

        <select
          name="zone"
          className={selectClass}
          value={filters.zone}
          onChange={(e) => applyFilter('zone', e.target.value)}
        >
          <option value="">Todas las zonas</option>
          {zones.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.name}
            </option>
          ))}
        </select>

        <select
          name="bedrooms"
          className={selectClass}
          value={filters.bedrooms?.toString() ?? ''}
          onChange={(e) => applyFilter('bedrooms', e.target.value)}
        >
          <option value="">Cualquier habitación</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}+ habitaciones
            </option>
          ))}
        </select>

        <Input
          name="minPrice"
          type="number"
          placeholder="Precio mínimo"
          defaultValue={filters.minPrice ?? ''}
        />
        <Input
          name="maxPrice"
          type="number"
          placeholder="Precio máximo"
          defaultValue={filters.maxPrice ?? ''}
        />

        <select
          name="tag"
          className={selectClass}
          value={filters.tag}
          onChange={(e) => applyFilter('tag', e.target.value)}
        >
          <option value="">Todas las etiquetas</option>
          {tags.map((value) => (
            <option key={value} value={value}>
              {tagLabels[value as keyof typeof tagLabels] ?? value}
            </option>
          ))}
        </select>

        <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
          <Button type="submit" className="flex-1">
            <Search className="size-4" aria-hidden="true" />
            Buscar
          </Button>
          {(filters.search ||
            filters.type ||
            filters.operation ||
            filters.zone ||
            filters.tag ||
            filters.minPrice ||
            filters.maxPrice ||
            filters.bedrooms) ? (
            <Button type="button" variant="outline" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  )
}
