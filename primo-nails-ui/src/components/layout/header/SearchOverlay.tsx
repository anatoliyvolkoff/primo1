import React, { useState, useEffect, useId, useRef } from 'react';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search,
  X,
  Clock,
  TrendingUp,
  ArrowRight,
  Grid,
  Leaf,
  GraduationCap,
  FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../../../context/LanguageContext';
import { useStoreSetting, useProductSlot } from '../../../hooks/useStoreContent';
import { useProducts } from '../../../context/ProductContext';
import { useCourses } from '../../../hooks/useCourses';
import { Product } from '../../../data';
import { ProductCard } from '../../ProductCard';
import { NAIL_SWATCHES } from '../../../data/swatches';
import { NailSwatch } from '../../ui/NailSwatch';
import { SEASONAL_KITS } from '../../../lib/collections';
import {
  fold,
  buildVocab,
  matchProducts,
  matchProductsWithFallback,
  scoreSuggestion,
  highlightTokens,
  getRecentSearches,
  rememberSearch,
  removeRecentSearch,
  clearRecentSearches,
  type SuggestionEntry,
} from '../../../lib/searchMatch';
import { useScrollLock } from '../../../lib/scrollLock';
import { WHOLESALE_EMAIL } from '../../../lib/whatsapp';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const POPULAR_SEARCH_KEYS = ['search.popular.0', 'search.popular.1', 'search.popular.2', 'search.popular.3'] as const;

// Admin-editable search overlay config (`search_config` store-setting). When
// absent, the component falls back to the i18n keys below.
interface SearchConfig {
  popularSearches?: { it?: string; en?: string }[];
  // suggestedCollections stays in the shape for back-compat with the stored
  // setting, but the redesigned overlay no longer renders editorial collection
  // cards — it uses live categories / colours / best-sellers instead.
  suggestedCollections?: unknown;
}

/**
 * Render a label with the query tokens wrapped in a `<mark>`-style span
 * (prototype `hl()`). The highlight is bold (no background), matching
 * `.sx-row .sx-t mark` / `.sx-pt b mark` in the prototype CSS.
 */
const Highlight: React.FC<{ text: string; query: string }> = ({ text, query }) => (
  <>
    {highlightTokens(text, query).map((seg, i) =>
      seg.mark ? (
        <mark key={i} className="bg-transparent text-inherit font-bold">
          {seg.text}
        </mark>
      ) : (
        <React.Fragment key={i}>{seg.text}</React.Fragment>
      ),
    )}
  </>
);

export const SearchOverlay: React.FC<SearchOverlayProps> = ({ isOpen, onClose }) => {
  const { t, language } = useLanguage();
  const searchConfig = useStoreSetting<SearchConfig | null>('search_config', null);
  // Best-sellers slot — resolved from already-fetched store content (no new
  // fetch); mirrors the Home page's `homepage.bestSellers` wiring.
  const bestSellersSlot = useProductSlot('homepage.bestSellers');

  // Popular searches: admin config (bilingual) → i18n fallback. Clicking one
  // fills the query, which runs the search via the effect below.
  const popularSearches: string[] = (searchConfig?.popularSearches?.length
    ? searchConfig.popularSearches.map(p => (language === 'it' ? p.it : p.en) || p.it || p.en || '')
    : POPULAR_SEARCH_KEYS.map(k => t(k as any))
  ).filter(Boolean);

  const navigate = useNavigate();
  const { products: liveProducts } = useProducts();
  // Courses reuse the existing /corsi loader (React Query cached) — no new data
  // path. `data` is already locale-projected UICourse[].
  const { data: courses = [] } = useCourses();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogTitleId = useId();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  // Set when a zero-hit query was typo-corrected to a variant that *does* match,
  // so the query state can show the amber typo banner (prototype `.sx-note`).
  const [correctedQuery, setCorrectedQuery] = useState<string | null>(null);
  // Recent SEARCH QUERIES (not products) — localStorage-backed, max 6. Loaded
  // on open so edits from another session are picked up.
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) setRecentSearches(getRecentSearches());
  }, [isOpen]);

  // Memoized so the downstream memos (liveByHandle, categories, swatchCounts,
  // collections, bestSellers, vocab) and the debounced search effect don't
  // recompute / re-arm on every unrelated parent re-render (B9).
  const allProducts = React.useMemo(
    () => liveProducts.filter(p => p.isVisible !== false),
    [liveProducts],
  );
  const liveByHandle = React.useMemo(
    () => new Map(allProducts.map(p => [p.handle ?? p.id, p])),
    [allProducts]
  );

  // Distinct top-level categories from the live catalogue (no new fetch) —
  // ordered by first appearance, deduped by handle.
  const categories = React.useMemo(() => {
    const seen = new Map<string, { name: string; handle: string }>();
    for (const p of allProducts) {
      if (p.categoryHandle && p.category && !seen.has(p.categoryHandle)) {
        seen.set(p.categoryHandle, { name: p.category, handle: p.categoryHandle });
      }
    }
    // Count products per category handle, including GEL sub-categories in the
    // parent's count (categoryHandle OR subCategoryHandle === handle), so the
    // row shows "N prodotti" like the client prototype.
    return Array.from(seen.values())
      .slice(0, 8)
      .map(cat => ({
        ...cat,
        count: allProducts.filter(
          p => p.categoryHandle === cat.handle || p.subCategoryHandle === cat.handle
        ).length,
      }));
  }, [allProducts]);

  // Best sellers: admin-configured `homepage.bestSellers` slot → isPromoted →
  // first few visible products. Same precedence the Home page uses; purely a
  // reuse of data the overlay already has, no new request.
  const bestSellers = React.useMemo(() => {
    const fromSlot = bestSellersSlot.handles
      .map(h => liveByHandle.get(h))
      .filter((p): p is Product => !!p);
    if (fromSlot.length > 0) return fromSlot.slice(0, 4);
    const promoted = allProducts.filter(p => p.isPromoted);
    return (promoted.length > 0 ? promoted : allProducts).slice(0, 4);
  }, [bestSellersSlot.handles, liveByHandle, allProducts]);

  // Colour swatches with a live product count (same crosswalk the "Cerca per
  // colore" grid uses), skipping palettes with no matching products.
  const swatchCounts = React.useMemo(() => {
    return NAIL_SWATCHES.map(sw => {
      const count = allProducts.filter(p => {
        if (sw.productEffect && p.effect?.toUpperCase() === sw.productEffect) return true;
        if (!p.colorName) return false;
        const t = p.colorName.toUpperCase().split(/[,\s]+/).map(x => x.trim()).filter(Boolean);
        return sw.productColors.some(c => t.includes(c));
      }).length;
      return { swatch: sw, count };
    });
  }, [allProducts]);

  // Seasonal collections present in the live catalogue, with a shade count
  // (the kit itself + its bundled shades), via the shared collection lookup.
  const collections = React.useMemo(() => {
    const kitByLabel = new Map<string, { label: string; count: number }>();
    for (const p of allProducts) {
      const label = SEASONAL_KITS[p.handle ?? ''];
      if (!label) continue;
      const shades = new Set<string>([p.handle!, ...(p.bundleHandles ?? [])]);
      kitByLabel.set(label, { label, count: shades.size });
    }
    return Array.from(kitByLabel.values());
  }, [allProducts]);

  // Vocabulary for typo-correction — rebuilt when the catalogue / index words
  // change. Mirrors the prototype's VOCAB = every INDEX entry's words: we widen
  // the product-derived vocabulary with the non-product search terms (category /
  // colour / collection / course / page labels + aliases) so a real term like
  // "corso" is a KNOWN word and is never "corrected" into a nearest product word
  // (DELTA-1). `buildVocab` folds + tokenises each entry, so raw labels are fine.
  const indexWords = React.useMemo(() => {
    const words: string[] = [];
    for (const cat of categories) words.push(cat.name, cat.handle);
    for (const { swatch } of swatchCounts) {
      words.push(swatch.name, swatch.slug, t(swatch.i18nKey as 'swatch.bw'), ...swatch.productColors);
    }
    for (const coll of collections) words.push(coll.label);
    for (const c of courses) {
      words.push(c.title, c.tag ?? '', c.level ?? '', 'corso corsi formazione course academy');
    }
    words.push(
      t('search.pageAbout'),
      'about us storia irina primo fondatrice azienda chi siamo',
      t('search.pageContact'),
      'contact email aiuto assistenza whatsapp contatti',
    );
    return words.filter(Boolean);
  }, [categories, swatchCounts, collections, courses, t]);
  const vocab = React.useMemo(
    () => buildVocab(allProducts, indexWords),
    [allProducts, indexWords],
  );

  // Query-state "Suggerimenti": SCORED category / colour / collection / course /
  // page hits (prototype's left column). Each carries a navigation target + a
  // right-side count or type label. Pure client scoring over already-loaded data.
  type Suggestion =
    | { kind: 'category'; key: string; label: string; count: number; to: string }
    | { kind: 'color'; key: string; label: string; count: number; to: string; swatch: typeof NAIL_SWATCHES[number] }
    | { kind: 'collection'; key: string; label: string; count: number; to: string }
    | { kind: 'course'; key: string; label: string; sub?: string; image?: string; to: string }
    | { kind: 'page'; key: string; label: string; to?: string; mailto?: string };

  const suggestions = React.useMemo<{ items: Suggestion[]; query: string; rawHasSuggestions: boolean }>(() => {
    const entry = (haystackParts: (string | undefined)[], label: string): SuggestionEntry => ({
      haystack: fold(haystackParts.filter(Boolean).join(' ')),
      labelFold: fold(label),
    });

    const scoreFor = (q: string): { s: Suggestion; score: number }[] => {
      if (fold(q).length < 2) return [];
      const scored: { s: Suggestion; score: number }[] = [];

      for (const cat of categories) {
        const score = scoreSuggestion(entry([cat.name, cat.handle], cat.name), q);
        if (score > 0) {
          scored.push({ s: { kind: 'category', key: `cat-${cat.handle}`, label: cat.name, count: cat.count, to: `/${cat.handle}` }, score });
        }
      }
      for (const { swatch } of swatchCounts) {
        const label = t(swatch.i18nKey as 'swatch.bw');
        const score = scoreSuggestion(
          entry([swatch.name, swatch.slug, label, ...swatch.productColors], label),
          q,
        );
        if (score <= 0) continue;
        // M27: the colour row's count comes from the SAME matcher that drives the
        // results header + "Vedi tutti", so they never disagree. Match on the
        // swatch's stable `name` (crosswalks to the catalogue colour via
        // COLOR_ALIAS_MAP) rather than the display label, so the count is correct
        // regardless of the active UI language.
        const count = matchProducts(allProducts, swatch.name).length;
        if (count === 0) continue;
        scored.push({ s: { kind: 'color', key: `color-${swatch.slug}`, label, count, to: `/tutti-prodotti?color=${swatch.slug}`, swatch }, score });
      }
      for (const coll of collections) {
        const score = scoreSuggestion(entry([coll.label], coll.label), q);
        if (score > 0) {
          scored.push({
            s: { kind: 'collection', key: `coll-${coll.label}`, label: coll.label, count: coll.count, to: `/tutti-prodotti?collection=${encodeURIComponent(coll.label)}` },
            score,
          });
        }
      }
      for (const c of courses) {
        const subParts = [c.tag, c.duration, c.level].filter(Boolean);
        const score = scoreSuggestion(
          entry([c.title, c.description, c.tag ?? undefined, c.level, 'corso corsi formazione course academy'], c.title),
          q,
        );
        if (score > 0) {
          scored.push({
            s: { kind: 'course', key: `course-${c.handle}`, label: c.title, sub: subParts.join(' · '), image: c.image, to: `/corsi/${c.handle}` },
            score,
          });
        }
      }
      const pages: { key: string; label: string; to?: string; mailto?: string; extra: string }[] = [
        { key: 'page-about', label: t('search.pageAbout'), to: '/about-us', extra: 'about us storia irina primo fondatrice azienda chi siamo' },
        // No standalone contact route in this SPA — the client prototype's
        // "Contatti" is a mailto, so mirror that here.
        { key: 'page-contact', label: t('search.pageContact'), mailto: WHOLESALE_EMAIL, extra: 'contact email aiuto assistenza whatsapp contatti' },
      ];
      for (const pg of pages) {
        const score = scoreSuggestion(entry([pg.label, pg.extra], pg.label), q);
        if (score > 0) {
          scored.push({ s: { kind: 'page', key: pg.key, label: pg.label, to: pg.to, mailto: pg.mailto }, score });
        }
      }
      return scored;
    };

    // Prefer the RAW query (prototype parity): a query like "corso" that hits a
    // course but no product must not be hijacked by the product-level typo
    // correction. Only fall back to the corrected query when the raw query
    // produces no suggestions at all (genuine typo → e.g. "rossso" → "rosso").
    const raw = searchQuery.trim();
    let usedQuery = raw;
    let scored = scoreFor(raw);
    // Whether the RAW query (as typed) matched any non-product suggestion. Used
    // to gate the product-typo-correction path below (DELTA-1): when the raw
    // query is a real term that surfaces a course / page / collection, we must
    // NOT let the product-level typo "correction" hijack it into a bogus
    // Prodotti grid + amber note, matching the prototype (correction only kicks
    // in when the full index has no hit for the raw query).
    const rawHasSuggestions = scored.length > 0;
    if (scored.length === 0 && correctedQuery) {
      usedQuery = correctedQuery.trim();
      scored = scoreFor(usedQuery);
    }

    scored.sort((a, b) => b.score - a.score);
    return { items: scored.slice(0, 7).map(x => x.s), query: usedQuery, rawHasSuggestions };
  }, [searchQuery, correctedQuery, categories, swatchCounts, collections, courses, allProducts, t]);

  const handleClose = () => {
    onClose();
    setSearchQuery('');
    setFocusedIndex(-1);
  };

  const handleProductClick = (idOrHandle: string) => {
    // Remember the query that led here (prototype `data-save`), then navigate.
    if (effectiveQuery.length >= 2) setRecentSearches(rememberSearch(effectiveQuery));
    handleClose();
    navigate(`/product/${idOrHandle}`);
  };

  // Focus trap: contains Tab/Shift-Tab within the dialog, handles Escape, and
  // restores focus to the trigger element on close.
  const overlayRef = useFocusTrap<HTMLDivElement>({ active: isOpen, onEscape: handleClose });

  // Click outside to close
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (isOpen && overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen]);

  // Body scroll-lock while open (shared refcounted lock).
  useScrollLock(isOpen);

  // Search — scored + typo-tolerant matching via the shared, framework-free
  // matcher (also consumed by the `?q=` results page). ~90 ms debounce (M51).
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length > 1) {
        const { results, correctedQuery: fixed } = matchProductsWithFallback<Product>(
          allProducts,
          searchQuery,
          vocab,
        );
        setSearchResults(results);
        setCorrectedQuery(fixed);
        setFocusedIndex(-1);
      } else {
        setSearchResults([]);
        setCorrectedQuery(null);
        setFocusedIndex(-1);
      }
    }, 90);
    return () => clearTimeout(timer);
  }, [searchQuery, allProducts, vocab]);

  const hasQuery = searchQuery.trim().length > 1;

  // DELTA-1 structural guard (prototype parity): the product-typo-correction
  // may only drive the Prodotti grid / amber note / "Vedi tutti" when the RAW
  // query had NO genuine index hit. If the raw query already surfaced a
  // non-product suggestion (e.g. the course word "corso"), any product
  // "correction" to a near product word ("cosi") is a false positive — suppress
  // it so the query shows just its course suggestion, with no bogus product
  // section/note. Direct product matches (no correction) are unaffected.
  const typoHijack = !!correctedQuery && suggestions.rawHasSuggestions;
  const productResults = typoHijack ? [] : searchResults;
  const effectiveTypoNote = typoHijack ? null : correctedQuery;

  // The query that actually produced the results (typo-corrected when the raw
  // query matched nothing). Drives ALL downstream copy so the counts never
  // disagree (M27). When the correction is a false positive over a real
  // suggestion term (DELTA-1 `typoHijack`), fall back to the raw query so
  // "Vedi tutti" / remembered searches use what the user actually typed.
  const effectiveQuery = ((typoHijack ? null : correctedQuery) ?? searchQuery).trim();

  // The query state shows results whenever there's EITHER a product match OR a
  // suggestion (category/colour/collection/course/page) — mirrors the prototype,
  // where a query like "corso" can surface a course without any product hit.
  const hasResults = productResults.length > 0 || suggestions.items.length > 0;

  // Fill the input with a term and let the debounced effect re-run the search
  // (shared by popular chips + recent-search rows).
  const fillQuery = (term: string) => {
    setSearchQuery(term);
    inputRef.current?.focus();
  };

  const clearSingleRecent = (q: string) => {
    setRecentSearches(removeRecentSearch(q));
    inputRef.current?.focus();
  };
  const clearAllRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
    inputRef.current?.focus();
  };

  // Submit: remember the query, then route to the ?q= results page (the only
  // store-wide search target in this SPA). Prototype routes to catalogo.html?q=.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q.length < 2) return;
    setRecentSearches(rememberSearch(effectiveQuery || q));
    handleClose();
    navigate(`/tutti-prodotti?q=${encodeURIComponent(effectiveQuery || q)}`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Scrim — fades in below/behind the panel; click to close. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onMouseDown={handleClose}
            aria-hidden="true"
            className="fixed inset-0 z-[300] bg-background/80 backdrop-blur-xl lg:bg-[hsl(var(--scrim)/0.4)] lg:backdrop-blur-0"
          />

          <motion.div
            ref={overlayRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            initial={{ y: -14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -14, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 0.8, 0.24, 1] }}
            className="fixed z-[301] flex flex-col bg-background inset-0 h-[100dvh] lg:inset-[0_0_auto_0] lg:h-auto lg:max-h-[calc(100vh-48px)] lg:rounded-b-[28px] lg:shadow-[0_30px_70px_rgba(0,0,0,0.2)]"
          >
            <h2 id={dialogTitleId} className="sr-only">{t('search.placeholder')}</h2>

            {/* ── Top bar: pill field + "Chiudi Esc" ───────────────────────── */}
            <form
              onSubmit={handleSubmit}
              className="flex-none w-full lg:max-w-[976px] lg:mx-auto px-4 lg:px-0 pt-3 lg:pt-5 pb-3 lg:pb-4"
            >
              <div className="flex items-center gap-2.5 lg:gap-3.5">
                <div className="group relative flex-1 min-w-0 flex items-center gap-2 h-[48px] lg:h-[52px] pl-[18px] lg:pl-[22px] pr-2.5 rounded-[26px] bg-[#f3f3f3] transition-[background,box-shadow] duration-150 focus-within:bg-white focus-within:shadow-[0_0_0_1.5px_#111]">
                  <Search className="flex-none w-[19px] h-[19px] lg:w-5 lg:h-5 text-foreground" strokeWidth={2} />
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && productResults.length > 0 && focusedIndex >= 0) {
                        e.preventDefault();
                        handleProductClick(productResults[focusedIndex].handle || productResults[focusedIndex].id);
                      } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setFocusedIndex(prev => Math.min(prev + 1, Math.min(productResults.length, 8) - 1));
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setFocusedIndex(prev => Math.max(prev - 1, -1));
                      }
                    }}
                    placeholder={t('search.placeholder')}
                    className="flex-1 min-w-0 h-full bg-transparent border-0 outline-none text-[15px] lg:text-[16px] font-medium text-foreground placeholder:text-[#8b8b8b] placeholder:font-normal"
                  />
                  {/* Clear the query (round × — does NOT close the overlay) */}
                  {searchQuery.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(''); inputRef.current?.focus(); }}
                      aria-label={t('search.clear')}
                      className="flex-none w-[34px] h-[34px] grid place-items-center rounded-full text-foreground"
                    >
                      <span className="grid place-items-center w-[22px] h-[22px] rounded-full bg-[#dedede]">
                        <X className="w-[13px] h-[13px]" strokeWidth={2.6} />
                      </span>
                    </button>
                  )}
                </div>

                {/* Leave the search overlay. Desktop shows "Chiudi Esc"; mobile
                    keeps a tappable round × so the existing mobile UX stands. */}
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label={t('search.close')}
                  className="flex-none lg:inline-flex lg:items-center lg:gap-1.5 lg:px-2.5 lg:h-auto lg:w-auto lg:rounded-none lg:border-0 lg:bg-transparent lg:text-[13px] lg:font-semibold lg:text-[#555] lg:hover:text-foreground w-[48px] h-[48px] grid place-items-center rounded-full border border-border bg-white text-foreground hover:bg-foreground hover:text-background lg:hover:bg-transparent lg:hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5 lg:hidden" strokeWidth={2} />
                  <span className="hidden lg:inline">{t('search.close')}</span>
                  <kbd className="hidden lg:inline-grid place-items-center min-w-[20px] h-[20px] px-[5px] border border-[#dcdcdc] border-b-2 rounded-md bg-white text-[10.5px] font-semibold leading-none text-[#777]">
                    Esc
                  </kbd>
                </button>
              </div>
            </form>

            {/* ── Body ─────────────────────────────────────────────────────── */}
            <div className="flex-1 min-h-0 overflow-y-auto w-full lg:max-w-[976px] lg:mx-auto px-4 lg:px-0 pb-7 lg:pb-[30px] custom-scrollbar">
              <AnimatePresence mode="wait">
                {hasQuery ? (
                  /* ===== QUERY STATE ===== */
                  <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="lg:border-t lg:border-[#efefef] lg:pt-5">
                    {/* Typo correction note — amber `.sx-note` box (M28).
                        Suppressed when the correction was a false positive over a
                        real suggestion term (DELTA-1): `effectiveTypoNote`. */}
                    {effectiveTypoNote && hasResults && (
                      <p className="mt-0 mb-3 px-3.5 py-2.5 rounded-xl bg-[#fff6e8] text-[13px] leading-[18px] text-[#5a4220]">
                        {t('search.typoNotePrefix')} “{searchQuery.trim()}”.{' '}
                        {t('search.typoNoteResults')} “<b className="font-bold">{effectiveTypoNote}</b>”.
                      </p>
                    )}
                    {hasResults ? (
                      <div className="flex flex-col gap-0 lg:grid lg:grid-cols-[288px_1fr] lg:gap-14">
                        {/* LEFT: Suggerimenti — scored category / colour / collection / course / page hits */}
                        {suggestions.items.length > 0 && (
                          <section className="pt-2 pb-1 lg:pt-0">
                            <SectionHead title={t('search.suggestions')} />
                            <ul className="-mx-2">
                              {suggestions.items.map(sug => {
                                const onSelect = () => {
                                  if (effectiveQuery.length >= 2) setRecentSearches(rememberSearch(effectiveQuery));
                                  handleClose();
                                };
                                const rowClass = `flex items-center gap-3 w-full px-2 rounded-xl text-left text-[15px] font-normal text-foreground hover:bg-[#f6f6f6] transition-colors ${
                                  sug.kind === 'course' ? 'min-h-[56px] py-1.5' : 'min-h-[44px]'
                                }`;
                                const inner = (
                                  <>
                                    <span
                                      className={`flex-none grid place-items-center text-[#555] overflow-hidden ${
                                        sug.kind === 'course'
                                          ? 'w-10 h-10 rounded-[10px] bg-[#f4f4f4]'
                                          : 'w-[30px] h-[30px] rounded-full bg-[#f4f4f4]'
                                      }`}
                                    >
                                      {sug.kind === 'color' ? (
                                        sug.swatch.moodPhoto ? (
                                          <img src={sug.swatch.moodPhoto} alt="" loading="lazy" decoding="async" className="w-[18px] h-[26px] object-contain" />
                                        ) : (
                                          <span className="w-[16px] h-[16px] rounded-full" style={sug.swatch.swatchImage ? { background: `url(${sug.swatch.swatchImage}) center / cover no-repeat` } : { background: sug.swatch.color }} />
                                        )
                                      ) : sug.kind === 'collection' ? (
                                        <Leaf className="w-[15px] h-[15px]" strokeWidth={2} />
                                      ) : sug.kind === 'course' ? (
                                        sug.image ? (
                                          <img src={sug.image} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                        ) : (
                                          <GraduationCap className="w-[15px] h-[15px]" strokeWidth={2} />
                                        )
                                      ) : sug.kind === 'page' ? (
                                        <FileText className="w-[15px] h-[15px]" strokeWidth={2} />
                                      ) : (
                                        <Grid className="w-[15px] h-[15px]" strokeWidth={2} />
                                      )}
                                    </span>
                                    <span className="flex-1 min-w-0 overflow-hidden">
                                      <span className="block truncate">
                                        <Highlight text={sug.label} query={suggestions.query} />
                                      </span>
                                      {sug.kind === 'course' && sug.sub && (
                                        <small className="block mt-0.5 text-[12px] leading-4 text-[#8a8a8a] truncate font-normal">
                                          {sug.sub}
                                        </small>
                                      )}
                                    </span>
                                    <span className="flex-none text-[12px] font-medium text-[#8a8a8a]">
                                      {sug.kind === 'collection'
                                        ? t('search.suggestionType.collection')
                                        : sug.kind === 'course'
                                          ? t('search.suggestionType.course')
                                          : sug.kind === 'page'
                                            ? t('search.suggestionType.page')
                                            : t('search.categoryCount', { count: sug.count })}
                                    </span>
                                  </>
                                );
                                return (
                                  <li key={sug.key}>
                                    {sug.kind === 'page' && sug.mailto ? (
                                      <a href={`mailto:${sug.mailto}`} onClick={onSelect} className={rowClass}>
                                        {inner}
                                      </a>
                                    ) : (
                                      <Link to={sug.to ?? '/'} onClick={onSelect} className={rowClass}>
                                        {inner}
                                      </Link>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </section>
                        )}

                        {/* RIGHT: Prodotti — 4-col grid on desktop (only when
                            there are product hits; suggestion-only queries like
                            "corso" show just the left column). */}
                        {productResults.length > 0 ? (
                          <section className={`pt-4 lg:pt-0 ${suggestions.items.length === 0 ? 'lg:col-span-2' : ''}`}>
                            <SectionHead
                              title={t('search.products')}
                              count={t('search.results', { count: productResults.length })}
                            />
                            <div className="grid grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3">
                              {productResults.slice(0, 8).map((product, idx) => (
                                <div
                                  key={product.id}
                                 
                                  className={focusedIndex === idx ? 'rounded-[16px] ring-2 ring-foreground ring-offset-2' : undefined}
                                >
                                  <ProductCard
                                    product={product}
                                    highlightQuery={effectiveQuery}
                                    onNavigate={() => {
                                      if (effectiveQuery.length >= 2) setRecentSearches(rememberSearch(effectiveQuery));
                                      handleClose();
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                            {/* Vedi tutti N — carries the (effective) query through
                                to the results page via ?q= (M27 unified count). */}
                            <Link
                              to={`/tutti-prodotti?q=${encodeURIComponent(effectiveQuery)}`}
                              onClick={() => {
                                if (effectiveQuery.length >= 2) setRecentSearches(rememberSearch(effectiveQuery));
                                handleClose();
                              }}
                              className="inline-flex items-center justify-center gap-2 mt-5 min-h-[44px] px-5 rounded-[22px] bg-foreground text-background text-[14px] font-semibold tracking-[0.2px]"
                            >
                              {t('search.seeAll', { count: productResults.length, query: effectiveQuery })}
                              <ArrowRight className="w-[17px] h-[17px]" strokeWidth={2} />
                            </Link>
                          </section>
                        ) : null}
                      </div>
                    ) : (
                      /* ===== NO RESULTS — prototype `.sx-none` (M26) ===== */
                      <div className="py-9 lg:py-8 text-center text-[#666] text-[14px] leading-5">
                        <Search className="mx-auto w-10 h-10 text-[#c4c4c4]" strokeWidth={1.5} />
                        <p className="mt-2.5 mb-1 text-[17px] leading-[22px] font-bold text-foreground break-words">
                          {t('search.noResultsTitle', { query: searchQuery.trim() })}
                        </p>
                        <p className="mx-auto max-w-[320px]">{t('search.noResultsAdvice')}</p>
                        {/* "Prova con" popular chips */}
                        <section className="mt-6 text-left lg:max-w-[420px] lg:mx-auto">
                          <div className="lg:text-center">
                            <SectionHead title={t('search.tryWith')} />
                          </div>
                          <div className="flex flex-wrap gap-2 lg:justify-center">
                            {popularSearches.map((term, i) => (
                              <button
                                key={`${term}-${i}`}
                                type="button"
                                onClick={() => fillQuery(term)}
                                className="inline-flex items-center gap-[7px] min-h-[40px] pl-[13px] pr-[15px] rounded-[20px] border border-[#e2e2e2] bg-white text-[13px] font-semibold text-foreground hover:border-foreground transition-colors"
                              >
                                <TrendingUp className="w-3.5 h-3.5 text-[#ff9000]" strokeWidth={2} />
                                {term}
                              </button>
                            ))}
                          </div>
                        </section>
                        <p className="mt-6">
                          {t('search.notFoundHelp')}{' '}
                          <a
                            href={`mailto:${WHOLESALE_EMAIL}`}
                            className="text-foreground font-semibold underline underline-offset-[3px]"
                          >
                            {t('search.writeUs')}
                          </a>
                        </p>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  /* ===== IDLE STATE — 2-col grid (288px | 1fr) ===== */
                  <motion.div
                    key="initial"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col gap-0 lg:grid lg:grid-cols-[288px_1fr] lg:gap-14 lg:border-t lg:border-[#efefef]"
                  >
                    {/* LEFT column */}
                    <div className="min-w-0 flex flex-col gap-2 lg:pt-[22px]">
                      {recentSearches.length > 0 && (
                        <section className="pt-5 lg:pt-0">
                          <SectionHead
                            title={t('search.recentSearches')}
                            action={
                              <button
                                type="button"
                                onClick={clearAllRecent}
                                className="min-h-[32px] px-0.5 text-[12.5px] font-semibold text-foreground underline underline-offset-[3px] hover:text-[#555] transition-colors"
                              >
                                {t('search.clearAll')}
                              </button>
                            }
                          />
                          <ul className="-mx-2">
                            {recentSearches.map(q => (
                              <li key={q} className="flex items-center">
                                <button
                                  type="button"
                                  onClick={() => fillQuery(q)}
                                  className="flex-1 min-w-0 flex items-center gap-3 min-h-[48px] px-2 rounded-xl text-left text-[15px] font-medium text-foreground hover:bg-[#f6f6f6] transition-colors"
                                >
                                  <span className="flex-none grid place-items-center w-[30px] h-[30px] rounded-full bg-[#f4f4f4] text-[#555]">
                                    <Clock className="w-[15px] h-[15px]" strokeWidth={2} />
                                  </span>
                                  <span className="flex-1 min-w-0 truncate">{q}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => clearSingleRecent(q)}
                                  aria-label={t('search.removeRecent', { query: q })}
                                  className="flex-none w-11 h-11 grid place-items-center rounded-full text-[#9a9a9a] hover:text-foreground hover:bg-[#f4f4f4] transition-colors"
                                >
                                  <X className="w-4 h-4" strokeWidth={2} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        </section>
                      )}

                      <section className="pt-5 lg:pt-2">
                        <SectionHead title={t('search.popularSearches')} icon={<TrendingUp className="w-4 h-4" />} />
                        <div className="flex flex-wrap gap-2">
                          {popularSearches.map((term, i) => (
                            <button
                              key={`${term}-${i}`}
                              type="button"
                              onClick={() => fillQuery(term)}
                              className="inline-flex items-center gap-[7px] min-h-[40px] pl-[13px] pr-[15px] rounded-[20px] border border-[#e2e2e2] bg-white text-[13px] font-semibold text-foreground hover:border-foreground transition-colors"
                            >
                              <TrendingUp className="w-3.5 h-3.5 text-[#ff9000]" strokeWidth={2} />
                              {term}
                            </button>
                          ))}
                        </div>
                      </section>

                      {categories.length > 0 && (
                        <section className="pt-5 lg:pt-2">
                          <SectionHead title={t('search.categories')} />
                          <ul className="-mx-2">
                            {/* M53: cap idle categories at 6; M46: grid-circle icon, no chevron */}
                            {categories.slice(0, 6).map(cat => (
                              <li key={cat.handle}>
                                <Link
                                  to={`/${cat.handle}`}
                                  onClick={handleClose}
                                  className="flex items-center gap-3 w-full min-h-[48px] px-2 rounded-xl text-[15px] font-medium text-foreground hover:bg-[#f6f6f6] transition-colors"
                                >
                                  <span className="flex-none grid place-items-center w-[30px] h-[30px] rounded-full bg-[#f4f4f4] text-[#555]">
                                    <Grid className="w-[15px] h-[15px]" strokeWidth={2} />
                                  </span>
                                  <span className="flex-1 min-w-0 truncate">{cat.name}</span>
                                  <span className="flex-none text-[12px] font-medium text-[#8a8a8a]">
                                    {t('search.categoryCount', { count: cat.count })}
                                  </span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </section>
                      )}
                    </div>

                    {/* RIGHT column */}
                    <div className="min-w-0 flex flex-col gap-2 lg:pt-[22px]">
                      <section className="pt-5 lg:pt-0">
                        <SectionHead title={t('search.byColor')} />
                        <div className="grid grid-cols-5 lg:grid-cols-7 gap-2">
                          {NAIL_SWATCHES.map(swatch => (
                            <Link
                              key={swatch.name}
                              // Same target as the Home "Shop by color" palette:
                              // the Gel Polish (Semipermanente) catalogue filtered
                              // by this colour; #prodotti scrolls to the results.
                              to={`/semipermanente?color=${swatch.slug}#prodotti`}
                              onClick={handleClose}
                              className="group flex flex-col items-center gap-1.5 py-1.5 rounded-xl text-center outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                              {/* The glossy nail swatch (photo OR CSS fallback)
                                  is shared with the Home ShopByColor palette via
                                  <NailSwatch> — the `grid` preset reproduces the
                                  26×62 footprint + hover lift. Keep them in sync;
                                  this must look like a scaled copy of ShopByColor's
                                  O&Y swatch. */}
                              <NailSwatch swatch={swatch} size="grid" />
                              <span className="text-[11px] font-semibold text-[#444] truncate max-w-full group-hover:underline group-hover:underline-offset-[3px]">
                                {t(swatch.i18nKey as any)}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </section>

                      {bestSellers.length > 0 && (
                        <section className="pt-5 lg:pt-2">
                          <SectionHead title={t('search.bestSellers')} />
                          <div className="grid grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3">
                            {bestSellers.map(product => (
                              <div key={product.id}>
                                <ProductCard product={product} onNavigate={handleClose} />
                              </div>
                            ))}
                          </div>
                        </section>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

/** Prototype `.sx-h` section heading: uppercase, 11.5px, 1.6px tracking,
 *  grey #7d7d7d, with an optional leading icon, a trailing count or a
 *  trailing action (e.g. "Cancella"). */
const SectionHead: React.FC<{
  title: string;
  icon?: React.ReactNode;
  count?: string;
  action?: React.ReactNode;
}> = ({ title, icon, count, action }) => (
  <div className="flex items-baseline justify-between gap-3 mb-2">
    <div className="flex items-center gap-2 text-[#7d7d7d]">
      {icon}
      <h3 className="text-[11.5px] leading-4 font-bold tracking-[1.6px] uppercase">{title}</h3>
    </div>
    {action ? action : count ? <span className="text-[12.5px] font-medium text-[#7d7d7d]">{count}</span> : null}
  </div>
);
