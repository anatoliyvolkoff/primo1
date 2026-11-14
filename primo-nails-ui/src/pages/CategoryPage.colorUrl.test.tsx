import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import type { Product } from '../types';

// Picking / clearing a colour in the Semipermanente header must keep ?color= in
// the URL in step, and must not be undone by the page-1 reset or the pager.

const mockProducts = { current: { products: [] as Product[], loading: false, error: null as unknown } };
vi.mock('../context/ProductContext', () => ({
  useProducts: () => mockProducts.current,
}));
vi.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('../hooks/useStoreContent', () => ({ usePageBanners: () => ({}) }));
vi.mock('../lib/useSeo', () => ({ useSeo: () => {} }));
vi.mock('../components/layout/Banner', () => ({ Banner: () => <div /> }));
vi.mock('../components/Breadcrumbs', () => ({ Breadcrumbs: () => <div /> }));
vi.mock('../components/collections/RunningBanner', () => ({ RunningBanner: () => <div /> }));
vi.mock('../components/RecentlyViewed', () => ({ RecentlyViewed: () => <div /> }));
vi.mock('../components/skeletons/ProductGridSkeleton', () => ({ ProductGridSkeleton: () => <div /> }));
vi.mock('../components/FilterBar', () => ({ FilterBar: () => <div /> }));
vi.mock('../components/ProductCard', () => ({
  ProductCard: ({ product }: { product: Product }) => <div data-testid="product-card">{product.name}</div>,
}));

// Header stub: expose pick / clear as plain buttons.
const header: { pick?: (name: string) => void; clear?: () => void } = {};
vi.mock('../components/collections/CategoryColorShop', () => ({
  CategoryColorShop: ({ onPick, onClear, selectedColors }: { onPick: (n: string) => void; onClear: () => void; selectedColors: string[] }) => {
    header.pick = onPick;
    header.clear = onClear;
    return <div data-testid="picked">{selectedColors.join(',')}</div>;
  },
}));

// Pager stub: a "next page" button.
const pager: { go?: (p: number) => void } = {};
vi.mock('../components/Pagination', () => ({
  Pagination: ({ currentPage, onPageChange }: { currentPage: number; onPageChange: (p: number) => void }) => {
    pager.go = onPageChange;
    return <div data-testid="current-page">{currentPage}</div>;
  },
}));

import { CategoryPage } from './CategoryPage';

const make = (i: number, colorName: string): Product =>
  ({
    id: `p${i}`, name: `Product ${i}`, description: '', price: '10', priceAmount: 10,
    category: 'Semipermanente', categoryHandle: 'semipermanente', handle: `p${i}`,
    colorName, image: '', isVisible: true, inStock: true,
  }) as Product;

// 20 rosa + 20 blu → 40 products, 3 pages unfiltered; 2 pages per colour.
const catalogue = [
  ...Array.from({ length: 20 }, (_, i) => make(i + 1, 'ROSA')),
  ...Array.from({ length: 20 }, (_, i) => make(i + 21, 'BLU')),
];

function Probe() {
  const loc = useLocation();
  return <div data-testid="search">{loc.search}</div>;
}

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/:categoryId" element={<><CategoryPage /><Probe /></>} />
      </Routes>
    </MemoryRouter>
  );

const search = () => screen.getByTestId('search').textContent;

beforeEach(() => {
  mockProducts.current = { products: catalogue, loading: false, error: null };
});

describe('CategoryPage — colour header keeps ?color= in sync', () => {
  it('writes ?color= when a colour is picked and drops it when cleared', () => {
    renderAt('/semipermanente');
    act(() => header.pick!('rosa'));
    expect(screen.getByTestId('picked').textContent).toBe('rosa');
    expect(search()).toBe('?color=rosa');

    // Colours are multi-select: a second pick ADDS to the first…
    act(() => header.pick!('blu'));
    expect(screen.getByTestId('picked').textContent).toBe('rosa,blu');
    expect(search()).toBe('?color=rosa%2Cblu');

    // …and picking one that is already selected removes just that one.
    act(() => header.pick!('rosa'));
    expect(screen.getByTestId('picked').textContent).toBe('blu');
    expect(search()).toBe('?color=blu');

    act(() => header.clear!());
    expect(screen.getByTestId('picked').textContent).toBe('');
    expect(search()).toBe('');
  });

  it('seeds every colour from a multi-colour ?color= link', () => {
    renderAt('/semipermanente?color=rosa,blu');
    expect(screen.getByTestId('picked').textContent).toBe('rosa,blu');
  });

  it('a cleared colour does not come back when paging afterwards', () => {
    renderAt('/semipermanente?color=rosa');
    expect(screen.getByTestId('picked').textContent).toBe('rosa');

    act(() => header.clear!());
    expect(search()).toBe('');

    act(() => pager.go!(2));
    expect(screen.getByTestId('picked').textContent).toBe('');
    expect(search()).toBe('?page=2');
    expect(screen.getByTestId('current-page').textContent).toBe('2');
  });

  it('picking a colour from page 2 goes back to page 1 and keeps the colour', () => {
    renderAt('/semipermanente?page=2');
    act(() => header.pick!('rosa'));
    expect(search()).toBe('?color=rosa');
    expect(screen.getByTestId('current-page').textContent).toBe('1');
  });
});
