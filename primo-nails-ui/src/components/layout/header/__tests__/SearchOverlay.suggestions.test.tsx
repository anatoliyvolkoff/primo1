/**
 * Guards the query-state behaviour added in the search redesign:
 *   - the "Vedi tutti" button carries the query through as ?q=<query>
 *   - the "Suggerimenti" column surfaces scored category / colour / collection
 *     hits (not just popular terms), each with a count or type label.
 *
 * Same stubbing approach as SearchOverlay.categoryCount.test.tsx: neutralise the
 * contexts/hooks + motion + scroll-lock/focus-trap so the overlay renders as
 * plain DOM. The search is debounced (300 ms) so tests use fake timers to flush.
 */
import { render, screen, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Product } from '../../../../types';

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
      k === 'search.categoryCount'
        ? `${vars?.count} prodotti`
        : k === 'search.seeAll'
          ? `Vedi tutti ${vars?.count}`
          : k === 'search.suggestionType.collection'
            ? 'Collezione'
            : k,
  }),
}));

vi.mock('../../../../hooks/useStoreContent', () => ({
  useStoreSetting: () => null,
  useProductSlot: () => ({ title: null, handles: [] }),
}));

vi.mock('../../../../hooks/useRecentlyViewed', () => ({
  useRecentlyViewed: () => ({ recentlyViewedIds: [], addToRecentlyViewed: () => {} }),
}));

// Two colour products (ROSSO) + a winter-collection kit with a bundled shade,
// so a "rosso" query surfaces a colour suggestion and a "winter" query a
// collection suggestion.
const PRODUCTS: Product[] = [
  {
    id: 'p1', handle: 'rosso-1', name: 'Semipermanente Rosso', price: '10,00',
    category: 'Semipermanente', categoryHandle: 'semipermanente', colorName: 'ROSSO',
    searchText: 'semipermanente rosso red', isVisible: true,
  } as Product,
  {
    id: 'kit', handle: 'kit-winter-collection', name: 'Kit Winter Collection', price: '50,00',
    category: 'Kit', categoryHandle: 'kit', bundleHandles: ['rosso-1'],
    searchText: 'kit winter collection inverno', isVisible: true,
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

// Type into the search box and flush the 300 ms debounce.
function type(value: string) {
  const input = screen.getByPlaceholderText('search.placeholder') as HTMLInputElement;
  act(() => {
    // Fire a native input event React can observe.
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  act(() => {
    vi.advanceTimersByTime(350);
  });
}

describe('SearchOverlay — query state', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('"Vedi tutti" links to /tutti-prodotti?q=<query>', () => {
    const { container } = renderOverlay();
    type('rosso');
    const seeAll = Array.from(container.querySelectorAll('a[href^="/tutti-prodotti?q="]'));
    expect(seeAll.length).toBeGreaterThanOrEqual(1);
    expect(seeAll[0].getAttribute('href')).toBe('/tutti-prodotti?q=rosso');
  });

  it('surfaces a colour suggestion row for a colour query', () => {
    const { container } = renderOverlay();
    type('rosso');
    // Colour suggestion navigates to /tutti-prodotti?color=<slug>.
    const colorRow = container.querySelector('a[href="/tutti-prodotti?color=rosso"]');
    expect(colorRow).not.toBeNull();
    // Right-side count (reuses the "N prodotti" pattern).
    expect(colorRow?.textContent).toMatch(/prodotti/);
  });

  it('surfaces a collection suggestion row (with type label) for a collection query', () => {
    const { container } = renderOverlay();
    type('winter');
    const collRow = container.querySelector('a[href^="/tutti-prodotti?collection="]');
    expect(collRow).not.toBeNull();
    expect(collRow?.textContent).toContain('Collezione');
  });

  it('surfaces a category suggestion row for a category query', () => {
    const { container } = renderOverlay();
    type('semipermanente');
    const catRow = container.querySelector('a[href="/semipermanente"]');
    expect(catRow).not.toBeNull();
  });
});
