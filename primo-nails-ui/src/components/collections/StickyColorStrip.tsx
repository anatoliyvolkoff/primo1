import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { NAIL_SWATCHES } from '../../data/swatches';

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
            className="absolute inset-x-0 top-0 flex items-center h-14 pl-2 pr-3 bg-white/95 backdrop-blur border-b border-[#ededed] shadow-[0_6px_16px_-12px_rgba(0,0,0,0.25)] lg:h-16 lg:justify-center lg:px-6"
          >
            {/* Swatches: 28px dots with a 16px gap, so even a fully selected row
                (every dot ringed) keeps clear air between the rings. Selected =
                the design system's thin double ring (white gap + black line). */}
            <div
              ref={rowRef}
              role="group"
              aria-label={t('shop.cs.groupLabel' as any)}
              className="flex-1 min-w-0 flex items-center gap-4 overflow-x-auto no-scrollbar px-2 py-2 lg:flex-none lg:overflow-visible"
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
                      style={{ background: swatch.color }}
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
            {/* Hairline divider between the palette and the result controls. */}
            <span aria-hidden="true" className="shrink-0 w-px h-6 mx-3 bg-[#e2dfdd] lg:mx-5" />
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
