import type React from 'react';

/**
 * Path to the local, on-brand placeholder tile served from Vite's `/public`.
 * Used whenever a product has no usable image, so we never depend on an
 * external stock-photo service (brand-safe + no third-party in the render path).
 */
export const PRODUCT_PLACEHOLDER = '/placeholder-product.svg';

/**
 * Placeholder for a product image. Returns the local branded tile. The `seed`
 * and `size` params are kept for signature stability with existing callers but
 * are intentionally ignored — the asset is a single static file.
 */
export function productPlaceholder(_seed?: string, _size = 800): string {
  return PRODUCT_PLACEHOLDER;
}

/**
 * onError handler for product <img>s: when the real image fails to load
 * (e.g. local dev-storage URLs that aren't reachable from a phone, or a product
 * imported without media) swap in the local branded placeholder. Guarded so it
 * can't loop if the placeholder itself fails. In production with working images
 * this never fires, so it's a pure graceful-degradation fallback.
 */
export function handleProductImageError(seed?: string, size = 800) {
  return (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.dataset.placeheld) return;
    img.dataset.placeheld = '1';
    img.src = productPlaceholder(seed, size);
  };
}
