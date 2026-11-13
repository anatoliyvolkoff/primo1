/**
 * Resolve a translatable field for custom-module entities (courses,
 * testimonials) that follow the products convention: Italian lives in the
 * base column, English in `metadata.translations.<field>.en`. Returns the
 * EN override when the locale is English and a non-empty value exists,
 * otherwise the Italian base.
 */
export function resolveTranslation(
  metadata: any,
  field: string,
  base: string,
  locale: string
): string {
  if (locale !== 'it') {
    const en = metadata?.translations?.[field]?.en;
    if (typeof en === 'string' && en.trim()) return en;
  }
  return base;
}
