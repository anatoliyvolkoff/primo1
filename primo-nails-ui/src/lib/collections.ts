import type { Product } from '../types';

/**
 * The four seasonal collections, keyed by their seasonal Kit handle.
 * Labels match FilterBar's COLLECTIONS list.
 */
export const SEASONAL_KITS: Record<string, string> = {
  'kit-autumn-collection': 'autumn collection',
  'kit-winter-collection': 'winter collection',
  'kit-spring-collection': 'spring collection',
  'kit-summer-collection': 'summer collection',
};

export const COLLECTION_LABELS = Object.values(SEASONAL_KITS);

/**
 * Builds a `product → collection-labels` lookup from the seasonal kits'
 * bundle children. A shade that ships inside a seasonal kit is filterable
 * by that collection — previously only the kit's own description matched,
 * so the 76 individual semipermanente shades never surfaced a Collections
 * filter. The legacy description match is kept as a fallback.
 */
export function buildCollectionLookup(allProducts: Product[]): (p: Product) => string[] {
  const byHandle = new Map<string, Set<string>>();
  const add = (handle: string | undefined, label: string) => {
    if (!handle) return;
    if (!byHandle.has(handle)) byHandle.set(handle, new Set());
    byHandle.get(handle)!.add(label);
  };
  for (const prod of allProducts) {
    const label = SEASONAL_KITS[prod.handle ?? ''];
    if (!label) continue;
    add(prod.handle, label); // the kit itself
    for (const child of prod.bundleHandles ?? []) add(child, label); // its shades
  }
  return (p: Product) => {
    const fromKits = byHandle.get(p.handle ?? '');
    const labels = fromKits ? Array.from(fromKits) : [];
    const desc = p.description?.toLowerCase() ?? '';
    for (const label of COLLECTION_LABELS) {
      if (desc.includes(label) && !labels.includes(label)) labels.push(label);
    }
    return labels;
  };
}
