/**
 * Guards the "Cerca per colore" grid shape fix: every palette swatch must read
 * as a nail-tip at the SAME 26×62 footprint. Swatches with a `moodPhoto`
 * render it as an <img>; the photo-less O&Y swatch (`y-o`) must fall back to a
 * CSS nail-tip SILHOUETTE (not a lone round circle) at the same box size,
 * filled with its split-gradient. Uses the REAL swatches.ts (y-o has no
 * moodPhoto) so the fallback branch is exercised.
 *
 * Same stubbing approach as SearchOverlay.parity.test.tsx.
 */
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Product } from '../../../../types';
import { NAIL_SWATCHES } from '../../../../data/swatches';

// The real card pulls in cart/quick-view/motion; the overlay tests only need a link per product.
vi.mock('../../../ProductCard', () => ({
  ProductCard: ({ product, onNavigate }: { product: { handle?: string; id: string; name: string }; onNavigate?: () => void }) => (
    <a href={`/product/${product.handle || product.id}`} onClick={onNavigate}>{product.name}</a>
  ),
}));

vi.mock('../../../../context/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'it',
    setLanguage: () => {},
    t: (k: string) => k,
  }),
}));

vi.mock('../../../../hooks/useStoreContent', () => ({
  useStoreSetting: () => null,
  useProductSlot: () => ({ title: null, handles: [] }),
}));

// Products covering GIALLO/ARANCIONE so the O&Y swatch has a live count and
// isn't filtered out of the grid, plus ROSSO for a photo swatch.
const PRODUCTS: Product[] = [
  {
    id: 'p1', handle: 'rosso-1', name: 'Semipermanente Rosso', price: '10,00',
    category: 'Semipermanente', categoryHandle: 'semipermanente', colorName: 'ROSSO',
    searchText: 'semipermanente rosso red', isVisible: true, image: '/img.jpg',
  } as Product,
  {
    id: 'p2', handle: 'giallo-1', name: 'Semipermanente Giallo', price: '10,00',
    category: 'Semipermanente', categoryHandle: 'semipermanente', colorName: 'GIALLO',
    searchText: 'semipermanente giallo yellow', isVisible: true, image: '/img.jpg',
  } as Product,
];

vi.mock('../../../../context/ProductContext', () => ({
  useProducts: () => ({ products: PRODUCTS }),
}));

vi.mock('../../../../hooks/useCourses', () => ({
  useCourses: () => ({ data: [] }),
}));

vi.mock('../../../../hooks/useFocusTrap', () => ({
  useFocusTrap: () => ({ current: null }),
}));

vi.mock('../../../../lib/scrollLock', () => ({
  useScrollLock: () => {},
}));

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: new Proxy(
    {},
    {
      get: () => (props: Record<string, unknown>) => {
        const { children, ...rest } = props as { children?: React.ReactNode };
        const { initial, animate, exit, transition, ...domProps } = rest as Record<string, unknown>;
        void initial; void animate; void exit; void transition;
        return <div {...domProps}>{children}</div>;
      },
    },
  ),
}));

import { SearchOverlay } from '../SearchOverlay';

function renderOverlay() {
  return render(
    <MemoryRouter>
      <SearchOverlay isOpen onClose={() => {}} />
    </MemoryRouter>,
  );
}

const Y_O = NAIL_SWATCHES.find((s) => s.slug === 'y-o')!;

describe('SearchOverlay — "Cerca per colore" swatch shapes', () => {
  afterEach(cleanup);

  it('the O&Y swatch has no mood photo (sanity: it exercises the CSS fallback)', () => {
    expect(Y_O.moodPhoto).toBeUndefined();
  });

  it('photo swatches render an <img> at the 26×62 nail footprint', () => {
    const { container } = renderOverlay();
    const img = container.querySelector('a[href*="color=rosso"] img') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.className).toContain('w-[26px]');
    expect(img.className).toContain('h-[62px]');
  });

  it('the photo-less O&Y swatch renders a nail-tip SHAPE at the same 26×62 footprint, not a circle', () => {
    const { container } = renderOverlay();
    const link = container.querySelector(`a[href*="color=${Y_O.slug}"]`) as HTMLAnchorElement;
    expect(link).toBeTruthy();

    // No photo for O&Y.
    expect(link.querySelector('img')).toBeNull();

    // The CSS fallback swatch matches the photo footprint (26×62 — same visual
    // weight as the neighbouring nail-tip photos) and is NOT a round circle.
    const shape = link.querySelector('span[aria-hidden="true"]') as HTMLElement;
    expect(shape).toBeTruthy();
    expect(shape.className).toContain('w-[26px]');
    expect(shape.className).toContain('h-[62px]');
    expect(shape.className).not.toContain('rounded-full');

    // Filled with the swatch's split-gradient.
    expect(shape.style.background).toContain('linear-gradient');
  });

  it("the O&Y fallback matches ShopByColor's glossy nail treatment (ellipse + inset gloss + 3 highlight layers)", () => {
    const { container } = renderOverlay();
    const link = container.querySelector(`a[href*="color=${Y_O.slug}"]`) as HTMLAnchorElement;
    const shape = link.querySelector('span[aria-hidden="true"]') as HTMLElement;

    // Reconciled encoding (shared <NailSwatch>): the glossy-nail ellipse radius
    // + inset gloss are inline styles (ShopByColor's encoding, now the single
    // source), not Tailwind arbitrary-value classes. (The elliptical
    // `border-radius: 50% / 50%` is dropped by jsdom's CSS parser, so it can't
    // be asserted here — the box-shadow + highlight structure stand in for the
    // glossy-nail treatment.)
    expect(shape.className).not.toContain('rounded-[9px');
    // ShopByColor's inset gloss shadow (PILL_INSET_SHADOW), not an outline/box.
    expect(shape.style.boxShadow).toContain('inset -4px -6px 12px rgba(0,0,0,0.35)');
    expect(shape.style.boxShadow).toContain('inset 4px 4px 12px rgba(255,255,255,0.45)');

    // All THREE blurred white highlight overlays from ShopByColor are present.
    const highlights = Array.from(
      shape.querySelectorAll('span[class*="pointer-events-none"]'),
    ) as HTMLElement[];
    expect(highlights).toHaveLength(3);
    // Bottom highlight layer (the third ShopByColor overlay) must exist.
    expect(highlights.some((h) => h.className.includes('bottom-[2%]'))).toBe(true);
  });
});
