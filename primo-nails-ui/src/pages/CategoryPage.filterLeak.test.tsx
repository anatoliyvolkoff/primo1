import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { Product } from '../types';

// ── Mutable product catalogue (shared across tests; reset per test). ──
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

// FilterBar stub — exposes the collection/effect/price setters via a captured
// ref so the test can simulate a user selecting a facet chip, then assert the
// selection does (or does not) survive a category→category navigation.
type FilterBarProps = {
  selectedCollections: string[];
  setSelectedCollections: (v: string[]) => void;
  selectedEffects: string[];
  setSelectedEffects: (v: string[]) => void;
  setPriceRange: (v: [number, number]) => void;
};
const filterBarApi: { current: FilterBarProps | null } = { current: null };
vi.mock('../components/FilterBar', () => ({
  FilterBar: (props: FilterBarProps) => {
    filterBarApi.current = props;
    return (
      <div data-testid="filter-bar">
        <span data-testid="sel-collections">{props.selectedCollections.join(',')}</span>
        <span data-testid="sel-effects">{props.selectedEffects.join(',')}</span>
      </div>
    );
  },
}));

vi.mock('../components/ProductCard', () => ({
  ProductCard: ({ product }: { product: Product }) => (
    <div data-testid="product-card">{product.name}</div>
  ),
}));
vi.mock('../components/Pagination', () => ({
  Pagination: ({ currentPage }: { currentPage: number }) => (
    <div data-testid="current-page">{currentPage}</div>
  ),
}));

import { CategoryPage } from './CategoryPage';

const makeProduct = (over: Partial<Product>): Product =>
  ({
    id: Math.random().toString(36).slice(2),
    name: 'Prod',
    description: '',
    price: '10',
    priceAmount: 10,
    category: 'Cat',
    categoryHandle: 'cat',
    image: '',
    isVisible: true,
    inStock: true,
    ...over,
  }) as Product;

// Catalogue spanning two categories, a seasonal kit (so "autumn collection"
// resolves as a collection facet), and a shimmer effect product.
const catalogue: Product[] = [
  makeProduct({ id: 'acry1', name: 'Acrygel One', category: 'Acrygel', categoryHandle: 'acrygel', handle: 'acry1' }),
  makeProduct({
    id: 'acry-kit', name: 'Kit Autumn Collection', category: 'Acrygel', categoryHandle: 'acrygel',
    handle: 'kit-autumn-collection', bundleHandles: ['acry1'],
  }),
  makeProduct({ id: 'acry-shim', name: 'Acrygel Shimmer', category: 'Acrygel', categoryHandle: 'acrygel', handle: 'acry-shim', effect: 'shimmer' }),
  makeProduct({ id: 'base1', name: 'Base One', category: 'Base', categoryHandle: 'base', handle: 'base1' }),
  makeProduct({ id: 'base2', name: 'Base Two', category: 'Base', categoryHandle: 'base', handle: 'base2' }),
  makeProduct({ id: 'base-rosso', name: 'Base Rosso', category: 'Base', categoryHandle: 'base', handle: 'base-rosso', colorName: 'ROSSO' }),
];

// A controllable route host: renders CategoryPage under /:categoryId so that
// navigating acrygel→base REUSES the component instance (the real leak path),
// and exposes a navigate() the test drives.
let navTo: (to: string) => void;
function Host({ initial }: { initial: string }) {
  return (
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/:categoryId" element={<CategoryPage />} />
      </Routes>
      <NavProbe />
    </MemoryRouter>
  );
}
import { useNavigate } from 'react-router-dom';
function NavProbe() {
  const navigate = useNavigate();
  navTo = (to: string) => navigate(to);
  return null;
}

beforeEach(() => {
  mockProducts.current = { products: catalogue, loading: false, error: null };
  filterBarApi.current = null;
});

describe('CategoryPage — filter selections do not leak across categories', () => {
  it('clears collection + effect selections when navigating to another category', () => {
    render(<Host initial="/acrygel" />);

    // User selects a collection + effect chip on /acrygel.
    act(() => {
      filterBarApi.current!.setSelectedCollections(['autumn collection']);
      filterBarApi.current!.setSelectedEffects(['shimmer']);
    });
    expect(screen.getByTestId('sel-collections').textContent).toBe('autumn collection');
    expect(screen.getByTestId('sel-effects').textContent).toBe('shimmer');

    // Navigate to a DIFFERENT category — the component is reused.
    act(() => { navTo('/base'); });

    expect(screen.getByTestId('sel-collections').textContent).toBe('');
    expect(screen.getByTestId('sel-effects').textContent).toBe('');
  });

  it('clears a narrowed price range when navigating to another category', () => {
    render(<Host initial="/acrygel" />);

    // User narrows the price slider on /acrygel.
    act(() => { filterBarApi.current!.setPriceRange([3, 7]); });

    // Navigate to a different category — the manual narrowing must not leak.
    act(() => { navTo('/base'); });

    // Only the category/full-range products of /base should show, i.e. the
    // price filter is no longer narrowing the result set.
    const names = screen.getAllByTestId('product-card').map(el => el.textContent);
    expect(names).toContain('Base One');
    expect(names).toContain('Base Two');
  });

  it('still pre-applies ?color= on a fresh deep-link (reset does not wipe URL-seeded colour)', () => {
    // Fresh mount of a category with ?color= must honour the URL param and the
    // per-category reset effect must NOT wipe it (the colour comes from the URL,
    // which is the new page's own baseline — not a leaked manual selection).
    render(<Host initial="/base?color=rosso" />);

    const names = screen.getAllByTestId('product-card').map(el => el.textContent);
    expect(names).toContain('Base Rosso');
    expect(names).not.toContain('Base One');
    expect(names).not.toContain('Base Two');
  });

  it('navigating A→B with ?color= on B honours B\'s colour, dropping A\'s manual chips', () => {
    // Select a collection on /acrygel, then navigate to /base?color=rosso.
    render(<Host initial="/acrygel" />);
    act(() => { filterBarApi.current!.setSelectedCollections(['autumn collection']); });

    act(() => { navTo('/base?color=rosso'); });

    // A's collection chip is gone; B's URL colour is applied.
    expect(screen.getByTestId('sel-collections').textContent).toBe('');
    const names = screen.getAllByTestId('product-card').map(el => el.textContent);
    expect(names).toEqual(['Base Rosso']);
  });
});
