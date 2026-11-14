import { useState } from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, useSearchParams, useNavigate } from 'react-router-dom';
import type { Product } from '../types';

// ── Drive the product catalogue the page paginates over. Mutable so the test
//    can simulate the async empty→loaded transition that used to clobber ?page. ──
const mockProducts = { current: { products: [] as Product[], loading: true, error: null as unknown } };
vi.mock('../context/ProductContext', () => ({
  useProducts: () => mockProducts.current,
}));

// ── Neutralise presentational / side-effecty deps so the test asserts purely
//    on pagination behaviour. ──
vi.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('../hooks/useStoreContent', () => ({
  useBanner: () => ({ image: '', mobileImage: '' }),
}));
vi.mock('../lib/useSeo', () => ({ useSeo: () => {} }));
vi.mock('../components/layout/Banner', () => ({
  Banner: () => <div data-testid="banner" />,
}));
vi.mock('../components/Breadcrumbs', () => ({
  Breadcrumbs: () => <div data-testid="breadcrumbs" />,
}));
// RunningBanner (TPO & HEMA marquee below the grid) pulls store-setting /
// shipping-zone hooks that aren't relevant here — stub it out.
vi.mock('../components/collections/RunningBanner', () => ({
  RunningBanner: () => <div data-testid="running-banner" />,
}));

// FilterBar stub — crucially mirrors the real bar's behaviour of re-pinning
// priceRange to the real catalogue max once products load. That empty→loaded
// priceRange change is exactly what used to trip the "reset to page 1" effect
// and strip a deep-linked ?page.
// Captures the live FilterBar props so facet-composition tests can drive the
// price slider + sort setter the real bar owns (no panel interaction needed).
const filterBarApi: {
  current: {
    setPriceRange?: (r: [number, number]) => void;
    onSortChange?: (o: string) => void;
  } | null;
} = { current: null };
vi.mock('../components/FilterBar', () => ({
  FilterBar: (props: {
    facetProducts?: Product[];
    priceRange: [number, number];
    setPriceRange: (r: [number, number]) => void;
    onSortChange: (o: string) => void;
    clearAll: () => void;
    setSelectedColors: (c: string[]) => void;
  }) => {
    filterBarApi.current = props;
    const { facetProducts, priceRange, setPriceRange, clearAll, setSelectedColors } = props;
    // Re-pin the range to the catalogue max on first non-empty product set,
    // matching FilterBar's real useEffect (default sentinel is [0, 100]).
    if (facetProducts && facetProducts.length > 0 && priceRange[0] === 0 && priceRange[1] === 100) {
      let max = 0;
      for (const p of facetProducts) {
        const v = p.priceAmount ?? (parseFloat(p.price) || 0);
        if (v > max) max = v;
      }
      const pinned = Math.max(10, Math.ceil(max));
      if (pinned !== 100) setPriceRange([0, pinned]);
    }
    // Expose the real clearAll + a swatch toggle the bar uses in production, so
    // the B4 write-back test and the out-of-range-page regression can drive the
    // state→URL sync directly (no empty-state / ?q= needed).
    return (
      <div data-testid="filter-bar">
        <button data-testid="clear-all" onClick={clearAll} />
        <button data-testid="pick-rosso" onClick={() => setSelectedColors(['rosso'])} />
      </div>
    );
  },
}));

// ProductCard → print the product name so the visible page is assertable.
vi.mock('../components/ProductCard', () => ({
  ProductCard: ({ product }: { product: Product }) => (
    <div data-testid="product-card">{product.name}</div>
  ),
}));

// Pagination stub — surface the current page number so we can assert on it.
vi.mock('../components/Pagination', () => ({
  Pagination: ({ currentPage }: { currentPage: number }) => (
    <div data-testid="current-page">{currentPage}</div>
  ),
}));

import { AllProducts } from './AllProducts';

const makeProduct = (i: number): Product =>
  ({
    id: `p${i}`,
    name: `Product ${i}`,
    description: '',
    price: '10',
    priceAmount: 10 + (i % 5), // some price spread so the max isn't 100
    category: 'Cat',
    categoryHandle: 'cat',
    image: '',
    isVisible: true,
    inStock: true,
  }) as Product;

// 48 products @ 16/page → 3 pages, so ?page=3 is valid.
const catalogue = Array.from({ length: 48 }, (_, i) => makeProduct(i + 1));

// Harness that keeps a single MemoryRouter + AllProducts mounted while the
// mocked product context flips from empty→loaded — reproducing the real async
// load on ONE continuous mount (a fresh MemoryRouter per rerender would reset
// both the URL and the reset-guard ref, hiding the bug).
let triggerLoad: () => void;
function Harness() {
  const [loaded, setLoaded] = useState(false);
  triggerLoad = () => setLoaded(true);
  mockProducts.current = loaded
    ? { products: catalogue, loading: false, error: null }
    : { products: [], loading: true, error: null };
  return (
    <MemoryRouter initialEntries={['/tutti-prodotti?page=3']}>
      <AllProducts />
    </MemoryRouter>
  );
}

// Reset the module-level product mock before each test so ordering can't leak
// state between this file's cases (or across files sharing the mock pattern).
beforeEach(() => {
  mockProducts.current = { products: [], loading: true, error: null };
  filterBarApi.current = null;
});

describe('AllProducts — deep-linked ?page survives async product load (Q2)', () => {
  it('keeps ?page=3 after the empty→loaded product transition', () => {
    render(<Harness />);

    // Products arrive on the SAME mounted instance — the async empty→loaded
    // transition. FilterBar re-pins priceRange, and (pre-fix) the reset-to-
    // page-1 effect fired here and stripped the deep-linked ?page.
    act(() => {
      triggerLoad();
    });

    // Page 3 must be preserved (products 33–48 shown), not reset to page 1.
    expect(screen.getByTestId('current-page').textContent).toBe('3');
    const names = screen.getAllByTestId('product-card').map(el => el.textContent);
    expect(names).toContain('Product 33');
    expect(names).not.toContain('Product 1');
  });

  // M43 regression: when a product is priced ABOVE the [0,100] default sentinel,
  // FilterBar's empty→loaded price re-pin moves priceRange[1] from 100 up past
  // 100 (e.g. [0,150]). The reset guard normalizes a full/untouched range to a
  // constant token; if that normalization only recognised priceRange[1] >=
  // catalogPriceMax it would MISS the raw [0,100] sentinel (100 < 150), read the
  // pin as a user filter change, and clobber the deep-linked ?page. This pins the
  // sentinel as "full" too.
  it('keeps ?page=3 across the load even when a product price exceeds the 100 sentinel', () => {
    // Rebuild a catalogue where one product costs 150 (> the [0,100] default).
    const expensive = catalogue.map((p, i) =>
      i === 0 ? ({ ...p, priceAmount: 150 } as Product) : p
    );
    let trigger: () => void = () => {};
    function ExpensiveHarness() {
      const [loaded, setLoaded] = useState(false);
      trigger = () => setLoaded(true);
      mockProducts.current = loaded
        ? { products: expensive, loading: false, error: null }
        : { products: [], loading: true, error: null };
      return (
        <MemoryRouter initialEntries={['/tutti-prodotti?page=3']}>
          <AllProducts />
        </MemoryRouter>
      );
    }

    render(<ExpensiveHarness />);
    act(() => {
      trigger();
    });

    expect(screen.getByTestId('current-page').textContent).toBe('3');
    const names = screen.getAllByTestId('product-card').map(el => el.textContent);
    expect(names).toContain('Product 33');
    expect(names).not.toContain('Product 1');
  });
});

// ── Batch 3: the catalogue reads ?q= / ?color= / ?collection= so the search
//    overlay's links land on a real results surface. ──
describe('AllProducts — URL search params drive the results', () => {
  // A small, searchable catalogue: one red gel, one blue top coat, and a
  // seasonal kit (so a collection label resolves via buildCollectionLookup).
  const searchCatalogue: Product[] = [
    {
      id: 'red', name: 'Gel Polish Rosso Passione', description: 'smalto rosso',
      price: '12', priceAmount: 12, category: 'Semipermanente', categoryHandle: 'semipermanente',
      handle: 'gel-rosso', colorName: 'ROSSO', image: '', isVisible: true, inStock: true,
    } as Product,
    {
      id: 'blue', name: 'Top Coat Blu', description: 'top coat',
      price: '9', priceAmount: 9, category: 'Top', categoryHandle: 'top',
      handle: 'top-blu', colorName: 'BLU', image: '', isVisible: true, inStock: true,
    } as Product,
    {
      id: 'kit-autumn', name: 'Kit Autumn Collection', description: 'autumn kit',
      price: '49', priceAmount: 49, category: 'Kit', categoryHandle: 'kit',
      handle: 'kit-autumn-collection', bundleHandles: ['gel-rosso'],
      image: '', isVisible: true, inStock: true,
    } as Product,
  ];

  const renderAt = (url: string) => {
    mockProducts.current = { products: searchCatalogue, loading: false, error: null };
    return render(
      <MemoryRouter initialEntries={[url]}>
        <AllProducts />
      </MemoryRouter>
    );
  };

  const shownNames = () =>
    screen.queryAllByTestId('product-card').map(el => el.textContent);

  it('?q= filters the grid to matching products', () => {
    renderAt('/tutti-prodotti?q=rosso');
    const names = shownNames();
    expect(names).toContain('Gel Polish Rosso Passione');
    expect(names).not.toContain('Top Coat Blu');
  });

  it('?q= with a typo corrects and still matches (did-you-mean)', () => {
    // "rosoo" → corrected to "rosso" by the shared matcher's typo fallback.
    renderAt('/tutti-prodotti?q=rosoo');
    const names = shownNames();
    expect(names).toContain('Gel Polish Rosso Passione');
    expect(names).not.toContain('Top Coat Blu');
  });

  it('?sort=newest pre-applies the newest-first sort (footer "Nuovi Arrivi")', () => {
    mockProducts.current = {
      products: [
        { ...searchCatalogue[0], id: 'old', name: 'Old', createdAt: '2025-01-01T00:00:00Z' } as Product,
        { ...searchCatalogue[1], id: 'new', name: 'New', createdAt: '2026-06-01T00:00:00Z' } as Product,
      ],
      loading: false,
      error: null,
    };
    function SortProbe() {
      const [params] = useSearchParams();
      return <div data-testid="sort-param">{params.get('sort') ?? ''}</div>;
    }
    render(
      <MemoryRouter initialEntries={['/tutti-prodotti?sort=newest']}>
        <AllProducts />
        <SortProbe />
      </MemoryRouter>
    );
    expect(shownNames()).toEqual(['New', 'Old']);

    // Picking another sort drops ?sort=newest so the footer link re-applies it.
    act(() => filterBarApi.current?.onSortChange?.('price-desc'));
    expect(screen.getByTestId('sort-param').textContent).toBe('');
  });

  it('?color= pre-applies the colour facet', () => {
    renderAt('/tutti-prodotti?color=rosso');
    const names = shownNames();
    expect(names).toContain('Gel Polish Rosso Passione');
    expect(names).not.toContain('Top Coat Blu');
  });

  it('?collection= pre-applies the collection facet', () => {
    renderAt('/tutti-prodotti?collection=autumn%20collection');
    const names = shownNames();
    // The kit itself and its bundled red shade belong to "autumn collection";
    // the unrelated blue top coat does not.
    expect(names).toContain('Kit Autumn Collection');
    expect(names).toContain('Gel Polish Rosso Passione');
    expect(names).not.toContain('Top Coat Blu');
  });

  // B2 regression: the header search overlay navigates in place (SPA <Link>, no
  // remount) to ?color= / ?collection=. Pre-fix these facets were seeded only by
  // mount-once lazy useState initializers, so an in-place param change left the
  // grid unfiltered. The URL→state sync effect must re-apply the facet when
  // searchParams changes post-mount.
  it('applies ?color= when the param changes in place (no remount)', () => {
    mockProducts.current = { products: searchCatalogue, loading: false, error: null };

    let setColor: () => void;
    function ColorHarness() {
      const [sp, setSp] = useSearchParams();
      setColor = () => {
        const next = new URLSearchParams(sp);
        next.set('color', 'rosso');
        setSp(next);
      };
      return <AllProducts />;
    }

    render(
      <MemoryRouter initialEntries={['/tutti-prodotti']}>
        <ColorHarness />
      </MemoryRouter>
    );
    // No facet yet → full catalogue.
    expect(shownNames()).toContain('Top Coat Blu');

    act(() => { setColor(); });

    const names = shownNames();
    expect(names).toContain('Gel Polish Rosso Passione');
    expect(names).not.toContain('Top Coat Blu');
  });

  it('applies ?collection= when the param changes in place (no remount)', () => {
    mockProducts.current = { products: searchCatalogue, loading: false, error: null };

    let setCollection: () => void;
    function CollectionHarness() {
      const [sp, setSp] = useSearchParams();
      setCollection = () => {
        const next = new URLSearchParams(sp);
        next.set('collection', 'autumn collection');
        setSp(next);
      };
      return <AllProducts />;
    }

    render(
      <MemoryRouter initialEntries={['/tutti-prodotti']}>
        <CollectionHarness />
      </MemoryRouter>
    );
    expect(shownNames()).toContain('Top Coat Blu');

    act(() => { setCollection(); });

    const names = shownNames();
    expect(names).toContain('Kit Autumn Collection');
    expect(names).not.toContain('Top Coat Blu');
  });

  // B4 regression: removing a colour chip / clearAll must also strip the stale
  // ?color= from the URL (state→URL write-back), so the filter doesn't resurrect
  // from the URL on reload once the B2 URL→state sync exists. The page is seeded
  // from ?color=rosso (grid non-empty), then clearAll fires via the FilterBar —
  // exactly the lever the real bar uses — and the param must disappear.
  it('clearAll strips a stale ?color= from the URL (state→URL write-back)', () => {
    mockProducts.current = { products: searchCatalogue, loading: false, error: null };

    let currentUrl = '';
    function UrlProbe() {
      const [sp] = useSearchParams();
      currentUrl = sp.toString();
      return null;
    }

    render(
      <MemoryRouter initialEntries={['/tutti-prodotti?color=rosso']}>
        <UrlProbe />
        <AllProducts />
      </MemoryRouter>
    );

    // ?color=rosso seeded the facet → only the red product shows, URL has color=rosso.
    expect(shownNames()).toContain('Gel Polish Rosso Passione');
    expect(shownNames()).not.toContain('Top Coat Blu');
    expect(currentUrl).toContain('color=rosso');

    act(() => { screen.getByTestId('clear-all').click(); });

    // clearAll() cleared selectedColors → the state→URL effect drops the param so
    // nothing resurrects on reload; the grid is unfiltered again.
    expect(currentUrl).not.toContain('color=rosso');
    expect(shownNames()).toContain('Top Coat Blu');
  });

  // B2/B4 regression (out-of-range page race): adding a colour facet via the
  // FilterBar while on ?page=N (N≥2), where the narrower result set makes page N
  // out of range, must still APPLY the facet. usePageParam's out-of-range repair
  // effect is a third concurrent setSearchParams writer; because React Router 7
  // does not compose same-commit setSearchParams calls, the repair (which carries
  // no colour) could win and wipe the just-written ?color=, after which the
  // URL→state sync would clear selectedColors — dropping the user's selection.
  it('adding a colour facet while on page ≥2 applies it (repair-effect race)', () => {
    // 20 products, only 1 is rosso. Unfiltered → 2 pages (so page 2 is valid);
    // after picking rosso → 1 product, so page 2 becomes out of range.
    const many: Product[] = Array.from({ length: 20 }, (_, i) =>
      ({
        id: `p${i}`, name: `Item ${i}`, description: 'x',
        price: '10', priceAmount: 10, category: 'C', categoryHandle: 'c',
        handle: `p${i}`, colorName: i === 0 ? 'ROSSO' : 'BLU',
        image: '', isVisible: true, inStock: true,
      }) as Product
    );
    mockProducts.current = { products: many, loading: false, error: null };

    let currentUrl = '';
    function UrlProbe() {
      const [sp] = useSearchParams();
      currentUrl = sp.toString();
      return null;
    }

    render(
      <MemoryRouter initialEntries={['/tutti-prodotti?page=2']}>
        <UrlProbe />
        <AllProducts />
      </MemoryRouter>
    );
    // On page 2 with no facet (16/page → items 16..19 shown).
    expect(screen.getByTestId('current-page').textContent).toBe('2');

    act(() => { screen.getByTestId('pick-rosso').click(); });

    // The colour must apply: only the single rosso product shows, the URL carries
    // color=rosso (not wiped by the repair), and pagination snapped to page 1.
    const names = shownNames();
    expect(names).toContain('Item 0');
    expect(names).not.toContain('Item 1');
    expect(currentUrl).toContain('color=rosso');
    expect(screen.getByTestId('current-page').textContent).toBe('1');
  });

  it('shows the "Results for <q>" pill when a query is active, with a clear (×) button', () => {
    renderAt('/tutti-prodotti?q=rosso');
    // The pill prints the raw query and the results-for label (echoed keys).
    expect(screen.getByText('search.resultsFor')).toBeTruthy();
    expect(screen.getByText('rosso')).toBeTruthy();
    // The × clears the query — labelled search.clearQuery.
    expect(screen.getByLabelText('search.clearQuery')).toBeTruthy();
  });

  it('does NOT render the query pill when there is no ?q=', () => {
    renderAt('/tutti-prodotti');
    expect(screen.queryByText('search.resultsFor')).toBeNull();
  });

  it('renders the "did you mean" note when a typo was corrected', () => {
    // "rosoo" corrects to "rosso"; the note (search.didYouMean) must render.
    renderAt('/tutti-prodotti?q=rosoo');
    expect(screen.getByText('search.didYouMean')).toBeTruthy();
  });

  it('clicking the pill × strips ?q= from the URL and restores the full catalogue', () => {
    let currentUrl = '';
    function UrlProbe() {
      const [sp] = useSearchParams();
      currentUrl = sp.toString();
      return null;
    }
    mockProducts.current = { products: searchCatalogue, loading: false, error: null };
    render(
      <MemoryRouter initialEntries={['/tutti-prodotti?q=rosso']}>
        <UrlProbe />
        <AllProducts />
      </MemoryRouter>
    );
    expect(shownNames()).not.toContain('Top Coat Blu');
    expect(currentUrl).toContain('q=rosso');

    act(() => { screen.getByLabelText('search.clearQuery').click(); });

    expect(currentUrl).not.toContain('q=rosso');
    expect(shownNames()).toContain('Top Coat Blu');
  });

  it('renders the product-count line once products have loaded', () => {
    renderAt('/tutti-prodotti');
    // Count line key (search.categoryCount) is present; it is NOT rendered while
    // loading (guarded by !loading in the component), which this catalogue is not.
    expect(screen.getAllByText('search.categoryCount').length).toBeGreaterThan(0);
  });

  it('composes ?q= + ?color= + price + sort together (facet composition)', () => {
    // Two red products (one cheap, one pricey) + an unrelated blue. q=rosso +
    // color=rosso both narrow to the reds; the price ceiling then drops the
    // pricey one; sort=price-asc orders what remains.
    const composed: Product[] = [
      { id: 'r1', name: 'Rosso Cheap', description: 'rosso', price: '5', priceAmount: 5,
        category: 'C', categoryHandle: 'c', handle: 'r1', colorName: 'ROSSO',
        image: '', isVisible: true, inStock: true } as Product,
      { id: 'r2', name: 'Rosso Pricey', description: 'rosso', price: '80', priceAmount: 80,
        category: 'C', categoryHandle: 'c', handle: 'r2', colorName: 'ROSSO',
        image: '', isVisible: true, inStock: true } as Product,
      { id: 'b1', name: 'Blu Thing', description: 'blu', price: '6', priceAmount: 6,
        category: 'C', categoryHandle: 'c', handle: 'b1', colorName: 'BLU',
        image: '', isVisible: true, inStock: true } as Product,
    ];
    mockProducts.current = { products: composed, loading: false, error: null };

    let narrowPrice: () => void;
    let setSort: () => void;
    function ComposeHarness() {
      // Drive the FilterBar stub's price setter + sort via captured closures.
      narrowPrice = () => filterBarApi.current!.setPriceRange!([0, 50]);
      setSort = () => filterBarApi.current!.onSortChange!('price-asc');
      return <AllProducts />;
    }

    render(
      <MemoryRouter initialEntries={['/tutti-prodotti?q=rosso&color=rosso']}>
        <ComposeHarness />
      </MemoryRouter>
    );
    // q + color already narrowed to the two reds (blue gone).
    expect(shownNames()).toEqual(expect.arrayContaining(['Rosso Cheap', 'Rosso Pricey']));
    expect(shownNames()).not.toContain('Blu Thing');

    // Narrow the price ceiling → drops the €80 red.
    act(() => { narrowPrice(); });
    expect(shownNames()).toEqual(['Rosso Cheap']);

    // Sort stays stable with a single item; applying it must not resurrect the
    // dropped product or the blue.
    act(() => { setSort(); });
    expect(shownNames()).toEqual(['Rosso Cheap']);
  });

  it('applies ?color= on back/forward navigation between colour states', () => {
    mockProducts.current = { products: searchCatalogue, loading: false, error: null };
    let go: (to: string) => void;
    let back: () => void;
    function NavHarness() {
      const navigate = useNavigate();
      go = (to) => navigate(to);
      back = () => navigate(-1);
      return <AllProducts />;
    }
    render(
      <MemoryRouter initialEntries={['/tutti-prodotti']}>
        <NavHarness />
      </MemoryRouter>
    );
    expect(shownNames()).toContain('Top Coat Blu');

    act(() => { go('/tutti-prodotti?color=rosso'); });
    expect(shownNames()).not.toContain('Top Coat Blu');
    expect(shownNames()).toContain('Gel Polish Rosso Passione');

    // Back → the colour facet must clear again (URL→state sync on history pop).
    act(() => { back(); });
    expect(shownNames()).toContain('Top Coat Blu');
  });

  it('changing ?q= resets pagination to page 1', () => {
    // 20 red products @ 16/page → 2 pages; land on page 2, then narrow q on the
    // SAME mounted instance (as the overlay does via navigation) — the reset
    // effect must snap it back to page 1.
    const many: Product[] = Array.from({ length: 20 }, (_, i) =>
      ({
        id: `r${i}`, name: `Rosso Item ${i}`, description: 'rosso',
        price: '10', priceAmount: 10, category: 'C', categoryHandle: 'c',
        handle: `r${i}`, colorName: 'ROSSO', image: '', isVisible: true, inStock: true,
      }) as Product
    );
    mockProducts.current = { products: many, loading: false, error: null };

    // A control that mutates ?q= in place without remounting AllProducts, so the
    // reset-guard ref persists across the query change (a fresh MemoryRouter
    // would reset it and hide the behaviour, like the ?page guard above).
    let narrow: () => void;
    function QueryHarness() {
      const [sp, setSp] = useSearchParams();
      narrow = () => {
        const next = new URLSearchParams(sp);
        next.set('q', 'rosso item 1');
        setSp(next);
      };
      return <AllProducts />;
    }

    render(
      <MemoryRouter initialEntries={['/tutti-prodotti?q=rosso&page=2']}>
        <QueryHarness />
      </MemoryRouter>
    );
    expect(screen.getByTestId('current-page').textContent).toBe('2');

    act(() => { narrow(); });
    expect(screen.getByTestId('current-page').textContent).toBe('1');
  });
});
