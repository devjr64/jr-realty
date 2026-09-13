import { describe, expect, it } from 'vitest'

import { formatArea, formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils/format'

describe('formatCurrency', () => {
  it('formats USD with thousands separators (es-VE usa el código de moneda)', () => {
    expect(formatCurrency(1500000)).toMatch(/^USD\s1\.500\.000$/)
  })

  it('formats VES with the Bs. prefix', () => {
    expect(formatCurrency(1200, 'VES')).toBe('Bs. 1.200')
  })

  it('accepts strings and Decimal-like objects', () => {
    expect(formatCurrency('480000')).toMatch(/^USD\s480\.000$/)
    expect(formatCurrency({ toNumber: () => 635000 })).toMatch(/^USD\s635\.000$/)
  })

  it('returns blank for NaN', () => {
    expect(formatCurrency('abc')).toBe('')
  })
})

describe('formatArea', () => {
  it('formats square meters', () => {
    expect(formatArea(185)).toBe('185 m²')
  })

  it('returns blank for null/undefined/empty/invalid', () => {
    expect(formatArea(null)).toBe('')
    expect(formatArea(undefined)).toBe('')
    expect(formatArea('')).toBe('')
    expect(formatArea('abc')).toBe('')
  })
})

describe('formatDate', () => {
  it('formats a date in es-VE', () => {
    const date = new Date(2026, 2, 12) // 12 mar 2026
    expect(formatDate(date)).toMatch(/12 mar/)
  })

  it('accepts ISO strings (sin depender de la zona horaria)', () => {
    const iso = new Date(2026, 2, 12).toISOString()
    expect(formatDate(iso)).toMatch(/12 mar/)
  })

  it('returns blank for null or invalid', () => {
    expect(formatDate(null)).toBe('')
    expect(formatDate('not-a-date')).toBe('')
  })
})

describe('formatRelativeTime', () => {
  it('handles recent timestamps', () => {
    expect(formatRelativeTime(new Date())).toBe('hace un momento')
    expect(formatRelativeTime(new Date(Date.now() - 5 * 60_000))).toBe('hace 5 min')
    expect(formatRelativeTime(new Date(Date.now() - 2 * 3_600_000))).toBe('hace 2 h')
    expect(formatRelativeTime(new Date(Date.now() - 3 * 86_400_000))).toBe('hace 3 días')
  })

  it('collapses old dates to a short date', () => {
    const old = new Date(Date.now() - 30 * 86_400_000)
    expect(formatRelativeTime(old)).toMatch(
      /^\d{1,2} (ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\.?$/,
    )
  })
})