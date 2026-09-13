/**
 * Rate limiter en memoria (ventana deslizante por clave).
 *
 * MVP: funciona por instancia de proceso. En despliegues multi-instancia
 * (Vercel serverless, múltiples réplicas Docker) cada instancia mantiene su
 * propio contador, por lo que el límite efectivo es `max × nº instancias`.
 * Para un límite estricto en producción usar Upstash/Redis
 * (ver .env.example, fase 2).
 */

const DEFAULT_MAX_REQUESTS = 10
const DEFAULT_WINDOW_MS = 60_000

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

/** Evita que el mapa crezca indefinidamente con claves abandonadas. */
function pruneExpired(now: number): void {
  if (buckets.size < 10_000) return
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

/**
 * True cuando la clave está dentro del límite (y consume una petición).
 * False cuando se superó el límite en la ventana actual.
 */
export function rateLimit(
  key: string,
  max = DEFAULT_MAX_REQUESTS,
  windowMs = DEFAULT_WINDOW_MS,
): boolean {
  const now = Date.now()
  pruneExpired(now)

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (bucket.count >= max) return false
  bucket.count += 1
  return true
}

/** Resetea el limiter (útil en tests). */
export function resetRateLimiter(): void {
  buckets.clear()
}
