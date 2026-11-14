import { useState } from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import type { Product } from '../types';

// ── Mutable product catalogue (shared across tests; reset per test so this file
//    can't cross-contaminate CategoryPage.filterLeak.test.tsx or vice-versa). ──
const mockProducts = { current: { products: [] as Product[], loading: false, error: null as unknown } };
vi.mock('../context/ProductContext', () => ({
  useProducts: () => mockProducts.current,
}));

vi.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('../hooks/useStoreContent', () => ({
  usePageBanners: () => ({}),
}));
vi.mock('../lib/useSeo', () => ({ useSeo: () => {} }));
vi.mock('../components/layout/Banner', () => ({ Banner: () => <div data-testid="banner" /> }));
vi.mock('../components/Breadcrumbs', () => ({ Breadcrumbs: () => <div data-testid="breadcrumbs" /> }));
vi.mock('../components/collections/RunningBanner', () => ({ RunningBanner: () => <div data-testid="running-banner" /> }));
vi.mock('../components/collections/ShopByColor', () => ({ ShopByColor: () => <div data-testid="shop-by-color" /> }));
vi.mock('../components/RecentlyViewed', () => ({ RecentlyViewed: () => <div data-testid="recently-viewed" /> }));
vi.mock('../components/skeletons/ProductGridSkeleton', () => ({ ProductGridSkeleton: () => <div data-testid="skeleton" /> }));

// FilterBar stub — mirrors the real bar re-pinning priceRange to the catalogue
// max once products load (the empty→loaded change that must NOT clobber a
// deep-linked ?page), and exposes the effect setter so a test can simulate a
// facet selection and assert it resets to page 1.
type FilterBarProps = {
  facetProducts?: Product[];
  priceRange: [number, number];
  setPriceRange: (r: [number, number]) => void;
  selectedEffects: string[];
  setSelectedEffects: (v: string[]) => void;
};
const filterBarApi: { current: FilterBarProps | null } = { current: null };
vi.mock('../components/FilterBar', () => ({
  FilterBar: (props: FilterBarProps) => {
    filterBarApi.current = props;
    const { facetProducts, priceRange, setPriceRange } = props;
    if (facetProducts && facetProducts.length > 0 && priceRange[0] === 0 && priceRange[1] === 100) {
      let max = 0;
      for (const p of facetProducts) {
        const v = p.priceAmount ?? (parseFloat(p.price) || 0);
        if (v > max) max = v;
      }
      const pinned = Math.max(10, Math.ceil(max));
      if (pinned !== 100) setPriceRange([0, pinned]);
    }
    return <div data-testid="filter-bar" />;
  },
}));

// ProductCard → print the product name so the visible page is assertable.
vi.mock('../components/ProductCard', () => ({
  ProductCard: ({ product }: { product: Product }) => (
    <div data-testid="product-card">{product.name}</div>
  ),
}));

// Pagination stub — surface the current page + total pages so the test can
// assert the control is present and tracking state.
vi.mock('../components/Pagination', () => ({
  Pagination: ({ currentPage, totalPages }: { currentPage: number; totalPages: number }) => (
    <div data-testid="pagination" data-total-pages={totalPages}>
      <span data-testid="current-page">{currentPage}</span>
    </div>
  ),
}));

import { CategoryPage } from './CategoryPage';

const makeProduct = (i: number, over: Partial<Product> = {}): Product =>
  ({
    id: `p${i}`,
    name: `Product ${i}`,
    description: '',
    price: '10',
    priceAmount: 10 + (i % 5), // some price spread so the max isn't 100
    category: 'Acrygel',
    categoryHandle: 'acrygel',
    handle: `p${i}`,
    image: '',
    isVisible: true,
    inStock: true,
    ...over,
  }) as Product;

// 40 products in the acrygel category @ 16/page → 3 pages. Product 20 carries a
// shimmer effect so a facet selection narrows to a single page.
const catalogue: Product[] = Array.from({ length: 40 }, (_, i) =>
  makeProduct(i + 1, i === 19 ? { effect: 'shimmer' } : {})
);

const shownNames = () => screen.queryAllByTestId('product-card').map((el) => el.textContent);

beforeEach(() => {
  mockProducts.current = { products: catalogue, loading: false, error: null };
  filterBarApi.current = null;
});

describe('CategoryPage — pagination', () => {
  it('paginates a category with more than one page: page 1 shows ITEMS_PER_PAGE and the pager is present', () => {
    render(
      <MemoryRouter initialEntries={['/acrygel']}>
        <Routes>
          <Route path="/:categoryId" element={<CategoryPage />} />
        </Routes>
      </MemoryRouter>
    );

    // 40 @ 16/page → page 1 shows exactly 16 cards, not all 40.
    expect(shownNames()).toHaveLength(16);
    expect(shownNames()).toContain('Product 1');
    expect(shownNames()).not.toContain('Product 17');

    // The pager is rendered and knows there are 3 pages.
    const pager = screen.getByTestId('pagination');
    expect(pager).toBeTruthy();
    expect(pager.getAttribute('data-total-pages')).toBe('3');
    expect(screen.getByTestId('current-page').textContent).toBe('1');
  });

  it('honours a ?page= deep-link, showing that page\'s slice', () => {
    render(
      <MemoryRouter initialEntries={['/acrygel?page=2']}>
        <Routes>
          <Route path="/:categoryId" element={<CategoryPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('current-page').textContent).toBe('2');
    const names = shownNames();
    expect(names).toContain('Product 17');
    expect(names).not.toContain('Product 1');
    expect(names).not.toContain('Product 33');
  });

  it('clamps an out-of-range ?page= to the last valid page', () => {
    render(
      <MemoryRouter initialEntries={['/acrygel?page=999']}>
        <Routes>
          <Route path="/:categoryId" element={<CategoryPage />} />
        </Routes>
      </MemoryRouter>
    );

    // 3 pages total → ?page=999 clamps to 3 (products 33–40).
    expect(screen.getByTestId('current-page').textContent).toBe('3');
    const names = shownNames();
    expect(names).toContain('Product 40');
    expect(names).not.toContain('Product 1');
  });

  it('keeps a deep-linked ?page across the async empty→loaded product transition', () => {
    let triggerLoad: () => void = () => {};
    function Harness() {
      const [loaded, setLoaded] = useState(false);
      triggerLoad = () => setLoaded(true);
      mockProducts.current = loaded
        ? { products: catalogue, loading: false, error: null }
        : { products: [], loading: true, error: null };
      return (
        <MemoryRouter initialEntries={['/acrygel?page=3']}>
          <Routes>
            <Route path="/:categoryId" element={<CategoryPage />} />
          </Routes>
        </MemoryRouter>
      );
    }

    render(<Harness />);
    act(() => { triggerLoad(); });

    // Page 3 preserved (products 33–40), not reset to page 1 by the load.
    expect(screen.getByTestId('current-page').textContent).toBe('3');
    expect(shownNames()).toContain('Product 33');
    expect(shownNames()).not.toContain('Product 1');
  });

  it('keeps a deep-linked ?page when a product price exceeds the 100 sentinel (M43)', () => {
    // One product priced above the [0,100] default. FilterBar's empty→loaded
    // re-pin moves priceRange[1] past 100; the reset guard must still treat the
    // raw [0,100] sentinel as "full" or it clobbers the deep-linked ?page=3.
    const expensive: Product[] = catalogue.map((p, i) =>
      i === 0 ? ({ ...p, priceAmount: 150 } as Product) : p
    );
    let triggerLoad: () => void = () => {};
    function Harness() {
      const [loaded, setLoaded] = useState(false);
      triggerLoad = () => setLoaded(true);
      mockProducts.current = loaded
        ? { products: expensive, loading: false, error: null }
        : { products: [], loading: true, error: null };
      return (
        <MemoryRouter initialEntries={['/acrygel?page=3']}>
          <Routes>
            <Route path="/:categoryId" element={<CategoryPage />} />
          </Routes>
        </MemoryRouter>
      );
    }

    render(<Harness />);
    act(() => { triggerLoad(); });

    expect(screen.getByTestId('current-page').textContent).toBe('3');
    expect(shownNames()).toContain('Product 33');
    expect(shownNames()).not.toContain('Product 1');
  });

  it('resets to page 1 when a filter changes', () => {
    let selectShimmer: () => void = () => {};
    function FilterHarness() {
      // Grab the live FilterBar props to flip an effect facet on the SAME mount
      // (a fresh router would reset the page-reset guard ref and hide the bug).
      selectShimmer = () => filterBarApi.current!.setSelectedEffects(['shimmer']);
      return <CategoryPage />;
    }

    render(
      <MemoryRouter initialEntries={['/acrygel?page=2']}>
        <Routes>
          <Route path="/:categoryId" element={<FilterHarness />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId('current-page').textContent).toBe('2');

    act(() => { selectShimmer(); });

    // Effect facet narrows to the single shimmer product → back to page 1.
    expect(screen.getByTestId('current-page').textContent).toBe('1');
    expect(shownNames()).toEqual(['Product 20']);
  });

  it('resets to page 1 when the category changes', () => {
    // /acrygel has 40 products (3 pages); /base has a single product. Landing on
    // page 2 of acrygel then navigating to base must snap back to page 1.
    const twoCatCatalogue: Product[] = [
      ...catalogue,
      makeProduct(100, { name: 'Base One', category: 'Base', categoryHandle: 'base', handle: 'base1' }),
    ];
    mockProducts.current = { products: twoCatCatalogue, loading: false, error: null };

    let navTo: (to: string) => void = () => {};
    function NavProbe() {
      const navigate = useNavigate();
      navTo = (to: string) => navigate(to);
      return null;
    }

    render(
      <MemoryRouter initialEntries={['/acrygel?page=2']}>
        <Routes>
          <Route path="/:categoryId" element={<CategoryPage />} />
        </Routes>
        <NavProbe />
      </MemoryRouter>
    );
    expect(screen.getByTestId('current-page').textContent).toBe('2');

    act(() => { navTo('/base'); });

    expect(screen.getByTestId('current-page').textContent).toBe('1');
    expect(shownNames()).toEqual(['Base One']);
  });

  it('renders no pager when the category has a single page of results', () => {
    // Pagination returns null for totalPages <= 1. Our stub still renders a node
    // (it doesn't replicate that early-return), so assert on totalPages=1 — the
    // signal the real component uses to hide itself.
    const tiny: Product[] = [makeProduct(1), makeProduct(2)];
    mockProducts.current = { products: tiny, loading: false, error: null };

    render(
      <MemoryRouter initialEntries={['/acrygel']}>
        <Routes>
          <Route path="/:categoryId" element={<CategoryPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('pagination').getAttribute('data-total-pages')).toBe('1');
    expect(shownNames()).toHaveLength(2);
  });
});
