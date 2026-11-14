import { useMemo } from 'react';
import { useProducts } from '../context/ProductContext';
import { NAIL_SWATCHES } from '../data/swatches';
import type { Season } from '../data/seasons';
import type { Product } from '../types';

/**
 * Le Stagioni seasons, sourced entirely from the four seasonal Kit
 * products in Medusa (title, description, imagery, shade palette and the
 * shades themselves) instead of the old hardcoded data/seasons.ts. The
 * palette is derived from each kit's child shades — their color name is
 * mapped to a swatch hex.
 */
export interface SeasonVM extends Season {
  kitHandle: string;
  productHandles: string[];
}

const KIT_TO_SEASON: Record<string, string> = {
  'kit-winter-collection': 'WINTER',
  'kit-spring-collection': 'SPRING',
  'kit-summer-collection': 'SUMMER',
  'kit-autumn-collection': 'AUTUMN',
};
const SEASON_ORDER = ['WINTER', 'SPRING', 'SUMMER', 'AUTUMN'];

// IT color-name → hex, built from the swatch palette (solid colors only),
// plus a few extras for names the palette only carries as gradients
// (giallo/arancione) or not at all (bianco/nero), so most shades resolve
// to a real colour. Anything still unmapped falls back to a neutral.
// Seed extras are kept in a frozen module-level map; the merged lookup is
// built fresh per call so the shared seed is never mutated (order-safe).
const COLOR_HEX_SEED: Record<string, string> = {
  GIALLO: '#FFD400', ARANCIONE: '#FF8C00', BIANCO: '#EDEDED', NERO: '#1A1A1A',
};

function buildColorHex(): Record<string, string> {
  const map: Record<string, string> = { ...COLOR_HEX_SEED };
  for (const s of NAIL_SWATCHES) {
    if (typeof s.color === 'string' && s.color.startsWith('#')) {
      for (const pc of s.productColors) map[pc.toUpperCase()] = s.color;
    }
  }
  return map;
}
const FALLBACK_HEX = '#C7B9A2';

export function useSeasons(): SeasonVM[] {
  const { products } = useProducts();
  return useMemo(() => {
    const colorHex = buildColorHex();
    const byHandle = new Map<string, Product>(products.map(p => [p.handle ?? p.id, p]));
    const out: SeasonVM[] = [];
    for (const name of SEASON_ORDER) {
      const kitHandle = Object.keys(KIT_TO_SEASON).find(k => KIT_TO_SEASON[k] === name);
      const kit = kitHandle ? byHandle.get(kitHandle) : undefined;
      if (!kit || !kitHandle) continue;

      // The single resolved child set drives colors, gallery AND handles, so
      // palette/gallery/handles always describe the exact same products
      // (unresolved bundle handles are dropped everywhere, not just here).
      const resolved = (kit.bundleHandles ?? [])
        .map(h => byHandle.get(h))
        .filter((p): p is Product => Boolean(p));

      // One palette entry per shade (kept in shade order) so the modal's
      // shade grid and full-collection price reflect the real kit size.
      const colors: string[] = resolved.map(
        c => (c.colorName && colorHex[c.colorName.toUpperCase()]) || FALLBACK_HEX
      );

      // Gallery = the kit's own imagery first, then each shade's image, so
      // the season detail view has a real multi-slide carousel (the kit
      // product itself only carries one image).
      const gallery = Array.from(new Set([
        ...(kit.gallery && kit.gallery.length ? kit.gallery : (kit.image ? [kit.image] : [])),
        ...resolved.map(c => c.image).filter(Boolean),
      ]));

      out.push({
        name,
        kitHandle,
        title: kit.name,
        description: kit.description,
        color: colors[0] ?? '#1d1d1f',
        image: kit.image,
        gallery,
        colors,
        productHandles: resolved.map(c => c.handle ?? c.id),
      });
    }
    return out;
  }, [products]);
}
