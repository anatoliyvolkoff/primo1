import { useQuery } from "@tanstack/react-query"
import { sdk } from "../lib/medusa"

export interface Testimonial {
  id: string
  author: string
  role: string
  text: string
  rating: number
  avatar_url: string | null
  date_iso: string | null
  sort_order: number
  is_published: boolean
  /** EN overrides: { translations: { role | text: { en } } }. IT = base columns. */
  metadata?: Record<string, any> | null
}

export interface HeroSlide {
  id: string
  image_url: string
  alt: string | null
  link: string | null
  sort_order: number
  is_published: boolean
  // Per-slide overlay copy + CTAs. All optional — empty falls back to the
  // storefront's default hero copy (translation strings + default CTAs).
  title?: string | null
  subtitle?: string | null
  cta_label?: string | null
  cta_link?: string | null
  cta2_label?: string | null
  cta2_link?: string | null
  // Optional background video (muted autoplay loop) + poster still.
  video_url?: string | null
  poster_url?: string | null
}

export interface ProductListSlot {
  title: string | null
  handles: string[]
}

export interface StoreContent {
  testimonials: Testimonial[]
  heroSlides: HeroSlide[]
  settings: Record<string, unknown>
  productLists: Record<string, ProductListSlot>
}

/**
 * Pulls testimonials / hero slides / store settings from the custom
 * content module on Medusa. One round-trip; 10-minute stale window so
 * editing copy in the admin shows up reasonably quickly without
 * thrashing the API.
 */
export function useStoreContent() {
  return useQuery<StoreContent>({
    queryKey: ["store-content"],
    queryFn: async () => {
      // Cast through `any` because sdk.client.fetch isn't typed for our
      // custom non-resource endpoint.
      const data = await (sdk.client.fetch as any)("/store/content", {
        method: "GET",
      })
      return data as StoreContent
    },
    staleTime: 10 * 60 * 1000,
  })
}

/** Convenience: read a single setting by key with a typed default. */
export function useStoreSetting<T>(key: string, fallback: T): T {
  const { data } = useStoreContent()
  const value = data?.settings?.[key]
  if (value == null) return fallback
  // Admin settings are stored as free-form JSON, so a numeric setting can come
  // back as a string (e.g. "199"). Coerce to the fallback's type so consumers
  // doing arithmetic don't get a string (which would poison `a - b`) (LB174-1).
  if (typeof fallback === "number") {
    const n = Number(value)
    return (Number.isFinite(n) ? n : fallback) as T
  }
  if (typeof fallback === "boolean") {
    // Admin stores booleans as JSON, but a value could arrive as the string
    // "true"/"false" — coerce so a toggle setting reads reliably.
    if (value === true || value === "true") return true as T
    if (value === false || value === "false") return false as T
    return fallback
  }
  return value as T
}

/**
 * Live VAT (IVA) rate as a percentage, from the admin-managed `vat_rate_percent`
 * store setting. DEFAULT 0 = VAT-exempt (regime forfettario) → no "IVA inclusa"
 * line is shown (callers gate on `vatPortion(total, rate) > 0`). Set to 22 in
 * Admin to charge/record VAT — no rebuild needed. Never negative.
 */
export function useVatRatePct(): number {
  const rate = useStoreSetting<number>("vat_rate_percent", 0)
  return Number.isFinite(rate) && rate >= 0 ? rate : 0
}

export interface BannerContent {
  image?: string
  /** optional separate mobile crop */
  mobileImage?: string
}

/**
 * Admin-editable page/category banner imagery, from the `page_banners`
 * store-setting. Keyed by static-page name (courses, about, care, nailArt,
 * allProducts), by category slug, or `categoryDefault` (the global fallback for
 * category pages). Empty object when unset — callers pass a built-in fallback.
 */
export function usePageBanners(): Record<string, BannerContent> {
  return useStoreSetting<Record<string, BannerContent>>("page_banners", {})
}

/** Resolve a single banner by key, falling back to a built-in default image. */
export function useBanner(key: string, fallbackImage: string): { image: string; mobileImage?: string } {
  const all = usePageBanners()
  const b = all[key]
  return { image: b?.image || fallbackImage, mobileImage: b?.mobileImage || undefined }
}

export interface SeasonContent {
  mainImage?: string
  gallery?: string[]
  multiply?: boolean
}

/**
 * Admin-editable Le Stagioni imagery (main image / gallery / multiply per
 * season), from the `seasons` store-setting. Empty object when unset — callers
 * fall back to the bundled content.json so the block always renders.
 */
export function useSeasonsContent(): Record<string, SeasonContent> {
  return useStoreSetting<Record<string, SeasonContent>>("seasons", {})
}

/**
 * Returns the product handles configured for a given homepage slot.
 * Empty array when the slot is unconfigured — callers fall back to
 * their own default selection so the page never renders empty.
 */
export function useProductSlot(slotKey: string): ProductListSlot {
  const { data } = useStoreContent()
  return data?.productLists?.[slotKey] ?? { title: null, handles: [] }
}
