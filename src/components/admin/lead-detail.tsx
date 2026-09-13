'use client'

import { useActionState } from 'react'
import { Mail, MessageCircle, Phone, Plus } from 'lucide-react'
import Link from 'next/link'

import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  addLeadNoteAction,
  assignLeadAgentAction,
  updateLeadStatusAction,
} from '@/server/actions/lead.actions'
import {
  leadSourceLabels,
  leadStatusLabels,
  leadStatusValues,
} from '@/lib/validations/lead.schema'
import { formatRelativeTime } from '@/lib/utils/format'

interface LeadDetailData {
  id: string
  name: string
  email: string
  phone: string | null
  message: string | null
  source: string
  status: string
  propertyTitle: string | null
  propertySlug: string | null
  assignedAgentId: string | null
  assignedAgentName: string | null
}

interface LeadDetailProps {
  lead: LeadDetailData
  notes: { text: string; createdAt: string }[]
  agents: { id: string; name: string }[]
}

const selectClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

export function LeadDetail({ lead, notes, agents }: LeadDetailProps) {
  const [statusState, statusAction, statusPending] = useActionState(
    updateLeadStatusAction,
    {},
  )
  const [noteState, noteAction, notePending] = useActionState(addLeadNoteAction, {})
  const [, assignAction] = useActionState(assignLeadAgentAction, {})

  const sortedNotes = [...notes].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )

  return (
    <div className="space-y-6">
      {/* Información de contacto */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Información de contacto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={lead.status} />
            <StatusBadge status={lead.source} />
            {lead.propertyTitle ? (
              <Link
                href={`/propiedades/${lead.propertySlug}`}
                className="text-sm text-primary underline-offset-4 hover:underline"
              >
                {lead.propertyTitle}
              </Link>
            ) : null}
            {lead.assignedAgentName ? (
              <span className="text-sm text-muted-foreground">
                Asignado a: {lead.assignedAgentName}
              </span>
            ) : null}
          </div>

          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p className="inline-flex items-center gap-2">
              <Mail className="size-4 text-primary" aria-hidden="true" />
              {lead.email}
            </p>
            {lead.phone ? (
              <p className="inline-flex items-center gap-2">
                <Phone className="size-4 text-primary" aria-hidden="true" />
                {lead.phone}
              </p>
            ) : null}
            <a
              href={`https://wa.me/${lead.phone ?? ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              Enviar WhatsApp
            </a>
          </div>

          {lead.message ? (
            <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
              {lead.message}
            </p>
          ) : null}

          <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="lead-status">Estado</Label>
              <form action={statusAction} className="mt-1.5 flex gap-2">
                <input type="hidden" name="leadId" value={lead.id} />
                <select
                  id="lead-status"
                  name="status"
                  defaultValue={lead.status}
                  className={selectClass}
                  disabled={statusPending}
                  onChange={(e) => e.target.form?.requestSubmit()}
                >
                  {leadStatusValues.map((value) => (
                    <option key={value} value={value}>
                      {leadStatusLabels[value]}
                    </option>
                  ))}
                </select>
              </form>
            </div>

            <div>
              <Label htmlFor="lead-agent">Asignar agente</Label>
              <form action={assignAction} className="mt-1.5 flex gap-2">
                <input type="hidden" name="leadId" value={lead.id} />
                <select
                  id="lead-agent"
                  name="agentId"
                  defaultValue={lead.assignedAgentId ?? ''}
                  className={selectClass}
                  onChange={(e) => e.target.form?.requestSubmit()}
                >
                  <option value="">Sin asignar</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </form>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notas */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Notas de seguimiento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={noteAction} className="space-y-2">
            <input type="hidden" name="leadId" value={lead.id} />
            <Textarea
              name="text"
              rows={3}
              placeholder="Agrega una nota sobre el seguimiento…"
              disabled={notePending}
              required
            />
            <Button type="submit" disabled={notePending}>
              <Plus className="size-4" aria-hidden="true" />
              Agregar nota
            </Button>
          </form>

          {sortedNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay notas para este lead.
            </p>
          ) : (
            <ol className="space-y-3">
              {sortedNotes.map((note, index) => (
                <li
                  key={`${note.createdAt}-${index}`}
                  className="rounded-lg border border-border p-3"
                >
                  <p className="text-sm">{note.text}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatRelativeTime(note.createdAt)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
