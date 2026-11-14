import {
  deriveMediaItems,
  initialSelectedOptions,
  selectRailProducts,
  deriveSizeGroup,
  deriveSeasonKits,
} from './ProductDetail';
import type { Product } from '../types';

// Minimal Product factory — only the fields the pure helpers read.
const makeProduct = (over: Partial<Product>): Product =>
  ({ id: 'p', name: 'Prod', image: '', ...over } as Product);

describe('deriveMediaItems (UI-002: no fabricated picsum slides)', () => {
  it('thumbnail-only product yields exactly ONE slide and NO picsum URLs', () => {
    const items = deriveMediaItems(
      makeProduct({ image: 'https://cdn.test/thumb.jpg', gallery: [], video: undefined })
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ type: 'image', url: 'https://cdn.test/thumb.jpg' });
    expect(JSON.stringify(items)).not.toMatch(/picsum\.photos/);
  });

  it('product with NO media falls back to a single local placeholder slide', () => {
    const items = deriveMediaItems(makeProduct({ image: '', gallery: [], video: undefined }));
    expect(items).toHaveLength(1);
    expect(items[0].url).toBe('/placeholder-product.svg');
    expect(JSON.stringify(items)).not.toMatch(/picsum\.photos/);
  });

  it('keeps a real gallery and dedupes the entry equal to the thumbnail', () => {
    const items = deriveMediaItems(
      makeProduct({
        image: 'https://cdn.test/a.jpg',
        gallery: ['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg'],
        video: undefined,
      })
    );
    expect(items.map((i) => i.url)).toEqual(['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg']);
  });

  it('appends a video slide last when present', () => {
    const items = deriveMediaItems(
      makeProduct({ image: 'https://cdn.test/a.jpg', gallery: [], video: 'https://cdn.test/v.mp4' })
    );
    expect(items).toHaveLength(2);
    expect(items[1]).toMatchObject({ type: 'video', url: 'https://cdn.test/v.mp4' });
  });
});

// computeSalePercent moved to src/lib/sale.ts — its tests live in src/lib/sale.test.ts.

describe('selectRailProducts (M10: bottom rail = recently-viewed, category fallback)', () => {
  const p = (id: string, over: Partial<Product> = {}): Product =>
    ({ id, name: id, image: '', ...over } as Product);
  const all = [p('a'), p('b'), p('c'), p('d'), p('e'), p('cur'), p('hidden', { isVisible: false })];
  const byId = (id: string) => all.find((x) => x.id === id)!;

  it('shows recently-viewed newest-first, excluding the current product, capped at limit', () => {
    // 5 recent (newest first) + current in the list → current dropped, 4 kept.
    const rail = selectRailProducts(['e', 'd', 'cur', 'c', 'b', 'a'], all, 'cur', []);
    expect(rail.map((x) => x.id)).toEqual(['e', 'd', 'c', 'b']);
  });

  it('drops hidden (isVisible===false) and unknown ids', () => {
    const rail = selectRailProducts(['a', 'hidden', 'ghost', 'b'], all, 'cur', []);
    expect(rail.map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('tops up with the category fallback (deduped) when too few recently-viewed', () => {
    // Only 1 recent ("a"); fill from fallback [a,c,d,e] — "a" already shown, so skipped.
    const rail = selectRailProducts(['a'], all, 'cur', [byId('a'), byId('c'), byId('d'), byId('e')]);
    expect(rail.map((x) => x.id)).toEqual(['a', 'c', 'd', 'e']);
  });

  it('falls back entirely to the category mix when there is no recently-viewed', () => {
    const rail = selectRailProducts([], all, 'cur', [byId('a'), byId('b'), byId('c'), byId('d')]);
    expect(rail.map((x) => x.id)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('initialSelectedOptions (REACT-008: no leak between products)', () => {
  const productA = makeProduct({
    id: 'A',
    variants: [
      { id: 'va', title: 'v', calculated_price: undefined, options: [{ value: '10ml', option: { title: 'Size' } }] } as any,
    ],
  });
  const productB = makeProduct({
    id: 'B',
    variants: [
      { id: 'vb', title: 'v', calculated_price: undefined, options: [{ value: 'Red', option: { title: 'Color' } }] } as any,
    ],
  });

  it('seeds each product from its OWN first variant (B does not inherit A keys)', () => {
    expect(initialSelectedOptions(productA)).toEqual({ Size: '10ml' });
    // Re-seeding for B must yield only B's keys — no leftover "Size" from A.
    const seededB = initialSelectedOptions(productB);
    expect(seededB).toEqual({ Color: 'Red' });
    expect(seededB).not.toHaveProperty('Size');
  });

  it('returns an empty map for a product with no variants/options', () => {
    expect(initialSelectedOptions(makeProduct({ variants: [] }))).toEqual({});
    expect(initialSelectedOptions(undefined)).toEqual({});
  });
});

describe('deriveSizeGroup (prototype `.p-sizes`: same product, multiple formats)', () => {
  const sized = (id: string, name: string, category: string, capacity: string, priceAmount: number): Product =>
    ({ id, handle: id, name, category, capacity, price: priceAmount.toFixed(2), priceAmount, image: '' } as Product);

  const cleaner100 = sized('cleaner-100', 'Cleaner Emotion', 'Preparatori', '100ml', 5);
  const cleaner1000 = sized('cleaner-1000', 'Cleaner Emotion', 'Preparatori', '1000ml', 17);
  const dehydrator = sized('dehydrator', 'Dehydrator', 'Preparatori', '12ml', 7);
  const all = [cleaner1000, cleaner100, dehydrator];

  it('groups same-name + same-category siblings, cheapest-first, when ≥2 sizes exist', () => {
    const group = deriveSizeGroup(cleaner1000, all);
    expect(group.map((p) => p.id)).toEqual(['cleaner-100', 'cleaner-1000']); // sorted by price
    // The current product is always included in the returned set.
    expect(group).toContain(cleaner1000);
  });

  it('returns the SAME group regardless of which size is the current product', () => {
    expect(deriveSizeGroup(cleaner100, all).map((p) => p.id)).toEqual(['cleaner-100', 'cleaner-1000']);
  });

  it('returns [] for a single-size product (→ plain capacity pill, no fake chooser)', () => {
    expect(deriveSizeGroup(dehydrator, all)).toEqual([]);
  });

  it('returns [] when the product has no capacity at all', () => {
    const noCap = sized('x', 'Dehydrator', 'Preparatori', '', 7);
    expect(deriveSizeGroup({ ...noCap, capacity: undefined }, all)).toEqual([]);
  });

  it('does NOT merge same-name products from different categories', () => {
    const other = sized('cleaner-top', 'Cleaner Emotion', 'Top', '100ml', 5);
    // Current is in "Preparatori" — the "Top" one is excluded, leaving one 100ml
    // + one 1000ml in Preparatori (still ≥2 → a valid group of exactly those).
    const group = deriveSizeGroup(cleaner100, [...all, other]);
    expect(group.map((p) => p.id).sort()).toEqual(['cleaner-100', 'cleaner-1000']);
  });

  it('excludes kit (bundle) products from a size family', () => {
    const kit = { ...sized('cleaner-kit', 'Cleaner Emotion', 'Preparatori', '100ml', 9), bundleHandles: ['a'] } as Product;
    const group = deriveSizeGroup(cleaner100, [...all, kit]);
    expect(group.map((p) => p.id)).not.toContain('cleaner-kit');
  });
});

describe('deriveSeasonKits (prototype `#season-tabs`: the four seasonal kits)', () => {
  const kit = (handle: string): Product =>
    ({ id: handle, handle, name: handle, category: 'Kit', image: '', bundleHandles: ['child'] } as Product);
  const winter = kit('kit-winter-collection');
  const spring = kit('kit-spring-collection');
  const summer = kit('kit-summer-collection');
  const autumn = kit('kit-autumn-collection');
  const plain = ({ id: 'p1', handle: 'cleaner-100ml', name: 'Cleaner', category: 'Prep', image: '' } as Product);
  const all = [winter, spring, summer, autumn, plain];

  it('returns the four kits in prototype tab order (winter·spring·summer·autumn) for a seasonal-kit product', () => {
    const tabs = deriveSeasonKits(winter, all);
    expect(tabs.map((tsk) => tsk.product.handle)).toEqual([
      'kit-winter-collection',
      'kit-spring-collection',
      'kit-summer-collection',
      'kit-autumn-collection',
    ]);
    expect(tabs.map((tsk) => tsk.labelKey)).toEqual([
      'collections.season.winter',
      'collections.season.spring',
      'collections.season.summer',
      'collections.season.autumn',
    ]);
  });

  it('returns [] for a non-seasonal-kit product (no tab row)', () => {
    expect(deriveSeasonKits(plain, all)).toEqual([]);
  });

  it('returns [] (drops the whole switcher) when the set is incomplete', () => {
    // winter is the current product but summer is missing from the catalogue.
    expect(deriveSeasonKits(winter, [winter, spring, autumn])).toEqual([]);
  });

  it('returns [] for null / handle-less input', () => {
    expect(deriveSeasonKits(null, all)).toEqual([]);
    expect(deriveSeasonKits({ handle: undefined }, all)).toEqual([]);
  });
});
