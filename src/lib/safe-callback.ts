/**
 * W7: saneamiento del callbackUrl para evitar open redirects.
 * Solo se aceptan rutas internas que empiezan con "/" y NO son
 * protocol-relative ("//"), ni contienen ":" (para descartar esquemas).
 * Rechaza también variantes codificadas y backslashes que podrían
 * usarse para eludir el filtro. Lista blanca: /admin/* y / .
 */
export function safeCallbackUrl(value: string): string | null {
  if (!value) return null
  if (!value.startsWith('/')) return null
  if (value.startsWith('//')) return null
  if (value.includes(':')) return null
  if (value.includes('\\')) return null
  const lower = value.toLowerCase()
  if (lower.includes('%3a') || lower.includes('%2f%2f')) return null
  return value
}
