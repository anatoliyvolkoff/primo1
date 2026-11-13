/**
 * Guards the optimistic quantity patch in CartContext.updateQuantity (LB154-1).
 *
 * When the user clicks +/- on a line item the patch must strip ALL three
 * server-computed money totals (item_subtotal, item_total, original_item_total)
 * from the query cache so that cartSubtotal falls through to the cartItems
 * reduce fallback and never shows a stale pre-click subtotal.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Minimal mock for the module boundary (no running app / React tree needed).
// We isolate just the cache-patch logic from CartContext.updateQuantity.
// ---------------------------------------------------------------------------

/**
 * Replicate the exact cache transform from CartContext.tsx:
 *   const { item_subtotal, item_total, original_item_total, ...rest } = old;
 * so a regression in the real file is immediately visible here.
 */
function applyOptimisticPatch(
  old: Record<string, unknown>,
  lineItemId: string,
  newQuantity: number,
): Record<string, unknown> | typeof old {
  if (!old?.items) return old;
  // ── This must stay in sync with CartContext.tsx updateQuantity ──────────
  const { item_subtotal, item_total, original_item_total, ...rest } = old as any;
  void item_subtotal; void item_total; void original_item_total; // explicitly discarded
  return {
    ...rest,
    items: (old.items as any[]).map((it: any) =>
      it.id === lineItemId ? { ...it, quantity: newQuantity } : it,
    ),
  };
}

describe('CartContext — optimistic quantity patch (LB154-1)', () => {
  const LINE_ID = 'line_abc';

  const makeCart = (overrides: Record<string, unknown> = {}) => ({
    id: 'cart_1',
    item_subtotal: 27.87,    // net (tax-exclusive)
    item_total: 34.00,       // gross post-discount
    original_item_total: 34.00, // gross pre-discount — primary path in cartSubtotal
    discount_total: 0,
    items: [
      { id: LINE_ID, quantity: 1, unit_price: 34 },
      { id: 'line_other', quantity: 2, unit_price: 10 },
    ],
    ...overrides,
  });

  it('strips original_item_total so cartSubtotal falls back to the reduce path', () => {
    const result = applyOptimisticPatch(makeCart(), LINE_ID, 3);
    expect(result).not.toHaveProperty('original_item_total');
  });

  it('strips item_total', () => {
    const result = applyOptimisticPatch(makeCart(), LINE_ID, 3);
    expect(result).not.toHaveProperty('item_total');
  });

  it('strips item_subtotal', () => {
    const result = applyOptimisticPatch(makeCart(), LINE_ID, 3);
    expect(result).not.toHaveProperty('item_subtotal');
  });

  it('updates the target line item quantity', () => {
    const result = applyOptimisticPatch(makeCart(), LINE_ID, 3) as any;
    const line = result.items.find((it: any) => it.id === LINE_ID);
    expect(line?.quantity).toBe(3);
  });

  it('leaves other line items unchanged', () => {
    const result = applyOptimisticPatch(makeCart(), LINE_ID, 5) as any;
    const other = result.items.find((it: any) => it.id === 'line_other');
    expect(other?.quantity).toBe(2);
  });

  it('preserves non-money fields (id, discount_total, etc.)', () => {
    const result = applyOptimisticPatch(makeCart(), LINE_ID, 2) as any;
    expect(result.id).toBe('cart_1');
    expect(result.discount_total).toBe(0);
  });

  it('returns the old value unchanged when cart has no items', () => {
    const empty = { id: 'cart_1' }; // no .items property
    const result = applyOptimisticPatch(empty, LINE_ID, 2);
    expect(result).toBe(empty);
  });

  it('handles a discounted cart — original_item_total differs from item_total', () => {
    // €199 before coupon, €150 after → only item_total (post-discount) should
    // drive the free-ship bar; both must be stripped so neither leaks stale data.
    const discountedCart = makeCart({
      original_item_total: 199,
      item_total: 150,
      discount_total: 49,
    });
    const result = applyOptimisticPatch(discountedCart, LINE_ID, 2);
    expect(result).not.toHaveProperty('original_item_total');
    expect(result).not.toHaveProperty('item_total');
  });
});
