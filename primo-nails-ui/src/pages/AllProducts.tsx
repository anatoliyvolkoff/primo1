import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { Pagination } from '../components/Pagination';
import { SortOption } from '../components/SortControl';
import { useProducts } from '../context/ProductContext';
import { Banner } from '../components/layout/Banner';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { FilterBar } from '../components/FilterBar';
import { RunningBanner } from '../components/collections/RunningBanner';
import { productMatchesSwatch, NAIL_SWATCHES } from '../data/swatches';
import { buildCollectionLookup, COLLECTION_LABELS } from '../lib/collections';
import { ProductGridSkeleton } from '../components/skeletons/ProductGridSkeleton';
import { useSeo } from '../lib/useSeo';
import { usePageParam } from '../hooks/usePageParam';
import { useLanguage } from '../context/LanguageContext';
import { useBanner } from '../hooks/useStoreContent';
import { formatPrice } from '../lib/formatPrice';
import { buildVocab, matchProductsWithFallback } from '../lib/searchMatch';
import type { Product } from '../types';

const ITEMS_PER_PAGE = 16;

export const AllProducts = () => {
  useSeo({ titleKey: 'pageTitle.allProducts', descriptionKey: 'seo.allProducts.description', canonicalPath: '/tutti-prodotti' });
  const { t, language } = useLanguage();
  const banner = useBanner('allProducts', 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?q=80&w=1920&auto=format&fit=crop');
  const { products: liveProducts, loading, error } = useProducts();
  const collectionsFor = useMemo(() => buildCollectionLookup(liveProducts), [liveProducts]);
  const [searchParams, setSearchParams] = useSearchParams();
  // ?sort=newest (footer "Nuovi Arrivi") lands newest-first; the effect
  // re-applies it when the URL gains the param again (see the drop below).
  const sortParam = searchParams.get('sort');
  const [sortBy, setSortBy] = useState<SortOption>(() => (sortParam === 'newest' ? 'newest' : 'popularity'));
  useEffect(() => {
    if (sortParam === 'newest') {
      setSortBy('newest');
      // ScrollRestoration ignores query-only changes; the footer link is
      // clicked from the bottom of the page.
      window.scrollTo(0, 0);
    }
  }, [sortParam]);

  // ── Search query (?q=) — this is what turns the catalogue into a
  //    search-results surface (Batch 3). Read reactively so the overlay's
  //    "Vedi tutti" / "cerca di nuovo" links filter in place, and the pill's
  //    clear button can drop it.
  const query = (searchParams.get('q') ?? '').trim();

  // Filter States. Colour / collection facets are seeded from the URL so the
  // overlay's "?color=" / "?collection=" suggestion links land pre-filtered
  // (mirrors how CategoryPage honours ?color=).
  const [selectedColors, setSelectedColors] = useState<string[]>(() => {
    const fromUrl = searchParams.get('color');
    if (!fromUrl) return [];
    const swatch = NAIL_SWATCHES.find((s) => s.slug === fromUrl.toLowerCase());
    return swatch ? [swatch.name] : [];
  });
  const [selectedCollections, setSelectedCollections] = useState<string[]>(() => {
    const fromUrl = searchParams.get('collection');
    if (!fromUrl) return [];
    const label = fromUrl.toLowerCase();
    return COLLECTION_LABELS.includes(label) ? [label] : [];
  });
  const [selectedEffects, setSelectedEffects] = useState<string[]>([]);
  const [selectedAvailability, setSelectedAvailability] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100]);

  const allProducts = useMemo(
    () => liveProducts.filter(p => p.isVisible !== false),
    [liveProducts]
  );

  // Typo-correction vocabulary, rebuilt when the catalogue changes (same
  // builder the overlay uses).
  const vocab = useMemo(() => buildVocab(allProducts), [allProducts]);

  // Apply the ?q= search FIRST, with the shared scored + typo-tolerant matcher
  // (identical relevance to the overlay). `correctedQuery` drives the "Forse
  // cercavi …" note. When there's no query the full catalogue passes through.
  const { searchResults, correctedQuery } = useMemo(() => {
    if (!query) return { searchResults: allProducts, correctedQuery: null as string | null };
    const { results, correctedQuery: fixed } = matchProductsWithFallback<Product>(
      allProducts,
      query,
      vocab,
    );
    return { searchResults: results, correctedQuery: fixed };
  }, [allProducts, query, vocab]);

  const filteredProducts = useMemo(() => {
    let result = [...searchResults];

    if (selectedColors.length > 0) {
      result = result.filter(p =>
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
      // Match on the `p.effect` field (case-insensitive equality) — the same
      // source the FilterBar facet counts and CategoryPage filter use — so the
      // facet counts, AllProducts, and CategoryPage all agree. (Was a brittle
      // description-substring match that over/under-counted vs. the chips.)
      result = result.filter(p =>
        selectedEffects.some(e => p.effect?.toUpperCase() === e.toUpperCase())
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

    // Sorting. With a query active, 'popularity' leaves the matcher's
    // relevance order intact (best match first).
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
  }, [searchResults, selectedColors, selectedCollections, selectedEffects, selectedAvailability, priceRange, sortBy, collectionsFor]);

  // Real catalogue price ceiling — must match FilterBar's slider max exactly, so
  // freeze it the SAME way FilterBar does (frozen on the first non-empty product
  // set, 100 until then). Without the freeze this re-derived on every allProducts
  // change and could diverge from the frozen slider, making "reset" and the
  // priceActive check target a different max than the thumb.
  const catalogPriceMaxRef = useRef<number | null>(null);
  const catalogPriceMax = useMemo(() => {
    if (catalogPriceMaxRef.current != null) return catalogPriceMaxRef.current;
    if (!allProducts || allProducts.length === 0) return 100;
    let max = 0;
    for (const p of allProducts) {
      const v = p.priceAmount ?? (parseFloat(p.price) || 0);
      if (v > max) max = v;
    }
    catalogPriceMaxRef.current = Math.max(10, Math.ceil(max));
    return catalogPriceMaxRef.current;
  }, [allProducts]);
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

  // Drop the ?q= search (the pill × and the empty-state reset). Keeps any
  // facet selections and other params; just strips the query from the URL.
  const clearQuery = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('q');
    setSearchParams(next, { replace: true });
  };

  // ── Two-way sync between the colour/collection facets and ?color= / ?collection=
  //    (mirrors CategoryPage's ?color= sync). Without this the header search
  //    overlay's SPA <Link to="/tutti-prodotti?color=rosso"> changed the URL but
  //    the grid stayed unfiltered (no remount, and the lazy useState initializers
  //    above only run once), and back/forward between ?color= states didn't update
  //    the grid. Each effect bails when state and URL already agree, so no loop.
  //
  //    Only the FIRST colour / collection round-trips to the URL (single-value
  //    ?color= / ?collection=), matching CategoryPage's design and the overlay's
  //    single-facet suggestion links. A multi-select made in the FilterBar still
  //    filters the grid in memory, but only its first value persists on reload —
  //    a pre-existing limitation shared with CategoryPage, not introduced here.
  //
  // Direction 1: URL → state (overlay links, back/forward). Keyed on searchParams
  // so in-place navigation re-applies the facet.
  useEffect(() => {
    const fromUrl = searchParams.get('color');
    const swatch = fromUrl ? NAIL_SWATCHES.find((s) => s.slug === fromUrl.toLowerCase()) : undefined;
    const wanted = swatch ? swatch.name : null;
    if (wanted === (selectedColors[0] ?? null)) return;
    setSelectedColors(wanted ? [wanted] : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const fromUrl = searchParams.get('collection');
    const label = fromUrl?.toLowerCase();
    const wanted = label && COLLECTION_LABELS.includes(label) ? label : null;
    if (wanted === (selectedCollections[0] ?? null)) return;
    setSelectedCollections(wanted ? [wanted] : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const [currentPage, setPage] = usePageParam(totalPages);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Direction 2: state → URL (removing a chip / clearAll / FilterBar toggle). Keeps
  // the URL consistent so the filter doesn't resurrect from a stale ?color= /
  // ?collection= on reload once the URL→state sync above exists.
  //
  // Both facets share ONE effect writing ONE setSearchParams. This matters because
  // React Router 7's setSearchParams does NOT compose multiple calls fired in the
  // same commit (the last write wins and clobbers the others) — so a separate
  // color-write + collection-write + the page-reset's setPage would stomp each
  // other. We therefore also drop `page` here (a facet change always returns to
  // page 1) in the same single write; the filtersSig reset effect below skips
  // colour/collection so it can't issue a competing setPage for the same change.
  //
  // This effect is DELIBERATELY declared AFTER usePageParam(): React runs effects
  // in registration order, so this write runs LAST and wins over any same-commit
  // writer that carries no colour — specifically usePageParam's out-of-range
  // "repair" effect, which fires when adding a facet makes the current ?page=N
  // exceed the new (smaller) total. If this ran first, the repair would overwrite
  // it with a page-only URL and the colour would be lost (then the URL→state sync
  // would clear the selection). Running last, our write carries the colour AND
  // drops the stale page, leaving a consistent ?color=…&(no page) = page 1.
  useEffect(() => {
    const colorSwatch = selectedColors[0] ? NAIL_SWATCHES.find((s) => s.name === selectedColors[0]) : undefined;
    const wantedColor = colorSwatch ? colorSwatch.slug : null;
    const wantedCollection = selectedCollections[0] ?? null;
    const curColor = searchParams.get('color') ?? null;
    const curCollection = searchParams.get('collection') ?? null;
    if (wantedColor === curColor && wantedCollection === curCollection) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (wantedColor) next.set('color', wantedColor); else next.delete('color');
      if (wantedCollection) next.set('collection', wantedCollection); else next.delete('collection');
      // A facet change resets pagination; drop ?page in the same write so the
      // page-reset effect doesn't need a competing (clobbering) setPage call.
      next.delete('page');
      return next;
    }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColors, selectedCollections]);

  // Reset to page 1 only when filters ACTUALLY change (value-compared, so it's
  // StrictMode-safe and preserves a deep-linked ?page on first load).
  //
  // Two things must NOT count as a "user filter change" here, or they'd clobber
  // a deep-linked ?page=N during the async product load:
  //   1. The empty→loaded product transition (products arrive after mount) —
  //      guarded by waiting for a non-empty catalogue before baselining.
  //   2. FilterBar re-pinning priceRange from the [0,100] default sentinel up to
  //      the real catalogue max once products resolve — a full/untouched range is
  //      normalized to a constant token so this pin doesn't change the signature.
  //      A genuine narrowing (e.g. [10,30]) still changes it and resets to page 1.
  //      A full/untouched range is normalized to a constant token. "Full" means
  //      EITHER the real pinned ceiling ([0, catalogPriceMax]) OR the raw [0, 100]
  //      default sentinel the parent seeds before FilterBar re-pins — the latter
  //      matters when a product costs more than 100 (then 100 < catalogPriceMax,
  //      so the sentinel would NOT be caught by the `>= catalogPriceMax` arm and
  //      the pin would masquerade as a user filter change, clobbering ?page).
  const prevFiltersRef = useRef<string | null>(null);
  const PRICE_DEFAULT_MAX = 100; // matches FilterBar's DEFAULT_PRICE_MAX sentinel
  const priceIsFullRange =
    priceRange[0] === 0 &&
    (priceRange[1] >= catalogPriceMax || priceRange[1] === PRICE_DEFAULT_MAX);
  // NOTE: colour / collection are intentionally EXCLUDED from this signature. A
  // facet change resets pagination inside the Direction-2 URL sync effect above
  // (it drops ?page in the same single setSearchParams write). Resetting here too
  // would fire a competing setPage in the same commit, and React Router 7 does not
  // compose concurrent setSearchParams calls — the last write wins — so the two
  // would clobber each other (e.g. restoring a just-removed ?color=). All other
  // facets (query, effects, availability, price, sort) have no URL param of their
  // own, so they still reset page here with no competing writer.
  const filtersSig = JSON.stringify([
    query,
    selectedEffects, selectedAvailability,
    priceIsFullRange ? 'full' : priceRange,
    sortBy,
  ]);
  useEffect(() => {
    // Wait until products have loaded before baselining/reacting — the initial
    // empty-catalogue render (and its default priceRange) is not a user change.
    if (allProducts.length === 0) return;
    if (prevFiltersRef.current === null) { prevFiltersRef.current = filtersSig; return; }
    if (prevFiltersRef.current !== filtersSig) { prevFiltersRef.current = filtersSig; setPage(1, { scroll: false }); }
  }, [filtersSig, allProducts.length]);

  // Picking another sort drops ?sort=newest so the footer "Nuovi Arrivi" link
  // changes the URL (and re-applies) when clicked again. Declared after the
  // page-reset effect so this write runs last and isn't clobbered by its
  // setPage; it drops ?page too, matching that reset.
  useEffect(() => {
    if (sortParam !== 'newest' || sortBy === 'newest') return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('sort');
      next.delete('page');
      return next;
    }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);

  return (
    <main className="flex-1 pt-[60px] lg:pt-[95px]">
      <Banner
        variant="catalog"
        title={t('allProducts.bannerTitle')}
        subtitle={t('allProducts.bannerSubtitle')}
        imageUrl={banner.image}
        mobileImageUrl={banner.mobileImage}
      />

      <div className="container-premium lg:!max-w-[976px] lg:mx-auto mt-[9px] lg:mt-[60px] pb-16 sm:pb-20 md:pb-24">
        <Breadcrumbs withBack mobileOnly />
        
        <FilterBar
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
          facetProducts={allProducts}
          collectionsFor={collectionsFor}
          showColors
          selectedColors={selectedColors}
          setSelectedColors={setSelectedColors}
        />

        {/* Query pill — shown when the catalogue is acting as a search-results
            surface (?q=). "Risultati per '<q>'" with a × to drop the search,
            plus a "Forse cercavi …" note when a typo was corrected. */}
        {query && (
          <div className="mt-5 sm:mt-6 flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-2 pl-4 pr-2 py-2 rounded-full bg-[#f3f3f3] text-[13px] sm:text-sm font-medium text-foreground">
                <span className="text-muted-foreground">{t('search.resultsFor')}</span>
                <b className="font-bold">{query}</b>
                <button
                  type="button"
                  onClick={clearQuery}
                  aria-label={t('search.clearQuery')}
                  className="flex-none grid place-items-center w-6 h-6 rounded-full bg-[#dedede] text-foreground hover:bg-foreground hover:text-background transition-colors"
                >
                  <X className="w-3 h-3" strokeWidth={2.6} />
                </button>
              </span>
            </div>
            {correctedQuery && (
              <p className="text-[13px] sm:text-sm text-muted-foreground">
                {t('search.didYouMean', { query: correctedQuery })}
              </p>
            )}
          </div>
        )}

        {/* Product-count line above the grid (prototype catalogo.html
            #results-live). Hidden while the catalogue is still loading so it
            doesn't flash "0 prodotti". */}
        {!loading && !error && (
          <p className="sr-only" aria-live="polite">
            {t('search.categoryCount', { count: filteredProducts.length })}
          </p>
        )}

        <div className="flex flex-col gap-[50px] lg:gap-10 mt-[51px] lg:mt-10">
          {loading ? (
            <ProductGridSkeleton count={8} />
          ) : error ? (
            <div className="py-14 sm:py-20 text-center min-h-[400px] flex flex-col items-center justify-center">
              <p className="text-base sm:text-xl text-muted-foreground">{t('catalog.loadError')}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-5 sm:mt-6 px-6 sm:px-8 py-3 bg-foreground text-background rounded-full text-xs sm:text-sm font-bold uppercase tracking-widest hover:scale-[1.02] transition-transform"
              >
                {t('errorBoundary.retry')}
              </button>
            </div>
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.1 }
                }
              }}
              className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 max-sm:-mx-0.5 gap-x-2.5 gap-y-[13.6px] sm:gap-6 lg:gap-x-4 lg:gap-y-10 min-h-[400px]"
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
                    onClick={() => { clearAll(); clearQuery(); }}
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
};
