/**
 * URL-safe kebab-case slug generation for property/project/zone slugs.
 *
 * Spanish-safe: `normalize('NFD')` decomposes accented characters (á → a,
 * ñ → n + combining tilde) so removing combining marks handles all diacritics
 * in a single pass. Pure and deterministic — same input, same output.
 */

/** Slugify: lowercase, strip diacritics, spaces/underscores → `-`, drop invalid chars. */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Slugify guaranteeing the result is unique against `existing` slugs
 * (appends `-2`, `-3`, … as needed). Used when creating property, project
 * or zone slugs so a repeated name never collides with the `@unique` column.
 */
export function slugifyUnique(input: string, existing: string[]): string {
  const base = slugify(input)
  if (!base) return ''
  const taken = new Set(existing)
  if (!taken.has(base)) return base

  let suffix = 2
  while (taken.has(`${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`
}
