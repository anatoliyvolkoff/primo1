/**
 * Guards the search-overlay redesign brought to client-prototype parity:
 *   - M22 recent SEARCH QUERIES (localStorage) render as clock rows with a
 *     delete-X each + a "Cancella" clear-all; clicking a row refills the input.
 *   - M23 course suggestions surface with a "Corso" type label.
 *   - M24 matched query tokens are wrapped in <mark> in product names.
 *   - M26 the no-results state shows the ".sx-none" block (heading + "Scrivici"
 *     mailto + "Prova con" chips), NOT a related-products grid.
 *   - M28 a typo-corrected query shows the amber note box.
 *
 * Same stubbing approach as SearchOverlay.suggestions.test.tsx.
 */
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Product } from '../../../../types';
import {
  getRecentSearches,
  clearRecentSearches,
  rememberSearch,
} from '../../../../lib/searchMatch';

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
    // Interpolate the few keys the assertions read; echo the key otherwise.
    t: (k: string, vars?: Record<string, string | number>) => {
      switch (k) {
        case 'search.categoryCount':
          return `${vars?.count} prodotti`;
        case 'search.seeAll':
          return `Vedi tutti i ${vars?.count} prodotti per "${vars?.query}"`;
        case 'search.suggestionType.course':
          return 'Corso';
        case 'search.noResultsTitle':
          return `Nessun risultato per "${vars?.query}"`;
        case 'search.removeRecent':
          return `Rimuovi "${vars?.query}" dalle ricerche recenti`;
        case 'search.clearAll':
          return 'Cancella';
        case 'search.recentSearches':
          return 'Ricerche recenti';
        case 'search.writeUs':
          return 'Scrivici';
        case 'search.tryWith':
          return 'Prova con';
        case 'search.products':
          return 'Prodotti';
        default:
          return k;
      }
    },
  }),
}));

vi.mock('../../../../hooks/useStoreContent', () => ({
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

vi.mock('../../../../context/ProductContext', () => ({
  useProducts: () => ({ products: PRODUCTS }),
}));

// One course so the "Corso" suggestion path is exercised.
vi.mock('../../../../hooks/useCourses', () => ({
  useCourses: () => ({
    data: [
      {
        id: 'c1', handle: 'corso-base', title: 'Corso Base Semipermanente',
        description: 'Impara il semipermanente', level: 'base', duration: '1 giorno',
        students: '', tag: 'Base',
      },
    ],
  }),
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

describe('SearchOverlay — prototype parity', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('M22: idle state renders recent SEARCH queries with delete-X + Cancella; clicking refills the input', () => {
    rememberSearch('rosso');
    rememberSearch('nude');
    const { container } = renderOverlay();

    // Both queries appear as rows.
    expect(screen.getByText('nude')).toBeTruthy();
    expect(screen.getByText('rosso')).toBeTruthy();
    // Clear-all control present.
    expect(screen.getByText('Cancella')).toBeTruthy();
    // Delete-X per row (aria-label contains the query).
    expect(screen.getByLabelText('Rimuovi "rosso" dalle ricerche recenti')).toBeTruthy();

    // Clicking a recent row fills the input.
    fireEvent.click(screen.getByText('nude'));
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('nude');
  });

  it('M22: the delete-X removes a single recent entry', () => {
    rememberSearch('rosso');
    rememberSearch('nude');
    renderOverlay();
    fireEvent.click(screen.getByLabelText('Rimuovi "rosso" dalle ricerche recenti'));
    expect(getRecentSearches()).toEqual(['nude']);
  });

  it('M22: Cancella clears all recent searches', () => {
    rememberSearch('rosso');
    renderOverlay();
    fireEvent.click(screen.getByText('Cancella'));
    expect(getRecentSearches()).toEqual([]);
  });

  it('M24: matched tokens are wrapped in <mark> in the product name', () => {
    clearRecentSearches();
    const { container } = renderOverlay();
    type('rosso');
    const marks = Array.from(container.querySelectorAll('mark'));
    expect(marks.some(m => /rosso/i.test(m.textContent || ''))).toBe(true);
  });

  it('M23: a matching course surfaces a "Corso" suggestion row', () => {
    const { container } = renderOverlay();
    type('corso');
    const courseLink = container.querySelector('a[href="/corsi/corso-base"]');
    expect(courseLink).not.toBeNull();
    expect(courseLink?.textContent).toContain('Corso');
  });

  it('DELTA-1: "corso" shows the course suggestion but NO amber typo note and NO bogus product grid/"Vedi tutti"', () => {
    const { container } = renderOverlay();
    type('corso');

    // Course suggestion still present (left column).
    const courseLink = container.querySelector('a[href="/corsi/corso-base"]');
    expect(courseLink).not.toBeNull();

    // No amber ".sx-note" typo box — "corso" is a real term, not a typo for a
    // product word ("rosso"/"cosi").
    const note = Array.from(container.querySelectorAll('p')).find(p =>
      /#fff6e8/.test(p.getAttribute('class') || ''),
    );
    expect(note).toBeUndefined();

    // No "Prodotti" section header and no "Vedi tutti" link (the course word
    // must not be hijacked into a product grid).
    expect(screen.queryByText('Prodotti')).toBeNull();
    expect(container.querySelector('a[href^="/tutti-prodotti?q="]')).toBeNull();
  });

  it('DELTA-1: a genuine product typo ("rsso") still corrects to "rosso" with products + the amber note (no M28 regression)', () => {
    const { container } = renderOverlay();
    type('rsso');

    // Amber note is shown, correcting to "rosso".
    const note = Array.from(container.querySelectorAll('p')).find(p =>
      /#fff6e8/.test(p.getAttribute('class') || ''),
    );
    expect(note).toBeTruthy();
    expect(note?.querySelector('b')?.textContent).toBe('rosso');

    // The product grid + "Vedi tutti" are present for the corrected query.
    expect(screen.getByText('Prodotti')).toBeTruthy();
    expect(container.querySelector('a[href^="/tutti-prodotti?q="]')).not.toBeNull();
  });

  it('M28: a typo-corrected query shows the amber note box with the corrected term bold', () => {
    const { container } = renderOverlay();
    // "rossso" corrects to "rosso" (one edit) → results for the fixed query.
    type('rossso');
    const note = Array.from(container.querySelectorAll('p')).find(p =>
      /#fff6e8/.test(p.getAttribute('class') || ''),
    );
    expect(note).toBeTruthy();
    // Corrected term is bold.
    const bold = note?.querySelector('b');
    expect(bold?.textContent).toBe('rosso');
    expect(note?.textContent).toContain('rossso'); // original query shown too
  });

  it('M26: a no-results query shows the .sx-none block with a Scrivici mailto, not a related grid', () => {
    const { container } = renderOverlay();
    type('zzzzxqwv');
    // Heading + mailto present.
    expect(screen.getByText('Nessun risultato per "zzzzxqwv"')).toBeTruthy();
    const mailto = container.querySelector('a[href^="mailto:"]');
    expect(mailto).not.toBeNull();
    expect(mailto?.textContent).toContain('Scrivici');
    // "Vedi tutti" (which only appears with results) is absent.
    expect(container.querySelector('a[href^="/tutti-prodotti?q="]')).toBeNull();
  });
});
