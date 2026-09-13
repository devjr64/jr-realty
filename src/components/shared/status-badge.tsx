import { Badge } from '@/components/ui/badge'

export interface StatusBadgeConfig {
  label: string
  className: string
}

/**
 * Default color/label map for the enums used across admin CRUD:
 * property statuses (AVAILABLE…) and lead statuses (NEW, CONTACTED…).
 */
const DEFAULT_STATUSES: Record<string, StatusBadgeConfig> = {
  AVAILABLE: {
    label: 'Disponible',
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  SOLD: {
    label: 'Vendido',
    className: 'bg-slate-500/10 text-slate-700 dark:text-slate-400',
  },
  RENTED: {
    label: 'Alquilado',
    className: 'bg-slate-500/10 text-slate-700 dark:text-slate-400',
  },
  RESERVED: {
    label: 'Reservado',
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  },
  INACTIVE: {
    label: 'Inactivo',
    className: 'bg-muted text-muted-foreground',
  },
  NEW: {
    label: 'Nuevo',
    className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  },
  CONTACTED: {
    label: 'Contactado',
    className: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
  },
  FOLLOWING_UP: {
    label: 'En seguimiento',
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  },
  VISIT_SCHEDULED: {
    label: 'Visita agendada',
    className: 'bg-violet-500/10 text-violet-700 dark:text-violet-400',
  },
  NEGOTIATING: {
    label: 'Negociación',
    className: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  },
  CLOSED_WON: {
    label: 'Cerrado',
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  CLOSED_LOST: {
    label: 'Perdido',
    className: 'bg-destructive/10 text-destructive dark:bg-destructive/20',
  },
}

interface StatusBadgeProps {
  /** Enum value, e.g. `PropertyStatus` or `LeadStatus`. */
  status: string
  /** Optional per-status overrides (label/colors) on top of the defaults. */
  variantMap?: Record<string, StatusBadgeConfig>
}

/**
 * Colored status pill for admin tables. Unknown statuses fall back to a plain
 * secondary badge with the raw value, so tables never break on new enums.
 */
export function StatusBadge({ status, variantMap }: StatusBadgeProps) {
  const config = variantMap?.[status] ?? DEFAULT_STATUSES[status]

  if (!config) return <Badge variant="secondary">{status}</Badge>

  return <Badge className={config.className}>{config.label}</Badge>
}
