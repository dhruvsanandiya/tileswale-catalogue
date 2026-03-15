/**
 * Convert a display name to a URL slug: lowercase, spaces to hyphens.
 * Used for building and matching path segments (company, type, size, category).
 */
export function nameToSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
