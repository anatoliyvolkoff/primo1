export interface ProductVariant {
  id: string;
  title: string;
  sku: string | null;
  options: { value: string; option?: { title: string } }[];
  calculated_price?: {
    calculated_amount: number;
    original_amount: number;
    currency_code: string;
  };
}

export interface Product {
  id: string;
  handle?: string;
  name: string;
  /**
   * Optional marketing tagline shown under the title on cards / PDP
   * (e.g. "BASE COAT PROFESSIONALE"). Falls back to category name when
   * absent. Stored on Medusa as `metadata.subtitle.{it,en}` (with
   * `metadata.subtitle` also accepted as a plain string for products
   * without translations).
   */
  subtitle?: string;
  description: string;
  price: string;
  priceAmount?: number;
  originalPrice?: string;
  category: string;
  categoryHandle?: string;
  subCategory?: string;
  subCategoryHandle?: string;
  image: string;
  swatchImage?: string;
  colorName?: string;
  hasShade?: boolean;
  /** For Kit products: handles of the standalone child products inside. */
  bundleHandles?: string[];
  badge?: string;
  colors?: string[];
  application?: string;
  ingredients?: string;
  gallery?: string[];
  video?: string;
  capacity?: string;
  features?: string[];
  isVisible?: boolean;
  /** False only when stock is actively managed, depleted, and backorders are off. */
  inStock?: boolean;
  isPromoted?: boolean;
  multiply?: boolean;
  /** Per-product toggle for the PDP "European Quality Standards" block. Set in
   * Admin (metadata.show_quality_standards); off unless explicitly enabled. */
  showStandards?: boolean;
  whyBuy?: string;
  techSpecs?: string;
  howToUse?: string;
  sdsDocs?: string;
  effect?: string;
  /**
   * Locale-independent search index: EN + IT variants of name, description,
   * category, subcategory, colour and effect concatenated. Lets the search
   * return the same results regardless of the current UI language (otherwise
   * "red" matches English text only → different counts per locale).
   */
  searchText?: string;
  /**
   * ISO timestamp of when the product was created in Medusa (`created_at`),
   * surfaced for the "Novità" (newest-first) catalogue sort. Optional because
   * it only arrives when the product query requests it (see useProducts.ts).
   */
  createdAt?: string;
  variants?: ProductVariant[];
  options?: { title: string; values: string[] }[];
}

// Color name -> hex for swatch display
const COLOR_HEX_MAP: Record<string, string> = {
  BLACK: "#1a1a1a",
  NERO: "#1a1a1a",
  WHITE: "#f5f5f5",
  GRAY: "#9e9e9e",
  NUDE: "#d4b59e",
  PINK: "#e8a0bf",
  ROSA: "#e8a0bf",
  RED: "#c0392b",
  BORDEAUX: "#6b0f1a",
  MARSALA: "#965251",
  MAGENTA: "#c2185b",
  PURPLE: "#7b1fa2",
  BROWN: "#6d4c41",
  BLUE: "#1565c0",
  GREEN: "#2e7d32",
  YELLOW: "#f9a825",
  ORANGE: "#e65100",
}

// These CSV "color" values are actually effects, not displayable colors
const EFFECT_VALUES = new Set([
  "SHIMMER", "HOLOGRAPHIC", "MATTE", "CAT-EYE", "GLITTER", "TRANSPARENT",
])

/**
 * Convert a Medusa Store API product response to our Product view model.
 *
 * Medusa v2 stores prices in DECIMAL MAJOR UNITS (e.g. 17 = €17.00) —
 * NOT cents. Forwarded straight through; no /100 conversion.
 */
export function medusaProductToProduct(
  mp: any,
  locale: string = "it"
): Product {
  const variant = mp.variants?.[0]
  const cp = variant?.calculated_price
  const priceEur = (cp?.calculated_amount ?? 0) as number
  const originalEur = (cp?.original_amount ?? priceEur) as number

  // Use translated title/description if available and locale is not Italian
  const translations = mp.metadata?.translations
  const name =
    locale !== "it" && translations?.title?.[locale]
      ? translations.title[locale]
      : mp.title || ""
  const description =
    locale !== "it" && translations?.description?.[locale]
      ? translations.description[locale]
      : mp.description || ""
  // Subtitle: prefer the bilingual metadata.subtitle.{locale}, fall
  // back to subtitle.it, then to a plain string `metadata.subtitle`.
  // Empty string means "no subtitle" — callers should fall back to
  // category name.
  const subtitleMeta = mp.metadata?.subtitle
  let subtitle: string | undefined
  if (typeof subtitleMeta === "object" && subtitleMeta !== null) {
    subtitle = subtitleMeta[locale] || subtitleMeta.it || subtitleMeta.en || undefined
  } else if (typeof subtitleMeta === "string") {
    subtitle = subtitleMeta || undefined
  }

  // Application/ingredients are seeded as bilingual { it, en } under
  // metadata.translations (the import script), but may also appear as a
  // top-level metadata string. Prefer the locale translation, fall back
  // to IT/EN. Mirrors the title/description handling above.
  const appData = translations?.application ?? mp.metadata?.application
  const application =
    typeof appData === "object" && appData !== null
      ? appData[locale] || appData.it || appData.en || ""
      : appData || ""
  const ingData = translations?.ingredients ?? mp.metadata?.ingredients
  const ingredients =
    typeof ingData === "object" && ingData !== null
      ? ingData[locale] || ingData.it || ingData.en || ""
      : ingData || ""

  // Distinguish top-level category from sub (sub has parent_category_id).
  const categories: any[] = mp.categories || []
  const subCat = categories.find((c) => c?.parent_category_id)
  const topCat = categories.find((c) => !c?.parent_category_id) || categories[0]
  const category = topCat
  // Category labels live in metadata.translations.name.{it,en}; fall back
  // to the untranslated `name` field for older categories or when only IT
  // is populated.
  const categoryName =
    locale !== "it" && category?.metadata?.translations?.name?.[locale]
      ? category.metadata.translations.name[locale]
      : category?.name || ""
  const subCategoryName =
    locale !== "it" && subCat?.metadata?.translations?.name?.[locale]
      ? subCat.metadata.translations.name[locale]
      : subCat?.name
  const colorData = mp.metadata?.color

  // Resolve color from metadata.color (name from CSV) -> hex for swatch display
  // Effect values (SHIMMER, HOLOGRAPHIC, etc.) are excluded from colors
  let colors: string[] | undefined
  if (colorData) {
    const colorRaw = typeof colorData === "object" ? colorData?.en : colorData
    const colorName = typeof colorRaw === "string" ? colorRaw.toUpperCase() : undefined
    if (colorName && !EFFECT_VALUES.has(colorName)) {
      const hex = COLOR_HEX_MAP[colorName]
      if (hex) colors = [hex]
    }
  }
  // Also check variant-level color options
  const colorOptions = mp.options?.find(
    (o: any) => o.title?.toLowerCase() === "color"
  )
  if (colorOptions?.values?.length) {
    colors = colorOptions.values
      .map((v: any) => {
        const rawValue = typeof v === "string" ? v : v?.value
        const name = typeof rawValue === "string" ? rawValue.toUpperCase() : undefined
        if (!name || EFFECT_VALUES.has(name)) return null
        return COLOR_HEX_MAP[name] || null
      })
      .filter(Boolean) as string[]
    if (colors.length === 0) colors = undefined
  }

  // Capacity from Size option
  const sizeOption = mp.variants?.find((v: any) =>
    v.options?.some((o: any) => o.option?.title?.toLowerCase() === "size")
  )
  const capacity = sizeOption?.options?.find(
    (o: any) => o.option?.title?.toLowerCase() === "size"
  )?.value

  // Stock: a variant is purchasable unless inventory is actively managed,
  // depleted, and backorders are disabled. Product is in stock if ANY variant is.
  const variantInStock = (v: any) =>
    v?.manage_inventory === false || v?.allow_backorder === true || (v?.inventory_quantity ?? 0) > 0
  const inStock = (mp.variants || []).length === 0
    ? true
    : (mp.variants || []).some(variantInStock)

  // Map variants
  const variants: ProductVariant[] = (mp.variants || []).map((v: any) => ({
    id: v.id,
    title: v.title || "",
    sku: v.sku || null,
    options: v.options || [],
    calculated_price: v.calculated_price
      ? {
          calculated_amount: v.calculated_price.calculated_amount,
          original_amount: v.calculated_price.original_amount,
          currency_code: v.calculated_price.currency_code,
        }
      : undefined,
  }))

  // Map options
  const options = (mp.options || []).map((o: any) => ({
    title: o.title,
    values: (o.values || []).map((v: any) =>
      typeof v === "string" ? v : v.value
    ),
  }))

  // Locale-independent search index — BOTH it+en variants of every text field
  // so search returns the same products regardless of the current UI language
  // (the cause of "9 results in IT vs 25 in EN"). Colour is also matched via
  // colorName + the alias map in the search overlay (red ↔ rosso, …).
  const catTrName = category?.metadata?.translations?.name
  const subTrName = subCat?.metadata?.translations?.name
  const colorIt = typeof colorData === "object" ? colorData?.it : typeof colorData === "string" ? colorData : undefined
  const colorEn = typeof colorData === "object" ? colorData?.en : undefined
  const searchText = [
    mp.title, translations?.title?.it, translations?.title?.en,
    mp.description, translations?.description?.it, translations?.description?.en,
    category?.name, catTrName?.it, catTrName?.en,
    subCat?.name, subTrName?.it, subTrName?.en,
    colorIt, colorEn,
    mp.metadata?.effect,
  ]
    .filter(Boolean)
    .join(" ")

  return {
    id: mp.id,
    handle: mp.handle || mp.id,
    name,
    subtitle,
    description,
    price: priceEur.toFixed(2),
    priceAmount: priceEur,
    originalPrice:
      originalEur !== priceEur
        ? originalEur.toFixed(2)
        : undefined,
    category: categoryName,
    categoryHandle: category?.handle,
    subCategory: subCategoryName,
    subCategoryHandle: subCat?.handle,
    image: mp.thumbnail || mp.images?.[0]?.url || "",
    inStock,
    swatchImage: mp.metadata?.swatch_image_url,
    // Italian is the primary catalog language. Filter matching reads the IT
    // side of metadata.color so palette names (rosa, rosso, viola, ...) line
    // up directly with product values (ROSA, ROSSO, VIOLA, ...).
    colorName: (() => {
      const raw =
        typeof colorData === "object"
          ? colorData?.it || colorData?.en
          : colorData
      return typeof raw === "string" ? raw.toUpperCase() : undefined
    })(),
    hasShade: !!mp.metadata?.has_shade,
    bundleHandles: Array.isArray(mp.metadata?.bundle_handles)
      ? (mp.metadata.bundle_handles as string[])
      : undefined,
    gallery: mp.images?.map((img: any) => img.url).filter(Boolean) || [],
    // Badge lives on metadata.badge (set by the admin badge widget). The
    // tags[0] read is a legacy fallback for products not yet migrated by
    // migrate-badges-to-metadata.ts.
    badge: mp.metadata?.badge || mp.tags?.[0]?.value,
    colors,
    application,
    ingredients,
    capacity,
    features: mp.metadata?.features,
    effect: mp.metadata?.effect || (() => {
      // Derive effect from color field if it's an effect value
      const raw = typeof colorData === "object" ? colorData?.en : colorData
      const cn = typeof raw === "string" ? raw.toUpperCase() : undefined
      return cn && EFFECT_VALUES.has(cn) && cn !== "TRANSPARENT" ? cn : undefined
    })(),
    searchText,
    // Surfaced for the "Novità" (newest-first) sort. Medusa returns ISO
    // `created_at` only when the product query asks for it (useProducts.ts).
    createdAt: mp.created_at,
    isVisible: mp.status === "published",
    // Per-product PDP "European Quality Standards" block — strictly opt-in.
    showStandards: mp.metadata?.show_quality_standards === true,
    isPromoted: mp.metadata?.isPromoted,
    multiply: mp.metadata?.multiply,
    whyBuy: mp.metadata?.whyBuy,
    techSpecs: mp.metadata?.techSpecs,
    howToUse: mp.metadata?.howToUse,
    sdsDocs: mp.metadata?.sdsDocs,
    variants,
    options,
  }
}

export interface Content {
  hero: {
    title: string;
    subtitle: string;
    images: string[];
  };
  explore: {
    title: string;
    subtitle: string;
    items: {
      id: string;
      title: string;
      description: string;
      image: string;
      link: string;
    }[];
  };
  about: {
    title: string;
    subtitle: string;
    description: string;
    image: string;
  };
  courses: {
    title: string;
    subtitle: string;
    items: {
      id: string;
      title: string;
      description: string;
      image: string;
      price: string;
      duration: string;
    }[];
  };
  footer: {
    address: string;
    email: string;
    phone: string;
    social: {
      instagram: string;
      facebook: string;
    };
  };
  gallery: string[];
}
