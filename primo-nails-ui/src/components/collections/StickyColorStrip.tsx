import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronRight, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { NAIL_SWATCHES } from '../../data/swatches';
import { NUDGE_KEY, peekGap } from './stripPeek';

/**
 * Once the big palette (`#palette`) has scrolled out of view,
 * a compact strip of colour dots stays pinned under the header so the user can
 * keep switching colours while looking at products — without scrolling back up.
 *
 * Renders inside a zero-height sticky wrapper (no layout shift); only the strip
 * itself appears/disappears.
 */
interface StickyColorStripProps {
  selectedColors: string[];
  onPick: (swatchName: string) => void;
  onClear: () => void;
  count: number;
}

export const StickyColorStrip: React.FC<StickyColorStripProps> = ({
  selectedColors,
  onPick,
  onClear,
  count,
}) => {
  const { t } = useLanguage();
  const [visible, setVisible] = React.useState(false);
  const rowRef = React.useRef<HTMLDivElement>(null);
  const [gap, setGap] = React.useState<number | null>(null);
  const [edges, setEdges] = React.useState({ start: true, end: true, scrolls: false });

  // Which ends of the row are hidden → which fades / arrow to show.
  const syncEdges = React.useCallback(() => {
    const row = rowRef.current;
    if (!row) return;
    const max = row.scrollWidth - row.clientWidth;
    const start = row.scrollLeft <= 4;
    const scrolls = max > 4;
    const end = !scrolls || row.scrollLeft >= max - 4;
    setEdges((e) =>
      e.start === start && e.end === end && e.scrolls === scrolls ? e : { start, end, scrolls },
    );
  }, []);

  // Size the gap so a dot peeks in at the right edge (mobile/tablet only —
  // on desktop the whole palette fits and is centred).
  React.useLayoutEffect(() => {
    if (!visible) return;
    const row = rowRef.current;
    if (!row) return;
    const measure = () => {
      const wide = window.innerWidth >= 1024;
      setGap(wide ? null : peekGap(row.clientWidth, NAIL_SWATCHES.length));
      requestAnimationFrame(syncEdges);
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(row);
    window.addEventListener('resize', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [visible, syncEdges]);

  // First time the strip shows in a session: slide the row a little left and
  // back, so it's obvious it scrolls. Skipped for reduced motion; any touch,
  // click or wheel on the row stops it at once.
  React.useEffect(() => {
    if (!visible) return;
    const row = rowRef.current;
    if (!row) return;
    try {
      if (sessionStorage.getItem(NUDGE_KEY)) return;
    } catch {
      /* storage blocked — still nudge */
    }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    let cancelled = false;
    const cancel = () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
    row.addEventListener('pointerdown', cancel, { passive: true });
    row.addEventListener('touchstart', cancel, { passive: true });
    row.addEventListener('wheel', cancel, { passive: true });

    const timer = window.setTimeout(() => {
      const max = row.scrollWidth - row.clientWidth;
      if (cancelled || max <= 4) return;
      try {
        sessionStorage.setItem(NUDGE_KEY, '1');
      } catch {
        /* ignore */
      }
      const base = row.scrollLeft;
      const dist = base + 56 <= max ? 56 : -Math.min(56, base);
      const t0 = performance.now();
      const DUR = 900;
      const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
      const step = (now: number) => {
        if (cancelled) return;
        const p = Math.min(1, (now - t0) / DUR);
        // 0 → 1 → 0 over the run: out in the first 45%, back in the rest.
        const k = p < 0.45 ? ease(p / 0.45) : 1 - ease((p - 0.45) / 0.55);
        row.scrollLeft = base + dist * k;
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, 650);

    return () => {
      window.clearTimeout(timer);
      cancel();
      row.removeEventListener('pointerdown', cancel);
      row.removeEventListener('touchstart', cancel);
      row.removeEventListener('wheel', cancel);
    };
  }, [visible]);

  const scrollMore = () => {
    const row = rowRef.current;
    row?.scrollBy({ left: Math.round(row.clientWidth * 0.6), behavior: 'smooth' });
  };

  // Show only after the palette has scrolled ABOVE the viewport.
  React.useEffect(() => {
    const palette = document.getElementById('palette');
    if (!palette || typeof IntersectionObserver === 'undefined') return;
    // The fixed header covers the top 60px (95px on desktop), so measure the
    // palette against the header's bottom edge, not the viewport's.
    const headerH = window.innerWidth >= 1024 ? 95 : 60;
    const io = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { rootMargin: `-${headerH}px 0px 0px 0px` },
    );
    io.observe(palette);
    return () => io.disconnect();
  }, []);

  // Keep the selected dot centred in the (horizontally scrolling) row.
  React.useEffect(() => {
    const row = rowRef.current;
    const btn = row?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!row || !btn) return;
    row.scrollTo({
      left: btn.offsetLeft - row.clientWidth / 2 + btn.offsetWidth / 2,
      behavior: 'smooth',
    });
  }, [selectedColors, visible]);

  return (
    // z-[48]: above the filter bar (z-[45]) so it never paints over the strip,
    // below the fixed header (z-50).
    <div className="sticky h-0 top-[60px] lg:top-[95px]" style={{ zIndex: 48 }}>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 0.8, 0.24, 1] }}
            className="absolute inset-x-0 -top-px flex items-center h-[57px] pl-2 pr-3 bg-white border-b border-[#ededed] shadow-[0_6px_16px_-12px_rgba(0,0,0,0.25)] lg:h-[65px] lg:justify-center lg:px-6"
          >
            {/* Swatches: 28px dots with a 16px gap, so even a fully selected row
                (every dot ringed) keeps clear air between the rings. Selected =
                the design system's thin double ring (white gap + black line). */}
            <div className="relative flex-1 min-w-0 lg:flex-none">
            <div
              ref={rowRef}
              role="group"
              aria-label={t('shop.cs.groupLabel' as any)}
              onScroll={syncEdges}
              style={gap !== null ? { columnGap: `${gap}px` } : undefined}
              className="min-w-0 flex items-center gap-4 overflow-x-auto overflow-y-hidden no-scrollbar px-2 py-2 lg:overflow-visible"
            >
              {NAIL_SWATCHES.map((swatch) => {
                const isSelected = selectedColors.includes(swatch.name);
                const label = t(swatch.i18nKey as any);
                return (
                  <button
                    key={swatch.slug}
                    type="button"
                    onClick={() => onPick(swatch.name)}
                    aria-pressed={isSelected}
                    aria-label={label}
                    title={label}
                    className="group relative shrink-0 w-7 h-7 rounded-full outline-none before:absolute before:-inset-2 before:content-[''] focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-4"
                  >
                    <span
                      aria-hidden="true"
                      style={swatch.swatchImage ? { background: `url(${swatch.swatchImage}) center / cover no-repeat` } : { background: swatch.color }}
                      className={`block w-full h-full rounded-full transition-[box-shadow,transform] duration-200 ease-[cubic-bezier(.22,.8,.24,1)] group-active:scale-90 ${
                        isSelected
                          ? 'shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.15),0_0_0_2px_#fff,0_0_0_3.5px_#000]'
                          : 'shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.15)] [@media(hover:hover)_and_(pointer:fine)]:group-hover:shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.15),0_0_0_2px_#fff,0_0_0_3.5px_#c9c4bf]'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            {/* "More this way" hints (mobile/tablet): soft white fades at the
                hidden ends + a small arrow on the right, all gone once the row
                is scrolled to that end. Fades never take taps. */}
            <span
              aria-hidden="true"
              data-testid="strip-fade-left"
              className={`pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-white to-white/0 transition-opacity duration-200 lg:hidden ${edges.start ? 'opacity-0' : 'opacity-100'}`}
            />
            <span
              aria-hidden="true"
              data-testid="strip-fade-right"
              className={`pointer-events-none absolute inset-y-0 right-0 w-5 bg-gradient-to-l from-white to-white/0 transition-opacity duration-200 lg:hidden ${edges.end ? 'opacity-0' : 'opacity-100'}`}
            />
            </div>
            {/* Sits just outside the row so the peeking dot stays visible; not
                rendered at all when every dot already fits. */}
            {edges.scrolls && (
            <button
              type="button"
              tabIndex={-1}
              aria-label={t('shop.cs.moreColors' as any)}
              data-testid="strip-more"
              onClick={scrollMore}
              className={`shrink-0 grid place-items-center w-5 h-7 -mr-1 text-black/70 transition-opacity duration-200 lg:hidden ${edges.end ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            >
              <ChevronRight aria-hidden="true" className="w-4 h-4" strokeWidth={2} />
            </button>
            )}
            {/* Hairline divider between the palette and the result controls. */}
            <span aria-hidden="true" className={`shrink-0 w-px h-6 mr-3 bg-[#e2dfdd] lg:mx-5 ${edges.scrolls ? 'ml-1.5' : 'ml-3'}`} />
            <span
              aria-live="polite"
              className="shrink-0 text-[12px] leading-none font-semibold tabular-nums text-black whitespace-nowrap lg:text-[13px]"
            >
              {t('search.categoryCount', { count })}
            </span>
            {selectedColors.length > 0 && (
              <button
                type="button"
                onClick={onClear}
                aria-label={t('shop.cs.allColors' as any)}
                title={t('shop.cs.allColors' as any)}
                className="relative shrink-0 ml-3 grid place-items-center w-8 h-8 rounded-full bg-[#f2f2f2] text-black transition-[background-color,color,transform] duration-200 before:absolute before:-inset-1.5 before:content-[''] active:scale-95 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-black [@media(hover:hover)_and_(pointer:fine)]:hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                <X aria-hidden="true" className="w-3.5 h-3.5" strokeWidth={2.25} />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
