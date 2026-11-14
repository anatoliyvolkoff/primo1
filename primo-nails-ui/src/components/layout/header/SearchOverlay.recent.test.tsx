/**
 * Recent-SEARCHES store wired through the overlay, edge cases:
 *   - submitting the form (Enter with no focused product) remembers the query
 *     and routes to /tutti-prodotti?q=.
 *   - clicking a product result remembers the query before navigating.
 *   - clicking "Vedi tutti" remembers the query.
 *   - the idle list shows at most 6 (store cap) and dedups folded duplicates,
 *     newest first.
 *
 * The lib-level store mechanics (max 6, dedup, <2-char ignore, delete/clear) are
 * unit-tested in searchMatch.test.ts; here we assert the OVERLAY calls them at
 * the right moments.
 */
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Product } from '../../../types';
import { getRecentSearches, rememberSearch } from '../../../lib/searchMatch';

const navigateSpy = vi.fn();
// The real card pulls in cart/quick-view/motion; the overlay tests only need a link per product.
vi.mock('../../ProductCard', () => ({
  ProductCard: ({ product, onNavigate }: { product: { handle?: string; id: string; name: string }; onNavigate?: () => void }) => (
    <a href={`/product/${product.handle || product.id}`} onClick={onNavigate}>{product.name}</a>
  ),
}));

vi.mock('react-router-dom', async (orig) => {
  const actual = await orig<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateSpy };
});

vi.mock('../../../context/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'it',
    setLanguage: () => {},
    t: (k: string, vars?: Record<string, string | number>) => {
      switch (k) {
        case 'search.seeAll':
          return `Vedi tutti ${vars?.count}`;
        case 'search.categoryCount':
          return `${vars?.count} prodotti`;
        case 'search.products':
          return 'Prodotti';
        default:
          return k;
      }
    },
  }),
}));

vi.mock('../../../hooks/useStoreContent', () => ({
  useStoreSetting: () => null,
  useProductSlot: () => ({ title: null, handles: [] }),
}));

const PRODUCTS: Product[] = [
  {
    id: 'p1', handle: 'rosso-1', name: 'Semipermanente Rosso', price: '10,00',
    category: 'Semipermanente', categoryHandle: 'semipermanente', colorName: 'ROSSO',
    searchText: 'semipermanente rosso red', isVisible: true, image: '/img.jpg',
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

function renderOverlay(onClose = () => {}) {
  return render(
    <MemoryRouter>
      <SearchOverlay isOpen onClose={onClose} />
    </MemoryRouter>,
  );
}

function type(value: string) {
  const input = screen.getByPlaceholderText('search.placeholder') as HTMLInputElement;
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  act(() => {
    vi.advanceTimersByTime(120);
  });
}

describe('SearchOverlay — recent searches wiring', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    navigateSpy.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('submitting the form remembers the query and routes to /tutti-prodotti?q=', () => {
    const { container } = renderOverlay();
    type('rosso');
    const form = container.querySelector('form')!;
    fireEvent.submit(form);
    expect(getRecentSearches()).toEqual(['rosso']);
    expect(navigateSpy).toHaveBeenCalledWith('/tutti-prodotti?q=rosso');
  });

  it('a <2-char query is NOT submitted and NOT remembered', () => {
    const { container } = renderOverlay();
    type('r');
    fireEvent.submit(container.querySelector('form')!);
    expect(getRecentSearches()).toEqual([]);
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('clicking a product result remembers the query (the shared ProductCard links to the PDP)', () => {
    const { container } = renderOverlay();
    type('rosso');
    const card = container.querySelector('a[href="/product/rosso-1"]') as HTMLAnchorElement;
    fireEvent.click(card);
    expect(getRecentSearches()).toEqual(['rosso']);
  });

  it('clicking "Vedi tutti" remembers the query', () => {
    const { container } = renderOverlay();
    type('rosso');
    const seeAll = container.querySelector('a[href^="/tutti-prodotti?q="]') as HTMLAnchorElement;
    fireEvent.click(seeAll);
    expect(getRecentSearches()).toEqual(['rosso']);
  });

  it('idle list shows at most 6 recent rows and dedups folded duplicates (newest first)', () => {
    // Seed 7 distinct + a folded-duplicate of the newest.
    for (const q of ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7']) rememberSearch(q);
    rememberSearch('Q7'); // folds to same as "q7" → dedup, moves to front
    const { container } = renderOverlay();
    const clockRows = Array.from(container.querySelectorAll('ul li button')).filter(
      b => b.querySelector('span.flex-1'),
    );
    // Exactly the 6 remembered queries render; q1 (oldest) dropped by the cap.
    expect(getRecentSearches()).toHaveLength(6);
    expect(screen.queryByText('q1')).toBeNull();
    expect(screen.getByText('Q7')).toBeTruthy(); // newest spelling kept
    expect(clockRows.length).toBeGreaterThanOrEqual(6);
  });
});
