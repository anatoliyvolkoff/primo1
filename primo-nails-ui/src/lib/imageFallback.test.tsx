import type React from 'react';
import { productPlaceholder, handleProductImageError, PRODUCT_PLACEHOLDER } from './imageFallback';

describe('imageFallback (UI-001: local branded placeholder, no picsum)', () => {
  it('productPlaceholder returns the local static asset path', () => {
    expect(productPlaceholder('some-seed')).toBe('/placeholder-product.svg');
    expect(PRODUCT_PLACEHOLDER).toBe('/placeholder-product.svg');
  });

  it('productPlaceholder never returns a picsum.photos URL for any seed/size', () => {
    for (const seed of ['a', 'prod_123', 'weird seed/with?chars']) {
      const url = productPlaceholder(seed, 400);
      expect(url).not.toMatch(/picsum\.photos/);
      expect(url).toBe('/placeholder-product.svg');
    }
  });

  it('handleProductImageError swaps a failed <img> to the local placeholder', () => {
    const img = document.createElement('img');
    const handler = handleProductImageError('prod_1');
    handler({ currentTarget: img } as unknown as React.SyntheticEvent<HTMLImageElement>);
    expect(img.src).toContain('/placeholder-product.svg');
    expect(img.src).not.toMatch(/picsum\.photos/);
    expect(img.dataset.placeheld).toBe('1');
  });

  it('handleProductImageError is guarded against an infinite error loop', () => {
    const img = document.createElement('img');
    img.dataset.placeheld = '1';
    img.src = 'http://example.test/original.png';
    const handler = handleProductImageError('prod_1');
    handler({ currentTarget: img } as unknown as React.SyntheticEvent<HTMLImageElement>);
    // Already placeheld → handler must be a no-op (no re-assignment).
    expect(img.src).toBe('http://example.test/original.png');
  });
});
