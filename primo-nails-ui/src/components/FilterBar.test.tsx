import { render, screen, fireEvent, within } from '@testing-library/react';
import type { Product } from '../types';

// Echo the i18n key (with interpolation appended) so option/count labels are
// assertable without depending on EN/IT copy.
vi.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, vars?: Record<string, unknown>) =>
      vars ? `${k}:${Object.values(vars).join('/')}` : k,
    language: 'en',
  }),
}));

// SortControl pulls its own LanguageContext — stub it out; this file only
// exercises the facet chips, active-filter chips, and clear/remove wiring.
vi.mock('./SortControl', () => ({
  SortControl: () => <div data-testid="sort-control" />,
}));

import { FilterBar } from './FilterBar';

const makeProduct = (over: Partial<Product>): Product =>
  ({
    id: Math.random().toString(36).slice(2),
    name: 'Prod',
    description: '',
    price: '10',
    priceAmount: 10,
    category: 'Cat',
    categoryHandle: 'cat',
    handle: 'prod',
    image: '',
    isVisible: true,
    inStock: true,
    ...over,
  }) as Product;

// Base props: the parent wires every setter + state. Tests override pieces.
function makeProps(over: Partial<React.ComponentProps<typeof FilterBar>> = {}) {
  return {
    sortBy: 'popularity' as const,
    onSortChange: vi.fn(),
    activeFilters: [],
    clearAll: vi.fn(),
    removeFilter: vi.fn(),
    selectedCollections: [],
    setSelectedCollections: vi.fn(),
    selectedEffects: [],
    setSelectedEffects: vi.fn(),
    selectedAvailability: null,
    setSelectedAvailability: vi.fn(),
    priceRange: [0, 100] as [number, number],
    setPriceRange: vi.fn(),
    ...over,
  };
}

// The facet options live inside the expanded panel. Click the "Show filters"
// toggle (there are two — toolbar + chevron; either works).
const expandPanel = () => {
  fireEvent.click(screen.getAllByLabelText('filter.showFilters')[0]);
};

describe('FilterBar — facet options reflect catalogue counts', () => {
  it('hides collection/effect options with a zero count and labels present ones with their count', () => {
    // 3 products: 2 in the autumn kit collection, 1 shimmer effect. "winter
    // collection" and "glitter" have no matches → must not render.
    const kit = makeProduct({
      id: 'kit', handle: 'kit-autumn-collection', name: 'Autumn Kit',
      bundleHandles: ['shade-a'],
    });
    const shade = makeProduct({ id: 'shade-a', handle: 'shade-a', name: 'Shade A' });
    const shimmer = makeProduct({ id: 'shim', handle: 'shim', effect: 'shimmer' });
    const facetProducts = [kit, shade, shimmer];

    // Collection membership comes from the kit lookup, mirroring the pages.
    const collectionsFor = (p: Product) =>
      p.handle === 'kit-autumn-collection' || p.handle === 'shade-a'
        ? ['autumn collection']
        : [];

    render(
      <FilterBar {...makeProps({ facetProducts, collectionsFor })} />
    );
    expandPanel();

    // Both the desktop dropdown and the mobile sheet render while expanded, so
    // each facet group appears twice — assert on the first (desktop) copy.
    const collGroup = screen.getAllByRole('group', { name: 'filter.collections' })[0];
    expect(within(collGroup).getByText('autumn collection')).toBeTruthy();
    expect(within(collGroup).getByText('2')).toBeTruthy(); // count badge
    expect(within(collGroup).queryByText('winter collection')).toBeNull();

    // The effects group shows Shimmer (1) and NOT glitter.
    const effGroup = screen.getAllByRole('group', { name: 'filter.effects' })[0];
    expect(within(effGroup).getByText('filter.effect.shimmer')).toBeTruthy();
    expect(within(effGroup).queryByText('filter.effect.glitter')).toBeNull();
  });

  it('toggles a collection selection on click (calls setSelectedCollections)', () => {
    const setSelectedCollections = vi.fn();
    const kit = makeProduct({ handle: 'kit-autumn-collection', bundleHandles: [] });
    render(
      <FilterBar
        {...makeProps({
          facetProducts: [kit],
          collectionsFor: () => ['autumn collection'],
          setSelectedCollections,
        })}
      />
    );
    expandPanel();
    const collGroup = screen.getAllByRole('group', { name: 'filter.collections' })[0];
    fireEvent.click(within(collGroup).getByText('autumn collection'));
    expect(setSelectedCollections).toHaveBeenCalled();
  });
});

describe('FilterBar — active-filter chips (remove + clearAll)', () => {
  const activeFilters = [
    { type: 'collection', value: 'autumn collection' },
    { type: 'effect', value: 'shimmer' },
  ];

  it('renders an active-count badge and a Clear All control when filters are active', () => {
    render(<FilterBar {...makeProps({ activeFilters })} />);
    // Active count surfaced for a11y as "2 filters active".
    expect(screen.getByLabelText('filter.activeCount:2')).toBeTruthy();
    // Clear All button present (desktop toolbar).
    expect(screen.getByText('filter.clearAll')).toBeTruthy();
  });

  it('calls removeFilter with the clicked chip', () => {
    const removeFilter = vi.fn();
    render(<FilterBar {...makeProps({ activeFilters, removeFilter })} />);
    // Each chip is a button labelled "Remove <value>".
    fireEvent.click(screen.getAllByLabelText('filter.removeFilter:autumn collection')[0]);
    expect(removeFilter).toHaveBeenCalledWith({ type: 'collection', value: 'autumn collection' });
  });

  it('calls clearAll when Clear All is clicked', () => {
    const clearAll = vi.fn();
    render(<FilterBar {...makeProps({ activeFilters, clearAll })} />);
    fireEvent.click(screen.getByText('filter.clearAll'));
    expect(clearAll).toHaveBeenCalled();
  });

  it('renders no active-count badge / Clear All when there are no active filters', () => {
    render(<FilterBar {...makeProps({ activeFilters: [] })} />);
    expect(screen.queryByText('filter.clearAll')).toBeNull();
    // activeCount a11y label is also absent.
    expect(screen.queryByLabelText(/filter\.activeCount/)).toBeNull();
  });
});

describe('FilterBar — empty bar space toggles the panel', () => {
  const barOf = () =>
    (screen.queryAllByLabelText('filter.showFilters')[0] ?? screen.getAllByLabelText('filter.hideFilters')[0])
      .parentElement as HTMLElement;

  it('opens and closes the panel when the empty space of the bar is clicked', () => {
    render(<FilterBar {...makeProps()} />);
    const toggle = screen.getAllByLabelText('filter.showFilters')[0];
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(barOf());
    expect(screen.getAllByLabelText('filter.hideFilters')[0].getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(barOf());
    expect(screen.getAllByLabelText('filter.showFilters')[0].getAttribute('aria-expanded')).toBe('false');
  });

  it('does not double-toggle when a button inside the bar is clicked', () => {
    render(<FilterBar {...makeProps()} />);
    fireEvent.click(screen.getAllByLabelText('filter.showFilters')[0]);
    expect(screen.getAllByLabelText('filter.hideFilters')[0].getAttribute('aria-expanded')).toBe('true');
  });

  it('does not toggle when the sort control area is clicked', () => {
    render(<FilterBar {...makeProps()} />);
    fireEvent.click(screen.getByTestId('sort-control'));
    expect(screen.getAllByLabelText('filter.showFilters')[0].getAttribute('aria-expanded')).toBe('false');
  });
});
