import { QueryClient } from "@tanstack/react-query"

/**
 * The single app-wide React Query client.
 *
 * Exported from its own module (rather than created inline in App.tsx) so that
 * non-React code — e.g. `getRegionId()` in hooks/useProducts.ts — can call
 * `queryClient.fetchQuery(...)` against the SAME cache the `<QueryClientProvider>`
 * uses. Constructing a second client would fork the cache and defeat
 * deduplication (OA-40).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
})
