/**
 * Query-state edge cases of the search overlay:
 *   - UNIFIED counts (M27): the colour-suggestion count, the "Prodotti" header
 *     count and the "Vedi tutti N" count all agree for a colour query.
 *   - the amber typo note renders the exact "Nessun risultato … / Risultati per …"
 *     copy with the original query and the corrected term bold.
 *   - the empty / no-results state shows the advice line + "Prova con" chips +
 *     a "Scrivici" mailto, and NO related-products grid / "Vedi tutti".
 *   - a suggestion-only query (a course word that matches no product) shows the
 *     course row but NO "Prodotti" grid and NO "Vedi tutti" (no bogus product UI).
 *
 * Complements __tests__/SearchOverlay.suggestions + parity (which assert the row
 * shapes / DELTA-1 note suppression); here the focus is the COUNT agreement, the
 * full empty-state shape, and exact note copy.
 */
import { render, screen, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Product } from '../../../types';

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
    t: (k: string, vars?: Record<string, string | number>) => {
      switch (k) {
        case 'search.categoryCount':
          return `${vars?.count} prodotti`;
        case 'search.results':
          return `${vars?.count} risultati`;
        case 'search.seeAll':
          return `Vedi tutti i ${vars?.count} prodotti per "${vars?.query}"`;
        case 'search.suggestionType.course':
          return 'Corso';
        case 'search.typoNotePrefix':
          return 'Nessun risultato per';
        case 'search.typoNoteResults':
          return 'Risultati per';
        case 'search.noResultsTitle':
          return `Nessun risultato per "${vars?.query}"`;
        case 'search.noResultsAdvice':
          return 'Controlla ortografia o termine più generico.';
        case 'search.tryWith':
          return 'Prova con';
        case 'search.notFoundHelp':
          return 'Non trovi quello che cerchi?';
        case 'search.writeUs':
          return 'Scrivici';
        case 'search.products':
          return 'Prodotti';
        case 'search.popular.0':
          return 'Semipermanente Rosso';
        case 'search.popular.1':
          return 'Top Coat';
        case 'search.popular.2':
          return 'Acrygel Nude';
        case 'search.popular.3':
          return 'Kit Iniziale';
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

// Three ROSSO products so the colour count is a non-trivial N (3) that must
// agree across the colour row / "Prodotti" header / "Vedi tutti".
const PRODUCTS: Product[] = [
  {
    id: 'r1', handle: 'rosso-1', name: 'Semipermanente Rosso', price: '10,00',
    category: 'Semipermanente', categoryHandle: 'semipermanente', colorName: 'ROSSO',
    searchText: 'semipermanente rosso red', isVisible: true, image: '/img.jpg',
  } as Product,
  {
    id: 'r2', handle: 'rosso-2', name: 'Gel Rosso Lacca', price: '11,00',
    category: 'Gel', categoryHandle: 'gel', colorName: 'ROSSO',
    searchText: 'gel rosso lacca red', isVisible: true, image: '/img.jpg',
  } as Product,
  {
    id: 'r3', handle: 'rosso-3', name: 'Top Rosso Brillante', price: '9,00',
    category: 'Top', categoryHandle: 'top', colorName: 'ROSSO',
    searchText: 'top rosso brillante red', isVisible: true, image: '/img.jpg',
  } as Product,
];

vi.mock('../../../context/ProductContext', () => ({
  useProducts: () => ({ products: PRODUCTS }),
}));

// One course whose title/word "corso" matches no product — the suggestion-only
// path.
vi.mock('../../../hooks/useCourses', () => ({
  useCourses: () => ({
    data: [
      {
        id: 'c1', handle: 'corso-base', title: 'Corso Base Nail Art',
        description: 'Impara la nail art', level: 'base', duration: '1 giorno',
        students: '', tag: 'Base',
      },
    ],
  }),
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

describe('SearchOverlay — query state edge cases', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('M27: colour-row count == "Prodotti" header count == "Vedi tutti" count == 3', () => {
    const { container } = renderOverlay();
    type('rosso');

    // Colour suggestion row carries the unified count.
    const colorRow = container.querySelector('a[href="/tutti-prodotti?color=rosso"]');
    expect(colorRow?.textContent).toContain('3 prodotti');

    // "Prodotti" header count.
    expect(screen.getByText('3 risultati')).toBeTruthy();

    // "Vedi tutti" count + query.
    const seeAll = container.querySelector('a[href="/tutti-prodotti?q=rosso"]');
    expect(seeAll?.textContent).toContain('Vedi tutti i 3 prodotti per "rosso"');
  });

  it('M28: a typo query shows the amber note with original query + bold correction', () => {
    const { container } = renderOverlay();
    type('rossso'); // → "rosso"
    const note = Array.from(container.querySelectorAll('p')).find(p =>
      /#fff6e8/.test(p.getAttribute('class') || ''),
    );
    expect(note).toBeTruthy();
    expect(note?.textContent).toContain('Nessun risultato per');
    expect(note?.textContent).toContain('rossso'); // original query echoed
    expect(note?.querySelector('b')?.textContent).toBe('rosso'); // corrected, bold
  });

  it('empty state: advice + "Prova con" chips + "Scrivici" mailto, NO related grid / "Vedi tutti"', () => {
    const { container } = renderOverlay();
    type('zzzzxqwv');

    // No-results heading + advice line.
    expect(screen.getByText('Nessun risultato per "zzzzxqwv"')).toBeTruthy();
    expect(screen.getByText('Controlla ortografia o termine più generico.')).toBeTruthy();

    // "Prova con" chips (from the popular-search fallback keys).
    expect(screen.getByText('Prova con')).toBeTruthy();
    expect(screen.getByText('Semipermanente Rosso')).toBeTruthy();

    // "Scrivici" mailto.
    const mailto = container.querySelector('a[href^="mailto:"]');
    expect(mailto?.textContent).toContain('Scrivici');

    // No product grid header, no "Vedi tutti", no colour/product links.
    expect(screen.queryByText('Prodotti')).toBeNull();
    expect(container.querySelector('a[href^="/tutti-prodotti?q="]')).toBeNull();
    expect(container.querySelector('a[href^="/tutti-prodotti?color="]')).toBeNull();
  });

  it('suggestion-only query ("corso"): course row shows, but NO "Prodotti" grid and NO "Vedi tutti"', () => {
    const { container } = renderOverlay();
    type('corso');

    // Course suggestion present.
    const courseRow = container.querySelector('a[href="/corsi/corso-base"]');
    expect(courseRow).not.toBeNull();
    expect(courseRow?.textContent).toContain('Corso');

    // No bogus product section driven off a false typo-correction.
    expect(screen.queryByText('Prodotti')).toBeNull();
    expect(container.querySelector('a[href^="/tutti-prodotti?q="]')).toBeNull();

    // And no amber typo note (it's a real term, not a typo).
    const note = Array.from(container.querySelectorAll('p')).find(p =>
      /#fff6e8/.test(p.getAttribute('class') || ''),
    );
    expect(note).toBeUndefined();
  });

  it('a 1-char query stays in the idle state (query state needs >1 char)', () => {
    renderOverlay();
    type('r');
    // Idle-only "Cerca per colore" section still shown; no "Prodotti" header.
    expect(screen.getByText('search.byColor')).toBeTruthy();
    expect(screen.queryByText('Prodotti')).toBeNull();
  });
});
