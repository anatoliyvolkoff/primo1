/**
 * Single source of truth for price display. Used everywhere a €
 * amount surfaces in the UI — product cards, cart, checkout,
 * confirmation, receipts — so we stop drifting between `17.00 EUR`,
 * `17,00 €`, `€17`, etc.
 *
 * Primo1 style: the € sign always leads with no space — `€17,00` in
 * Italian, `€17.00` in English. Uses Intl so the decimal separator and
 * grouping match the chosen locale.
 */

import type { Language } from '../i18n';

export type PriceInput = number | string | null | undefined;

/**
 * The VAT already contained in a gross (tax-inclusive) amount, at a given rate.
 * e.g. vatPortion(34, 22) → 6.13 (the 22% IVA inside €34; net is €27.87).
 *
 * The rate is NOT hard-coded: it comes from the admin-managed `vat_rate_percent`
 * store setting (read via `useVatRatePct`), so VAT can be turned on from the
 * Admin UI with no rebuild. DEFAULT is 0 (VAT-exempt — the client's current
 * regime forfettario), and any non-positive rate returns 0, so callers gate on
 * `vatPortion(...) > 0` to hide the "IVA inclusa" line entirely.
 */
export function vatPortion(gross: PriceInput, ratePct: number = 0): number {
  const amount = toNumber(gross);
  if (amount === null || amount <= 0 || ratePct <= 0) return 0;
  const net = amount / (1 + ratePct / 100);
  return Math.round((amount - net) * 100) / 100;
}

/**
 * Format any "price-like" value as a € amount.
 *
 * - Numbers are treated as **euros** (not cents). Pass `12.9` for "€12,90".
 * - Strings are parsed as floats (handles both "12.90" and "12,90").
 * - null / undefined / NaN renders as the empty string.
 */
export function formatPrice(input: PriceInput, language: Language = 'it'): string {
  const amount = toNumber(input);
  if (amount === null) return '';
  const locale = language === 'en' ? 'en-IE' : 'it-IT';
  try {
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));
    return `${amount < 0 ? '-' : ''}€${normalizeCurrencySpace(formatted)}`;
  } catch {
    const fixed = amount.toFixed(2);
    return language === 'en' ? `€${fixed}` : `€${fixed.replace('.', ',')}`;
  }
}

/**
 * PRESENTATION-ONLY space normalization (no money math changes).
 *
 * Intl.NumberFormat separates the amount from the `€` with a regular
 * NO-BREAK SPACE (U+00A0). Our brand font (Gotham) has no glyph for U+00A0
 * and falls back to a huge `.notdef` box (~400–650px), which stretched the
 * price row and shoved the `€` to the far edge. Gotham DOES have the NARROW
 * NO-BREAK SPACE (U+202F), which renders compactly (~4px) and is still
 * non-breaking, so the amount and `€` stay together on one line.
 *
 * This only swaps the separator CHARACTER for display; the number, decimals,
 * currency, locale ordering, and grouping are untouched.
 */
function normalizeCurrencySpace(formatted: string): string {
  return formatted.replace(/\u00A0/g, '\u202F');
}

/**
 * Same as formatPrice but takes integer minor units (cents).
 *
 * NOTE: Medusa v2 stores cart/order amounts as DECIMAL MAJOR UNITS,
 * so the storefront shouldn't need this helper anymore. Kept around
 * for any caller that genuinely receives cents (e.g. raw minor-unit
 * values from a payment provider response).
 */
export function formatPriceCents(cents: PriceInput, language: Language = 'it'): string {
  const c = toNumber(cents);
  if (c === null) return '';
  return formatPrice(c / 100, language);
}

function toNumber(input: PriceInput): number | null {
  if (input == null) return null;
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;
  const parsed = parseFloat(String(input).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}
