/**
 * Computed on-sale percentage for the red "N%" sale pill (prototype's
 * `.p-badge`). Mirrors the ProductCard/QuickView pill: round((1 - price/original) * 100).
 * Returns null — so NO pill renders — unless the product has a strictly-higher
 * original (compare-at) price yielding a positive whole-number discount, so a
 * €0 / equal / malformed original never produces a bogus "0%"/"NaN%"/"-5%".
 * Inputs are the formatted major-unit strings already on the Product
 * (price / originalPrice), matching what the components pass.
 */
export function computeSalePercent(
  current: string | null | undefined,
  original: string | null | undefined
): number | null {
  if (!original || current == null) return null;
  const o = parseFloat(original);
  const c = parseFloat(current);
  if (!(o > 0) || !(c >= 0) || c >= o) return null;
  const pct = Math.round((1 - c / o) * 100);
  return pct > 0 ? pct : null;
}
