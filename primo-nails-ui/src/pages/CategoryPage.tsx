import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useProducts } from '../context/ProductContext';
import { usePageParam } from '../hooks/usePageParam';
import { ProductCard } from '../components/ProductCard';
import { SortOption } from '../components/SortControl';
import { Pagination } from '../components/Pagination';
import { RecentlyViewed } from '../components/RecentlyViewed';
import { Banner } from '../components/layout/Banner';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { FilterBar } from '../components/FilterBar';
import { CategoryColorShop } from '../components/collections/CategoryColorShop';
import { RunningBanner } from '../components/collections/RunningBanner';
import { ShieldCheck } from 'lucide-react';
import { productMatchesSwatch } from '../data/swatches';
import { buildCollectionLookup } from '../lib/collections';
import { motion, useReducedMotion } from 'motion/react';
import { StickyColorStrip } from '../components/collections/StickyColorStrip';
import { parseColorParam, serializeColorParam } from '../lib/colorParam';
import { ProductGridSkeleton } from '../components/skeletons/ProductGridSkeleton';
import { useSeo } from '../lib/useSeo';
import { breadcrumbJsonLd } from '../lib/seo';
import { useLanguage } from '../context/LanguageContext';
import { usePageBanners } from '../hooks/useStoreContent';
import { formatPrice } from '../lib/formatPrice';

// Fallback category banner when neither a per-category nor a `categoryDefault`
// banner is configured in admin. Local asset (no external dependency).
const DEFAULT_CATEGORY_BANNER = '/category-banner-default.svg';

// Category handles where the colour palette adds value (colour-led catalogue).
const CATEGORIES_WITH_PALETTE = new Set(['semipermanente']);

// Route slug → nav translation key, so the category banner title localizes
// (e.g. EN "/preparatori" → "PRIMERS", "/semipermanente" → "GEL POLISH").
const CATEGORY_TITLE_KEYS: Record<string, string> = {
  preparatori: 'nav.preparatori',
  base: 'nav.base',
  top: 'nav.top',
  gel: 'nav.gel',
  'gel-medio': 'nav.gel.medio',
  'gel-architect': 'nav.gel.architect',
  'gel-wedding-perla': 'nav.gel.weddingPerla',
  acrygel: 'nav.acrygel',
  semipermanente: 'nav.semipermanente',
  'nail-art': 'nav.nailArt',
  care: 'nav.care',
  kit: 'nav.kit',
  accessori: 'nav.accessori',
};

const ITEMS_PER_PAGE = 16;

export function CategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const { t, language } = useLanguage();
  const { products, loading } = useProducts();
  const collectionsFor = useMemo(() => buildCollectionLookup(products), [products]);
  const [searchParams, setSearchParams] = useSearchParams();
  const reducedMotion = useReducedMotion();
  // Resolve the real category title from any product matching this slug,
  // falling back to the slug itself while data loads. Avoids titles like
  // "semipermanente — PriMo Nails" (lower-case slug); now reads
  // "Semipermanente — PriMo Nails".
  const resolvedTitle = useMemo(() => {
    if (!categoryId) return '';
    const slug = categoryId.toLowerCase();
    const match = products.find(p => p.categoryHandle === slug || p.subCategoryHandle === slug);
    if (match?.subCategoryHandle === slug && match.subCategory) return match.subCategory;
    if (match?.categoryHandle === slug) return match.category;
    return categoryId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }, [categoryId, products]);
  useSeo({
    titleKey: 'pageTitle.category',
    titleVars: { category: resolvedTitle },
    descriptionKey: 'seo.category.description',
    descriptionVars: { category: resolvedTitle },
    canonicalPath: categoryId ? `/${categoryId}` : undefined,
    jsonLd: categoryId
      ? breadcrumbJsonLd([
          { name: 'Home', url: '/' },
          { name: resolvedTitle || categoryId, url: `/${categoryId}` },
        ])
      : null,
  });
  const [sortBy, setSortBy] = useState<SortOption>('popularity');
  
  // Filter States
  const [selectedColors, setSelectedColors] = useState<string[]>(() => {
    // Honour ?color=<slug> so the Home palette / shared links land pre-filtered
    // (this page is the colour-led Semipermanente shop; it inherits what /shop did).
    // Read the router's URL (not window.location) so the first render agrees
    // with the URL ↔ state sync effects below.
    return parseColorParam(searchParams.get('color'));
  });
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [selectedEffects, setSelectedEffects] = useState<string[]>([]);
  const [selectedAvailability, setSelectedAvailability] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100]);

  const categoryName = useMemo(() => {
    if (!categoryId) return '';
    return categoryId.replace(/-/g, ' ').toUpperCase();
  }, [categoryId]);

  const baseFilteredProducts = useMemo(() => {
    if (!categoryId) return [];
    // Match by category handle (URL slug) first — the category *name* may
    // differ from the slug (e.g. handle 'base' → name 'Basi'). Sub-category
    // handles like 'gel-architect' also match here. Fall back to a normalized
    // name match for safety.
    const slug = categoryId.toLowerCase();
    const normalizedName = categoryId.replace(/-/g, ' ').toUpperCase();
    return products.filter(
      (p) =>
        p.categoryHandle === slug ||
        p.subCategoryHandle === slug ||
        p.category.toUpperCase() === normalizedName
    );
  }, [categoryId, products]);

  const filteredProducts = useMemo(() => {
    let result = [...baseFilteredProducts];

    // Color filter — see swatches.productMatchesSwatch for the IT-palette
    // ↔ EN-product-colour mapping (and effect handling for glitter).
    if (selectedColors.length > 0) {
      result = result.filter((p) =>
        selectedColors.some((swatchName) => productMatchesSwatch(p, swatchName))
      );
    }

    if (selectedCollections.length > 0) {
      result = result.filter(p => {
        const cols = collectionsFor(p);
        return selectedCollections.some(c => cols.includes(c));
      });
    }

    if (selectedEffects.length > 0) {
      result = result.filter((p) =>
        selectedEffects.some(
          (e) => p.effect?.toUpperCase() === e.toUpperCase()
        )
      );
    }

    if (selectedAvailability) {
      const isOut = selectedAvailability === 'Out of Stock';
      result = result.filter(p => (!p.inStock) === isOut);
    }

    result = result.filter(p => {
      const price = p.priceAmount ?? (parseFloat(p.price) || 0);
      return price >= priceRange[0] && price <= priceRange[1];
    });

    // Sorting
    const priceOf = (p: typeof result[number]) => p.priceAmount ?? (parseFloat(p.price) || 0);
    // "Novità" (newest first): sort by product creation date descending. Missing
    // dates sort last (treated as epoch 0) so they never jump to the front.
    const createdOf = (p: typeof result[number]) => (p.createdAt ? Date.parse(p.createdAt) : 0);
    switch (sortBy) {
      case 'price-asc': result.sort((a, b) => priceOf(a) - priceOf(b)); break;
      case 'price-desc': result.sort((a, b) => priceOf(b) - priceOf(a)); break;
      case 'newest': result.sort((a, b) => createdOf(b) - createdOf(a)); break;
      case 'popularity': break;
    }

    return result;
  }, [baseFilteredProducts, selectedColors, selectedCollections, selectedEffects, selectedAvailability, priceRange, sortBy, collectionsFor]);

  // Real catalogue price ceiling for this category (mirrors FilterBar's max)
  // so we can show a "price" chip once the slider is narrowed (bug: slider use
  // wasn't reflected in the active-filter list).
  const catalogPriceMax = useMemo(() => {
    let max = 0;
    for (const p of baseFilteredProducts) {
      const v = p.priceAmount ?? (parseFloat(p.price) || 0);
      if (v > max) max = v;
    }
    return Math.max(10, Math.ceil(max));
  }, [baseFilteredProducts]);
  const priceActive = priceRange[0] > 0 || priceRange[1] < catalogPriceMax;

  const activeFilters = useMemo(() => {
    const filters: { type: string, value: string }[] = [];
    selectedColors.forEach(c => filters.push({ type: 'color', value: c }));
    selectedCollections.forEach(c => filters.push({ type: 'collection', value: c }));
    selectedEffects.forEach(e => filters.push({ type: 'effect', value: e }));
    if (selectedAvailability) filters.push({ type: 'availability', value: selectedAvailability });
    if (priceActive) filters.push({ type: 'price', value: `${formatPrice(priceRange[0], language)} – ${formatPrice(priceRange[1], language)}` });
    return filters;
  }, [selectedColors, selectedCollections, selectedEffects, selectedAvailability, priceActive, priceRange, language]);

  const removeFilter = (filter: { type: string, value: string }) => {
    if (filter.type === 'color') setSelectedColors(prev => prev.filter(c => c !== filter.value));
    if (filter.type === 'collection') setSelectedCollections(prev => prev.filter(c => c !== filter.value));
    if (filter.type === 'effect') setSelectedEffects(prev => prev.filter(e => e !== filter.value));
    if (filter.type === 'availability') setSelectedAvailability(null);
    if (filter.type === 'price') setPriceRange([0, catalogPriceMax]);
  };

  const clearAll = () => {
    setSelectedColors([]);
    setSelectedCollections([]);
    setSelectedEffects([]);
    setSelectedAvailability(null);
    setPriceRange([0, catalogPriceMax]);
  };

  // Colours are multi-select everywhere on this page (big palette, sticky strip
  // and the filter sheet): a tap adds the colour, tapping it again removes it.
  const toggleColor = (color: string) => {
    setSelectedColors(prev => (prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]));
  };

  const resultsRef = useRef<HTMLDivElement>(null);
  const gridEndRef = useRef<HTMLDivElement>(null);
  const scrollToResults = () => {
    // Next frame, so the title/count swap has committed before we measure.
    requestAnimationFrame(() =>
      resultsRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' }),
    );
  };
  // Big palette: the FIRST colour brings the results (filter bar + grid) into
  // view; further taps don't scroll, so the user can keep adding colours without
  // being pulled away. The sticky strip then carries on from the results.
  const pickColorFromPalette = (color: string) => {
    const wasEmpty = selectedColors.length === 0;
    toggleColor(color);
    if (wasEmpty) scrollToResults();
  };
  // Sticky strip: only re-anchors on the first products when the page got
  // shorter and the user would otherwise be stranded below the grid.
  const pickColorFromStrip = (color: string) => {
    toggleColor(color);
    requestAnimationFrame(() => {
      const gridEnd = gridEndRef.current?.getBoundingClientRect().bottom ?? Infinity;
      if (gridEnd < window.innerHeight * 0.6) scrollToResults();
    });
  };
  const clearColors = () => setSelectedColors([]);

  // Switching category tab (e.g. /gel → /base, or a gel sub-tab) should start
  // from a clean filter state instead of carrying the previous category's
  // manual selections over. Colours are handled separately by the ?color= sync
  // effect below (so a URL-seeded colour on the new page survives). The price
  // range must be reset here too: a user-narrowed range (e.g. [3,7]) is NOT the
  // [0,100] sentinel FilterBar re-pins on remount, so without this reset the old
  // category's price filter leaked into the next category. We reset back to the
  // [0,100] sentinel so FilterBar re-pins it to the new category's real ceiling.
  useEffect(() => {
    setSelectedCollections([]);
    setSelectedEffects([]);
    setSelectedAvailability(null);
    setPriceRange([0, 100]);
  }, [categoryId]);

  // Two-way sync between selectedColors and ?color=<slug>[,<slug>…] (mirrors the
  // old /shop). Each effect bails when state and URL already agree, so no loop.
  // Direction 1: URL → state (Home palette link, back/forward, category switch).
  useEffect(() => {
    const wanted = parseColorParam(searchParams.get('color'));
    if (wanted.length === selectedColors.length && wanted.every((c, i) => c === selectedColors[i])) return;
    setSelectedColors(wanted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const [currentPage, setPage] = usePageParam(totalPages);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 only when category/filters actually change (StrictMode-safe; keeps deep-linked ?page).
  //
  // Two non-user changes must NOT clobber a deep-linked ?page=N during the async
  // product load: (1) the empty→loaded transition (guarded by waiting for a
  // non-empty catalogue), and (2) FilterBar re-pinning priceRange from the
  // [0,100] sentinel up to the real catalogue max once products resolve —
  // normalized to a constant token so the pin doesn't register as a filter change.
  // "Full" means EITHER the real pinned ceiling ([0, catalogPriceMax]) OR the
  // raw [0, 100] default sentinel the parent seeds before FilterBar re-pins — the
  // latter matters when a product costs more than 100 (then 100 < catalogPriceMax,
  // so the sentinel would NOT be caught by the `>= catalogPriceMax` arm and the
  // pin would masquerade as a user filter change, clobbering a deep-linked ?page).
  const prevFiltersRef = useRef<string | null>(null);
  const PRICE_DEFAULT_MAX = 100; // matches FilterBar's DEFAULT_PRICE_MAX sentinel
  const priceIsFullRange =
    priceRange[0] === 0 &&
    (priceRange[1] >= catalogPriceMax || priceRange[1] === PRICE_DEFAULT_MAX);
  // Colours are NOT in this signature: a colour change resets the page inside
  // the state → URL write below (one setSearchParams; React Router 7 lets the
  // last same-commit write win, so a separate setPage here would wipe ?color=).
  const filtersSig = JSON.stringify([
    categoryId, selectedCollections, selectedEffects, selectedAvailability,
    priceIsFullRange ? 'full' : priceRange,
    sortBy,
  ]);
  useEffect(() => {
    if (products.length === 0) return;
    if (prevFiltersRef.current === null) { prevFiltersRef.current = filtersSig; return; }
    if (prevFiltersRef.current !== filtersSig) { prevFiltersRef.current = filtersSig; setPage(1, { scroll: false }); }
  }, [filtersSig, products.length]);

  // Direction 2: state → URL (user picks a swatch on this page). Declared AFTER
  // usePageParam and the page reset so this write runs last in the commit and
  // wins; it drops ?page in the same write (a colour change returns to page 1).
  useEffect(() => {
    const fromUrl = searchParams.get('color');
    const wanted = serializeColorParam(selectedColors);
    if (wanted === fromUrl) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (wanted) next.set('color', wanted); else next.delete('color');
      next.delete('page');
      return next;
    }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColors]);

  const showPalette = !!categoryId && CATEGORIES_WITH_PALETTE.has(categoryId.toLowerCase());

  // Localized banner title (nav-key when known, else the slug) + a properly
  // cased name for the subtitle interpolation.
  const titleKey = categoryId ? CATEGORY_TITLE_KEYS[categoryId.toLowerCase()] : undefined;
  const bannerTitle = titleKey ? t(titleKey as any) : categoryName;
  const bannerName = (titleKey ? t(titleKey as any) : resolvedTitle || categoryName)
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  // Per-category banner (by slug) → global category default → hardcoded fallback.
  const pageBanners = usePageBanners();
  const categoryBanner =
    (categoryId ? pageBanners[categoryId.toLowerCase()] : undefined) ?? pageBanners.categoryDefault;
  const bannerImage = categoryBanner?.image || DEFAULT_CATEGORY_BANNER;
  const bannerMobile = categoryBanner?.mobileImage;

  return (
    <main className="flex-1 pt-[60px] lg:pt-[95px]">
      {/* Colour-led pages (Semipermanente) lead with the palette instead of the
          banner — keep an sr-only heading so the page still has its <h1>. */}
      {showPalette ? (
        <h1 className="sr-only">{bannerTitle}</h1>
      ) : (
        <Banner
          variant="catalog"
          title={bannerTitle}
          subtitle={t('category.bannerSubtitle', { category: bannerName })}
          imageUrl={bannerImage}
          mobileImageUrl={bannerMobile}
        />
      )}

      {/* The palette filters in place on this page. */}
      {showPalette && (
        <CategoryColorShop
          selectedColors={selectedColors}
          onPick={pickColorFromPalette}
          onClear={clearColors}
          count={filteredProducts.length}
          categoryLabel={bannerName}
        />
      )}

      <div>
      {/* Compact swatch strip pinned under the header once the big palette has
          scrolled away. */}
      {showPalette && (
        <StickyColorStrip
          selectedColors={selectedColors}
          onPick={pickColorFromStrip}
          onClear={clearColors}
          count={filteredProducts.length}
        />
      )}

      {/* Primo1 `.cat-nav` 9px under the hero; desktop `.fbar-wrap` 60px under it
          (80px under the palette, `.cat-semi`). */}
      <div className={`container-premium lg:!max-w-[976px] lg:mx-auto ${showPalette ? 'mt-[9px] lg:mt-[80px]' : 'mt-[9px] lg:mt-[60px]'} pb-14 sm:pb-16 md:pb-24`}>
        <Breadcrumbs withBack mobileOnly />

        {/* Scroll target after a palette pick; the margin clears the fixed header
            (+ the sticky strip on colour-led pages). */}
        <div
          ref={resultsRef}
          id="prodotti"
          className={showPalette ? 'scroll-mt-[130px] lg:scroll-mt-[175px]' : undefined}
        >
        <FilterBar
          key={categoryId}
          sortBy={sortBy}
          onSortChange={setSortBy}
          activeFilters={activeFilters}
          clearAll={clearAll}
          removeFilter={removeFilter}
          selectedCollections={selectedCollections}
          setSelectedCollections={setSelectedCollections}
          selectedEffects={selectedEffects}
          setSelectedEffects={setSelectedEffects}
          selectedAvailability={selectedAvailability}
          setSelectedAvailability={setSelectedAvailability}
          priceRange={priceRange}
          setPriceRange={setPriceRange}
          facetProducts={baseFilteredProducts}
          collectionsFor={collectionsFor}
          showColors
          selectedColors={selectedColors}
          setSelectedColors={setSelectedColors}
          enhancedSheet
          resultCount={filteredProducts.length}
        />
        </div>

        {/* Product-count line above the grid (prototype catalogo.html
            #results-live). Hidden while loading so it doesn't flash "0 prodotti". */}
        {!loading && (
          <p className="sr-only" aria-live="polite">
            {t('search.categoryCount', { count: filteredProducts.length })}
          </p>
        )}

        <div ref={gridEndRef} className="flex flex-col gap-[50px] lg:gap-10 mt-[51px] lg:mt-10">
          {loading ? (
            <ProductGridSkeleton count={8} />
          ) : (
            <motion.div
              // A new key per filter/page state remounts the grid, so each change
              // replays a short fade-up instead of a hard swap.
              key={`${filtersSig}|${selectedColors.join(',')}|${currentPage}`}
              initial="hidden"
              animate="visible"
              variants={{
                hidden: reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.3, ease: [0.22, 0.8, 0.24, 1] },
                },
              }}
              className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 max-sm:-mx-0.5 gap-x-2.5 gap-y-[13.6px] sm:gap-6 lg:gap-x-4 lg:gap-y-10 min-h-[400px] content-start"
            >
              {paginatedProducts.length > 0 ? (
                paginatedProducts.map(product => (
                  <ProductCard key={product.id} product={product} grid />
                ))
              ) : (
                <div className="col-span-full py-14 sm:py-20 text-center">
                  <p className="text-base sm:text-xl text-muted-foreground">{t('shop.noResults')}</p>
                  <button
                    type="button"
                    onClick={clearAll}
                    className="mt-5 sm:mt-6 px-6 sm:px-8 py-3 bg-foreground text-background rounded-full text-xs sm:text-sm font-bold uppercase tracking-widest hover:scale-[1.02] transition-transform"
                  >
                    {t('shop.resetFilters')}
                  </button>
                </div>
              )}
            </motion.div>
          )}
          
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
            totalResults={filteredProducts.length}
            pageSize={ITEMS_PER_PAGE}
          />
        </div>
      </div>
      </div>

      <RecentlyViewed />

      {/* TPO & HEMA FREE marquee below the grid (prototype catalogo.html). */}
      <RunningBanner
        desktopOnly
        text={t('banner.tpoHemaText')}
        highlight={t('banner.tpoHemaHighlight')}
        highlightClassName="text-green-bright"
        Icon={ShieldCheck}
      />
    </main>
  );
}
