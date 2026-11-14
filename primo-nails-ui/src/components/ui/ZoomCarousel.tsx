import React, { useRef, useState } from 'react';
import { handleProductImageError } from '../../lib/imageFallback';

/**
 * 2-slide scroll-snap zoom carousel shared by the ProductCard thumbnail
 * (`hover` interaction) and the QuickViewModal gallery (`dots` interaction).
 * Both render the SAME photo twice: slide 0 at 1×, slide 1 pre-scaled with a
 * per-call-site `zoom.scale` / `zoom.origin`, clipped by the overflow track —
 * exactly like the prototype's `.ptrack`/`.pz` and `.g-track`/`.g-zoom`.
 *
 * The two call-sites diverge on: image fit (`contain` + card filters vs
 * `cover`), zoom factor/origin, slide padding, slide element (`div` vs
 * `figure`), and interaction model — so those are props. The shared machinery
 * (trackRef, `slideTo`, onScroll active tracking, per-slide error keys) lives
 * here once.
 *
 * `interaction`:
 *  - `hover` — fine-pointer mouseenter/leave scrolls to the zoom slide and back;
 *    decorative (non-interactive) dots that widen with scroll position.
 *  - `dots`  — real clickable dots + ArrowLeft/Right key nav + carousel a11y.
 *
 * B7 fix: the onScroll active-index divides by `clientWidth`; if a scroll fires
 * mid entrance-animation while `clientWidth === 0`, the old code produced
 * `0/0 = NaN` and no dot showed active. Guarded here with `clientWidth > 0`.
 */
export interface ZoomCarouselProps {
  src: string;
  alt: string;
  errorKey: string;
  multiply: boolean;
  interaction: 'hover' | 'dots';
  /** object-fit + any per-call-site image filters (e.g. contrast/brightness). */
  imgFitClassName: string;
  /** Pre-scale applied to slide 1 (e.g. `scale-[1.7] origin-[80%_45%]`). */
  zoomClassName: string;
  /** Element used for each slide wrapper (`div` for the card, `figure` for qv). */
  slideAs?: 'div' | 'figure';
  /** Extra classes on each slide wrapper (padding / flex centering per site). */
  slideClassName?: string;
  /** `sizes` attribute for slide 0's <img> (card sets it; qv omits it). */
  slide0Sizes?: string;
  /** Mark the <img>s non-draggable (qv sets this; card omits it). */
  draggableImages?: boolean;
  /** Extra classes on the outer track element. */
  trackClassName?: string;
}

export const ZoomCarousel: React.FC<ZoomCarouselProps> = ({
  src,
  alt,
  errorKey,
  multiply,
  interaction,
  imgFitClassName,
  zoomClassName,
  slideAs = 'div',
  slideClassName = '',
  slide0Sizes,
  draggableImages,
  trackClassName = '',
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  // `active` drives both the dots and the boolean "zoomed" state (slide 1).
  const [active, setActive] = useState(0);

  const finePointer =
    interaction === 'hover' &&
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const slideTo = (index: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: index * track.clientWidth, behavior: 'smooth' });
  };

  const Slide = slideAs;
  const imgClass = `${imgFitClassName} ${multiply ? 'mix-blend-multiply' : ''}`;
  const draggableProp = draggableImages ? { draggable: false } : {};

  const isDots = interaction === 'dots';

  return (
    <>
      <div
        ref={trackRef}
        tabIndex={isDots ? 0 : undefined}
        aria-roledescription={isDots ? 'carousel' : undefined}
        aria-label={isDots ? alt : undefined}
        className={`absolute inset-0 flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory no-scrollbar ${trackClassName}`.trim()}
        onScroll={(e) => {
          const el = e.currentTarget;
          // B7: never divide by a zero clientWidth (mid entrance animation) —
          // that yields NaN and leaves no dot active until the next real scroll.
          if (el.clientWidth <= 0) return;
          if (isDots) {
            setActive(Math.round(el.scrollLeft / el.clientWidth));
          } else {
            setActive(el.scrollLeft > el.clientWidth / 2 ? 1 : 0);
          }
        }}
        onMouseEnter={!isDots && finePointer ? () => slideTo(1) : undefined}
        onMouseLeave={!isDots && finePointer ? () => slideTo(0) : undefined}
        onKeyDown={
          isDots
            ? (e) => {
                const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
                if (!step) return;
                e.preventDefault();
                slideTo(Math.max(0, Math.min(1, active + step)));
              }
            : undefined
        }
      >
        {/* Slide 0 — the photo at 1×. */}
        <Slide className={`relative flex-[0_0_100%] h-full overflow-hidden snap-start snap-always ${slideClassName}`.trim()}>
          <img
            src={src}
            alt={alt}
            {...draggableProp}
            loading="lazy"
            decoding="async"
            {...(slide0Sizes ? { sizes: slide0Sizes } : {})}
            onError={handleProductImageError(`${errorKey}-0`)}
            className={imgClass}
          />
        </Slide>
        {/* Slide 1 — the SAME photo pre-scaled (the zoom close-up). */}
        <Slide
          aria-hidden="true"
          className={`relative flex-[0_0_100%] h-full overflow-hidden snap-start snap-always ${slideClassName}`.trim()}
        >
          <img
            src={src}
            alt=""
            aria-hidden="true"
            {...draggableProp}
            loading="lazy"
            decoding="async"
            onError={handleProductImageError(`${errorKey}-1`)}
            className={`${imgClass} ${zoomClassName}`}
          />
        </Slide>
      </div>

      {isDots ? (
        // `.g-dots` — two REAL clickable dots; active one widens, tracks scroll.
        <div className="absolute inset-x-0 bottom-2.5 z-10 flex justify-center">
          {[0, 1].map((i) => (
            <button
              key={i}
              type="button"
              aria-label={`${alt} — ${i + 1}`}
              aria-current={active === i ? 'true' : undefined}
              onClick={() => slideTo(i)}
              className="grid h-6 w-5 place-items-center"
            >
              <span
                className={`block h-1.5 rounded-pill transition-[width,background-color] duration-300 ${
                  active === i ? 'w-3.5 bg-[#222]' : 'w-1.5 bg-[#cfcfcf]'
                }`}
              />
            </button>
          ))}
        </div>
      ) : (
        // Decorative dots — the active one widens, following scroll position.
        <div
          aria-hidden="true"
          className="absolute left-1/2 bottom-2 -translate-x-1/2 z-30 flex gap-[5px] rounded-pill bg-white/80 px-1.5 py-1"
        >
          <i
            className={`block h-1.5 rounded-pill transition-all duration-200 ${active === 1 ? 'w-1.5 bg-black/20' : 'w-3.5 bg-[#111]'}`}
          />
          <i
            className={`block h-1.5 rounded-pill transition-all duration-200 ${active === 1 ? 'w-3.5 bg-[#111]' : 'w-1.5 bg-black/20'}`}
          />
        </div>
      )}
    </>
  );
};
