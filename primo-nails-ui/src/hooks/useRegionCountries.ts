import { useQuery } from "@tanstack/react-query"
import { sdk } from "../lib/medusa"

export interface RegionCountry {
  /** ISO 3166-1 alpha-2 (lowercase) — Medusa convention. */
  iso_2: string
  /** Display name in the region's default language (e.g. "Italy", "France"). */
  display_name: string
}

/** Minimal region shape both consumers read (OA-40 shared cache). */
export interface RegionLite {
  id: string
  countries?: Array<{ iso_2?: string; display_name?: string }>
}

/**
 * ONE shared region query key + fetcher (OA-40). Both `useRegionCountries`
 * (checkout country dropdown) and `getRegionId` (product pricing) read through
 * this key so React Query deduplicates the `region.list()` round-trip instead
 * of each keeping its own cache. Fetch the union of fields both need: `id`
 * (for pricing) + country iso/name (for the dropdown).
 */
export const regionsQueryKey = ["regions"] as const
export const REGIONS_STALE_MS = 60 * 60 * 1000 // 1h — region list rarely changes

export async function regionsQueryFn(): Promise<RegionLite[]> {
  // The SDK's region type resolves loosely (its `@medusajs/types` dependency
  // isn't installed here), so the result would collapse to `any`. Narrow it to
  // the minimal shape we actually read.
  const { regions } = await sdk.store.region.list({
    fields: "id,countries.iso_2,countries.display_name",
  })
  return (regions ?? []) as RegionLite[]
}

/** Derive the deduped, sorted country union from the shared region list. */
export function regionsToCountries(regions: RegionLite[]): RegionCountry[] {
  const map = new Map<string, RegionCountry>()
  for (const region of regions) {
    for (const c of region.countries ?? []) {
      if (c?.iso_2 && !map.has(c.iso_2)) {
        map.set(c.iso_2, {
          iso_2: c.iso_2,
          display_name: c.display_name || c.iso_2.toUpperCase(),
        })
      }
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.display_name.localeCompare(b.display_name, "en")
  )
}

/**
 * Returns the union of countries across all configured Medusa regions.
 * Used to populate the checkout country dropdown — guarantees tax +
 * shipping zones resolve, since only countries Medusa knows about
 * appear as options.
 */
export function useRegionCountries() {
  return useQuery<RegionLite[], Error, RegionCountry[]>({
    queryKey: regionsQueryKey,
    queryFn: regionsQueryFn,
    select: regionsToCountries,
    staleTime: REGIONS_STALE_MS,
  })
}
