import { useQuery } from "@tanstack/react-query"
import { sdk } from "../lib/medusa"
import { medusaProductToProduct, type Product } from "../types"
import { queryClient } from "../lib/queryClient"
import { regionsQueryKey, regionsQueryFn, REGIONS_STALE_MS } from "./useRegionCountries"

// OA-40: resolve the region through the SHARED React Query cache (same key/fn as
// useRegionCountries) instead of a private module-scope cache. fetchQuery gives
// built-in single-flight + caching, and — crucially — shares the result with
// useRegionCountries so /checkout no longer fires two region.list() round-trips.
export function invalidateRegionCache(): void {
  queryClient.invalidateQueries({ queryKey: regionsQueryKey })
}

export async function getRegionId(): Promise<string> {
  const regions = await queryClient.fetchQuery({
    queryKey: regionsQueryKey,
    queryFn: regionsQueryFn,
    staleTime: REGIONS_STALE_MS,
  })
  if (!regions?.length) throw new Error("No regions configured")
  return regions[0].id
}

// Raw Medusa products are fetched once and cached locale-agnostically.
// Locale-aware view models are derived in ProductContext, so flipping
// IT↔EN no longer triggers a refetch — translations live in product
// metadata and are resolved client-side.
export function useMedusaProducts() {
  return useQuery({
    queryKey: ["products", "list"],
    queryFn: async () => {
      const regionId = await getRegionId()
      const { products, count } = await sdk.store.product.list({
        limit: 200,
        offset: 0,
        region_id: regionId,
        fields:
          "handle,title,description,status,thumbnail,metadata,+created_at,+tags.value,+categories.name,+categories.handle,+categories.parent_category_id,+categories.metadata,+images.url,*variants.calculated_price,+variants.title,+variants.sku,+variants.inventory_quantity,+variants.manage_inventory,+variants.allow_backorder,+variants.options.value,+variants.options.option.title,+options.title,+options.values.value",
      })
      return {
        raw: products,
        count: count || products.length,
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useMedusaProduct(handle: string) {
  return useQuery({
    queryKey: ["products", "detail", handle],
    queryFn: async () => {
      const regionId = await getRegionId()
      const { products } = await sdk.store.product.list({
        handle,
        limit: 1,
        region_id: regionId,
        fields:
          "handle,title,description,status,thumbnail,metadata,+created_at,+tags.value,+categories.name,+categories.handle,+categories.parent_category_id,+categories.metadata,+images.url,*variants.calculated_price,+variants.title,+variants.sku,+variants.inventory_quantity,+variants.manage_inventory,+variants.allow_backorder,+variants.options.value,+variants.options.option.title,+options.title,+options.values.value",
      })
      return products[0] || null
    },
    enabled: !!handle,
    staleTime: 5 * 60 * 1000,
  })
}

// Convenience for components that want a Product view model directly.
// Re-projects whenever locale changes without refetching.
export { medusaProductToProduct }
