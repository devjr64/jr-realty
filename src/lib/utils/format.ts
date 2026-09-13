/**
 * Locale-aware formatters for the JR Realty admin (es-VE).
 *
 * Prisma stores money/area as `Decimal` (decimal.js). To keep these shared
 * helpers decoupled from the Prisma runtime we duck-type it as `DecimalLike`
 * (anything exposing `toNumber()`), alongside plain numbers and strings.
 */

/** Any value coercible to a number — includes Prisma's `Decimal`. */
export type DecimalLike = { toNumber(): number }

export type NumericValue = number | string | DecimalLike

export type CurrencyCode = 'USD' | 'VES'

function toNumber(value: NumericValue): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value)
  return value.toNumber()
}

/** "$1,500,000" or "Bs. 1,200" — thousands separators, no decimals. Blank on NaN. */
export function formatCurrency(
  amount: NumericValue,
  currency: CurrencyCode = 'USD',
): string {
  const value = toNumber(amount)
  if (Number.isNaN(value)) return ''

  if (currency === 'VES') {
    return `Bs. ${value.toLocaleString('es-VE', { maximumFractionDigits: 0 })}`
  }
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

/** "185 m²" — blank for null/undefined/empty/invalid input. */
export function formatArea(m2?: number | string | DecimalLike | null): string {
  if (m2 === null || m2 === undefined || m2 === '') return ''
  const value = toNumber(m2)
  if (Number.isNaN(value)) return ''
  return `${value.toLocaleString('es-VE', { maximumFractionDigits: 0 })} m²`
}

/** "12 mar 2026" (es-VE) — blank for null or invalid input. */
export function formatDate(date: Date | string | null): string {
  if (!date) return ''
  const value = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(value.getTime())) return ''
  return value.toLocaleDateString('es-VE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** "hace 5 min", "hace 2 h", "hace 3 días" — older dates collapse to a short date. */
export function formatRelativeTime(date: Date | string): string {
  const value = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(value.getTime())) return ''
  const diffMinutes = Math.floor((Date.now() - value.getTime()) / 60_000)

  if (diffMinutes < 1) return 'hace un momento'
  if (diffMinutes < 60) return `hace ${diffMinutes} min`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `hace ${diffHours} h`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `hace ${diffDays} día${diffDays === 1 ? '' : 's'}`

  return value.toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })
}
