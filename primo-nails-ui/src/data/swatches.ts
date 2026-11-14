export interface NailSwatch {
  /**
   * Stable internal identifier used as a colour filter token (URL
   * `?color=<name>`, `selectedColors` state, `productMatchesSwatch`
   * lookups). Lowercase IT-style label — historically also the
   * display string, hence the un-slug-like values like `"b & w"`. For
   * user-visible text use `i18nKey` instead.
   */
  name: string;
  /**
   * URL-safe stable identifier used in /shop?color=<slug>. Must round-trip
   * cleanly through query-string encoding (no '&', '=', or spaces) — kept
   * separate from `name` because labels like "b & w" don't slugify safely
   * with a naive replace.
   */
  slug: string;
  /** Translation key for the user-visible label (`swatch.<slug>`). */
  i18nKey: string;
  /** CSS background — solid colour, gradient, or solid + glitter overlay. */
  color: string;
  isGlitter?: boolean;
  /**
   * Product colour values (matching metadata.color.it — uppercase Italian)
   * that count as belonging to this palette swatch when filtering. Empty
   * array means "no products map here yet" (e.g. the imported catalog has
   * no entries with this colour).
   */
  productColors: string[];
  /**
   * If set, the swatch matches products whose metadata.effect equals this
   * value, in addition to (or instead of) productColors. Used for the
   * "glitter" pill where the relevant attribute is effect, not colour.
   */
  productEffect?: string;
  /**
   * Public path to the painted nail-tip "mood" photo for this swatch
   * (`/moods/mood-<name>.webp`), used by the search overlay's "Cerca per
   * colore" grid instead of a flat CSS circle. Mapped 1:1 from the client
   * prototype's `MOOD_TO_COLOR` crosswalk. When absent, consumers fall back
   * to the `color` CSS swatch.
   */
  moodPhoto?: string;
}

// productColors are IT uppercase values from metadata.color.it. The catalog
// is IT-primary; matching by IT keeps palette labels (rosa, rosso, ...)
// trivially aligned with the values stored on products.
// `moodPhoto` paths come from the client prototype's `MOOD_TO_COLOR`
// crosswalk (mood filename → our swatch slug): bordeaux→bordo, lampone→marsala,
// fucsia→magenta, lilla→viola, cioccolato→marrone; the rest match by slug.
// The combined `y-o` (orange+yellow) swatch intentionally has NO mood photo:
// the prototype's lone `giallo` photo is yellow-only and would misrepresent the
// split swatch, so y-o falls back to its CSS split-gradient everywhere. Assets
// live in `public/moods/`.
export const NAIL_SWATCHES: NailSwatch[] = [
  { name: 'b & w',   slug: 'bw',      i18nKey: 'swatch.bw',      color: 'linear-gradient(90deg, #050505 50%, #F4F4F4 50%)', productColors: ['NERO', 'BIANCO'], moodPhoto: '/moods/mood-bw.webp' },
  { name: 'grigio',  slug: 'grigio',  i18nKey: 'swatch.grigio',  color: '#8A8D91', productColors: ['GRIGIO'], moodPhoto: '/moods/mood-grigio.webp' },
  { name: 'nude',    slug: 'nude',    i18nKey: 'swatch.nude',    color: '#E3C2B0', productColors: ['NUDE'], moodPhoto: '/moods/mood-nude.webp' },
  { name: 'rosa',    slug: 'rosa',    i18nKey: 'swatch.rosa',    color: '#F49AC1', productColors: ['ROSA'], moodPhoto: '/moods/mood-rosa.webp' },
  { name: 'rosso',   slug: 'rosso',   i18nKey: 'swatch.rosso',   color: '#D91A2A', productColors: ['ROSSO'], moodPhoto: '/moods/mood-rosso.webp' },
  { name: 'bordo',   slug: 'bordo',   i18nKey: 'swatch.bordo',   color: '#6B0F1A', productColors: ['BORDEAUX'], moodPhoto: '/moods/mood-bordeaux.webp' },
  { name: 'marsala', slug: 'marsala', i18nKey: 'swatch.marsala', color: '#B52857', productColors: ['MARSALA'], moodPhoto: '/moods/mood-lampone.webp' },
  { name: 'magenta', slug: 'magenta', i18nKey: 'swatch.magenta', color: '#E0007B', productColors: ['MAGENTA'], moodPhoto: '/moods/mood-fucsia.webp' },
  { name: 'viola',   slug: 'viola',   i18nKey: 'swatch.viola',   color: '#9B6BCE', productColors: ['VIOLA'], moodPhoto: '/moods/mood-lilla.webp' },
  { name: 'marrone', slug: 'marrone', i18nKey: 'swatch.marrone', color: '#4A2518', productColors: ['MARRONE'], moodPhoto: '/moods/mood-cioccolato.webp' },
  // Effect-based pill — the CSV doesn't translate effects; SHIMMER /
  // HOLOGRAPHIC / MATTE / GLITTER stay in English. Match by effect, not colour.
  { name: 'glitter', slug: 'glitter', i18nKey: 'swatch.glitter', color: '#C89B90', isGlitter: true, productColors: [], productEffect: 'GLITTER', moodPhoto: '/moods/mood-glitter-anim.webp' },
  { name: 'blu',     slug: 'blu',     i18nKey: 'swatch.blu',     color: '#2B429F', productColors: ['BLU'], moodPhoto: '/moods/mood-blu.webp' },
  { name: 'verde',   slug: 'verde',   i18nKey: 'swatch.verde',   color: '#559E38', productColors: ['VERDE'], moodPhoto: '/moods/mood-verde.webp' },
  // 'y + o' (yellow→orange) split swatch — matches the ref's palette label.
  // Filters by catalog values GIALLO and ARANCIONE (when present).
  { name: 'y + o',   slug: 'y-o',     i18nKey: 'swatch.orange',  color: 'linear-gradient(90deg, #FFDB00 50%, #FF8C00 50%)', productColors: ['GIALLO', 'ARANCIONE'] },
];

/**
 * True when a product's colour (or effect, for 'glitter') belongs to the
 * palette swatch named `swatchName`. Compound CSV values like
 * "GREEN, BLUE, BROWN" (used on multi-shade Kits) are tokenised so any
 * constituent colour matches.
 */
export function productMatchesSwatch(
  product: { colorName?: string; effect?: string },
  swatchName: string
): boolean {
  const swatch = NAIL_SWATCHES.find((s) => s.name === swatchName);
  if (!swatch) return false;
  if (swatch.productEffect && product.effect?.toUpperCase() === swatch.productEffect) {
    return true;
  }
  if (!product.colorName) return false;
  const tokens = product.colorName
    .split(/[,\s]+/)
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
  return swatch.productColors.some((c) => tokens.includes(c));
}
