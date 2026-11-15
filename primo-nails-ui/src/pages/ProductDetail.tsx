import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useProducts } from '../context/ProductContext';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { useSearch } from '../context/SearchContext';
import { Check, ShieldCheck, Globe, Leaf, ChevronDown, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ProductCard } from '../components/ProductCard';
import { ProductCarousel, carouselItemVariants } from '../components/ProductCarousel';
import { RunningBanner } from '../components/collections';
import { seasonGlowForKit } from '../components/collections/seasonMeta';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { ProductDetailSkeleton } from '../components/skeletons/ProductDetailSkeleton';
import { useLanguage } from '../context/LanguageContext';
import { useSeo } from '../lib/useSeo';
import { productJsonLd, breadcrumbJsonLd, toMetaDescription } from '../lib/seo';
import { formatPrice } from '../lib/formatPrice';
import { SalePill } from '../components/ui/SalePill';
import { QtyStepper } from '../components/ui/QtyStepper';
import { handleProductImageError, PRODUCT_PLACEHOLDER } from '../lib/imageFallback';
import { resolveBadge, BUILTIN_BADGES, type BadgeDef } from '../lib/badges';
import { useStoreSetting, useProductSlot } from '../hooks/useStoreContent';
import { waLinkWithText, WHOLESALE_EMAIL, WHATSAPP_FALLBACK } from '../lib/whatsapp';
import { Button, Price, SectionTitle } from '../components/ui';

export type MediaItem = { type: 'image' | 'video'; url: string; alt: string };

/**
 * Derive the carousel media for a product from its own real media only — never
 * fabricate stock-photo slides. Rules:
 *   - Thumbnail (product.image) is slide 1 when present, otherwise the local
 *     branded placeholder is the single slide.
 *   - Gallery images are appended, skipping any entry equal to the thumbnail
 *     (the import sets the thumbnail to the single gallery image).
 *   - A video, if any, is appended last.
 */
export function deriveMediaItems(
  product: Pick<Product, 'image' | 'gallery' | 'video' | 'name'>
): MediaItem[] {
  const gallery = (product.gallery || []).filter((url) => url && url !== product.image);
  const hasThumb = !!product.image;

  const items: MediaItem[] = [];
  if (hasThumb) {
    items.push({ type: 'image', url: product.image, alt: product.name });
  }
  gallery.forEach((url, i) => {
    items.push({ type: 'image', url, alt: `${product.name} gallery ${i + 1}` });
  });
  if (product.video) {
    items.push({ type: 'video', url: product.video, alt: `${product.name} video` });
  }

  // No real media at all → a single branded placeholder slide.
  if (items.length === 0) {
    items.push({ type: 'image', url: PRODUCT_PLACEHOLDER, alt: product.name });
  }
  return items;
}

/**
 * Choose the bottom "Recently Viewed" rail (M10). Resolves the stored
 * recently-viewed ids against the LIVE products (newest first), drops the
 * current product and hidden ones, and caps at `limit`. When there aren't
 * enough recently-viewed to fill the rail, it's topped up with the
 * category-related `fallback` mix (deduped) so the rail is never empty on a
 * first visit. Pure so it can be unit-tested without mounting the PDP.
 */
export function selectRailProducts(
  recentlyViewedIds: string[],
  products: Product[],
  currentProductId: string | undefined,
  fallback: Product[],
  limit = 4
): Product[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const recent = recentlyViewedIds
    .map((id) => byId.get(id))
    .filter(
      (p): p is Product => !!p && p.id !== currentProductId && p.isVisible !== false
    );
  if (recent.length >= limit) return recent.slice(0, limit);
  const seen = new Set(recent.map((p) => p.id));
  const fill = fallback.filter((p) => !seen.has(p.id));
  return [...recent, ...fill].slice(0, limit);
}

/**
 * Prototype `.p-sizes` (`js/product.js` `sizesOf`): the SAME product sold in
 * more than one size/format (e.g. "Cleaner Emotion" 100 ml / 1000 ml). Group
 * siblings by identical display `name` + `category`, keep only members that
 * carry a `capacity`, sort cheapest-first by numeric price, and return the set
 * ONLY when there are ≥2 distinct capacities — so a single-size product gets
 * nothing (the caller then falls back to the plain capacity pill) and we never
 * fabricate a chooser with one option. `current` is always included.
 *
 * Purely derived from existing product data (name/category/capacity/price);
 * no backend changes. If the data can't form a clean ≥2-size group the chips
 * are dropped, not faked.
 */
export function deriveSizeGroup(
  current: Pick<Product, 'id' | 'name' | 'category' | 'capacity'> | null | undefined,
  products: Product[]
): Product[] {
  if (!current?.capacity || !current.name) return [];
  const group = products.filter(
    (p) =>
      !!p.capacity &&
      p.name === current.name &&
      p.category === current.category &&
      // A kit is never a "size" of a plain product.
      !(p.bundleHandles && p.bundleHandles.length > 0)
  );
  const capacities = new Set(group.map((p) => p.capacity));
  if (capacities.size < 2) return [];
  const priceOf = (p: Product) => p.priceAmount ?? (parseFloat(p.price) || 0);
  return [...group].sort((a, b) => priceOf(a) - priceOf(b));
}

// The four seasonal kit handles, in the prototype's tab order
// (Inverno · Primavera · Estate · Autunno). Mirrors useSeasons.ts.
const SEASON_KIT_ORDER = [
  'kit-winter-collection',
  'kit-spring-collection',
  'kit-summer-collection',
  'kit-autumn-collection',
] as const;

const SEASON_KIT_LABEL_KEY: Record<string, string> = {
  'kit-winter-collection': 'collections.season.winter',
  'kit-spring-collection': 'collections.season.spring',
  'kit-summer-collection': 'collections.season.summer',
  'kit-autumn-collection': 'collections.season.autumn',
};

/** A resolved season-kit tab: the kit Product plus its i18n label key. */
export interface SeasonKitTab {
  product: Product;
  labelKey: string;
}

/**
 * Prototype `#season-tabs` / `.qv-tabs` (`js/product.js`): the four seasonal
 * kits form a pill-row switcher. Bound to REAL data — the four
 * `kit-*-collection` bundle products in Medusa (see useSeasons.ts). Returns the
 * ordered tabs ONLY when `current` is itself one of the four seasonal kits AND
 * all four resolve from the catalogue; otherwise `[]`, so the tab row never
 * renders for a non-kit product or a partial/missing set (dropped, not faked).
 */
export function deriveSeasonKits(
  current: Pick<Product, 'handle'> | null | undefined,
  products: Product[]
): SeasonKitTab[] {
  if (!current?.handle || !SEASON_KIT_ORDER.includes(current.handle as (typeof SEASON_KIT_ORDER)[number])) {
    return [];
  }
  const byHandle = new Map(products.map((p) => [p.handle ?? p.id, p]));
  const tabs: SeasonKitTab[] = [];
  for (const handle of SEASON_KIT_ORDER) {
    const product = byHandle.get(handle);
    if (!product) return []; // incomplete set → drop the whole switcher
    tabs.push({ product, labelKey: SEASON_KIT_LABEL_KEY[handle] });
  }
  return tabs;
}

/**
 * Seed the selected-options map from a product's first variant. Pure so the
 * PDP can re-seed on every product change (see REACT-008) without leaking one
 * product's option keys/values into the next.
 */
export function initialSelectedOptions(
  product: Pick<Product, 'variants'> | undefined | null
): Record<string, string> {
  const initial: Record<string, string> = {};
  const firstVariant = product?.variants?.[0];
  firstVariant?.options?.forEach((opt) => {
    const optTitle = opt.option?.title;
    if (optTitle) initial[optTitle] = opt.value;
  });
  return initial;
}

// Hoisted to module scope so its identity is stable across ProductDetail
// re-renders — defining it inline remounted it every render, dropping the
// open/animation state (REACT-005). State it needs (activeSection) and the
// toggle are passed as props.
const AccordionItem = ({
  id,
  title,
  content,
  isMono = false,
  activeSection,
  toggleSection,
}: {
  id: string;
  title: string;
  content: string;
  isMono?: boolean;
  activeSection: string | null;
  toggleSection: (section: string) => void;
}) => (
  <div className="border-t border-[#f0f0f2] mt-1 first:mt-0">
    <button
      onClick={() => toggleSection(id)}
      aria-expanded={activeSection === id}
      aria-controls={`accordion-panel-${id}`}
      className="w-full h-[66px] py-0 max-lg:pr-2 flex items-center justify-between group"
    >
      <span className="font-sans text-[16px] font-normal text-[#555] lg:group-hover:text-foreground lg:group-hover:translate-x-1.5 lg:transition-[color,transform]">
        {title}
      </span>
      {/* Rotating chevron at every size (Primo1 `.p-acc summary svg`). */}
      <ChevronDown
        className={`block w-[18px] h-[18px] stroke-[2] text-[#222] transition-transform duration-300 ${activeSection === id ? 'rotate-180' : ''}`}
      />
    </button>
    <AnimatePresence initial={false}>
      {activeSection === id && (
        <motion.div
          key="content"
          id={`accordion-panel-${id}`}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
          className="overflow-hidden"
        >
          <div className={`pb-8 max-sm:pb-[18px] font-sans text-base max-sm:text-[14px] max-sm:leading-[21px] max-sm:text-[#555] sm:text-lg leading-relaxed text-muted-foreground ${isMono ? 'font-mono text-sm sm:text-base' : ''}`}>
            {content}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

export const ProductDetail = () => {
  const { handle } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { products, loading: productsLoading } = useProducts();
  const { addToCart } = useCart();
  const { t, language } = useLanguage();
  const { recentlyViewedIds, addToRecentlyViewed } = useRecentlyViewed();
  const { trackProductView } = useSearch();
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const prefersReducedMotion = useReducedMotion();

  const product = useMemo(() => products.find(p => p.handle === handle || p.id === handle), [products, handle]);
  const loading = productsLoading;

  // Admin-curated "you may also like" slot (global, one list for all PDPs).
  // Empty handles → fall back to the algorithmic displayRelated below.
  const alsoLikeSlot = useProductSlot('pdp.alsoLike');
  const badgeDefs = useStoreSetting<BadgeDef[]>('badges', BUILTIN_BADGES);
  const detailBadge = product ? resolveBadge(product.badge, product.isPromoted, badgeDefs, language) : null;

  // Wholesale WhatsApp deep-link: reuse the admin-configured course WhatsApp
  // number (falling back to the prototype number) via the shared helper.
  const wholesaleWhatsappBase = useStoreSetting<string>('course_whatsapp_url', '');
  const wholesaleWhatsappHref = waLinkWithText(wholesaleWhatsappBase) || WHATSAPP_FALLBACK;

  // Kit contents: resolve bundle_handles to full Products for the PDP section.
  const bundleChildren = useMemo(() => {
    if (!product?.bundleHandles?.length) return [];
    const byHandle = new Map(products.map((p) => [p.handle, p]));
    return product.bundleHandles
      .map((h) => byHandle.get(h))
      .filter((p): p is Product => !!p);
  }, [product, products]);

  // Shade siblings — same category + sub + colour name as the current product,
  // AND the same effect *presence*: an effect shade (shimmer/holographic/…)
  // groups only with other effect shades, a plain shade only with other plain
  // shades — so e.g. grey splits into "plain greys" vs "effect greys". This is
  // a boolean match (has-any-effect), not same-specific-effect.
  // Used by the 'Sfumature' dimension above SIZE for regular shaded products.
  const shadeSiblings = useMemo(() => {
    if (!product?.hasShade || !product.colorName) return [];
    return products.filter(
      (p) =>
        p.hasShade &&
        p.colorName === product.colorName &&
        p.category === product.category &&
        (p.subCategory || null) === (product.subCategory || null) &&
        Boolean(p.effect) === Boolean(product.effect)
    );
  }, [product, products]);

  // ?from-kit=<kitHandle> — when a Kit child PDP is opened via a swatch
  // click on the kit page, this preserves the kit context. The dimension
  // row then shows the kit's siblings (kit tile + other children) instead
  // of the child's regular colour family.
  const fromKitParam = searchParams.get('from-kit');
  const fromKit = useMemo(() => {
    if (!fromKitParam || !product) return null;
    const kit = products.find((p) => p.handle === fromKitParam);
    if (!kit?.bundleHandles?.length) return null;
    // Only honour the scope if the current product is actually in the kit.
    if (!kit.bundleHandles.includes(product.handle ?? '')) return null;
    return kit;
  }, [fromKitParam, product, products]);

  const fromKitChildren = useMemo(() => {
    if (!fromKit?.bundleHandles?.length) return [];
    const byHandle = new Map(products.map((p) => [p.handle, p]));
    return fromKit.bundleHandles
      .map((h) => byHandle.get(h))
      .filter((p): p is Product => !!p);
  }, [fromKit, products]);

  // What the PDP 'Sfumature' row should render. Priority:
  //   1. This product is itself a Kit → [self, ...children]
  //   2. Arrived from a Kit (?from-kit=) → [kit, ...kit's children]
  //   3. Regular shaded product → category+sub+colour siblings
  //   4. Otherwise → empty (row hidden).
  const dimensionSwatches: Product[] = useMemo(() => {
    if (!product) return [];
    if (bundleChildren.length > 0) return [product, ...bundleChildren];
    if (fromKit) return [fromKit, ...fromKitChildren];
    return shadeSiblings;
  }, [product, bundleChildren, fromKit, fromKitChildren, shadeSiblings]);

  // The "kit tile" in the dimension row is whichever product carries the
  // bundle_handles for the active scope — either this product (kit page)
  // or the from-kit context. Used to know which tile gets the 'KIT' badge
  // and to suppress the from-kit query param on its link.
  const kitInScope: Product | null = product?.bundleHandles?.length
    ? product
    : fromKit;

  // Size-chip group (prototype `.p-sizes`): same-name/same-category siblings
  // in ≥2 formats. Empty for a single-size product (→ plain capacity pill).
  const sizeGroup = useMemo(
    () => deriveSizeGroup(product, products),
    [product, products]
  );

  // Season-tab switcher (prototype `#season-tabs`): the four seasonal kits.
  // Non-empty only when THIS product is one of the four seasonal kits.
  const seasonTabs = useMemo(
    () => deriveSeasonKits(product, products),
    [product, products]
  );

  // Season switcher placement: in the page from lg (the 1440 design) and in the
  // phone buy bar (above qty + Add to Cart) below lg. One element, rendered once.
  const [isLg, setIsLg] = useState(
    () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(min-width: 1024px)').matches
  );
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => setIsLg(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);
  const renderSeasonTablist = (placement: 'page' | 'bar') =>
    seasonTabs.length > 0 ? (
      <div
        role="tablist"
        aria-label={t('search.collection.seasons.name')}
        className={`relative grid h-[42.4px] w-full grid-cols-4 items-center gap-1 rounded-[21.2px] bg-[#f2f2f2] p-[5.7px_6.3px] ${
          placement === 'page' ? 'mx-auto mt-6 max-w-[411px] lg:mx-0 lg:ml-[252px] lg:mt-6 lg:w-[411px] lg:gap-[4.27px]' : ''
        }`}
      >
        {seasonTabs.map(({ product: kit, labelKey }) => {
          const isActive = kit.id === product.id;
          // Each season button glows (softly, selected only) in its season colour.
          const glow = seasonGlowForKit(kit.handle);
          return (
            <button
              key={kit.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              data-glow={glow}
              style={glow ? ({ '--glow': glow } as React.CSSProperties) : undefined}
              onClick={() => {
                if (!isActive) navigate(`/product/${kit.handle || kit.id}`);
              }}
              className={`relative z-[1] h-[31px] rounded-[15.5px] text-[13px] max-[350px]:text-[12px] max-[330px]:text-[11.5px] font-semibold leading-none tracking-[-0.17px] transition-[color,box-shadow] duration-200 ${
                isActive
                  ? 'bg-black text-white shadow-[0_3px_12px_-2px_color-mix(in_srgb,var(--glow,#000)_60%,transparent)]'
                  : 'bg-transparent text-black hover:text-black/70'
              }`}
            >
              {t(labelKey as any)}
            </button>
          );
        })}
      </div>
    ) : null;

  const displayRelated = useMemo(() => {
    if (!product) return [];
    
    // 1. Get products in the same category (excluding current). Match by
    //    categoryHandle — display name may differ from the URL slug.
    const categoryRelated = products.filter(
      (p) => p.id !== product.id && p.categoryHandle === product.categoryHandle
    );

    // 2. If we have enough, return top 4
    if (categoryRelated.length >= 4) return categoryRelated.slice(0, 4);

    // 3. Fallback: Fill remaining slots with other products
    const otherProducts = products.filter(
      (p) => p.id !== product.id && p.categoryHandle !== product.categoryHandle
    );
    return [...categoryRelated, ...otherProducts].slice(0, 4);
  }, [products, handle, product]);

  // Resolve the admin-curated slot handles to Products (same source as
  // displayRelated), preserving admin order, dropping unknown handles and the
  // current product. Mirrors Home's resolveSlot. ≥1 hit → curated wins;
  // otherwise the algorithmic displayRelated fallback is rendered unchanged.
  const relatedProducts = useMemo(() => {
    if (alsoLikeSlot.handles.length === 0) return displayRelated;
    const byHandle = new Map(products.map((p) => [p.handle ?? p.id, p]));
    const curated = alsoLikeSlot.handles
      .map((h) => byHandle.get(h))
      .filter((p): p is Product => !!p && p.id !== product?.id);
    return curated.length > 0 ? curated : displayRelated;
  }, [alsoLikeSlot.handles, products, product?.id, displayRelated]);

  // Bottom rail = "Recently Viewed" (prototype). Resolve the stored ids against
  // the LIVE products (newest first, excluding the current product + hidden
  // ones), capped at 4. If there are too few recently-viewed to fill the rail,
  // top it up with the category-related mix (relatedProducts) — deduped — so
  // the rail is never empty on a first visit.
  const railProducts = useMemo(
    () => selectRailProducts(recentlyViewedIds, products, product?.id, relatedProducts),
    [recentlyViewedIds, products, product?.id, relatedProducts]
  );

  // (Re)initialize selected options from the current product's first variant.
  // Keyed on product.id (not a length===0 guard) so navigating A→B — the route
  // stays mounted — re-seeds from B's own variant instead of leaking A's keys.
  useEffect(() => {
    setSelectedOptions(initialSelectedOptions(product));
  }, [product?.id]);

  // Find the variant matching current selected options
  const selectedVariant = useMemo(() => {
    if (!product?.variants?.length) return product?.variants?.[0];
    return product.variants.find(v =>
      v.options?.every(opt => {
        const optTitle = opt.option?.title;
        return optTitle ? selectedOptions[optTitle] === opt.value : true;
      })
    ) || product.variants[0];
  }, [product, selectedOptions]);

  // Medusa v2 calculated_amount is already in major units (7 = €7.00),
  // matching the adapter convention in types.ts — do NOT divide by 100.
  const displayPrice = selectedVariant?.calculated_price
    ? selectedVariant.calculated_price.calculated_amount.toFixed(2)
    : product?.price;

  // ── SEO ──────────────────────────────────────────────────────────────────
  const productPath = product ? `/product/${product.handle || product.id}` : undefined;
  const seoDescription = toMetaDescription(product?.description, 160);
  useSeo({
    titleKey: 'pageTitle.product',
    titleVars: { name: product?.name || 'PriMo Nails' },
    description: seoDescription || undefined,
    descriptionKey: 'seo.default.description',
    canonicalPath: productPath,
    image: product?.image,
    type: 'product',
    // A "product not found" view is a soft 404 — keep it out of the index.
    noindex: !loading && !product,
    jsonLd: product
      ? [
          productJsonLd({
            name: product.name,
            description: seoDescription || undefined,
            image: product.image,
            url: productPath!,
            price: displayPrice,
            currency: 'EUR',
            inStock: product.inStock !== false,
            sku: selectedVariant?.sku || undefined,
          }),
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Shop', url: '/semipermanente' },
            { name: product.name, url: productPath! },
          ]),
        ]
      : null,
  });

  // Key on product.id (not the whole product object) so a language switch
  // — which gives the projected product a new JS identity without changing
  // its id — does not re-fire the view-tracking event. (OA-41)
  useEffect(() => {
    if (product?.id) {
      addToRecentlyViewed(product);
      trackProductView(product.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, addToRecentlyViewed, trackProductView]);

  // All gallery media for the current product. Defined as a hook (before the
  // early returns below) so the autoplay effect can use the real media count.
  const mediaItems = useMemo<MediaItem[]>(() => {
    if (!product) return [];
    return deriveMediaItems(product);
  }, [product]);

  // Reset the carousel when switching products (the route stays mounted when
  // navigating between PDPs, so currentSlide would otherwise carry over).
  useEffect(() => {
    setCurrentSlide(0);
  }, [product?.id]);

  useEffect(() => {
    if (!autoPlay || mediaItems.length <= 1) return;
    // Desktop (≥1024px) drops the auto-advance to match the redesign (manual
    // dot navigation only). Mobile keeps the 4s autoplay. Guarded by a media
    // query so no desktop timer is ever created.
    if (typeof window !== 'undefined' && window.matchMedia?.('(min-width: 1024px)').matches) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % mediaItems.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [autoPlay, mediaItems.length]);

  // ── Desktop hover-to-zoom magnifier (presentational only) ─────────────────
  // An inner-zoom on the current IMAGE slide: the <img> scales up and its
  // transform-origin tracks the cursor, so moving the mouse pans the magnified
  // view. Scoped to the image wrapper only (dots/arrows/swipe/cart untouched),
  // enabled only ≥1024px (no touch/mobile zoom), skipped for video slides and
  // under prefers-reduced-motion. The transform-origin is written straight to
  // the DOM node via rAF — no per-frame React re-render.
  const ZOOM_SCALE = 2.3;
  const [isZooming, setIsZooming] = useState(false);
  const zoomImgRef = useRef<HTMLImageElement | null>(null);
  const zoomRafRef = useRef<number | null>(null);

  const isDesktopZoomEnabled = useCallback(() => {
    if (prefersReducedMotion) return false;
    return (
      typeof window !== 'undefined' &&
      !!window.matchMedia?.('(min-width: 1024px)').matches
    );
  }, [prefersReducedMotion]);

  const handleZoomMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDesktopZoomEnabled()) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      if (zoomRafRef.current !== null) cancelAnimationFrame(zoomRafRef.current);
      zoomRafRef.current = requestAnimationFrame(() => {
        const img = zoomImgRef.current;
        if (img) {
          img.style.transformOrigin = `${x}% ${y}%`;
          img.style.transform = `scale(${ZOOM_SCALE})`;
        }
      });
    },
    [isDesktopZoomEnabled]
  );

  const handleZoomEnter = useCallback(() => {
    if (!isDesktopZoomEnabled()) return;
    setIsZooming(true);
  }, [isDesktopZoomEnabled]);

  const handleZoomLeave = useCallback(() => {
    if (zoomRafRef.current !== null) {
      cancelAnimationFrame(zoomRafRef.current);
      zoomRafRef.current = null;
    }
    setIsZooming(false);
    const img = zoomImgRef.current;
    if (img) {
      img.style.transform = '';
      img.style.transformOrigin = '';
    }
  }, []);

  // Drop any pending rAF and the zoomed transform when the slide changes
  // (e.g. dot-click to a video) or on unmount — no leaks, no stuck zoom.
  useEffect(() => {
    return () => {
      if (zoomRafRef.current !== null) cancelAnimationFrame(zoomRafRef.current);
    };
  }, []);

  useEffect(() => {
    handleZoomLeave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSlide, product?.id]);

  if (loading) {
    return <ProductDetailSkeleton />;
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="font-sans text-2xl font-bold mb-4 text-foreground">{t('product.notFound')}</h1>
          <button
            onClick={() => navigate('/')}
            className="font-sans text-primary hover:underline"
          >
            {t('product.backToHome')}
          </button>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (!product || !selectedVariant || product.inStock === false) return;
    // Create a product copy with the selected variant as first
    const productWithVariant = {
      ...product,
      variants: selectedVariant ? [selectedVariant, ...(product.variants || []).filter(v => v.id !== selectedVariant.id)] : product.variants,
    };
    addToCart(productWithVariant, quantity);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  return (
    <main className="flex-1 pt-[57px] lg:pt-[134px] pb-16 lg:pb-24">
      {/* Desktop: constrain the PDP to the redesign's centred 976px column. The
          `!` beats the shared .container-premium (1300px) max-width; mobile
          stays full-width inside the container. (See DECISIONS gotcha.) */}
      <div className="container-premium lg:!max-w-[976px] lg:!px-0 lg:mx-auto">
        {/* Breadcrumbs + back are desktop-only (Primo1 `.crumbs.d-only` /
            `.back.d-only`): on phones the gallery leads the page. */}
        <div className="hidden lg:block">
          <Breadcrumbs customItems={[
            { label: t('breadcrumb.home' as any), link: '/' },
            { label: t('breadcrumb.catalog' as any), link: '/tutti-prodotti' },
            { label: product.category, link: product.categoryHandle ? `/${product.categoryHandle}` : '/semipermanente' },
            { label: product.name }
          ]} />
        </div>

        <div className="hidden lg:flex items-center lg:mb-0 lg:mt-3">
          <button
            type="button"
            onClick={() => {
              // Go back within the app when there's history to return to;
              // otherwise (deep link / new tab) fall back to the all-products
              // catalogue (prototype's "Indietro" → catalogo.html) so "Back"
              // never dead-ends or leaves the site.
              if (location.key !== 'default') navigate(-1);
              else navigate('/tutti-prodotti');
            }}
            className="flex items-center h-[28.2px] -ml-px font-inter text-[13px] text-[#555] hover:text-foreground transition-colors"
          >
            <ChevronLeft aria-hidden="true" className="w-[22.6px] h-[22.6px]" strokeWidth={1.6} />
            {t('nav.back')}
          </button>
        </div>

        {/* Season switcher — prototype `#season-tabs` pill row, shown only on
            the four seasonal-kit PDPs (real `kit-*-collection` bundle products).
            Switching navigates to the sibling season's PDP (the kit page itself
            re-renders with that kit's children). lg-scoped to the 1440 design
            (`.season-tabs`: 411px track, offset to the info column); a compact
            centred variant keeps mobile usable without breaking it. */}
        {isLg && renderSeasonTablist('page')}

        <div className="grid grid-cols-1 lg:grid-cols-[480px_479px] gap-0 lg:gap-[17px] items-start lg:mt-[27.6px]">
          {/* Left: Product Image Carousel */}
          <div
            // Phones: Primo1 `.gallery` — full-bleed 540px band, photos cover it.
            className="bg-[#fefefe] lg:bg-white rounded-none lg:rounded-[16px] relative group/carousel overflow-hidden flex items-center justify-center h-[min(96vw,420px)] lg:aspect-auto max-sm:-mx-4 sm:max-lg:-mx-5 lg:sticky lg:top-28 lg:h-[631px]"
            onMouseEnter={() => setAutoPlay(false)}
            onMouseLeave={() => setAutoPlay(true)}
          >
            <div 
              // Desktop: Primo1 `.g-track` — a 480px photo band 75px from the top.
              className="absolute inset-0 lg:inset-auto lg:inset-x-0 lg:top-[75px] lg:h-[480px] flex transition-transform duration-1000 cubic-bezier(0.4, 0, 0.2, 1)" 
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {mediaItems.map((media, idx) => {
                // Hover-zoom attaches only to the CURRENT image slide: the
                // pointer handlers + ref live on that slide so off-screen
                // slides and video never participate. Desktop/reduced-motion
                // gating happens inside the handlers.
                const isActiveImage = media.type === 'image' && idx === currentSlide;
                return (
                  <div
                    key={idx}
                    onMouseEnter={isActiveImage ? handleZoomEnter : undefined}
                    onMouseMove={isActiveImage ? handleZoomMove : undefined}
                    onMouseLeave={isActiveImage ? handleZoomLeave : undefined}
                    className={`min-w-full h-full flex items-center justify-center p-0 relative ${isActiveImage ? 'lg:cursor-zoom-in' : ''}`}
                  >
                    {media.type === 'video' ? (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <video
                          src={media.url}
                          controls
                          className="max-w-[85%] max-h-[85%] object-contain rounded-3xl shadow-2xl border border-border/10"
                        />
                      </div>
                    ) : (
                      <img
                        ref={isActiveImage ? zoomImgRef : undefined}
                        src={media.url}
                        alt={media.alt}
                        loading={idx === 0 ? 'eager' : 'lazy'}
                        decoding="async"
                        fetchPriority={idx === 0 ? 'high' : 'auto'}
                        sizes="(min-width: 1024px) 50vw, 100vw"
                        onError={handleProductImageError(`${product.id}-${idx}`)}
                        className={`w-full h-full object-cover sm:max-lg:object-contain max-w-full max-h-full ${isActiveImage && isZooming ? 'transition-transform duration-150 ease-out' : 'transition-transform duration-700 hover:scale-105'} ${product.multiply !== false ? 'mix-blend-multiply' : ''}`}
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Navigation Arrows — desktop drops them (redesign: dot-only nav); kept
                below lg because the gallery has no swipe. Only with 2+ slides. */}
            {mediaItems.length > 1 && (<>
            <button
              type="button"
              aria-label={t('a11y.image.prev' as any)}
              onClick={() => setCurrentSlide((prev) => (prev - 1 + mediaItems.length) % mediaItems.length)}
              className="lg:hidden absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 flex items-center justify-center bg-background/60 hover:bg-background border border-border rounded-full shadow-card transition-all duration-500 z-10 backdrop-blur-sm"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              aria-label={t('a11y.image.next' as any)}
              onClick={() => setCurrentSlide((prev) => (prev + 1) % mediaItems.length)}
              className="lg:hidden absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 flex items-center justify-center bg-background/60 hover:bg-background border border-border rounded-full shadow-card transition-all duration-500 z-10 backdrop-blur-sm"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" strokeWidth={1.5} />
            </button>
            </>)}

            {/* Indicators — Primo1 `.g-dots`: 20×24 buttons around a 6px dot
                (14px #222 when active), 10px from the bottom; desktop top 575px. */}
            <div role="tablist" aria-label={t('a11y.image.indicators' as any)} className="absolute bottom-2.5 lg:bottom-auto lg:top-[575px] left-1/2 -translate-x-1/2 flex z-10 items-center">
              {mediaItems.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  role="tab"
                  aria-selected={currentSlide === idx}
                  aria-label={t('a11y.imageNumber', { index: idx + 1 })}
                  onClick={() => setCurrentSlide(idx)}
                  className={`group/dot w-5 h-6 grid place-items-center before:content-[''] before:h-1.5 before:rounded-[3px] before:transition-all before:duration-300 ${currentSlide === idx ? 'before:w-3.5 before:bg-[#222]' : 'before:w-1.5 before:bg-[#cfcfcf] hover:before:bg-foreground/30'}`}
                />
              ))}
            </div>
          </div>

          {/* Right: Product Info. Phones: Primo1 `.pinfo` (28px top, 33px gutter). */}
          <div className="flex flex-col max-sm:px-1 sm:max-lg:px-[13px] max-lg:pt-[14px]">
            {/* Phones: shades sit first (Primo1), placed first in the DOM too so
                keyboard order matches; the desktop copy below is hidden here.
                Sfumature dimension — only renders when this product has a
                swatch group (shade siblings) or is a Kit (kit tile + children).
                Each swatch navigates to its target product's PDP. */}
            {dimensionSwatches.length > 0 && (
              <div className="lg:hidden">
                <div className="flex justify-between items-center gap-3 leading-[19px] tracking-[-0.13px] lg:items-start lg:h-[39px] lg:pt-[6px] lg:border-b lg:border-[#f2f2f4]">
                  {/* Primo1 `.p-shades-h`: "Sfumature: <current shade>". */}
                  <span className="font-sans text-[15px] lg:text-[16px] leading-[19px] font-bold text-[#1e1e1e] min-w-0 truncate">
                    {t('product.shades')}: {product.name.replace(/^(?:№|N[º°])\s*/, '')}
                  </span>
                  {/* The shade count ("N Colori"). Count = sibling swatches. */}
                  <span className="font-sans text-[14px] lg:text-[15px] leading-[19px] font-normal text-[#a0a0a0] shrink-0">
                    <em className="not-italic text-[#5a5a5a]">{dimensionSwatches.length}</em> {t(dimensionSwatches.length === 1 ? 'product.color' : 'product.colors')}
                  </span>
                </div>
                <div className="flex gap-2.5 overflow-x-auto overflow-y-hidden no-scrollbar snap-x snap-proximity scroll-px-5 -mx-5 px-5 sm:max-lg:scroll-px-[33px] sm:max-lg:-mx-[33px] sm:max-lg:px-[33px] mt-2 mb-[18px] pt-1.5 pb-4 border-b border-[#f0f0f2] lg:grid lg:w-[419px] lg:grid-cols-[repeat(6,55.7px)] lg:justify-between lg:gap-x-0 lg:gap-y-2 lg:overflow-visible lg:mx-0 lg:mb-0 lg:px-0 lg:pt-0 lg:pb-0 lg:border-0 lg:mt-[20px]" role="radiogroup" aria-label={t('product.shades')}>
                  {dimensionSwatches.map((s) => {
                    const isCurrent = s.id === product.id;
                    const isKitTile = !!kitInScope && s.id === kitInScope.id;
                    // Keep ?from-kit= context when navigating to a child;
                    // drop it when navigating back to the kit's own page.
                    const linkTo =
                      kitInScope && !isKitTile
                        ? `/product/${s.handle || s.id}?from-kit=${kitInScope.handle}`
                        : `/product/${s.handle || s.id}`;
                    // Redesign double ring (white gap + black outer) on the
                    // selected swatch, phones and desktop alike (Primo1 `.psw`).
                    const ringClass = isCurrent ? 'shadow-[0_0_0_2.5px_#fff,0_0_0_5px_#000]' : '';
                    return (
                      <Link
                        key={s.id}
                        to={linkTo}
                        role="radio"
                        aria-checked={isCurrent}
                        aria-label={s.name}
                        aria-current={isCurrent ? 'true' : undefined}
                        title={s.name}
                        className={`flex-none snap-start w-12 h-12 lg:w-[55.7px] lg:h-[55.7px] rounded-full flex items-center justify-center bg-center bg-cover bg-no-repeat transition-all duration-200 hover:scale-105 active:scale-95 lg:hover:-translate-y-0.5 lg:hover:scale-[1.08] ${ringClass}`}
                        style={
                          isKitTile
                            ? { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }
                            : s.swatchImage
                            ? { backgroundImage: `url(${s.swatchImage})` }
                            : { backgroundColor: '#E0E0E0' }
                        }
                      >
                        {isKitTile && (
                          <span className="font-sans text-[9px] font-black tracking-widest leading-none">
                            {t('product.kitBadge')}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {detailBadge && (
              <span
                className="inline-flex items-center font-sans text-[11px] font-black uppercase tracking-[0.2em] px-5 py-2 rounded-pill mb-4 w-fit shadow-card"
                style={detailBadge.style}
              >
                {detailBadge.label}
              </span>
            )}

            {/* Computed on-sale pill — prototype's red ".p-badge" ("N%"),
                sitting above the title. Independent of the admin metadata
                badge above (both can show). Desktop matches the prototype's
                exact pixel sizing; mobile keeps a proportional variant. */}
            <SalePill
              variant="pdp"
              current={displayPrice}
              original={product.originalPrice}
              className="mb-3 lg:mb-[13.5px] lg:text-[15px]"
            />

            <h1 className="font-sans text-[24px] font-bold tracking-normal leading-[30px] lg:min-h-0 text-[#1e1e1e] lg:text-[33px] lg:leading-[42px] lg:font-bold lg:tracking-[0.65px] lg:normal-case lg:text-[#1e1e1e] lg:mb-0">
              {product.name}
            </h1>

            {/* Category eyebrow — Primo1 hides it (`.p-eyebrow`); the breadcrumb
                carries it on desktop. Kept for screen readers. */}
            <p className="max-lg:sr-only lg:hidden">
              {product.subtitle || product.category}
            </p>

            <div className="flex max-lg:flex-row max-lg:items-center max-lg:justify-between max-lg:gap-3 max-lg:mt-[10px] lg:flex-col lg:mt-[16.6px] lg:mb-0">
              {/* Desktop: keep the price compact + left-aligned. `lg:w-fit`
                  stops the flex row spanning the 479px info column. The NBSP
                  width problem is fixed globally in formatPrice (narrow
                  no-break space). */}
              <Price
                size="lg"
                current={formatPrice(displayPrice, language)}
                original={
                  product.originalPrice
                    ? formatPrice(product.originalPrice, language)
                    : undefined
                }
                // Only the struck-through original (2nd span) drops to 16px; a lone
                // current price keeps the full 26px (prototype `.p-price`).
                className="text-[22px] leading-7 gap-3 w-fit lg:text-[26px] lg:leading-[17px] lg:gap-4 [&>span]:leading-[inherit] [&>span:first-child]:font-extrabold [&>span:only-child]:text-black [&>span:first-child]:text-[length:inherit] [&>span:first-child]:tracking-[0.4px] lg:[&>span:first-child]:tracking-[2.56px] [&>span:nth-child(2)]:text-[17px] lg:[&>span:nth-child(2)]:text-[16px]"
              />
              {/* Size / format — prototype `.p-size` (single) vs `.p-sizes`
                  (chooser). When the product is sold in ≥2 sizes (same name +
                  category, e.g. Cleaner Emotion 100 ml / 1000 ml) render one
                  selectable chip per size; picking one navigates to that SKU's
                  PDP (which swaps the whole panel, incl. the price). Otherwise
                  the plain capacity pill. Derived from existing data only. */}
              {sizeGroup.length >= 2 ? (
                <div
                  role="group"
                  aria-label={t('product.format')}
                  className="flex flex-wrap gap-1.5 lg:gap-2 w-fit flex-none lg:mt-[25px]"
                >
                  {sizeGroup.map((sku) => {
                    const isActive = sku.id === product.id;
                    return (
                      <button
                        key={sku.id}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => {
                          if (!isActive) navigate(`/product/${sku.handle || sku.id}`);
                        }}
                        className={`grid place-items-center min-w-[60px] whitespace-nowrap rounded-[18px] border px-3 h-9 text-[14px] lg:rounded-[13px] lg:border-[1.5px] lg:px-2.5 lg:h-[25px] lg:text-[15px] font-medium leading-none transition-colors duration-200 ${
                          isActive
                            ? 'bg-black border-black text-white'
                            : 'bg-transparent border-[#7f7f7f] text-[#7f7f7f] hover:border-black hover:text-foreground'
                        }`}
                      >
                        {sku.capacity}
                      </button>
                    );
                  })}
                </div>
              ) : (
                product.capacity && (
                  <div className="font-sans w-fit flex-none justify-center min-w-[64px] px-[14px] h-[30px] rounded-[15px] border text-[14px] lg:min-w-0 lg:mt-[25px] lg:px-2.5 lg:h-[25px] lg:rounded-[13px] lg:border-[1.5px] lg:text-[15px] leading-none flex items-center border-[#7f7f7f] text-black font-medium">
                    {product.capacity}
                  </div>
                )
              )}
            </div>

            {/* Sfumature dimension — only renders when this product has a
                swatch group (shade siblings) or is a Kit (kit tile + children).
                Each swatch navigates to its target product's PDP. */}
            {dimensionSwatches.length > 0 && (
              <div className="max-lg:hidden lg:mt-[25px]">
                <div className="flex justify-between items-center gap-3 leading-[19px] tracking-[-0.13px] lg:items-start lg:h-[39px] lg:pt-[6px] lg:border-b lg:border-[#f2f2f4]">
                  {/* Primo1 `.p-shades-h`: "Sfumature: <current shade>". */}
                  <span className="font-sans text-[15px] lg:text-[16px] leading-[19px] font-bold text-[#1e1e1e] min-w-0 truncate">
                    {t('product.shades')}: {product.name.replace(/^(?:№|N[º°])\s*/, '')}
                  </span>
                  {/* The shade count ("N Colori"). Count = sibling swatches. */}
                  <span className="font-sans text-[14px] lg:text-[15px] leading-[19px] font-normal text-[#a0a0a0] shrink-0">
                    <em className="not-italic text-[#5a5a5a]">{dimensionSwatches.length}</em> {t(dimensionSwatches.length === 1 ? 'product.color' : 'product.colors')}
                  </span>
                </div>
                <div className="flex gap-2.5 overflow-x-auto overflow-y-hidden no-scrollbar snap-x snap-proximity scroll-px-5 -mx-5 px-5 sm:max-lg:scroll-px-[33px] sm:max-lg:-mx-[33px] sm:max-lg:px-[33px] mt-2 mb-[18px] pt-1.5 pb-4 border-b border-[#f0f0f2] lg:grid lg:w-[419px] lg:grid-cols-[repeat(6,55.7px)] lg:justify-between lg:gap-x-0 lg:gap-y-2 lg:overflow-visible lg:mx-0 lg:mb-0 lg:px-0 lg:pt-0 lg:pb-0 lg:border-0 lg:mt-[20px]" role="radiogroup" aria-label={t('product.shades')}>
                  {dimensionSwatches.map((s) => {
                    const isCurrent = s.id === product.id;
                    const isKitTile = !!kitInScope && s.id === kitInScope.id;
                    // Keep ?from-kit= context when navigating to a child;
                    // drop it when navigating back to the kit's own page.
                    const linkTo =
                      kitInScope && !isKitTile
                        ? `/product/${s.handle || s.id}?from-kit=${kitInScope.handle}`
                        : `/product/${s.handle || s.id}`;
                    // Redesign double ring (white gap + black outer) on the
                    // selected swatch, phones and desktop alike (Primo1 `.psw`).
                    const ringClass = isCurrent ? 'shadow-[0_0_0_2.5px_#fff,0_0_0_5px_#000]' : '';
                    return (
                      <Link
                        key={s.id}
                        to={linkTo}
                        role="radio"
                        aria-checked={isCurrent}
                        aria-label={s.name}
                        aria-current={isCurrent ? 'true' : undefined}
                        title={s.name}
                        className={`flex-none snap-start w-12 h-12 lg:w-[55.7px] lg:h-[55.7px] rounded-full flex items-center justify-center bg-center bg-cover bg-no-repeat transition-all duration-200 hover:scale-105 active:scale-95 lg:hover:-translate-y-0.5 lg:hover:scale-[1.08] ${ringClass}`}
                        style={
                          isKitTile
                            ? { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }
                            : s.swatchImage
                            ? { backgroundImage: `url(${s.swatchImage})` }
                            : { backgroundColor: '#E0E0E0' }
                        }
                      >
                        {isKitTile && (
                          <span className="font-sans text-[9px] font-black tracking-widest leading-none">
                            {t('product.kitBadge')}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Product Options / Variants — only real choices (an option with
                more than one value). A single-value option (e.g. the size of a
                single-variant product) just repeats the capacity shown next to
                the price, so it's hidden to avoid the ML appearing 3×. */}
            {product.options?.some(o => (o.values?.length ?? 0) > 1) && (
              <div className="mb-8 sm:mb-10 lg:mb-12 space-y-6 sm:space-y-8">
                {product.options.filter(o => (o.values?.length ?? 0) > 1).map(option => (
                  <div key={option.title}>
                    <div className="flex justify-between items-center mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-border gap-3">
                      <span className="font-sans text-[11px] sm:text-[12px] font-black tracking-[0.25em] sm:tracking-[0.3em] uppercase text-foreground">{option.title}</span>
                      <span className="font-sans text-[10px] sm:text-[11px] font-black tracking-[0.05em] uppercase text-muted-foreground truncate">
                        {selectedOptions[option.title] || ''}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:gap-3" role="radiogroup" aria-label={option.title}>
                      {option.values.map((value) => {
                        const isActive = selectedOptions[option.title] === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={isActive}
                            onClick={() => setSelectedOptions(prev => ({ ...prev, [option.title]: value }))}
                            className={`relative min-w-[52px] sm:min-w-[56px] h-12 sm:h-14 px-4 sm:px-5 rounded-[12px] sm:rounded-[14px] transition-all duration-200 ${
                              isActive
                                ? 'border-2 border-primary shadow-card scale-[1.05] sm:scale-110 z-20 bg-primary text-primary-foreground'
                                : 'bg-tab-track text-foreground hover:scale-[1.03] hover:shadow-card'
                            }`}
                          >
                            <span className="font-sans text-[11px] sm:text-[12px] font-bold tracking-wide">
                              {value}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quantity and Add to Cart — desktop only. On mobile this is
                replaced by the sticky bottom bar (see below), so hide it here to
                avoid duplicate controls (both reference the same quantity state
                + handleAddToCart, so nothing diverges). */}
            <div className="hidden lg:flex flex-row items-center gap-3 sm:gap-4 mb-10 sm:mb-14 lg:mb-0 lg:mt-[41.9px] lg:h-[54px] lg:pl-[45.5px] lg:pr-[41.4px]">
              {/* Desktop quantity stepper (prototype `.p-buy .stepper`): NO
                  wrapping capsule. −/count/+ sit inline; each button is an
                  IDENTICAL 44×44 tap target rendering the prototype's
                  circle-enclosed glyph SVG (same circle r=10, same hairline
                  stroke-width .9, same #222) — the only difference between − and
                  + is the extra vertical bar inside the identical circle. The
                  value is a 13px-wide centred readout with 13px margins each
                  side (prototype `.stepper output` + `.p-buy .stepper output`).
                  Styling only — quantity state, clamp and handlers unchanged.
                  (Already desktop-only via the `hidden lg:flex` parent.) */}
              <QtyStepper
                value={quantity}
                onDecrement={() => setQuantity(q => Math.max(1, q - 1))}
                onIncrement={() => setQuantity(q => q + 1)}
                decrementLabel={t('cart.decreaseQty')}
                incrementLabel={t('cart.increaseQty')}
                decrementDisabled={product.inStock === false}
                glyph="circle"
                glyphStrokeWidth={0.9}
                glyphClassName="w-11 h-11"
                className={`flex items-center ${product.inStock === false ? 'opacity-40 pointer-events-none' : ''}`}
                buttonClassName="w-11 h-11 p-0 grid place-items-center text-[#222] hover:text-foreground"
                readoutAs="span"
                readoutClassName="font-sans text-[20px] leading-6 font-medium w-[13px] mx-[13px] text-center"
              />

              <Button
                variant="primary"
                size="lg"
                uppercase
                onClick={handleAddToCart}
                disabled={product.inStock === false}
                aria-disabled={product.inStock === false}
                leadingIcon={
                  product.inStock !== false && isAdded ? <Check className="w-5 h-5" /> : undefined
                }
                className={`w-full sm:flex-1 py-4 sm:py-5 h-auto text-[12px] sm:text-sm lg:ml-auto lg:min-w-[172.4px] lg:w-auto lg:flex-none lg:h-[42.8px] lg:py-0 lg:px-6 lg:text-[16px] lg:font-semibold lg:normal-case lg:tracking-[0.2px] lg:whitespace-nowrap ${
                  product.inStock === false
                    ? '!bg-muted !text-muted-foreground !border-muted hover:!bg-muted hover:!text-muted-foreground cursor-not-allowed'
                    : isAdded
                      ? '!bg-success !text-success-foreground !border-success hover:!bg-success hover:!text-success-foreground'
                      : ''
                }`}
              >
                <span className="lg:hidden">
                  {product.inStock === false
                    ? t('product.outOfStock').toUpperCase()
                    : isAdded
                      ? t('product.added').toUpperCase()
                      : t('collections.addToCart').toUpperCase()}
                </span>
                <span className="hidden lg:inline">
                  {product.inStock === false
                    ? t('product.outOfStock')
                    : isAdded
                      ? t('product.added')
                      : t('pdp.addToCart')}
                </span>
              </Button>
            </div>

            {/* Wholesale + shipping note sit after the shades and the buy row,
                in Primo1's order on phones and desktop alike (DOM order = visual
                order, so keyboard focus follows the page). */}
              {/* Wholesale enquiry — B2B buyers contact the shop directly via
                  TWO channels (WhatsApp + email). Restyled to match the
                  prototype `.wholesale`: a hairline #999 card (no fill),
                  66px tall, 16px radius, 18px left padding; a 38px circle with a
                  1.5px #222 border holding the prototype's message-heart glyph
                  (exact circle/heart paths, 20px); a bold #111 headline over a
                  second line whose WhatsApp/email links are the prototype's
                  underlined #1d1a52. lg-scoped to the 1440 design; mobile keeps a
                  proportional variant so it isn't broken. Bilingual via i18n. */}
              <div className="mt-6 lg:mt-10 lg:mx-[52.5px] flex items-center gap-[13px] rounded-[16px] border-[1.5px] border-[#999] pl-[18px] pr-2 lg:pr-0 py-2 lg:py-0 min-h-[66px] lg:h-[66px] self-stretch lg:self-auto max-w-full">
                <span aria-hidden="true" className="shrink-0 grid place-items-center w-[38px] h-[38px] rounded-full border-[1.5px] border-[#222] text-[#222]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    <path d="M14.8 7.5a1.84 1.84 0 0 0-2.6 0l-.2.3-.3-.3a1.84 1.84 0 1 0-2.4 2.8L12 13l2.7-2.7c.9-.9.8-2.1.1-2.8" />
                  </svg>
                </span>
                <p className="flex flex-col gap-1.5 leading-tight min-w-0 m-0">
                  <b className="font-sans text-[15px] leading-[17px] font-bold tracking-[0.2px] text-[#111]">
                    {t('pdp.wholesale.title' as any)}
                  </b>
                  <span className="font-sans text-[14px] leading-4 text-[#1d1a52]">
                    {t('pdp.wholesale.text' as any)}{' '}
                    <a
                      href={wholesaleWhatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold underline underline-offset-2 text-[#1d1a52]"
                    >
                      {t('pdp.wholesale.whatsapp' as any)}
                    </a>{' '}
                    {t('pdp.wholesale.or' as any)}{' '}
                    <a
                      href={`mailto:${WHOLESALE_EMAIL}?subject=${encodeURIComponent(t('pdp.wholesale.subject'))}`}
                      className="font-bold underline underline-offset-2 text-[#1d1a52]"
                    >
                      {t('pdp.wholesale.email' as any)}
                    </a>
                  </span>
                </p>
              </div>

              {/* Shipping note — the prototype's single centered muted line
                  (`.ship-note`): "Spedizione calcolata al checkout." + a
                  "Tariffe e resi" link to the shipping page. Replaces the old
                  bordered GLS delivery card. lg-scoped centering so it matches
                  the 1440 desktop; mobile keeps it left-aligned under the
                  wholesale card. Static copy, bilingual. */}
              <p className="mt-[15px] font-sans text-[12.5px] leading-4 tracking-[0.3px] text-[#a9a9a9] text-center">
                {t('product.shippingNote')}{' '}
                <Link
                  to="/spedizioni"
                  className="underline underline-offset-2 text-[#6b6b6b] hover:text-black whitespace-nowrap"
                >
                  {t('product.shippingRatesLink' as any)}
                </Link>
              </p>

            {/* Product info — only the sections backed by real product data. */}
            <div className="mt-5">
              <AccordionItem
                id="description"
                title={t('pdp.section.description')}
                content={product.description}
                activeSection={activeSection}
                toggleSection={toggleSection}
              />
              {product.application && (
                <AccordionItem
                  id="application"
                  title={t('pdp.section.application')}
                  content={product.application}
                  activeSection={activeSection}
                  toggleSection={toggleSection}
                />
              )}
              {product.ingredients && (
                <AccordionItem
                  id="ingredients"
                  title={t('pdp.section.ingredients')}
                  content={product.ingredients}
                  activeSection={activeSection}
                  toggleSection={toggleSection}
                />
              )}
            </div>

            {/* European Quality Standards — opt-in per product via the Admin
                toggle (metadata.show_quality_standards → product.showStandards).
                Hidden unless explicitly enabled. Compact badge row beneath info. */}
            {product.showStandards && (
            <div className="border-t border-border mt-6 sm:mt-8 pt-6 sm:pt-7 pb-12 sm:pb-16">
              <h3 className="font-sans text-[10px] sm:text-[11px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] text-muted-foreground mb-4 sm:mb-5">{t('pdp.standardsTitle')}</h3>
              <div className="flex flex-wrap items-center gap-x-6 sm:gap-x-8 gap-y-3">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-foreground stroke-[1.5] shrink-0" />
                  <span className="font-sans text-[11px] sm:text-[12px] font-black uppercase tracking-wider text-foreground">{t('pdp.tpoHema.title')}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Globe className="w-5 h-5 text-foreground stroke-[1.5] shrink-0" />
                  <span className="font-sans text-[11px] sm:text-[12px] font-black uppercase tracking-wider text-foreground">{t('pdp.madeInItaly.title')}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Leaf className="w-5 h-5 text-foreground stroke-[1.5] shrink-0" />
                  <span className="font-sans text-[11px] sm:text-[12px] font-black uppercase tracking-wider text-foreground">{t('pdp.vegan.title')}</span>
                </div>
              </div>
            </div>
            )}
          </div>
        </div>

        {/* RELATED PRODUCTS — Editorial Highlight */}
        <section className="pt-[37px] pb-0 lg:pb-[140px] lg:pt-0 lg:mt-[134.9px]">
          <div className="flex flex-col md:flex-row md:items-start justify-between mb-0 lg:mb-[40px] gap-4 sm:gap-6 max-sm:px-1 sm:max-lg:px-[13px]">
            <SectionTitle
              as="h2"
              align="left"
              title={t('pdp.alsoLike')}
              subtitle={<span className="max-lg:hidden">{t('recentlyViewed.subtitle')}</span>}
              className="max-lg:[&_h2]:text-[25px] max-lg:[&_h2]:leading-10 max-lg:[&_h2]:font-bold max-lg:[&_h2]:tracking-[0.35px] max-lg:[&_h2]:text-[#1e1e1e] gap-2 sm:gap-3 lg:gap-4 lg:[&>*:first-child]:text-[#1e1e1e] lg:[&>*:first-child]:text-[31px] lg:[&>*:first-child]:leading-[38px] lg:[&>*:first-child]:tracking-[0.3px] lg:[&>*:first-child]:normal-case lg:[&_p]:text-[20px] lg:[&_p]:leading-[31px] lg:[&_p]:text-[#8a8a8a] lg:[&_p]:normal-case lg:[&_p]:font-semibold lg:[&_p]:tracking-[0.37px]"
            />
            <Link
              to="/tutti-prodotti"
              className="max-lg:hidden group flex items-center gap-3 font-sans text-[11px] sm:text-xs font-bold uppercase tracking-widest text-foreground hover:text-muted-foreground transition-all lg:text-[12px] lg:font-semibold lg:normal-case lg:tracking-normal lg:text-[#111] lg:mt-[26.5px] shrink-0"
            >
              {t('pdp.viewAllShop')}
              <div aria-hidden="true" className="w-8 h-8 rounded-pill bg-primary text-primary-foreground flex items-center justify-center transition-transform group-hover:scale-110 lg:bg-transparent lg:text-[#111] lg:border lg:border-[#d8d8d8] lg:group-hover:bg-black lg:group-hover:text-white lg:transition-colors">
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          </div>

          {/* Phones: Primo1 `.related .rail` starts 15px under the title. */}
          <div className="lg:hidden -mt-1.5">
            <ProductCarousel bleedRight>
              {railProducts.map((relatedProduct) => (
                <motion.div key={relatedProduct.id} variants={carouselItemVariants} className="flex-shrink-0 w-[258px] snap-start flex">
                  <ProductCard product={relatedProduct} />
                </motion.div>
              ))}
            </ProductCarousel>
          </div>
          <div className="hidden lg:grid lg:grid-cols-4 lg:gap-4">
            {railProducts.map((relatedProduct) => (
              <motion.div
                key={relatedProduct.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <ProductCard product={relatedProduct} />
              </motion.div>
            ))}
          </div>
        </section>
      </div>

      {/* TPO & HEMA FREE running line — matches Home's marquee; full-width below
          the related-products rail, shown at all breakpoints. */}
      <RunningBanner
          desktopOnly
          text={t('banner.tpoHemaText')}
          highlight={t('banner.tpoHemaHighlight')}
          highlightClassName="text-green-bright"
          Icon={ShieldCheck}
      />

      {/* Mobile sticky Add-to-Cart bar — pinned to the viewport bottom below the
          PDP's stacking breakpoint (lg, matching lg:grid-cols-2). Replaces the
          inline qty+ATC block on mobile. Reuses the SAME quantity state and
          handleAddToCart handler as the inline block, so nothing diverges. */}
      <div data-pdp-buybar data-has-tabs={!isLg && seasonTabs.length > 0 ? '' : undefined} className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white rounded-t-[22px] shadow-[0_-8px_30px_rgba(0,0,0,.08)] pb-[env(safe-area-inset-bottom)]">
        {/* Primo1 `.buybar`: 22px top radius, soft upward shadow, 79px tall,
            circled thin stepper, 52px black pill. Full width: Primo1 caps it at
            440px only because its whole prototype is a 440px phone frame. */}
        {!isLg && seasonTabs.length > 0 && (
          <div className="px-3.5 pt-3">{renderSeasonTablist('bar')}</div>
        )}
        <div className="pl-6 pr-[27px] max-[440px]:pl-3.5 max-[440px]:pr-4 h-[79px] flex items-center">
          <div className="flex items-center gap-[19px] max-[440px]:gap-2.5 w-full">
            <QtyStepper
              value={quantity}
              onDecrement={() => setQuantity(q => Math.max(1, q - 1))}
              onIncrement={() => setQuantity(q => q + 1)}
              decrementLabel={t('cart.decreaseQty')}
              incrementLabel={t('cart.increaseQty')}
              decrementDisabled={product.inStock === false}
              glyph="circle"
              glyphStrokeWidth={0.9}
              glyphClassName="w-11 h-11"
              className={`flex items-center shrink-0 ${product.inStock === false ? 'opacity-40 pointer-events-none' : ''}`}
              buttonClassName="w-11 h-11 p-0 grid place-items-center text-[#222]"
              readoutAs="span"
              readoutClassName="font-sans text-[20px] leading-6 font-medium w-[13px] mx-[13px] text-center"
            />

            {/* Rendered as a plain <button> (not the shared Button primitive) so the
                explicit text-[12px] actually applies — the primitive's size prop bakes
                in text-base, and the local `cn` joiner does NOT tailwind-merge conflicts,
                so an override would just be a second, losing class. A SHORT label
                (product.addShort · price) is used here so the full string fits the narrow
                bar; the desktop inline CTA still uses the long label. */}
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={product.inStock === false}
              aria-disabled={product.inStock === false}
              className={`flex-1 min-w-0 max-w-[246px] ml-auto h-[52px] flex items-center justify-center gap-1.5 rounded-pill border px-3 font-sans text-[16px] font-semibold tracking-[0.2px] transition-colors active:scale-[0.98] ${
                product.inStock === false
                  ? 'bg-muted text-muted-foreground border-muted cursor-not-allowed'
                  : isAdded
                    ? 'bg-success text-success-foreground border-success'
                    : 'bg-primary text-primary-foreground border-primary'
              }`}
            >
              {product.inStock !== false && isAdded && <Check className="w-5 h-5 shrink-0" />}
              <span className="whitespace-nowrap">
                {product.inStock === false
                  ? t('product.outOfStock')
                  : isAdded
                    ? t('product.added')
                    : t('pdp.addToCart')}
              </span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};
