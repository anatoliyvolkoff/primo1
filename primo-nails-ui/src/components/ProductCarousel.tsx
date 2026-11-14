import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, type Variants } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import type { TranslationKey } from '../i18n';

// Shared entrance animation. The scroll row (below) orchestrates a stagger so
// cards cascade in one-by-one when it scrolls into view; each carousel item
// must be a `motion.div` carrying `carouselItemVariants` for the stagger to
// reach it. Used by every product carousel so they all animate identically.
const carouselRowVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

// Fade + slide-up only — no scale. A scaled card grows from its centre, which
// pushes the row's visible right edge outward as it settles; with the cards now
// bleeding to the viewport edge that read as the carousel "jumping" to the edge
// after the animation. Vertical-only motion keeps the horizontal layout fixed.
export const carouselItemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

interface ProductCarouselProps {
  /** Pre-sized carousel items (each should be `shrink-0 snap-start w-…`). */
  children: React.ReactNode;
  /** Tailwind gap/utility classes for the scroll row (defaults to product-card spacing). */
  rowClassName?: string;
  prevLabelKey?: TranslationKey;
  nextLabelKey?: TranslationKey;
  /**
   * On mobile, let the scroll row bleed past the container's right padding to
   * the viewport edge so the carousel uses the full width (cards reach the
   * edge instead of stopping ~16px short). The left stays aligned with the
   * section heading. Off by default (e.g. the search overlay keeps its
   * padding). Resets at `sm` where the desktop arrows appear.
   */
  bleedRight?: boolean;
}

/**
 * Horizontal product carousel modelled on rhode's: prev/next chevrons sit at
 * the left/right edges, vertically centered against the cards, and each
 * appears only when there's more to scroll that way (right-only at the start,
 * left once you've moved). One click advances exactly one card; a small
 * Primo1-style scroll thumb below tracks the position.
 * Native scroll-snap drives touch swipe; arrows are desktop-only. Shared by
 * Recently Viewed and the search overlay.
 */
export const ProductCarousel: React.FC<ProductCarouselProps> = ({
  children,
  rowClassName = 'gap-4 sm:gap-6 lg:gap-8',
  prevLabelKey = 'a11y.product.prev',
  nextLabelKey = 'a11y.product.next',
  bleedRight = false,
}) => {
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  // Primo1 `.rprog`: thumb width = visible share of the row, offset = scroll share.
  const [progress, setProgress] = useState({ w: 1, p: 0 });

  // Distance between adjacent cards (gap included) — one "step".
  const cardStep = (el: HTMLDivElement): number => {
    const kids = el.children;
    if (kids.length >= 2) {
      return kids[1].getBoundingClientRect().left - kids[0].getBoundingClientRect().left;
    }
    if (kids.length === 1) return kids[0].getBoundingClientRect().width;
    return el.clientWidth;
  };

  const update = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
    const max = el.scrollWidth - el.clientWidth;
    setProgress({
      w: max > 4 ? Math.max(0.2, el.clientWidth / el.scrollWidth) : 1,
      p: max > 0 ? Math.min(1, el.scrollLeft / max) : 0,
    });
  }, []);

  // Recompute whenever the item count changes (e.g. recently-viewed grows).
  const itemCount = React.Children.count(children);
  useEffect(() => { update(); }, [update, itemCount]);

  // Entrance state is held here (not left to `whileInView`) so cards that mount
  // AFTER the row has animated in inherit `animate="visible"` and fade in too.
  // With `whileInView` alone a card added later (e.g. the product you just
  // left, prepended to "Potrebbe piacerti anche" when you open another product)
  // stayed at opacity 0: an invisible card-wide hole at the start of the row.
  const [shown, setShown] = useState(false);

  // When the first item changes, the row now holds a different list (another
  // product page, new search results): start again from the first card. Without
  // this Chrome's scroll anchoring keeps the old cards in place and the new
  // first card ends up scrolled out of view to the left.
  const firstKey = React.Children.toArray(children)
    .map((c) => (React.isValidElement(c) ? c.key : null))
    .find((k) => k != null) ?? null;
  const prevFirstKey = useRef(firstKey);
  useEffect(() => {
    if (prevFirstKey.current === firstKey) return;
    prevFirstKey.current = firstKey;
    const el = scrollRef.current;
    if (el) el.scrollLeft = 0;
    update();
  }, [firstKey, update]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [update]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const step = cardStep(el);
    el.scrollBy({ left: direction === 'left' ? -step : step, behavior: 'smooth' });
  };

  const onArrow = (direction: 'left' | 'right') => (e: React.MouseEvent) => {
    // Stop the click from reaching the product card beneath the arrow.
    e.preventDefault();
    e.stopPropagation();
    scroll(direction);
  };

  const arrowBase =
    'absolute top-1/2 -translate-y-1/2 z-20 hidden sm:flex w-11 h-11 lg:w-12 lg:h-12 rounded-full bg-white border border-black/5 shadow-md items-center justify-center text-foreground hover:bg-foreground hover:text-background transition-all duration-300 group';

  return (
    <div>
      {/* Symmetric vertical padding keeps the absolutely-centered arrows on
          the true card centre at every breakpoint. */}
      <div className="relative py-2">
        {canScrollLeft && (
          <button
            type="button"
            onClick={onArrow('left')}
            aria-label={t(prevLabelKey)}
            className={`${arrowBase} -left-1 lg:-left-3`}
          >
            <ChevronLeft className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2} />
          </button>
        )}

        <motion.div
          ref={scrollRef}
          role="group"
          aria-label={t('a11y.gallery')}
          tabIndex={0}
          initial="hidden"
          animate={shown ? 'visible' : 'hidden'}
          onViewportEnter={() => setShown(true)}
          viewport={{ once: true, amount: 0.15 }}
          variants={carouselRowVariants}
          // overflow-y-hidden (not the default `visible`, which the `auto`
          // x-axis silently upgrades to `auto`): the entrance translateY and
          // hover-lift make the row a few px tall-overflowing, which turns it
          // into a vertical wheel-scroll target. Chrome then *latches* a fast
          // vertical wheel onto the row right after load, so the page won't
          // scroll until you pause. Hidden keeps it off the wheel; the py-6
          // /-my-6 pair reserves room for the lift/shadow/entrance so nothing
          // is clipped and the layout is unchanged.
          className={`flex overflow-x-auto overflow-y-hidden py-6 -my-6 no-scrollbar snap-x snap-mandatory ${
            bleedRight ? '-mr-4 sm:mr-0' : ''
          } ${rowClassName}`}
        >
          {children}
        </motion.div>

        {canScrollRight && (
          <button
            type="button"
            onClick={onArrow('right')}
            aria-label={t(nextLabelKey)}
            className={`${arrowBase} -right-1 lg:-right-3`}
          >
            <ChevronRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" strokeWidth={2} />
          </button>
        )}
      </div>

      {progress.w < 1 && (
        <div
          aria-hidden="true"
          className="relative w-[72px] h-1 mx-auto mt-4 rounded-[9px] bg-black/12 overflow-hidden"
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
  );
};
