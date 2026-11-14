import React from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { NAIL_SWATCHES } from '../../data/swatches';
import { NailSwatch } from '../ui/NailSwatch';
import './colorShop.css';

/**
 * Primo1 `#cat-shop` (header variant "m"), the colour picker that replaces the
 * banner on the Semipermanente page: an orange "Shop by color" eyebrow, a big
 * title that turns into the picked colour's name, a "Semipermanente, N
 * tonalità" line (→ "N prodotti" + "Tutti i colori" once a colour is picked),
 * soft pastel lights behind it, and the nail tips as a 7-column grid on phones
 * / one 977px row on desktop. Picking a colour shows only that colour; picking
 * it again clears it.
 */

// Primo1 `MOOD_DEEP` / `MOOD_SOFT`, keyed by our swatch slugs (bordo =
// bordeaux, marsala = lampone, magenta = fucsia, viola = lilla, marrone =
// cioccolato, y-o = giallo).
const TINTS: Record<string, [deep: string, soft: string]> = {
  bw: ['#111', '#f0f0f0'],
  grigio: ['#55565d', '#eeeef1'],
  nude: ['#8f6b62', '#f7ede9'],
  rosa: ['#c94f8a', '#fde6f0'],
  rosso: ['#b0001c', '#fbe3e5'],
  bordo: ['#4a0a08', '#f4e3e2'],
  marsala: ['#a61433', '#f9e1e7'],
  magenta: ['#c0136a', '#fde2ef'],
  viola: ['#7d43b3', '#efe6fa'],
  marrone: ['#341210', '#f0e7e4'],
  glitter: ['#8a5c55', '#f6eae6'],
  blu: ['#264996', '#e4eaf7'],
  verde: ['#3b6e21', '#e6f1e0'],
  'y-o': ['#8a7316', '#fbf4d6'],
};

interface CategoryColorShopProps {
  /** Swatch names currently filtering the grid. */
  selectedColors: string[];
  /** Pick a swatch (or clear it when it's the one already picked). */
  onPick: (swatchName: string) => void;
  /** Clear every colour. */
  onClear: () => void;
  /** Number of products currently shown (after all filters). */
  count: number;
  /** Category name for the "<category>, N tonalità" line. */
  categoryLabel: string;
}

export const CategoryColorShop: React.FC<CategoryColorShopProps> = ({
  selectedColors,
  onPick,
  onClear,
  count,
  categoryLabel,
}) => {
  const { t } = useLanguage();
  const picked = selectedColors.length === 1 ? NAIL_SWATCHES.find((s) => s.name === selectedColors[0]) : undefined;
  const hasPick = selectedColors.length > 0;
  const pickedLabel = picked ? t(picked.i18nKey as any) : '';
  const title = picked
    ? pickedLabel.charAt(0).toUpperCase() + pickedLabel.slice(1)
    : hasPick
      ? t('shop.cs.colorsN' as any, { count: selectedColors.length })
      : t('shop.cs.title' as any);

  // Re-run the title's fade-up only when the text actually changes (not on mount).
  const [swapKey, setSwapKey] = React.useState(0);
  const prevTitle = React.useRef(title);
  React.useEffect(() => {
    if (prevTitle.current !== title) {
      prevTitle.current = title;
      setSwapKey((k) => k + 1);
    }
  }, [title]);

  const tint = picked ? TINTS[picked.slug] : hasPick ? (['#111', '#f3efeb'] as [string, string]) : undefined;
  const style = tint ? ({ '--cs-deep': tint[0], '--cs-soft': tint[1] } as React.CSSProperties) : undefined;

  return (
    <section
      id="palette"
      aria-labelledby="cat-shop-title"
      className={`pm-cs relative isolate overflow-hidden text-center pt-9 pb-2 lg:pt-[90px] lg:pb-0 ${hasPick ? 'is-picked' : ''}`}
      style={style}
    >
      <div className="pm-cs-bg" aria-hidden="true" />

      <p lang="en" className="m-0 font-sans text-[11px] leading-4 font-bold tracking-[1.8px] uppercase text-[#c8742d]">
        {t('shop.cs.eyebrow' as any)}
      </p>
      <h2
        id="cat-shop-title"
        className="mt-1.5 mb-0 px-4 font-sans text-[40px] leading-[46px] font-bold tracking-[-1.6px] text-[#111] text-balance lg:text-[56px] lg:leading-[62px] lg:tracking-[-2.4px]"
      >
        <span key={swapKey} className={`inline-block px-[0.04em] ${swapKey ? 'pm-cs-swap' : ''}`}>{title}</span>
      </h2>
      <p
        aria-live="polite"
        className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 min-h-8 mt-2.5 mb-0 px-6 font-inter text-[14px] leading-5 text-[#6b6b6b] lg:mt-3.5 lg:text-[17px] lg:leading-[27px]"
      >
        {hasPick ? (
          <>
            <span><b className="font-semibold text-black">{count}</b> {t('shop.cs.productsWord' as any)}</span>
            <button
              type="button"
              onClick={onClear}
              className="relative inline-flex items-center gap-[5px] h-[30px] px-[13px] rounded-full border border-[#c9c4bf] bg-white font-sans text-[12.5px] leading-none font-medium text-black transition-colors hover:bg-black hover:border-black hover:text-white active:scale-[0.97] before:absolute before:-inset-y-[7px] before:-inset-x-1 before:content-[''] lg:h-[34px] lg:px-4 lg:text-[13.5px]"
            >
              <X aria-hidden="true" className="w-[13px] h-[13px]" strokeWidth={2} />
              {t('shop.cs.allColors' as any)}
            </button>
          </>
        ) : (
          <span>{categoryLabel}, <b className="font-semibold text-black">{count}</b> {t('shop.cs.shadesWord' as any)}</span>
        )}
      </p>

      {/* Phones: Primo1 `.cat-shop-row` — 7 columns (22px × 4px gaps), max
          440px wide; desktop: one 977px row. */}
      <div
        role="group"
        aria-label={t('shop.cs.groupLabel' as any)}
        className="grid grid-cols-7 gap-x-0 gap-y-[22px] max-w-[440px] mx-auto mt-[30px] px-1.5 min-[440px]:gap-x-1 min-[440px]:px-3.5 lg:flex lg:justify-between lg:w-[977px] lg:max-w-none lg:mt-[53.5px] lg:px-0"
      >
        {NAIL_SWATCHES.map((swatch) => {
          const isSelected = selectedColors.includes(swatch.name);
          return (
            <button
              key={swatch.slug}
              type="button"
              onClick={() => onPick(swatch.name)}
              aria-pressed={isSelected}
              className="group relative min-h-11 flex flex-col items-center p-0 border-0 bg-transparent text-black cursor-pointer lg:w-[51px]"
            >
              <span
                className={`block w-[38px] h-[91px] transition-transform duration-300 ease-[cubic-bezier(.22,.8,.24,1)] group-active:-translate-y-1 group-active:scale-[1.04] lg:w-[51px] lg:h-[122px] lg:group-hover:-translate-y-1.5 ${
                  isSelected ? '-translate-y-1.5' : ''
                }`}
              >
                <NailSwatch swatch={swatch} size="palette" />
              </span>
              <span
                className={`mt-3 text-[clamp(9px,2.5vw,11px)] leading-[14px] tracking-[-0.01em] whitespace-nowrap lowercase lg:mt-[45px] lg:text-[12px] lg:leading-[15px] ${
                  isSelected ? 'font-extrabold shadow-[inset_0_-2px_0_#000]' : 'font-semibold lg:font-bold'
                }`}
              >
                {t(swatch.i18nKey as any)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
