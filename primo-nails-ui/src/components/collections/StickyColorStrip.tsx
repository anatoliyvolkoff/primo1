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
            className="absolute inset-x-0 top-0 flex items-center gap-2 h-14 pl-3 pr-2 bg-white/95 backdrop-blur border-b border-[#ededed] shadow-[0_6px_16px_-12px_rgba(0,0,0,0.25)] lg:h-16 lg:justify-center"
          >
            <div
              ref={rowRef}
              role="group"
              aria-label={t('shop.cs.groupLabel' as any)}
              className="flex-1 min-w-0 flex items-center gap-2.5 overflow-x-auto no-scrollbar py-2 lg:flex-none lg:overflow-visible"
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
                    className="relative shrink-0 w-8 h-8 rounded-full outline-none before:absolute before:-inset-1 before:content-[''] focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span
                      aria-hidden="true"
                      style={{ background: swatch.color }}
                      className={`block w-full h-full rounded-full shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.15)] transition-transform duration-200 ${
                        isSelected
                          ? 'scale-110 outline outline-2 outline-offset-2 outline-black'
                          : 'active:scale-95'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <span
              aria-live="polite"
              className="shrink-0 text-[12px] font-semibold tabular-nums text-black"
            >
              {t('search.categoryCount', { count })}
            </span>
            {selectedColors.length > 0 && (
              <button
                type="button"
                onClick={onClear}
                aria-label={t('shop.cs.allColors' as any)}
                className="shrink-0 grid place-items-center w-8 h-8 rounded-full border border-[#c9c4bf] bg-white text-black active:scale-95"
              >
                <X aria-hidden="true" className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
