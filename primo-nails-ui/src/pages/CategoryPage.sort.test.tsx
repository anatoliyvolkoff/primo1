import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { Product } from '../types';
import type { SortOption } from '../components/SortControl';

// Mutable product catalogue (reset per test).
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

// FilterBar stub — expose the sort setter so the test can switch to "newest".
type FilterBarProps = {
  sortBy: SortOption;
  onSortChange: (o: SortOption) => void;
};
const filterBarApi: { current: FilterBarProps | null } = { current: null };
vi.mock('../components/FilterBar', () => ({
  FilterBar: (props: FilterBarProps) => {
    filterBarApi.current = props;
    return <div data-testid="filter-bar" data-sort={props.sortBy} />;
  },
}));

// ProductCard → print the product name so ordering is assertable.
vi.mock('../components/ProductCard', () => ({
  ProductCard: ({ product }: { product: Product }) => (
    <div data-testid="product-card">{product.name}</div>
  ),
}));

vi.mock('../components/Pagination', () => ({
  Pagination: () => <div data-testid="pagination" />,
}));

import { CategoryPage } from './CategoryPage';

const makeProduct = (name: string, createdAt: string | undefined): Product =>
  ({
    id: name,
    name,
    description: '',
    price: '10',
    priceAmount: 10,
    category: 'Acrygel',
    categoryHandle: 'acrygel',
    handle: name,
    image: '',
    isVisible: true,
    inStock: true,
    createdAt,
  }) as Product;

const shownNames = () => screen.queryAllByTestId('product-card').map((el) => el.textContent);

beforeEach(() => {
  filterBarApi.current = null;
});

describe('CategoryPage — "Novità" (newest) sort', () => {
  it('orders products by createdAt descending when sort is "newest"', () => {
    // Deliberately NOT in date order, so the sort has to do real work.
    mockProducts.current = {
      products: [
        makeProduct('Old', '2026-01-01T00:00:00.000Z'),
        makeProduct('Newest', '2026-03-01T00:00:00.000Z'),
        makeProduct('Middle', '2026-02-01T00:00:00.000Z'),
      ],
      loading: false,
      error: null,
    };

    render(
      <MemoryRouter initialEntries={['/acrygel']}>
        <Routes>
          <Route path="/:categoryId" element={<CategoryPage />} />
        </Routes>
      </MemoryRouter>
    );

    act(() => { filterBarApi.current!.onSortChange('newest'); });

    expect(shownNames()).toEqual(['Newest', 'Middle', 'Old']);
  });

  it('sorts products missing a createdAt last (never jumps them to the front)', () => {
    mockProducts.current = {
      products: [
        makeProduct('NoDate', undefined),
        makeProduct('Older', '2026-01-01T00:00:00.000Z'),
        makeProduct('Newer', '2026-02-01T00:00:00.000Z'),
      ],
      loading: false,
      error: null,
    };

    render(
      <MemoryRouter initialEntries={['/acrygel']}>
        <Routes>
          <Route path="/:categoryId" element={<CategoryPage />} />
        </Routes>
      </MemoryRouter>
    );

    act(() => { filterBarApi.current!.onSortChange('newest'); });

    expect(shownNames()).toEqual(['Newer', 'Older', 'NoDate']);
  });
});
