import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect } from 'vitest';
import { ProductCard } from './ProductCard';
import type { Product } from '../data';

// ProductCard pulls in the cart/language/products/store-setting contexts, which
// depend on the Medusa SDK + network. Mock them so this test isolates the card's
// media rendering (UI-014: no fabricated picsum stock-photo slides).
vi.mock('../context/CartContext', () => ({
  useCart: () => ({ addToCart: vi.fn() }),
}));
vi.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({ language: 'it', setLanguage: vi.fn(), t: (k: string) => k }),
}));
vi.mock('../context/ProductContext', () => ({
  useProducts: () => ({ products: [] }),
}));
vi.mock('../hooks/useStoreContent', () => ({
  useStoreSetting: <T,>(_key: string, fallback: T) => fallback,
}));

const makeProduct = (over: Partial<Product>): Product =>
  ({ id: 'p1', name: 'Prod', handle: 'prod', price: '10', category: 'Cat', image: '', ...over } as Product);

const collectImgSrcs = (container: HTMLElement): string[] =>
  Array.from(container.querySelectorAll('img')).map((img) => img.getAttribute('src') || '');

// Distinct sources, so the prototype's hover-zoom duplicate (slide 1 is the SAME
// photo pre-scaled 1.7×, so 2 <img> with one src) still counts as one real photo.
const distinctImgSrcs = (container: HTMLElement): string[] =>
  Array.from(new Set(collectImgSrcs(container)));

describe('ProductCard (UI-014: no fabricated picsum stock photos)', () => {
  it('media-less product renders the local placeholder and NO picsum URLs', () => {
    const { container } = render(
      <MemoryRouter>
        <ProductCard product={makeProduct({ image: '', gallery: [], video: undefined })} />
      </MemoryRouter>
    );

    const srcs = collectImgSrcs(container);
    // No third-party stock photo anywhere in the rendered card.
    expect(srcs.join('|')).not.toMatch(/picsum\.photos/);
    // The image is the local branded placeholder.
    expect(srcs).toContain('/placeholder-product.svg');
    // Exactly one distinct photo — the hover-zoom duplicate reuses the same src,
    // never a fabricated extra bottle/tips/stock slide.
    expect(distinctImgSrcs(container)).toEqual(['/placeholder-product.svg']);
  });

  it('product WITH an image renders that real image and NO picsum URLs', () => {
    const { container } = render(
      <MemoryRouter>
        <ProductCard
          product={makeProduct({ image: 'https://cdn.test/real.jpg', gallery: [], video: undefined })}
        />
      </MemoryRouter>
    );

    const srcs = collectImgSrcs(container);
    expect(srcs.join('|')).not.toMatch(/picsum\.photos/);
    expect(srcs).toContain('https://cdn.test/real.jpg');
    expect(srcs).not.toContain('/placeholder-product.svg');
    // One distinct photo (its zoom duplicate reuses the same src).
    expect(distinctImgSrcs(container)).toEqual(['https://cdn.test/real.jpg']);
  });

  it('renders the hover-zoom scroll track: a 1× slide + a pre-scaled zoom duplicate', () => {
    const { container } = render(
      <MemoryRouter>
        <ProductCard
          product={makeProduct({ image: 'https://cdn.test/real.jpg', gallery: [], video: undefined })}
        />
      </MemoryRouter>
    );
    // Two <img> for the one photo: slide 0 (1×) + slide 1 (the .pz zoom clone).
    const imgs = Array.from(container.querySelectorAll('img')).filter(
      (img) => (img.getAttribute('src') || '') === 'https://cdn.test/real.jpg'
    );
    expect(imgs).toHaveLength(2);
    // The zoom duplicate is the pre-scaled one and is aria-hidden (decorative).
    const zoom = imgs.find((img) => (img.className || '').includes('scale-[1.7]'));
    expect(zoom).toBeTruthy();
    expect(zoom!.getAttribute('aria-hidden')).toBe('true');
  });
});
