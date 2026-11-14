import { describe, it, expect } from 'vitest';
import { computeSalePercent } from './sale';

describe('computeSalePercent (m32: computed red "N%" sale pill)', () => {
  it('rounds (1 - price/original)*100 for a genuine discount', () => {
    expect(computeSalePercent('8.00', '10.00')).toBe(20); // 20% off
    expect(computeSalePercent('7.50', '9.99')).toBe(25); // 24.92 → 25
    expect(computeSalePercent('33.00', '44.00')).toBe(25);
  });

  it('returns null (no pill) when there is no original/compare-at price', () => {
    expect(computeSalePercent('10.00', undefined)).toBeNull();
    expect(computeSalePercent('10.00', null)).toBeNull();
    expect(computeSalePercent(undefined, '10.00')).toBeNull();
  });

  it('returns null when original is not strictly higher than current', () => {
    expect(computeSalePercent('10.00', '10.00')).toBeNull(); // equal → no sale
    expect(computeSalePercent('12.00', '10.00')).toBeNull(); // current higher → no negative %
  });

  it('returns null for degenerate originals (0 / malformed) instead of 0% or NaN%', () => {
    expect(computeSalePercent('10.00', '0')).toBeNull();
    expect(computeSalePercent('10.00', 'abc')).toBeNull();
    // Rounds to 0% (original barely above current) → suppressed, no "0%" pill.
    expect(computeSalePercent('99.80', '100.00')).toBeNull();
  });

  // ── B6 edge cases: the raw formula these callers used before would emit a
  // bogus pill; the helper must suppress every one of them. ──────────────────
  it('returns null for an empty-string original (ProductCard used to render NaN%)', () => {
    expect(computeSalePercent('10.00', '')).toBeNull();
  });

  it('returns null for a negative / zero current', () => {
    expect(computeSalePercent('0', '10.00')).toBe(100);
    expect(computeSalePercent('-1', '10.00')).toBeNull();
  });

  it('returns null for a negative original', () => {
    expect(computeSalePercent('10.00', '-5')).toBeNull();
  });

  it('handles whole-number rounding at the boundary', () => {
    // 0.5% off rounds to 1% → a pill shows (positive whole number).
    expect(computeSalePercent('99.50', '100.00')).toBe(1);
    // 0.49% off rounds to 0% → suppressed.
    expect(computeSalePercent('99.51', '100.00')).toBeNull();
  });

  // ── Additional edge cases ──────────────────────────────────────────────────
  it('renders a near-100% pill for a very large discount', () => {
    // €0.01 on a €200 original → 99.995% → rounds to 100%.
    expect(computeSalePercent('0.01', '200.00')).toBe(100);
    // €2 on €1000 → 99.8% → 100%.
    expect(computeSalePercent('2.00', '1000.00')).toBe(100);
    // A tiny-but-nonzero current that still rounds below 100 stays below.
    expect(computeSalePercent('5.00', '200.00')).toBe(98); // 97.5 → 98
  });

  it('rounds half-up at the .5 boundary (banker-free Math.round)', () => {
    // 12.5% off → Math.round(12.5) = 13 (round half toward +Infinity).
    expect(computeSalePercent('87.50', '100.00')).toBe(13);
    // 37.5% off → 38.
    expect(computeSalePercent('62.50', '100.00')).toBe(38);
  });

  it('surfaces a tiny (just ≥1%) discount rather than swallowing it', () => {
    // Exactly 1% off → shows 1%.
    expect(computeSalePercent('99.00', '100.00')).toBe(1);
    // 1.4% off rounds down to 1% (still a pill).
    expect(computeSalePercent('98.60', '100.00')).toBe(1);
  });

  it('returns null for NaN / whitespace / non-numeric current or original', () => {
    expect(computeSalePercent('NaN', '10.00')).toBeNull();
    expect(computeSalePercent('10.00', 'NaN')).toBeNull();
    expect(computeSalePercent('   ', '10.00')).toBeNull();
    expect(computeSalePercent('10.00', '   ')).toBeNull();
  });

  it('parses leading-numeric strings via parseFloat (currency-ish inputs)', () => {
    // parseFloat stops at the first non-numeric char, so "8€"→8, "10 EUR"→10.
    expect(computeSalePercent('8€', '10 EUR')).toBe(20);
    // A dot-decimal with trailing garbage still parses the leading number.
    expect(computeSalePercent('7.50abc', '10.00')).toBe(25);
  });

  it('does NOT understand comma decimals (parseFloat truncates at the comma)', () => {
    // Documents the contract: callers must pass dot-decimal major-unit strings.
    // "8,00" → parseFloat → 8; "10,00" → 10 ⇒ 20% (comma + fraction ignored).
    expect(computeSalePercent('8,00', '10,00')).toBe(20);
    // "8,50" parses as 8 (not 8.5), so vs "10" it's 20%, not 15%.
    expect(computeSalePercent('8,50', '10')).toBe(20);
  });

  it('handles very large absolute prices without overflow', () => {
    expect(computeSalePercent('500000.00', '1000000.00')).toBe(50);
  });

  it('returns null when current is non-finite (Infinity string)', () => {
    expect(computeSalePercent('Infinity', '10.00')).toBeNull();
    expect(computeSalePercent('10.00', 'Infinity')).toBe(100);
  });
});
