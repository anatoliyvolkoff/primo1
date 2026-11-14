import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { MousePointerClick } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { NAIL_SWATCHES } from '../../data/swatches';
import { NailSwatch } from '../ui/NailSwatch';
import { SECTION_TITLE_CLASS, SECTION_SUBTITLE_CLASS } from '../ui/SectionTitle';

// Client-side <Link> that keeps the swatch's hover/tap motion — a plain
// <a href> was doing a full page reload on colour-swatch clicks.
const MotionLink = motion(Link);

interface ShopByColorProps {
  /**
   * When provided, the widget acts as a filter control: swatches become
   * buttons, the active one(s) render with the ring/lift treatment, and
   * the bottom CTAs are hidden. When omitted, swatches are anchor links to
   * /semipermanente?color=<slug> and the CTAs are shown — used on Home as a
   * discovery widget.
   */
  selectedColors?: string[];
  onToggle?: (swatchName: string) => void;
}

/**
 * Primo1 layout: desktop "Shop by color" (`.shop-color` — 14 nail tips spread
 * over 977px, black "Show All" pill) and phones "Scegli il tuo Mood."
 * (`.mood` — swipeable row with a small progress thumb, "see all" expands the
 * row into a 4-column grid).
 */
export const ShopByColor: React.FC<ShopByColorProps> = ({
  selectedColors,
  onToggle,
}) => {
  const { t } = useLanguage();
  const [showTutorial, setShowTutorial] = React.useState(true);
  const handleInteraction = () => setShowTutorial(false);

  const isFilterMode = !!onToggle;
  const selected = selectedColors ?? [];

  const scrollerRef = React.useRef<HTMLDivElement>(null);
  // Phones: "see all" turns the swipe row into a grid (Primo1 `.mood-row.grid`).
  const [expanded, setExpanded] = React.useState(false);
  const toggleExpanded = () => {
    setExpanded((was) => {
      if (was && scrollerRef.current) scrollerRef.current.scrollLeft = 0;
      return !was;
    });
  };

  // Primo1 `.rprog`: a 72px track whose thumb mirrors the row's scroll position.
  const [progress, setProgress] = React.useState({ w: 1, p: 0 });
  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      setProgress({
        w: max > 4 ? Math.max(0.2, el.clientWidth / el.scrollWidth) : 1,
        p: max > 0 ? Math.min(1, el.scrollLeft / max) : 0,
      });
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro?.disconnect();
    };
  }, [expanded]);
  const grid = !isFilterMode && expanded;

  return (
    <section
      // `isolate` scopes the swatch/tooltip z-indexes into this section's own
      // stacking context, so they never paint above the fixed header.
      className={`bg-white overflow-hidden relative isolate ${
        isFilterMode
          ? 'pt-8 sm:pt-10 lg:pt-14 pb-16 sm:pb-20 md:pb-24 lg:pb-32'
          : 'pt-[34px] pb-12 lg:pt-[180px] lg:pb-[180px]'
      }`}
      id="palette"
      onMouseMove={handleInteraction}
      onTouchStart={handleInteraction}
    >
      <div className="container-premium flex flex-col items-center text-center">
        <div className="max-w-3xl flex flex-col items-center">
          <h2 className={`${SECTION_TITLE_CLASS} lg:font-bold lg:leading-[50px] lg:tracking-[0.95px] lg:text-[#1e1e1e]`}>
            <span className="lg:hidden">{t('shop.paletteTitle')}</span>
            <span className="max-lg:hidden">{t('shop.colorTitle')}</span>
          </h2>
          <p
            className={`${SECTION_SUBTITLE_CLASS} mt-[11px] max-lg:font-inter max-lg:text-[16px] max-lg:leading-[24px] max-lg:px-6 lg:mt-[16.6px] lg:font-semibold lg:text-[#8a8a8a] lg:text-[18px] lg:leading-[22px] lg:tracking-[0.26px]`}
          >
            <span className="lg:hidden" dangerouslySetInnerHTML={{ __html: t('shop.paletteSubtitle') }} />
            <span className="max-lg:hidden">{t('shop.colorSubtitle')}</span>
          </p>
        </div>

        <div className={`relative w-full overflow-visible ${isFilterMode ? 'mt-8 sm:mt-10 py-6 sm:py-8 md:py-10' : ''}`}>
          {/* overflow-x-auto implicitly clips overflow-y, so the hover lift (and
              the filter-mode tooltip) must stay inside the padding box; the
              negative margins absorb that padding. */}
          <div
            ref={scrollerRef}
            className={`no-scrollbar -mx-4 sm:-mx-5 lg:mx-0 lg:px-0 ${
              isFilterMode
                ? 'overflow-x-auto overflow-y-hidden px-9 pt-20 pb-8 sm:pt-24 sm:pb-10 -mt-20 -mb-8 sm:-mt-24 sm:-mb-10'
                : grid
                  ? 'overflow-visible px-5 pt-[34px]'
                  : 'overflow-x-auto overflow-y-hidden snap-x snap-proximity scroll-pl-9 px-9 pt-[41px] lg:pt-[53.5px]'
            }`}
          >
            {/* w-max + mx-auto centres the row when it fits, but left-aligns and
                stays scrollable from the FIRST swatch when it overflows. */}
            <div
              className={
                grid
                  ? 'grid grid-cols-4 gap-x-2 gap-y-[26px] w-full lg:flex lg:flex-nowrap lg:justify-between lg:w-[977px] lg:mx-auto'
                  : 'flex flex-nowrap items-center gap-[21px] lg:gap-0 lg:justify-between lg:w-[977px] w-max mx-auto'
              }
            >
              {NAIL_SWATCHES.map((swatch, i) => {
                const isSelected = selected.includes(swatch.name);
                // Swatches with a painted nail-tip "mood" photo render it
                // directly; the rest fall back to the CSS nail-shaped swatch.
                // Phones: Primo1 `.mood-item img` 53×125; desktop `.color-item
                // img` 51×122.
                const hasMoodPhoto = !!swatch.moodPhoto;
                const swatchClassName = hasMoodPhoto
                  ? `relative origin-bottom hover:z-20 block w-[53px] h-[125px] lg:w-[51px] lg:h-[122px] ${
                      isSelected ? 'mb-1.5 lg:mb-0 z-20' : ''
                    }`
                  : `relative transition-[box-shadow] duration-500 origin-bottom hover:z-20 block rounded-[50%/50%] w-[53px] h-[125px] lg:w-[51px] lg:h-[122px] ${
                      isSelected ? 'mb-1.5 lg:mb-0 ring-2 ring-foreground ring-offset-4 lg:ring-offset-8 z-20' : ''
                    }`;
                const swatchContent = <NailSwatch swatch={swatch} size="palette" />;
                // Primo1: desktop hover lifts 6px; a phone tap lifts 4px + 4% grow.
                const hover = isFilterMode ? { scale: 1.08, y: -15 } : { y: -6 };
                const tap = isFilterMode ? { scale: 0.96 } : { y: -4, scale: 1.04 };
                const transition = { duration: 0.3, ease: [0.22, 0.8, 0.24, 1] as const };

                return (
                  <div
                    key={swatch.slug}
                    className={`relative group flex flex-col items-center shrink-0 snap-start ${
                      grid ? 'w-auto lg:w-[51px]' : 'w-[53.5px] lg:w-[51px]'
                    }`}
                  >
                    <AnimatePresence>
                      {isFilterMode && showTutorial && i === 2 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: -10 }}
                          className="absolute -top-9 sm:-top-11 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-[100]"
                        >
                          <motion.div
                            animate={{ y: [0, -6, 0] }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                            className="flex flex-col items-center"
                          >
                            <div className="bg-[#222] text-white text-[10px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap shadow-lg flex items-center gap-1.5">
                              <MousePointerClick className="w-3.5 h-3.5" />
                              {t('shop.tapToFilter')}
                            </div>
                            <div
                              aria-hidden="true"
                              className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-[#222]"
                            />
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Fixed-height box reserves the SELECTED (lifted) swatch
                        height so selecting one doesn't shift the label. */}
                    <div className={`flex items-end justify-center w-full ${isFilterMode ? 'h-[131px]' : 'h-[125px]'} lg:h-[122px]`}>
                      {isFilterMode ? (
                        <motion.button
                          type="button"
                          whileHover={hover}
                          whileTap={tap}
                          onClick={() => onToggle!(swatch.name)}
                          aria-label={t(swatch.i18nKey as any)}
                          aria-pressed={isSelected}
                          className={swatchClassName}
                        >
                          {swatchContent}
                        </motion.button>
                      ) : (
                        <MotionLink
                          to={`/semipermanente?color=${swatch.slug}`}
                          whileHover={hover}
                          whileTap={tap}
                          transition={transition}
                          className={swatchClassName}
                          aria-label={t(swatch.i18nKey as any)}
                        >
                          {swatchContent}
                        </MotionLink>
                      )}
                    </div>

                    <span
                      // Phones: Primo1 `.mood-item span` — 13px medium lowercase,
                      // 47px under the tip (12px in the grid); selected = bold +
                      // 2px underline. Desktop: `.color-item span` — 12px bold
                      // black, 45px under the tip; long names wrap in a 66px box.
                      className={`w-full text-center leading-tight whitespace-nowrap lowercase text-[13px] font-medium text-black tracking-normal transition-all duration-300 ${
                        grid ? 'mt-3' : isFilterMode ? 'mt-[41px]' : 'mt-[47px]'
                      } lg:mt-[45px] lg:whitespace-normal lg:w-[66px] lg:text-[12px] lg:leading-[15px] lg:font-bold lg:text-black ${
                        isSelected ? 'max-lg:font-bold max-lg:shadow-[inset_0_-2px_0_#000] lg:scale-110' : ''
                      }`}
                    >
                      {t(swatch.i18nKey as any)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Phones: Primo1 `.rprog` scroll thumb (hidden when the row fits or is a grid). */}
          {!isFilterMode && !grid && progress.w < 1 && (
            <div
              aria-hidden="true"
              className="lg:hidden relative w-[72px] h-1 mx-auto mt-[14px] rounded-[9px] bg-black/12 overflow-hidden"
            >
              <i
                className="absolute left-0 top-0 bottom-0 rounded-[9px] bg-[#111] transition-transform duration-[120ms] ease-linear"
                style={{
                  width: `${progress.w * 100}%`,
                  transform: `translateX(${progress.p * (1 / progress.w - 1) * 100}%)`,
                }}
              />
            </div>
          )}
        </div>

        {!isFilterMode && (
          <>
            {/* Phones: Primo1 `.mood .pill-btn` — outline pill, expands the row. */}
            <button
              type="button"
              onClick={toggleExpanded}
              aria-expanded={expanded}
              className="lg:hidden mt-[23px] w-[163px] h-11 rounded-full border-[1.2px] border-[#444] bg-transparent text-[15px] font-normal text-[#656565] tracking-[0.02em] active:bg-[#f3f3f3]"
            >
              {expanded ? t('shop.showLess') : t('shop.seeAll')}
            </button>
            {/* Desktop: Primo1 `.btn-pill-black`. */}
            <Link
              to="/semipermanente"
              className="max-lg:hidden grid place-items-center w-[166px] h-[39px] mt-[55px] rounded-full bg-black text-white text-[14px] font-medium tracking-[0.3px] transition-opacity hover:opacity-85"
            >
              {t('shop.showAll')}
            </Link>
          </>
        )}
      </div>
    </section>
  );
};
