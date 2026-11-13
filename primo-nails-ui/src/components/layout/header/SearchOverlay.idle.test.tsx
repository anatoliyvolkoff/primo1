/**
 * Idle-state (no query) behaviour of the search overlay, edge cases:
 *   - "Categorie" rows carry a "N prodotti" count AND are capped at 6 even when
 *     the catalogue has more top-level categories.
 *   - the "Cerca per colore" grid renders every swatch, using a nail-tip PHOTO
 *     where a `moodPhoto` exists and the CSS split-gradient fallback for the
 *     photo-less O&Y swatch.
 *   - "I più venduti" (best sellers) renders live product cells.
 *
 * Complements the existing __tests__/SearchOverlay.categoryCount + colorGrid
 * specs (which cover the 2-category / GEL-fold / single-swatch cases); here we
 * push the >6 cap and the whole-grid shape.
 */
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Product } from '../../../types';
import { NAIL_SWATCHES } from '../../../data/swatches';

// The real card pulls in cart/quick-view/motion; the overlay tests only need a link per product.
vi.mock('../../ProductCard', () => ({
  ProductCard: ({ product, onNavigate }: { product: { handle?: string; id: string; name: string }; onNavigate?: () => void }) => (
    <a href={`/product/${product.handle || product.id}`} onClick={onNavigate}>{product.name}</a>
  ),
}));

vi.mock('../../../context/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'it',
    setLanguage: () => {},
    t: (k: string, vars?: Record<string, string | number>) =>
      k === 'search.categoryCount' ? `${vars?.count} prodotti` : k,
  }),
}));

vi.mock('../../../hooks/useStoreContent', () => ({
  useStoreSetting: () => null,
  useProductSlot: () => ({ title: null, handles: [] }),
}));

// Eight top-level categories (so the idle "Categorie" list must cap at 6), plus
// colour products so the grid's O&Y + ROSSO swatches have a live count. ROSSO
// is also flagged isPromoted so it drives the best-sellers block.
const CATS = ['base', 'gel', 'top', 'nail', 'acrygel', 'kit', 'tools', 'care'];
const PRODUCTS: Product[] = [
  ...CATS.map((h, i) => ({
    id: `c${i}`, handle: `c${i}`, name: `Prodotto ${h}`, price: '10,00',
    category: h.toUpperCase(), categoryHandle: h, isVisible: true, image: '/img.jpg',
    isPromoted: i === 0,
  } as Product)),
  {
    id: 'r1', handle: 'rosso-1', name: 'Semipermanente Rosso', price: '12,00',
    category: 'Semipermanente', categoryHandle: 'semipermanente', colorName: 'ROSSO',
    searchText: 'semipermanente rosso red', isVisible: true, image: '/img.jpg', isPromoted: true,
  } as Product,
  {
    id: 'g1', handle: 'giallo-1', name: 'Semipermanente Giallo', price: '12,00',
    category: 'Semipermanente', categoryHandle: 'semipermanente', colorName: 'GIALLO',
    searchText: 'semipermanente giallo yellow', isVisible: true, image: '/img.jpg',
  } as Product,
];

vi.mock('../../../context/ProductContext', () => ({
  useProducts: () => ({ products: PRODUCTS }),
}));

vi.mock('../../../hooks/useCourses', () => ({
  useCourses: () => ({ data: [] }),
}));

vi.mock('../../../hooks/useFocusTrap', () => ({
  useFocusTrap: () => ({ current: null }),
}));

vi.mock('../../../lib/scrollLock', () => ({
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

import { SearchOverlay } from './SearchOverlay';

function renderOverlay() {
  return render(
    <MemoryRouter>
      <SearchOverlay isOpen onClose={() => {}} />
    </MemoryRouter>,
  );
}

const Y_O = NAIL_SWATCHES.find((s) => s.slug === 'y-o')!;

describe('SearchOverlay — idle state', () => {
  afterEach(cleanup);

  it('caps the idle "Categorie" list at 6 rows even with 8 top-level categories', () => {
    const { container } = renderOverlay();
    // Category rows link to "/<handle>" and carry a "N prodotti" count.
    const countRows = Array.from(container.querySelectorAll('a[href^="/"]')).filter(
      a => /prodotti$/.test(a.textContent?.trim() ?? ''),
    );
    expect(countRows.length).toBe(6);
  });

  it('every idle category row shows a "N prodotti" count', () => {
    renderOverlay();
    const counts = screen.getAllByText(/prodotti$/);
    // 6 category rows + possibly colour counts; at least the 6 category rows.
    expect(counts.length).toBeGreaterThanOrEqual(6);
  });

  it('renders the whole "Cerca per colore" grid — one link per swatch', () => {
    const { container } = renderOverlay();
    // Each swatch links to /tutti-prodotti?color=<slug>; the idle grid lists all.
    const colorLinks = container.querySelectorAll('a[href^="/tutti-prodotti?color="]');
    expect(colorLinks.length).toBe(NAIL_SWATCHES.length);
  });

  it('a photo swatch (ROSSO) renders an <img> nail-tip', () => {
    const { container } = renderOverlay();
    const img = container.querySelector('a[href*="color=rosso"] img');
    expect(img).not.toBeNull();
  });

  it('the photo-less O&Y swatch uses a CSS split-gradient fallback (no img)', () => {
    const { container } = renderOverlay();
    const link = container.querySelector(`a[href*="color=${Y_O.slug}"]`) as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.querySelector('img')).toBeNull();
    const shape = link.querySelector('span[aria-hidden="true"]') as HTMLElement;
    expect(shape.style.background).toContain('linear-gradient');
  });

  it('renders the best-sellers block with live product cells', () => {
    const { container } = renderOverlay();
    // Best sellers fall back to isPromoted products; those cells carry a price.
    expect(screen.getByText('search.bestSellers')).toBeTruthy();
    // The promoted ROSSO product card is present (the shared ProductCard, stubbed to a link).
    expect(container.querySelector('a[href="/product/rosso-1"]')).not.toBeNull();
  });

  it('shows the idle layout, not the query layout, when the box is empty', () => {
    renderOverlay();
    // "Cerca per colore" is an idle-only section; "Prodotti" header is query-only.
    expect(screen.getByText('search.byColor')).toBeTruthy();
    expect(screen.queryByText('search.products')).toBeNull();
  });
});
