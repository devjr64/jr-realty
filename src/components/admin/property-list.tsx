'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import {
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { ConfirmDeleteDialog } from '@/components/admin/confirm-delete-dialog'
import { EmptyState } from '@/components/admin/empty-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusBadge } from '@/components/shared/status-badge'
import {
  deletePropertyAction,
  toggleFeaturedAction,
} from '@/server/actions/property.actions'
import {
  operationLabels,
  propertyTypeLabels,
  statusLabels,
} from '@/lib/validations/property.schema'
import { formatCurrency } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Shared types (serialized by the server page)                        */
/* ------------------------------------------------------------------ */

export interface AdminProperty {
  id: string
  title: string
  type: keyof typeof propertyTypeLabels
  operation: keyof typeof operationLabels
  price: number
  currency: 'USD' | 'VES'
  status: keyof typeof statusLabels
  featured: boolean
  zoneName: string
  agentName: string
  coverImage: string | null
  createdAt: string
}

export interface PropertyFilters {
  search: string
  type: string
  operation: string
  status: string
  zone: string
}

interface PropertyListProps {
  properties: AdminProperty[]
  total: number
  page: number
  pageSize: number
  filters: PropertyFilters
  zones: { id: string; name: string }[]
  isSuperAdmin: boolean
}

/* ------------------------------------------------------------------ */
/* Filter select options (label maps → native <option> values)         */
/* ------------------------------------------------------------------ */

const typeOptions: { value: string; label: string }[] = [
  { value: '', label: 'Todos los tipos' },
  ...Object.entries(propertyTypeLabels).map(([value, label]) => ({ value, label })),
]

const operationOptions: { value: string; label: string }[] = [
  { value: '', label: 'Todas las operaciones' },
  ...Object.entries(operationLabels).map(([value, label]) => ({ value, label })),
]

const statusOptions: { value: string; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  ...Object.entries(statusLabels).map(([value, label]) => ({ value, label })),
]

/**
 * Rebuilds the page URL preserving the active filters. Filtering is
 * URL-synced via a native GET form, so pagination links are plain Links that
 * carry the same query (page ± 1).
 */
function buildHref(pageNumber: number, filters: PropertyFilters): string {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.type) params.set('type', filters.type)
  if (filters.operation) params.set('operation', filters.operation)
  if (filters.status) params.set('status', filters.status)
  if (filters.zone) params.set('zone', filters.zone)
  if (pageNumber > 1) params.set('page', String(pageNumber))
  const query = params.toString()
  return query ? `/admin/propiedades?${query}` : '/admin/propiedades'
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

/**
 * Admin property list: URL-synced filter bar + data table.
 *
 * The filter bar is a native GET form (action="/admin/propiedades") so every
 * filter change is reflected in the URL and the server page re-queries with
 * the new params — no client state to keep in sync. Native <select> elements
 * are used instead of the headless shadcn Select because base-ui's Select is
 * not a native form control and cannot participate in a GET submission.
 *
 * Row actions:
 *  - Featured toggle submits `toggleFeaturedAction` (useActionState) with the
 *    property id as a hidden field.
 *  - Delete uses `deletePropertyAction` through a hidden form + ref-driven
 *    `requestSubmit()`, with ConfirmDeleteDialog handling the confirmation
 *    and pending state.
 */
export function PropertyList({
  properties,
  total,
  page,
  pageSize,
  filters,
  zones,
  isSuperAdmin,
}: PropertyListProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const zoneOptions: { value: string; label: string }[] = [
    { value: '', label: 'Todas las zonas' },
    ...zones.map((zone) => ({ value: zone.id, label: zone.name })),
  ]

  return (
    <div className="space-y-6">
      {/* Filter bar — native GET form keeps filters URL-synced */}
      <Card>
        <CardContent>
          <form
            method="GET"
            action="/admin/propiedades"
            className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center"
          >
            <div className="relative min-w-[200px] flex-1">
              <Label htmlFor="search" className="sr-only">
                Buscar
              </Label>
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="search"
                name="search"
                type="search"
                defaultValue={filters.search}
                placeholder="Buscar por título o dirección"
                className="pl-8"
              />
            </div>

            <FilterSelect
              id="type"
              name="type"
              label="Tipo"
              value={filters.type}
              options={typeOptions}
            />
            <FilterSelect
              id="operation"
              name="operation"
              label="Operación"
              value={filters.operation}
              options={operationOptions}
            />
            <FilterSelect
              id="status"
              name="status"
              label="Estado"
              value={filters.status}
              options={statusOptions}
            />
            <FilterSelect
              id="zone"
              name="zone"
              label="Zona"
              value={filters.zone}
              options={zoneOptions}
            />

            <div className="flex items-center gap-2">
              <Button type="submit" variant="outline">
                <Search className="size-4" aria-hidden="true" />
                Filtrar
              </Button>
              <Button variant="ghost" render={<Link href="/admin/propiedades" />}>
                Limpiar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Results table */}
      <Card className="overflow-hidden p-0">
        {properties.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No hay propiedades"
            description="Crea tu primera propiedad para comenzar"
            action={
              <Button size="lg" render={<Link href="/admin/propiedades/nuevo" />}>
                <Plus className="size-4" aria-hidden="true" />
                Nueva propiedad
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Imagen</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead className="hidden md:table-cell">Zona</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Destacada</TableHead>
                  <TableHead className="pr-4 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {properties.map((property) => (
                  <TableRow key={property.id}>
                    <TableCell className="pl-4">
                      <PropertyThumbnail
                        coverImage={property.coverImage}
                        title={property.title}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-0 flex-col">
                        <Link
                          href={`/admin/propiedades/${property.id}/editar`}
                          className="truncate font-medium hover:text-primary hover:underline"
                        >
                          {property.title}
                        </Link>
                        {isSuperAdmin && property.agentName ? (
                          <span className="mt-0.5 truncate text-xs text-muted-foreground">
                            {property.agentName}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{propertyTypeLabels[property.type]}</TableCell>
                    <TableCell className="font-medium tabular-nums">
                      {formatCurrency(property.price, property.currency)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {property.zoneName}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={property.status} />
                    </TableCell>
                    <TableCell className="text-center">
                      <FeaturedToggle
                        propertyId={property.id}
                        featured={property.featured}
                      />
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Editar ${property.title}`}
                          render={
                            <Link href={`/admin/propiedades/${property.id}/editar`} />
                          }
                        >
                          <Pencil aria-hidden="true" />
                        </Button>
                        <DeletePropertyButton
                          propertyId={property.id}
                          title={property.title}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 ? (
              <div className="flex items-center justify-between gap-4 border-t px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Página {page} de {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  {page > 1 ? (
                    <Button
                      variant="outline"
                      size="sm"
                      render={<Link href={buildHref(page - 1, filters)} />}
                    >
                      <ChevronLeft className="size-3.5" aria-hidden="true" />
                      Anterior
                    </Button>
                  ) : null}
                  {page < totalPages ? (
                    <Button
                      variant="outline"
                      size="sm"
                      render={<Link href={buildHref(page + 1, filters)} />}
                    >
                      Siguiente
                      <ChevronRight className="size-3.5" aria-hidden="true" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        )}
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

interface FilterSelectProps {
  id: string
  name: string
  label: string
  value: string
  options: { value: string; label: string }[]
}

/**
 * Native <select> styled to match the shadcn SelectTrigger. Native controls
 * are required here so the filter form can submit via plain GET and keep the
 * URL as the single source of truth.
 */
function FilterSelect({ id, name, label, value, options }: FilterSelectProps) {
  return (
    <div className="relative">
      <Label htmlFor={id} className="sr-only">
        {label}
      </Label>
      <select
        id={id}
        name={name}
        defaultValue={value}
        className="h-8 w-full appearance-none rounded-lg border border-input bg-transparent pr-8 pl-2.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto dark:bg-input/30"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  )
}

function PropertyThumbnail({
  coverImage,
  title,
}: {
  coverImage: string | null
  title: string
}) {
  if (!coverImage) {
    return (
      <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Building2 className="size-5" aria-hidden="true" />
      </div>
    )
  }
  return (
    <Image
      src={coverImage}
      alt=""
      width={48}
      height={48}
      className="size-12 shrink-0 rounded-md object-cover"
    />
  )
}

function FeaturedToggle({
  propertyId,
  featured,
}: {
  propertyId: string
  featured: boolean
}) {
  const [, formAction, isPending] = useActionState(toggleFeaturedAction, {})

  return (
    <form action={formAction} className="inline-flex">
      <input type="hidden" name="id" value={propertyId} />
      <Button
        type="submit"
        variant="ghost"
        size="icon-sm"
        disabled={isPending}
        aria-label={featured ? 'Quitar de destacadas' : 'Marcar como destacada'}
        aria-pressed={featured}
      >
        {isPending ? (
          <Loader2
            className="size-4 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        ) : (
          <Star
            className={cn(
              'size-4 transition-colors',
              featured ? 'fill-current text-primary' : 'text-muted-foreground',
            )}
            aria-hidden="true"
          />
        )}
      </Button>
    </form>
  )
}

function DeletePropertyButton({
  propertyId,
  title,
}: {
  propertyId: string
  title: string
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction, isPending] = useActionState(deletePropertyAction, {})
  const formRef = useRef<HTMLFormElement>(null)

  // Close the dialog once the server action reports success.
  useEffect(() => {
    if (state?.success) {
      setOpen(false)
    }
  }, [state])

  return (
    <>
      {/* Hidden form carrying the property id; confirmed via ref submit so the
          server action always receives the id through real FormData. */}
      <form ref={formRef} action={formAction} className="hidden">
        <input type="hidden" name="id" value={propertyId} />
      </form>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Eliminar ${title}`}
        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 aria-hidden="true" />
      </Button>

      <ConfirmDeleteDialog
        open={open}
        onOpenChange={setOpen}
        title="Eliminar propiedad"
        description={`¿Seguro que deseas eliminar "${title}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        pending={isPending}
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </>
  )
}
