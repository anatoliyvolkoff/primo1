import { describe, it, expect } from 'vitest';
import { vatPortion, formatPrice, formatPriceCents } from './formatPrice';

// Intl emits locale-defined separators; assert on structure (digits, decimal
// comma, € glyph) and on the absence of a raw NBSP. Use explicit
// escapes so the exact code point under test is unambiguous in source.
const NBSP = ' '; // regular no-break space Intl inserts before €

describe('vatPortion — rate comes from the admin vat_rate_percent setting', () => {
  it('extracts the VAT contained in a gross amount at a positive rate', () => {
    expect(vatPortion(10, 22)).toBeCloseTo(1.8, 2);
    expect(vatPortion(122, 22)).toBeCloseTo(22, 2);
  });

  it('is 0 when the store is VAT-exempt (rate 0, regime forfettario)', () => {
    // The whole point of the exempt config: no VAT is broken out, so callers
    // (Checkout / CartSidebar) hide the "IVA inclusa" line.
    expect(vatPortion(10, 0)).toBe(0);
    expect(vatPortion(999, 0)).toBe(0);
  });

  it('defaults to VAT-exempt (0) when no rate is passed', () => {
    // Default arg is 0 so a caller that forgets the rate never invents VAT.
    expect(vatPortion(122)).toBe(0);
  });

  it('is 0 for non-positive / invalid inputs', () => {
    expect(vatPortion(0, 22)).toBe(0);
    expect(vatPortion(-5, 22)).toBe(0);
    expect(vatPortion(null, 22)).toBe(0);
    expect(vatPortion(undefined, 22)).toBe(0);
  });

  // ── Additional edge cases ──────────────────────────────────────────────────
  it('is 0 for a negative (invalid) rate', () => {
    expect(vatPortion(122, -22)).toBe(0);
  });

  it('rounds the extracted VAT to the cent', () => {
    // 34 gross @ 22% → net 27.8688…, VAT 6.1311… → rounds to 6.13.
    expect(vatPortion(34, 22)).toBe(6.13);
  });

  it('parses string gross inputs (dot and comma decimals)', () => {
    expect(vatPortion('122', 22)).toBeCloseTo(22, 2);
    expect(vatPortion('122,00', 22)).toBeCloseTo(22, 2);
  });

  it('handles a tiny gross without underflowing to a wrong sign', () => {
    // 1 cent gross @ 22% → VAT ~0.0018 → rounds to 0.00.
    expect(vatPortion(0.01, 22)).toBe(0);
  });

  it('scales to large gross amounts', () => {
    // 1,000,000 @ 22% → VAT = 1_000_000 * 0.22/1.22 = 180327.868… → 180327.87.
    expect(vatPortion(1_000_000, 22)).toBeCloseTo(180327.87, 2);
  });
});

describe('formatPrice — EUR display, € always leading (primo1 style)', () => {
  it('formats a plain euro number as Italian "€99,00"', () => {
    expect(formatPrice(99)).toBe('€99,00');
  });

  it('keeps two fraction digits for whole and fractional euros', () => {
    expect(formatPrice(12.9)).toBe('€12,90');
    expect(formatPrice(0)).toBe('€0,00');
  });

  it('never leaks a raw NBSP (U+00A0) and leads with € (no space)', () => {
    const out = formatPrice(1234.5);
    expect(out).not.toContain(NBSP);
    expect(out.startsWith('€')).toBe(true);
  });

  it('flips order to "€99.00" in English mode', () => {
    const out = formatPrice(99, 'en');
    expect(out).toContain('€');
    expect(out).toContain('99.00');
    expect(out.indexOf('€')).toBeLessThan(out.indexOf('99'));
  });

  it('parses string inputs, accepting both dot and comma decimals', () => {
    expect(formatPrice('12.90')).toBe('€12,90');
    expect(formatPrice('12,90')).toBe('€12,90');
  });

  it('renders the empty string for null / undefined / NaN / non-numeric', () => {
    expect(formatPrice(null)).toBe('');
    expect(formatPrice(undefined)).toBe('');
    expect(formatPrice(NaN)).toBe('');
    expect(formatPrice('not-a-price')).toBe('');
    expect(formatPrice(Infinity)).toBe('');
    expect(formatPrice(-Infinity)).toBe('');
  });

  it('rounds to 2 fraction digits (no third decimal leaks through)', () => {
    expect(formatPrice(1.004)).toBe('€1,00');
  });

  it('formats a negative amount with a leading minus (display-only, no guard)', () => {
    // formatPrice is display-only; the negative guard lives in the money
    // helpers. A negative still renders rather than blanking.
    const out = formatPrice(-5);
    expect(out).toBe('-€5,00');
  });

  it('formats large amounts with grouping and the leading €', () => {
    const out = formatPrice(1234567.89);
    expect(out).toContain('89'); // fraction preserved
    expect(out.startsWith('€')).toBe(true);
    expect(out).not.toContain(NBSP);
  });
});

describe('formatPriceCents — integer minor units', () => {
  it('divides cents by 100 before formatting', () => {
    expect(formatPriceCents(9900)).toBe('€99,00');
    expect(formatPriceCents(1)).toBe('€0,01');
    expect(formatPriceCents(0)).toBe('€0,00');
  });

  it('accepts string cents, and formats in English mode', () => {
    expect(formatPriceCents('1290')).toBe('€12,90');
    expect(formatPriceCents(9900, 'en')).toContain('€99.00');
  });

  it('returns the empty string for null / undefined / non-numeric cents', () => {
    expect(formatPriceCents(null)).toBe('');
    expect(formatPriceCents(undefined)).toBe('');
    expect(formatPriceCents('abc')).toBe('');
  });
});
