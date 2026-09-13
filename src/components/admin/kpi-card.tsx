import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export interface KpiTrend {
  /** Human-readable delta, e.g. "+12 %" or "3 esta semana". */
  value: string
  /** Whether the delta is positive (up) or negative (down). */
  positive: boolean
}

export interface KpiCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
  trend?: KpiTrend
}

/**
 * Single dashboard KPI: gold-tinted icon square, large Playfair value,
 * muted label and an optional trend pill with a directional arrow.
 *
 * Server-rendered, no interactivity. Layout is handled by the parent grid.
 */
export function KpiCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
}: KpiCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-5" aria-hidden="true" />
          </div>

          {trend ? (
            <Badge
              className={cn(
                trend.positive
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'bg-destructive/10 text-destructive dark:bg-destructive/20',
              )}
            >
              {trend.positive ? (
                <ArrowUpRight aria-hidden="true" />
              ) : (
                <ArrowDownRight aria-hidden="true" />
              )}
              {trend.value}
            </Badge>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <p className="font-heading text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
            {value}
          </p>
          <p className="text-sm font-medium text-foreground">{title}</p>
          {description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

/** Loading placeholder that mirrors the KPI card layout. */
export function KpiCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <Skeleton className="size-10 rounded-lg" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-4 w-36" />
        </div>
      </CardContent>
    </Card>
  )
}
