import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, X, SlidersHorizontal, Tags } from 'lucide-react';
import { SortControl, SortOption } from './SortControl';
import { useLanguage } from '../context/LanguageContext';
import { NAIL_SWATCHES, productMatchesSwatch } from '../data/swatches';
import type { Product } from '../types';
import { formatPrice } from '../lib/formatPrice';
import { useScrollLock } from '../lib/scrollLock';
import { useSheetDragDismiss } from '../hooks/useSheetDragDismiss';
import { Swatch } from './ui';

/** All collection labels we know how to filter by. Hidden from the UI
 *  when no product in the current page-level set matches. */
const COLLECTIONS = ['autumn collection', 'winter collection', 'spring collection', 'summer collection'];
/** Likewise for effect tags — full superset; the UI only renders ones
 *  with a non-zero count. */
const EFFECTS = ['shimmer', 'holographic', 'cat-eye', 'glitter', 'matte'];

/** Map a filter effect value to its i18n key (display only; the value drives filtering). */
const EFFECT_LABEL_KEYS: Record<string, string> = {
  shimmer: 'filter.effect.shimmer',
  holographic: 'filter.effect.holographic',
  'cat-eye': 'filter.effect.catEye',
  glitter: 'filter.effect.glitter',
  matte: 'filter.effect.matte',
};
/**
 * A single-select-per-click filter option rendered as a rounded pill/chip that
 * visually toggles its selected state (Figma 7602:19896). Reuses the app's
 * active-pill pattern (SegmentedTabs / Button): selected = filled
 * `bg-primary text-primary-foreground`; unselected = bordered/transparent.
 * `aria-pressed` keeps it a keyboard-toggleable, labeled toggle button — the
 * filter logic (onChange) is unchanged from the old checkbox row.
 */
const ChipItem: React.FC<{
  label: string;
  checked: boolean;
  onChange: () => void;
  count?: number;
}> = ({ label, checked, onChange, count }) => (
  <button
    type="button"
    aria-pressed={checked}
    onClick={onChange}
    className={`inline-flex items-center gap-2 h-8 px-3.5 rounded-pill border text-xs font-medium uppercase tracking-wider transition-[background-color,color,border-color,scale] duration-200 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
      checked
        ? 'bg-primary text-primary-foreground border-primary'
        : 'bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground'
    }`}
  >
    <span>{label}</span>
    {count != null && (
      <span className={`text-[10px] font-bold tabular-nums ${checked ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
        {count}
      </span>
    )}
  </button>
);

/**
 * Desktop checkbox row (prototype `.fchip` desktop override): a borderless row
 * with a 15.3px square tick box on the left, label + count on the right.
 * Checked = filled-black box + white check. Keeps `aria-pressed` toggle-button
 * semantics so the filter logic (onChange) is identical to the pill chip — this
 * is a visual restyle only. Used only on desktop (lg); mobile keeps `ChipItem`.
 */
const CheckRow: React.FC<{
  label: string;
  checked: boolean;
  onChange: () => void;
  count?: number;
}> = ({ label, checked, onChange, count }) => (
  <button
    type="button"
    aria-pressed={checked}
    onClick={onChange}
    className="group flex items-center gap-[9px] w-full min-h-[22px] text-left outline-none"
  >
    <span
      aria-hidden="true"
      className={`flex items-center justify-center shrink-0 w-[15px] h-[15px] rounded-[4px] border transition-colors ${
        checked ? 'bg-black border-black' : 'bg-white border-[#bbb] group-hover:border-foreground'
      } group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2`}
    >
      {checked && (
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" className="w-[11px] h-[11px]">
          <path d="m5 12 5 5 9-10" />
        </svg>
      )}
    </span>
    <span className={`flex-1 text-[12px] capitalize ${checked ? 'text-black' : 'text-[#555]'}`}>{label}</span>
    {count != null && <span className="text-[12px] text-[#999] tabular-nums">{count}</span>}
  </button>
);

interface FilterBarProps {
  sortBy: SortOption;
  onSortChange: (option: SortOption) => void;
  activeFilters: { type: string; value: string }[];
  clearAll: () => void;
  removeFilter: (filter: { type: string; value: string }) => void;
  selectedCollections: string[];
  setSelectedCollections: React.Dispatch<React.SetStateAction<string[]>>;
  selectedEffects: string[];
  setSelectedEffects: React.Dispatch<React.SetStateAction<string[]>>;
  selectedAvailability: string | null;
  setSelectedAvailability: React.Dispatch<React.SetStateAction<string | null>>;
  priceRange: [number, number];
  setPriceRange: React.Dispatch<React.SetStateAction<[number, number]>>;
  showColors?: boolean;
  selectedColors?: string[];
  setSelectedColors?: React.Dispatch<React.SetStateAction<string[]>>;
  /**
   * The set of products the parent page is filtering. Used to derive
   * which COLORI/COLLEZIONI/EFFETTI options actually have matches —
   * options with a zero count are hidden, and counts are rendered
   * next to each option. Optional: when omitted, every option in the
   * known superset is shown without counts.
   */
  facetProducts?: Product[];
  /**
   * Maps a product to the collection labels it belongs to. When provided,
   * the Collections facet is derived from this (seasonal-kit membership)
   * instead of the brittle description-text match — so shades inside a
   * seasonal kit surface a Collections filter on their category page.
   */
  collectionsFor?: (p: Product) => string[];
  /**
   * On phones the colour dots in the sheet get a name + count
   * under them, and the CTA reads "Mostra N prodotti" (live result count)
   * instead of the generic "Applica filtri".
   */
  enhancedSheet?: boolean;
  /** Products currently matching ALL filters (used by `enhancedSheet`). */
  resultCount?: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  sortBy,
  onSortChange,
  activeFilters,
  clearAll,
  removeFilter,
  selectedCollections,
  setSelectedCollections,
  selectedEffects,
  setSelectedEffects,
  selectedAvailability,
  setSelectedAvailability,
  priceRange,
  setPriceRange,
  showColors = false,
  selectedColors = [],
  setSelectedColors,
  facetProducts,
  collectionsFor,
  enhancedSheet = false,
  resultCount,
}) => {
  const { t, language } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeThumb, setActiveThumb] = useState<number | null>(null);
  const activeFiltersCount = activeFilters.length;
  const barRef = useRef<HTMLDivElement>(null);
  // True while the price slider is being dragged. The drag can briefly retarget
  // pointer events outside the bar (pointer capture + node churn), which would
  // otherwise trip the outside-click handler and close the panel.
  const sliderDragging = useRef(false);
  // Drag controls for the mobile bottom sheet — drag starts from the grab
  // handle only, so swiping the handle down closes the sheet (and scrolling
  // the content inside doesn't drag it).

  // Count how many products in the page-level set match each filter
  // option. Memoized so re-renders from input changes don't recompute.
  const facets = useMemo(() => {
    if (!facetProducts) return null;
    const colors = new Map<string, number>();
    const collections = new Map<string, number>();
    const effects = new Map<string, number>();
    for (const p of facetProducts) {
      for (const swatch of NAIL_SWATCHES) {
        if (productMatchesSwatch(p, swatch.name)) {
          colors.set(swatch.name, (colors.get(swatch.name) ?? 0) + 1);
        }
      }
      const cols = collectionsFor
        ? collectionsFor(p)
        : COLLECTIONS.filter(col => p.description?.toLowerCase().includes(col.toLowerCase()));
      for (const col of cols) {
        collections.set(col, (collections.get(col) ?? 0) + 1);
      }
      if (p.effect) {
        const key = p.effect.toLowerCase();
        if (EFFECTS.includes(key)) {
          effects.set(key, (effects.get(key) ?? 0) + 1);
        }
      }
    }
    return { colors, collections, effects };
  }, [facetProducts, collectionsFor]);

  // Filter the static option lists down to ones with a non-zero count,
  // or fall back to the full list when no facetProducts were provided.
  // Colours always list the whole palette: they mirror the big "shop by colour"
  // swatches above the filter bar, which are the same filters shown visually.
  const visibleColors = NAIL_SWATCHES;
  const visibleCollections = facets
    ? COLLECTIONS.filter(c => (facets.collections.get(c) ?? 0) > 0)
    : COLLECTIONS;
  const visibleEffects = facets
    ? EFFECTS.filter(e => (facets.effects.get(e) ?? 0) > 0)
    : EFFECTS;
  const colorCount = (name: string) => facets?.colors.get(name);
  const collectionCount = (col: string) => facets?.collections.get(col);
  const effectCount = (eff: string) => facets?.effects.get(eff);

  // Real upper bound for the price slider, derived from the catalogue (was
  // hardcoded to 100, so labels read "€0–€100" and the top ~60% of the track
  // was dead). Frozen on the first non-empty product set so applying filters
  // (which shrinks facetProducts) doesn't make the slider max jump around.
  const priceMaxRef = useRef<number | null>(null);
  const priceMax = useMemo(() => {
    if (priceMaxRef.current != null) return priceMaxRef.current;
    if (!facetProducts || facetProducts.length === 0) return 100;
    let max = 0;
    for (const p of facetProducts) {
      const v = p.priceAmount ?? (parseFloat(p.price) || 0);
      if (v > max) max = v;
    }
    priceMaxRef.current = Math.max(10, Math.ceil(max));
    return priceMaxRef.current;
  }, [facetProducts]);

  // Position (0–100%) of a euro value on the track, clamped so a value that
  // temporarily exceeds priceMax (e.g. a [0,100] default on a €10 category)
  // can never push the fill bar / thumb outside the track and overflow the panel.
  const pct = (v: number) => Math.max(0, Math.min(100, (v / priceMax) * 100));

  // While the user hasn't touched the slider, keep the range pinned to the
  // full [0, priceMax] so the default reflects the real catalogue (e.g. €40),
  // not the stale 100.
  //
  // Only pin when the incoming range is still the parent's default sentinel
  // ([0, DEFAULT_PRICE_MAX]) — a non-default range provided by the parent (e.g.
  // restored from persisted/URL state) must NOT be clobbered when priceMax
  // resolves. `priceTouched` covers in-component slider edits; the sentinel
  // check covers parent-provided ranges (whose edits never set the local ref).
  // Parent pages initialise priceRange to [0, DEFAULT_PRICE_MAX] as the "untouched"
  // sentinel; only that default range is pinned to the real priceMax below.
  const DEFAULT_PRICE_MAX = 100;
  const priceTouched = useRef(false);
  useEffect(() => {
    if (priceTouched.current) return;
    // Parents initialise priceRange to [0, DEFAULT_PRICE_MAX] (see *Page.tsx).
    // Anything else is a deliberate, non-default range we must preserve.
    const isDefaultRange = priceRange[0] === 0 && priceRange[1] === DEFAULT_PRICE_MAX;
    if (!isDefaultRange) return;
    if (priceMax === DEFAULT_PRICE_MAX) return; // already at target, no-op
    setPriceRange([0, priceMax]);
  }, [priceMax, priceRange, setPriceRange]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 1000) setIsExpanded(false);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close desktop dropdown on outside click (mobile uses its own backdrop)
  useEffect(() => {
    if (!isExpanded) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (window.innerWidth < 1024) return;
      if (sliderDragging.current) return;
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && window.innerWidth >= 1024) setIsExpanded(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isExpanded]);

  // Lock page scroll ONLY for the mobile bottom-sheet (shared refcounted
  // lock). The desktop dropdown is a lightweight panel — freezing the whole
  // page when it opens made the page feel like scroll was broken.
  // Track the viewport reactively (matchMedia) so a resize/rotate while the
  // sheet is open re-evaluates the lock instead of leaving it stuck (LB139-5).
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 1023px)');
    const onChange = () => setIsMobileViewport(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  useScrollLock(isExpanded && isMobileViewport);

  // Mobile filter sheet: swipe down (handle, header, or list at its top) to close.
  const sheetRef = useRef<HTMLDivElement>(null);
  const sheetBackdropRef = useRef<HTMLDivElement>(null);
  useSheetDragDismiss({
    enabled: isExpanded && isMobileViewport,
    sheetRef,
    backdropRef: sheetBackdropRef,
    onDismiss: () => setIsExpanded(false),
  });

  const toggleColor = (color: string) => {
    setSelectedColors?.(prev =>
      prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]
    );
  };

  // Human label for an active-filter chip. Colour tokens are internal IT-ish
  // names ("rosa", "b & w") → resolve to the localized swatch label so EN mode
  // doesn't leak Italian. Other types already carry a display string.
  const chipLabel = (f: { type: string; value: string }) => {
    if (f.type === 'color') {
      const sw = NAIL_SWATCHES.find(s => s.name === f.value);
      if (sw) return t(sw.i18nKey as any);
    }
    return f.value;
  };

  // Shared filter content — rendered in both mobile sheet and desktop dropdown.
  // Called as a function (not <FilterContent/>) so it inlines into the tree and
  // doesn't remount on every render — remounting tore down the price slider
  // mid-drag (losing pointer capture) and made the panel feel like it closed.
  // Desktop legend styling (prototype: 12px/600). Mobile keeps the existing
  // small-caps heading. `mobile` toggles between the two.
  const legendCls = (mobile: boolean) =>
    mobile
      ? 'text-[10px] font-bold uppercase tracking-[0.2em] mb-5 text-muted-foreground'
      : 'text-[12px] font-semibold text-foreground mb-[15px]';

  const renderFilterContent = (mobile = false) => (
    <div
      className={
        mobile
          ? 'space-y-6'
          : `grid ${showColors ? 'grid-cols-[163.9px_1fr_1fr_1fr]' : 'grid-cols-3'} gap-x-[30.5px]`
      }
    >
      {showColors && visibleColors.length > 0 && (
        <div>
          <h3 className={legendCls(mobile)}>{t('filter.colors')}</h3>
          {/* Multi-select colour filter — checkbox semantics (not the Swatch
              default radio), grouped for a11y. On desktop it takes the
              prototype `.fdot` look: 27.5px circles, 4-per-row grid, a white
              gap + black ring when selected. */}
          <div
            role="group"
            aria-label={t('filter.colors')}
            className={
              mobile
                ? enhancedSheet
                  ? 'grid grid-cols-5 gap-x-1 gap-y-4'
                  : 'flex flex-wrap gap-2.5'
                : 'grid grid-cols-4 gap-[7.6px] w-max'
            }
          >
            {visibleColors.map((swatch) => {
              const isSelected = selectedColors.includes(swatch.name);
              const count = colorCount(swatch.name);
              const label = t(swatch.i18nKey as any);
              const dot = (
                <Swatch
                  key={swatch.name}
                  color={swatch.color}
                  image={swatch.swatchImage}
                  selected={isSelected}
                  size="lg"
                  role="checkbox"
                  onClick={() => toggleColor(swatch.name)}
                  title={count != null ? `${label} (${count})` : label}
                  aria-label={count != null ? t('a11y.colorSwatch', { label, count }) : label}
                  aria-checked={isSelected}
                  className={
                    mobile
                      ? undefined
                      : `!w-[27.5px] !h-[27.5px] !border-0 !shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)] hover:!scale-100 ${
                          isSelected ? '!shadow-[0_0_0_2px_#fff,0_0_0_3.5px_#000]' : ''
                        }`
                  }
                />
              );
              if (!(mobile && enhancedSheet)) return dot;
              // Name + count under each dot (the label also taps).
              return (
                <div key={swatch.name} className="flex flex-col items-center gap-1.5">
                  {dot}
                  <span
                    aria-hidden="true"
                    onClick={() => toggleColor(swatch.name)}
                    className={`cursor-pointer text-[11px] leading-[13px] lowercase text-center ${isSelected ? 'font-bold text-black' : 'text-[#555]'}`}
                  >
                    {label}
                  </span>
                  {count != null && (
                    <span aria-hidden="true" className="-mt-1 text-[10px] leading-3 text-[#999] tabular-nums">
                      {count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {visibleCollections.length > 0 && (
        <div>
          <h3 className={legendCls(mobile)}>{t('filter.collections')}</h3>
          <div
            role="group"
            aria-label={t('filter.collections')}
            className={mobile ? 'flex flex-wrap gap-2.5' : 'flex flex-col gap-[9.1px]'}
          >
            {visibleCollections.map(col => {
              const checked = selectedCollections.includes(col);
              const onChange = () =>
                setSelectedCollections(prev =>
                  prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
                );
              return mobile ? (
                <ChipItem key={col} label={col} count={collectionCount(col)} checked={checked} onChange={onChange} />
              ) : (
                <CheckRow key={col} label={col} count={collectionCount(col)} checked={checked} onChange={onChange} />
              );
            })}
          </div>
        </div>
      )}

      {visibleEffects.length > 0 && (
        <div>
          <h3 className={legendCls(mobile)}>{t('filter.effects')}</h3>
          <div
            role="group"
            aria-label={t('filter.effects')}
            className={mobile ? 'flex flex-wrap gap-2.5' : 'flex flex-col gap-[9.1px]'}
          >
            {visibleEffects.map(eff => {
              const label = EFFECT_LABEL_KEYS[eff] ? t(EFFECT_LABEL_KEYS[eff] as any) : eff;
              const checked = selectedEffects.includes(eff);
              const onChange = () =>
                setSelectedEffects(prev =>
                  prev.includes(eff) ? prev.filter(e => e !== eff) : [...prev, eff]
                );
              return mobile ? (
                <ChipItem key={eff} label={label} count={effectCount(eff)} checked={checked} onChange={onChange} />
              ) : (
                <CheckRow key={eff} label={label} count={effectCount(eff)} checked={checked} onChange={onChange} />
              );
            })}
          </div>
        </div>
      )}

      {/* Availability filter intentionally not rendered: the store does not
          surface stock/availability to customers (stakeholder request), and
          with backorders enabled every product is always purchasable. The
          `selectedAvailability` prop is kept so page filter state stays a
          no-op rather than breaking the FilterBar contract across pages. */}

      <div>
        <h3 className={legendCls(mobile)}>{t('filter.price')}</h3>
        <div className="px-1">
          {/* Value bubbles — prototype slim `9.5px` outlined pills on desktop;
              the roomier muted pills stay on mobile. */}
          <div className="flex justify-between mb-3 lg:mb-[9px]" aria-live="polite">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-muted/60 lg:bg-transparent lg:border lg:border-[#222] lg:rounded-[9px] lg:px-2 lg:py-0 lg:h-[18px] lg:flex lg:items-center lg:text-[9.5px] lg:font-medium lg:text-[#222]">{formatPrice(priceRange[0], language)}</span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-muted/60 lg:bg-transparent lg:border lg:border-[#222] lg:rounded-[9px] lg:px-2 lg:py-0 lg:h-[18px] lg:flex lg:items-center lg:text-[9.5px] lg:font-medium lg:text-[#222]">{formatPrice(priceRange[1], language)}</span>
          </div>
          <div
            className="relative h-10 lg:h-[30.5px] flex items-center touch-none select-none"
            onPointerDown={(e) => {
              // Keep the pointerdown from reaching the document outside-click
              // handler, and flag the drag so it can't close the panel.
              e.stopPropagation();
              sliderDragging.current = true;
              const track = e.currentTarget as HTMLElement;
              const rect = track.getBoundingClientRect();
              // Guard against a zero-width track (e.g. a display:none copy of the
              // panel) so the math never yields NaN and corrupts the range.
              if (!rect.width) return;
              const toVal = (clientX: number) =>
                Math.max(0, Math.min(priceMax, Math.round(((clientX - rect.left) / rect.width) * priceMax)));
              const v = toVal(e.clientX);
              // grab the nearer thumb (covers both clicking the track and the thumb)
              const idx = Math.abs(v - priceRange[0]) <= Math.abs(v - priceRange[1]) ? 0 : 1;
              priceTouched.current = true;
              setActiveThumb(idx);
              const apply = (clientX: number) => {
                const nv = toVal(clientX);
                setPriceRange(prev =>
                  idx === 0
                    ? [Math.min(nv, prev[1] - 1), prev[1]]
                    : [prev[0], Math.max(nv, prev[0] + 1)]
                );
              };
              apply(e.clientX);
              try { track.setPointerCapture(e.pointerId); } catch { /* optional */ }
              // Window-level listeners track the drag everywhere, independent
              // of pointer capture (which can be flaky) — this is what fixes
              // the old "moves only one step" bug.
              const move = (ev: PointerEvent) => apply(ev.clientX);
              const up = () => {
                window.removeEventListener('pointermove', move);
                window.removeEventListener('pointerup', up);
                window.removeEventListener('pointercancel', up);
                setActiveThumb(null);
                // Defer clearing so the trailing click/pointer events from this
                // drag don't reach the outside-click handler first.
                setTimeout(() => { sliderDragging.current = false; }, 0);
              };
              window.addEventListener('pointermove', move);
              window.addEventListener('pointerup', up);
              window.addEventListener('pointercancel', up);
            }}
          >
            <div aria-hidden="true" className="absolute w-full h-[3px] lg:h-[2.3px] bg-border lg:bg-[#ddd] rounded-full" />
            <div
              aria-hidden="true"
              className="absolute h-[3px] lg:h-[2.3px] bg-foreground lg:bg-[#111] rounded-full"
              style={{ left: `${pct(priceRange[0])}%`, right: `${100 - pct(priceRange[1])}%` }}
            />
            {([0, 1] as const).map((idx) => (
              <div
                key={idx}
                role="slider"
                tabIndex={0}
                aria-label={`${t('filter.price')} — ${idx === 0 ? 'min' : 'max'}`}
                aria-valuemin={0}
                aria-valuemax={priceMax}
                aria-valuenow={priceRange[idx]}
                onKeyDown={(e) => {
                  let delta = 0;
                  if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') delta = -1;
                  else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') delta = 1;
                  else return;
                  e.preventDefault();
                  priceTouched.current = true;
                  setPriceRange(prev =>
                    idx === 0
                      ? [Math.max(0, Math.min(prev[0] + delta, prev[1] - 1)), prev[1]]
                      : [prev[0], Math.min(priceMax, Math.max(prev[1] + delta, prev[0] + 1))]
                  );
                }}
                className="absolute w-5 h-5 -ml-2.5 lg:w-[15px] lg:h-[15px] lg:-ml-[7.5px] rounded-full bg-foreground lg:bg-[#111] border-2 border-background lg:border-0 shadow-md lg:shadow-none cursor-grab active:cursor-grabbing touch-none outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2"
                style={{ left: `${pct(priceRange[idx])}%`, zIndex: activeThumb === idx ? 30 : 20 }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ─── Compact Bar ─── */}
      {/* Prototype `.fbar-wrap` is a normal in-flow element (position:relative,
          z-index:4) — it scrolls away with the page, it is NOT pinned/sticky.
          We match that: `relative` (not sticky), z-[45] only so the open panel +
          chips still layer ABOVE product-card badges (z-40) and the dropdown
          renders over the grid, while staying BELOW the fixed header (z-50). */}
      <div ref={barRef} className="relative z-[45] select-none max-lg:ml-[10px] max-lg:mr-[9px] lg:-mx-2">
        {/* Prototype `.fbar`: 30px radius, soft #e8e6e5 hairline, low
            box-shadow:0 6px 24px -14px rgba(0,0,0,.12). */}
        <div className="bg-white border border-border rounded-[30px] shadow-[0_6px_24px_-14px_rgba(0,0,0,0.12)] p-2.5 sm:p-4 max-sm:h-[60px] max-sm:py-0 max-sm:pl-[13px] max-sm:pr-[8.3px] lg:h-[60px] lg:py-0 lg:px-[13px] flex items-center gap-2 sm:gap-4 cursor-pointer"
          // Empty space on the bar toggles the panel too. Ignore clicks that
          // started on a real control (they handle themselves; the sort pill
          // and its listbox must not also toggle the panel).
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('button, a, input, [role="listbox"], [data-testid="sort-control"]')) return;
            setIsExpanded(prev => !prev);
          }}
        >
          {/* Filter toggle */}
          <button
            onClick={() => setIsExpanded(prev => !prev)}
            aria-label={isExpanded ? t('filter.hideFilters') : t('filter.showFilters')}
            aria-expanded={isExpanded}
            className="flex items-center gap-2.5 max-sm:gap-[7.6px] shrink-0 min-h-[44px] px-1 max-sm:px-[9px] lg:gap-[7.6px] lg:px-[9px] lg:min-h-0 lg:h-[33.6px]"
          >
            <SlidersHorizontal className="w-4 h-4 max-sm:w-[17px] max-sm:h-[17px] lg:w-5 lg:h-5" />
            {/* Phones show the "Filtri" label too (Primo1 `.f-toggle`). */}
            <span className="text-sm font-medium max-sm:text-[13.5px] max-sm:font-semibold max-sm:text-[#1a1a1a] lg:font-semibold lg:text-[#1a1a1a]">{t('filter.filters')}</span>
            {/* Prototype count badge — small black 18px circle inside the Filtri
                pill. Hidden when no filters are active. */}
            {activeFiltersCount > 0 && (
              <span
                aria-hidden="true"
                className="grid place-items-center min-w-[18px] h-[18px] px-1 rounded-full bg-black text-white text-[10px] font-bold tabular-nums"
              >
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Spacer: pushes the chips + count + controls into one group on the
              right so the chips always sit next to the count they tunnel into
              (no empty gulf at low filter counts). lg+ only. */}
          <div aria-hidden="true" className="hidden lg:block flex-1" />

          {/* Active-filter chips — scroll horizontally and slide behind the count
              "cap" on the right (the tunnel). lg+ only (below that the toolbar
              controls leave no room); on smaller screens the chips live in the
              bottom sheet, but the count cap still shows next to Clear. */}
          {activeFiltersCount > 0 && (
            <div className="hidden lg:flex min-w-0 items-center gap-2 h-10 pr-10 overflow-x-auto overflow-y-hidden no-scrollbar [mask-image:linear-gradient(to_right,#000_calc(100%-44px),transparent)] [-webkit-mask-image:linear-gradient(to_right,#000_calc(100%-44px),transparent)]">
              {activeFilters.map((f, i) => {
                const label = chipLabel(f);
                return (
                  <button
                    key={`${f.type}-${f.value}-${i}`}
                    type="button"
                    onClick={() => removeFilter(f)}
                    aria-label={t('filter.removeFilter', { name: label })}
                    className="group flex items-center gap-1.5 shrink-0 pl-3.5 pr-2.5 h-8 rounded-full border border-border bg-white text-xs whitespace-nowrap hover:border-black transition-[border-color,scale] duration-200 active:scale-95"
                  >
                    <span className="capitalize">{label}</span>
                    <X className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Right: count cap (tunnel mouth) + clear + sort + expand toggle */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
            {activeFiltersCount > 0 && (
              <span
                aria-label={t('filter.activeCount', { count: activeFiltersCount })}
                className="relative z-10 lg:-ml-8 flex items-center gap-1.5 shrink-0 h-8 pl-3 pr-3.5 rounded-full border border-border bg-white text-foreground lg:shadow-[-12px_0_16px_-8px_rgba(0,0,0,0.20)]"
              >
                <Tags className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-bold tabular-nums">{activeFiltersCount}</span>
              </span>
            )}
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="flex items-center gap-1.5 h-10 px-3 sm:px-4 rounded-full border border-border bg-white text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground hover:text-black hover:border-black transition-all active:scale-95 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('filter.clearAll')}</span>
              </button>
            )}
            {/* Primo1: the bar's sort pill is desktop-only; phones sort from the filter sheet. */}
            <div className="max-lg:hidden">
              <SortControl currentSort={sortBy} onSortChange={onSortChange} />
            </div>
            {/* Prototype `.f-hide`: a solid-black pill ALWAYS (not grey when
                closed), white label + chevron, 42.6px tall on desktop. The
                chevron rotates 180° when the panel is open. */}
            <button
              onClick={() => setIsExpanded(prev => !prev)}
              className="h-10 sm:h-10 max-sm:h-11 max-sm:w-11 max-sm:px-0 rounded-full flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 lg:h-[42.6px] lg:px-[17px] lg:gap-[9px] transition-all duration-300 min-w-[44px] justify-center sm:justify-start bg-black text-white hover:bg-[#262626] active:scale-95"
              aria-label={isExpanded ? t('filter.hideFilters') : t('filter.showFilters')}
              aria-expanded={isExpanded}
            >
              <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-[0.18em] lg:text-[11.5px] lg:font-semibold lg:normal-case lg:tracking-normal">
                {isExpanded ? t('filter.hideFilters') : t('filter.showFilters')}
              </span>
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              >
                <ChevronDown className="w-5 h-5" />
              </motion.div>
            </button>
          </div>
        </div>

        {/* ─── Desktop dropdown ─── */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              key="desktop-filters"
              initial={{ opacity: 0, y: 8, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.99 }}
              transition={{ duration: 0.2 }}
              className="hidden lg:block absolute top-[calc(100%+12px)] left-0 right-0 z-[100] bg-white border border-[#ededed] shadow-[0_20px_50px_-24px_rgba(0,0,0,0.2)] rounded-[24px] p-[25px] max-h-[calc(100vh-150px)] overflow-y-auto custom-scrollbar"
              onClick={e => e.stopPropagation()}
            >
              {renderFilterContent()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Mobile bottom sheet ─── */}
      <AnimatePresence>
        {isExpanded && (
          <div className="lg:hidden fixed inset-0 z-[200] flex items-end">
            {/* Backdrop */}
            <motion.div
              ref={sheetBackdropRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsExpanded(false)}
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              ref={sheetRef}
              className="relative w-full bg-white rounded-t-[32px] max-h-[88vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Handle — drag target for swipe-to-dismiss */}
              <div className="flex justify-center pt-3 pb-2 shrink-0 touch-none">
                <div className="w-10 h-1.5 rounded-full bg-border" />
              </div>

              {/* Sheet header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-bold uppercase tracking-widest">{t('filter.filters')}</h3>
                  {activeFiltersCount > 0 && (
                    <span className="text-xs font-bold bg-black text-white w-5 h-5 flex items-center justify-center rounded-full">
                      {activeFiltersCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={clearAll}
                      className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-black transition-colors"
                    >
                      {t('filter.reset')}
                    </button>
                  )}
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="p-2 hover:bg-muted rounded-full transition-[background-color,scale] active:scale-90"
                    aria-label={t('filter.closeFilters')}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Active filter chips in sheet */}
              {activeFiltersCount > 0 && (
                <div className="px-6 pt-4 pb-2 flex flex-wrap gap-2 shrink-0">
                  {activeFilters.map((f, i) => (
                    <div
                      key={`${f.type}-${f.value}-${i}`}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border text-xs bg-white"
                    >
                      <span className="capitalize">{chipLabel(f)}</span>
                      <button onClick={() => removeFilter(f)} className="hover:opacity-70">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Scrollable filter content */}
              <div className="overflow-y-auto flex-1 px-6 py-6 custom-scrollbar">
                {renderFilterContent(true)}
              </div>

              {/* CTA footer — primo1 `.fp-foot` puts the phone sort control here. */}
              <div className="p-6 border-t border-border shrink-0 flex flex-col gap-4">
                <div className="flex justify-center">
                  <SortControl currentSort={sortBy} onSortChange={onSortChange} placement="up" />
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="w-full py-4 bg-black text-white rounded-full text-sm font-bold uppercase tracking-widest hover:bg-black/90 transition-colors active:scale-[0.98]"
                >
                  {enhancedSheet && resultCount != null
                    ? t('filter.showResults' as any, { count: resultCount })
                    : t('filter.apply')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
