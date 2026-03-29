/**
 * Convert a string to a URL/filename-safe slug.
 * Lowercase, spaces to hyphens, strip special characters.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'untitled'
}

/**
 * Generate unique slugs from a list of names.
 * Appends -2, -3, etc. for duplicates.
 */
export function uniqueSlugs(names: string[]): string[] {
  const counts = new Map<string, number>()
  return names.map((name) => {
    const base = slugify(name)
    const count = counts.get(base) ?? 0
    counts.set(base, count + 1)
    return count === 0 ? base : `${base}-${count + 1}`
  })
}

/**
 * Zero-pad a session number for file ordering.
 */
export function padSessionNumber(n: number | null): string {
  return String(n ?? 0).padStart(2, '0')
}
