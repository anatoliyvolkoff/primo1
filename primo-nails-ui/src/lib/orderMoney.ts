/**
 * Storefront copy of the backend gross-money helper
 * (primo-nails-api/src/lib/order-money.ts). Kept in sync deliberately — the two
 * packages don't share a module. Any change here must mirror the API version.
 */

export type OrderLike =
  | {
      total?: number | null;
      item_total?: number | null;
      item_subtotal?: number | null;
      shipping_total?: number | null;
      original_total?: number | null;
      summary?: { accounting_total?: number | null } | null;
    }
  | null
  | undefined;

/**
 * GROSS grand total for an order. Prefers `original_total` (gross), then the
 * accounting total, then `total`; the last-resort sum uses the GROSS
 * `item_total` (not the NET `item_subtotal`) plus shipping. Never returns NaN.
 *
 * Why not just `order.total` (OA-02): Medusa's `order.total` is amount-
 * OUTSTANDING and becomes 0 once `auto-capture-payment` fires on `order.placed`,
 * so a paid order would render "Total €0.00". A legitimately €0 order (100%
 * discount) carries `original_total = 0`, which is preferred first and returned
 * correctly.
 */
export function grossOrderTotal(order: OrderLike): number {
  if (!order) return 0;
  const itemsTotal = Number(order.item_total ?? order.item_subtotal ?? 0);
  const shipping = Number(order.shipping_total ?? 0);
  const headline =
    order.original_total ??
    order.summary?.accounting_total ??
    (order.total || undefined);
  return Number(headline ?? itemsTotal + shipping) || 0;
}
