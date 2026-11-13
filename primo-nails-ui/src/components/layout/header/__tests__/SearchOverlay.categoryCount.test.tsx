/**
 * Guards the idle-state "Categorie" list in the search overlay:
 *   - each category row renders a product count as "N prodotti"
 *   - the count folds a parent category's GEL sub-categories in
 *     (counts products where categoryHandle OR subCategoryHandle === handle).
 *
 * Rendering the full overlay means stubbing the contexts/hooks it pulls from
 * (language, store content, recently-viewed, products) plus motion + the
 * scroll-lock/focus-trap effects — the same approach Header.flag.test.tsx uses
 * to neutralise heavy dependencies.
 */
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Product } from '../../../../types';

// t() mirrors the real interpolation for the one key under test so the
// assertion checks the rendered "N prodotti" copy, not an opaque token.
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
    t: (k: string, vars?: Record<string, string | number>) =>
      k === 'search.categoryCount' ? `${vars?.count} prodotti` : k,
  }),
}));

vi.mock('../../../../hooks/useStoreContent', () => ({
  useStoreSetting: () => null,
  useProductSlot: () => ({ title: null, handles: [] }),
}));

vi.mock('../../../../hooks/useRecentlyViewed', () => ({
  useRecentlyViewed: () => ({ recentlyViewedIds: [], addToRecentlyViewed: () => {} }),
}));

// Three products: two in "base" (one directly, one via a GEL sub-category) and
// one in "gel". The "base" row must read "2 prodotti" (sub-category folded in).
const PRODUCTS: Product[] = [
  {
    id: 'p1', handle: 'p1', name: 'Base Coat', price: '10,00',
    category: 'Base', categoryHandle: 'base', isVisible: true,
  } as Product,
  {
    id: 'p2', handle: 'p2', name: 'Gel Base Builder', price: '20,00',
    category: 'Gel', categoryHandle: 'gel', subCategoryHandle: 'base', isVisible: true,
  } as Product,
  {
    id: 'p3', handle: 'p3', name: 'Gel Architect', price: '30,00',
    category: 'Gel', categoryHandle: 'gel', isVisible: true,
  } as Product,
];

vi.mock('../../../../context/ProductContext', () => ({
  useProducts: () => ({ products: PRODUCTS }),
}));

// Courses load via React Query in the real hook; stub it so no QueryClient is
// needed (the overlay now surfaces course suggestions, none here).
vi.mock('../../../../hooks/useCourses', () => ({
  useCourses: () => ({ data: [] }),
}));

vi.mock('../../../../hooks/useFocusTrap', () => ({
  useFocusTrap: () => ({ current: null }),
}));

vi.mock('../../../../lib/scrollLock', () => ({
  useScrollLock: () => {},
}));

// Strip motion animation wrappers down to plain DOM so children render.
vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: new Proxy(
    {},
    {
      get: () => (props: Record<string, unknown>) => {
        const { children, ...rest } = props as { children?: React.ReactNode };
        // Drop motion-only props that aren't valid DOM attributes.
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

describe('SearchOverlay — category product counts', () => {
  afterEach(cleanup);

  it('renders a "N prodotti" count on each category row', () => {
    renderOverlay();
    // Two distinct top-level categories → two count rows.
    expect(screen.getAllByText(/prodotti$/).length).toBeGreaterThanOrEqual(2);
  });

  it('folds GEL sub-categories into the parent count ("base" = 2)', () => {
    const { container } = renderOverlay();
    // The "Categorie" list links to `/<handle>`; grab the base row by href.
    const baseRow = container.querySelector('a[href="/base"]');
    expect(baseRow).not.toBeNull();
    // p1 (categoryHandle=base) + p2 (subCategoryHandle=base) = 2.
    expect(baseRow?.textContent).toContain('2 prodotti');
  });
});
