'use client'

import { useActionState } from 'react'
import { ArrowDownToLine, Eye, Search } from 'lucide-react'
import Link from 'next/link'

import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  leadSourceLabels,
  leadSourceValues,
  leadStatusLabels,
  leadStatusValues,
} from '@/lib/validations/lead.schema'
import { formatRelativeTime } from '@/lib/utils/format'
import { updateLeadStatusAction } from '@/server/actions/lead.actions'

export interface LeadRow {
  id: string
  name: string
  email: string
  phone: string | null
  message: string | null
  source: string
  status: string
  propertyTitle: string | null
  propertySlug: string | null
  assignedAgentName: string | null
  createdAt: string
}

interface LeadsTableProps {
  leads: LeadRow[]
  agents: { id: string; name: string }[]
  counts: { total: number; byStatus: Record<string, number> }
  isSuperAdmin: boolean
}

const selectClass =
  'h-9 w-full rounded-md border border-input bg-background px-2 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

export function LeadsTable({ leads, counts, isSuperAdmin }: LeadsTableProps) {
  const [, formAction, isPending] = useActionState(updateLeadStatusAction, {})

  function exportCsv() {
    const header = [
      'Nombre',
      'Correo',
      'Teléfono',
      'Estado',
      'Fuente',
      'Propiedad',
      'Fecha',
    ]
    const rows = leads.map((lead) => [
      lead.name,
      lead.email,
      lead.phone ?? '',
      leadStatusLabels[lead.status as keyof typeof leadStatusLabels] ?? lead.status,
      leadSourceLabels[lead.source as keyof typeof leadSourceLabels] ?? lead.source,
      lead.propertyTitle ?? '',
      new Date(lead.createdAt).toLocaleString('es-VE'),
    ])
    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(','),
      )
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <form
        method="GET"
        action="/admin/leads"
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            name="search"
            placeholder="Buscar por nombre o correo…"
            className="pl-9"
          />
        </div>
        <select name="status" className={selectClass + ' sm:w-48'}>
          <option value="">Todos los estados</option>
          {leadStatusValues.map((value) => (
            <option key={value} value={value}>
              {leadStatusLabels[value]} ({counts.byStatus[value] ?? 0})
            </option>
          ))}
        </select>
        <select name="source" className={selectClass + ' sm:w-44'}>
          <option value="">Todas las fuentes</option>
          {leadSourceValues.map((value) => (
            <option key={value} value={value}>
              {leadSourceLabels[value]}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
        <Button type="button" variant="outline" onClick={exportCsv}>
          <ArrowDownToLine className="size-4" aria-hidden="true" />
          Exportar CSV
        </Button>
      </form>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contacto</TableHead>
              <TableHead>Propiedad</TableHead>
              <TableHead>Fuente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Recibido</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell>
                  <p className="font-medium">{lead.name}</p>
                  <p className="text-sm text-muted-foreground">{lead.email}</p>
                  {lead.phone ? (
                    <p className="text-sm text-muted-foreground">{lead.phone}</p>
                  ) : null}
                </TableCell>
                <TableCell>
                  {lead.propertyTitle ? (
                    <span className="text-sm">{lead.propertyTitle}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">General</span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={lead.source} />
                </TableCell>
                <TableCell>
                  <form action={formAction}>
                    <input type="hidden" name="leadId" value={lead.id} />
                    <select
                      name="status"
                      defaultValue={lead.status}
                      className={selectClass + ' w-40'}
                      disabled={isPending}
                      onChange={(e) => e.target.form?.requestSubmit()}
                    >
                      {leadStatusValues.map((value) => (
                        <option key={value} value={value}>
                          {leadStatusLabels[value]}
                        </option>
                      ))}
                    </select>
                  </form>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {formatRelativeTime(lead.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Ver detalle de ${lead.name}`}
                    render={<Link href={`/admin/leads/${lead.id}`} />}
                  >
                    <Eye aria-hidden="true" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
