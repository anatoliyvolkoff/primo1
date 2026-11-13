import { describe, it, expect } from 'vitest';
import { grossOrderTotal } from './orderMoney';

describe('grossOrderTotal (OA-02)', () => {
  it('returns the GROSS total after capture, when order.total has gone to 0', () => {
    // Medusa's order.total is amount-OUTSTANDING and becomes 0 once
    // auto-capture-payment fires on order.placed. The receipt must NOT show
    // "€0.00" for a paid order — it must fall through to original_total.
    expect(grossOrderTotal({ total: 0, original_total: 49.9 })).toBe(49.9);
  });

  it('returns 0 for a legitimately free order (100% discount)', () => {
    // original_total === 0 is a real zero and must be returned as-is, NOT
    // fall through to an items+shipping sum.
    expect(grossOrderTotal({ total: 0, original_total: 0 })).toBe(0);
  });

  it('falls back to summary.accounting_total when original_total is absent', () => {
    expect(
      grossOrderTotal({ total: 0, summary: { accounting_total: 35 } })
    ).toBe(35);
  });

  it('last-resort: items + shipping when no headline total is present', () => {
    expect(
      grossOrderTotal({ total: 0, item_total: 30, shipping_total: 5 })
    ).toBe(35);
  });

  it('never returns NaN and handles null/undefined', () => {
    expect(grossOrderTotal(null)).toBe(0);
    expect(grossOrderTotal(undefined)).toBe(0);
    expect(grossOrderTotal({})).toBe(0);
  });

  // ── Additional edge cases ──────────────────────────────────────────────────
  it('prefers original_total over accounting_total AND over total (priority order)', () => {
    // All three present → original_total wins.
    expect(
      grossOrderTotal({
        original_total: 50,
        summary: { accounting_total: 40 },
        total: 30,
      }),
    ).toBe(50);
  });

  it('prefers accounting_total over total when original_total is absent', () => {
    expect(
      grossOrderTotal({ total: 30, summary: { accounting_total: 45 } }),
    ).toBe(45);
  });

  it('falls back to a non-zero order.total when no gross headline exists', () => {
    // total is only used when original_total + accounting_total are absent, and
    // only if it is truthy (pre-capture). A positive total is returned.
    expect(grossOrderTotal({ total: 42 })).toBe(42);
  });

  it('last-resort sum uses GROSS item_total, falling back to item_subtotal', () => {
    // item_total present → used (gross).
    expect(grossOrderTotal({ item_total: 30, shipping_total: 5 })).toBe(35);
    // only item_subtotal present → used as the fallback.
    expect(grossOrderTotal({ item_subtotal: 20, shipping_total: 5 })).toBe(25);
  });

  it('treats a missing shipping_total as 0 in the last-resort sum', () => {
    expect(grossOrderTotal({ item_total: 30 })).toBe(30);
  });

  it('handles string-encoded amounts via Number() coercion', () => {
    // Medusa fields can arrive as numeric strings; grossOrderTotal uses Number().
    expect(grossOrderTotal({ original_total: '49.90' as unknown as number })).toBe(49.9);
    expect(
      grossOrderTotal({
        item_total: '30' as unknown as number,
        shipping_total: '5' as unknown as number,
      }),
    ).toBe(35);
  });

  it('never returns NaN when headline fields are null and items are 0', () => {
    expect(
      grossOrderTotal({
        original_total: null,
        summary: { accounting_total: null },
        total: null,
        item_total: null,
        item_subtotal: null,
        shipping_total: null,
      }),
    ).toBe(0);
  });

  it('returns 0 (not NaN) for a non-numeric garbage headline', () => {
    // Number('abc') → NaN, and `|| 0` guards the final return.
    expect(
      grossOrderTotal({ original_total: 'abc' as unknown as number }),
    ).toBe(0);
  });

  it('scales to large order totals', () => {
    expect(grossOrderTotal({ original_total: 1234567.89 })).toBe(1234567.89);
  });

  it('a free order still returns 0 even when item_total/shipping would sum higher', () => {
    // original_total === 0 is preferred and returned, NOT the items+shipping sum.
    expect(
      grossOrderTotal({ original_total: 0, item_total: 30, shipping_total: 5 }),
    ).toBe(0);
  });
});
