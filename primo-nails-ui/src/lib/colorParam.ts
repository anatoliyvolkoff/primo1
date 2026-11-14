import { NAIL_SWATCHES } from '../data/swatches';

/**
 * `?color=` ↔ swatch names. The param is a comma list of swatch slugs
 * (`?color=magenta,rosa`) so a multi-colour filter survives refresh / share /
 * back. A single slug (the old `?color=<slug>` links from Home) still parses.
 */
export function parseColorParam(raw: string | null): string[] {
  if (!raw) return [];
  const names: string[] = [];
  for (const part of raw.split(',')) {
    const slug = part.trim().toLowerCase();
    const swatch = NAIL_SWATCHES.find((s) => s.slug === slug);
    if (swatch && !names.includes(swatch.name)) names.push(swatch.name);
  }
  return names;
}

export function serializeColorParam(names: string[]): string | null {
  const slugs: string[] = [];
  for (const name of names) {
    const swatch = NAIL_SWATCHES.find((s) => s.name === name);
    if (swatch) slugs.push(swatch.slug);
  }
  return slugs.length ? slugs.join(',') : null;
}
