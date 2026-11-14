import React from 'react';
import { motion } from 'motion/react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { ProductCarousel, carouselItemVariants } from './ProductCarousel';
import { Section, SectionTitle, SegmentedTabs } from './ui';

import { useLanguage } from '../context/LanguageContext';

interface ExploreCarouselProps {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  /** Primo1 `.sub.xl` (phones): Montserrat 22/26 medium grey instead of the Inter subtitle. */
  subtitleXl?: boolean;
  /** Products shown by default (or always, when filterTabs is not provided). */
  products: Product[];
  /**
   * Optional per-tab product lists. When set, the carousel renders a
   * tab bar (BESTSELLERS / NEW / SALE) and swaps `products` per tab.
   * Each tab takes whatever the admin has selected for that slot —
   * if a tab's list is empty, it falls back to `products`.
   */
  filterTabs?: {
    bestsellers: Product[];
    new: Product[];
    sale: Product[];
  };
  /**
   * On desktop, suppress the large H2 heading (prototype shows the segmented
   * tabs + subtitle only for the best-seller instance — the title there is
   * `m-only`). The subtitle still renders. Mobile is unaffected.
   */
  hideTitle?: boolean;
}

/**
 * Home-page product showcase: a heading + optional filter tabs above the
 * shared ProductCarousel. Delegating the scroll row to ProductCarousel keeps
 * the edge bleed, prev/next arrows, segmented dots, and card-entrance stagger
 * identical to every other product carousel in the app.
 */
export const ExploreCarousel: React.FC<ExploreCarouselProps> = ({ title, subtitle, subtitleXl, products: initialProducts, filterTabs, hideTitle }) => {
  const { t } = useLanguage();
  const showFilters = !!filterTabs;
  const [activeFilter, setActiveFilter] = React.useState<'bestsellers' | 'new' | 'sale'>('bestsellers');

  const displayProducts = React.useMemo(() => {
    if (!showFilters || !filterTabs) return initialProducts;
    const tab = filterTabs[activeFilter];
    return tab.length > 0 ? tab : initialProducts;
  }, [activeFilter, initialProducts, filterTabs, showFilters]);

  return (
      <Section spacing="lg" className="max-lg:pt-[36px]! max-lg:pb-[52px]! lg:pt-[120px]! lg:pb-0!">
        {/* Desktop: Primo1 `#bestsellers` / `#for-you` / `#loved` — 120px top, no
            bottom padding (the 120px gap to the next black strip lives in Home). */}
        {/* Phones: Primo1 `.block` rhythm — sub→tabs 17px, header→rail ~35px. */}
        {/* Desktop: Primo1 title 48/50 → 16px → subtitle 20/31 → 40px → cards; the
            tabbed best-seller block: 66px → subtitle → 39px → tabs → 50px → cards. */}
        <div className={`flex flex-col items-center justify-center gap-[17px] lg:gap-0 mb-[27px] ${showFilters ? 'lg:mb-[50px]' : 'lg:mb-10'}`}>
          {/* hideTitle: prototype's best-seller block renders the large H2 only
              on mobile (`m-only`) — desktop shows just the subtitle + tabs. We
              keep the H2 for a11y/mobile but hide it from `lg:` up. */}
          <SectionTitle
              title={title}
              subtitle={subtitle || undefined}
              className={`lg:gap-4 ${hideTitle ? 'lg:[&>:first-child]:hidden' : ''}`}
              titleClassName="lg:text-[48px] lg:leading-[50px] lg:font-bold lg:tracking-[1.05px] lg:text-[#1e1e1e]"
              subtitleClassName={`lg:text-[20px] lg:leading-[31px] lg:font-semibold lg:tracking-[0.37px] lg:text-[#8a8a8a] ${hideTitle ? 'lg:mt-[66px]' : ''} ${subtitleXl ? 'max-lg:font-sans max-lg:font-medium! max-lg:text-[22px] max-lg:leading-[26px] max-lg:text-[#767676] max-lg:tracking-[-0.005em] max-lg:px-[14px]' : ''}`}
          />

          {showFilters && (
              <div className="w-full flex justify-center lg:mt-[39px]">
                <SegmentedTabs<'bestsellers' | 'new' | 'sale'>
                    aria-label={t('explore.bestsellers')}
                    // Desktop: match the prototype's 524×50px grey pill track
                    // exactly — a fixed-width CSS grid whose first ("I Più
                    // Venduti") column is wider (166px) than the two 1fr
                    // columns, with a 6px inset track. (home.css .tabs @1024px:
                    // width:524px; height:50px; padding:0 6px;
                    // grid-template-columns:166px 1fr 1fr.)
                    // Phones: Primo1 `.tabs` — a full-width 48px pill track
                    // (16px side margins), first column 1.35fr, semibold labels.
                    className="max-lg:grid max-lg:w-full max-lg:grid-cols-[1.35fr_1fr_1fr] max-lg:gap-0 max-lg:h-12 max-lg:px-[6px] max-lg:py-0 max-lg:bg-[#f4f4f4] lg:grid lg:w-[524px] lg:grid-cols-[166px_1fr_1fr] lg:gap-0 lg:h-[50px] lg:bg-[#f4f4f4] lg:px-[6px] lg:shadow-[0_10px_30px_-18px_rgba(0,0,0,0.18)]"
                    // Primo1 `.tabs button`: unselected labels #555.
                    buttonClassName="max-lg:w-full max-lg:px-0 max-lg:h-[38px] max-lg:font-semibold lg:h-[38px] lg:w-full lg:px-0 lg:font-semibold whitespace-nowrap aria-[checked=false]:text-[#555]"
                    value={activeFilter}
                    onChange={setActiveFilter}
                    options={[
                      { value: 'bestsellers', label: t('explore.bestsellers') },
                      { value: 'new', label: t('explore.new') },
                      { value: 'sale', label: t('explore.sale') },
                    ]}
                />
              </div>
          )}
        </div>

        {/* Desktop (≥1024px): the prototype renders a static 4-up product grid
            (no scroll carousel/arrows), with FIXED 232px columns centered and a
            16px gap (home: .rail @1024px → grid-template-columns:repeat(4,232px);
            gap:16px; justify-content:center). Fixed columns keep each card at the
            prototype's exact 232×394 footprint instead of stretching to fill.
            Mobile keeps the horizontal carousel. Same product data/order/cart
            behavior in both. The grid shows the first 4 of `displayProducts`. */}
        <div className="hidden lg:grid lg:grid-cols-[repeat(4,232px)] lg:gap-4 lg:justify-center">
          {displayProducts.slice(0, 4).map((product) => (
              <motion.div
                  key={`grid-${activeFilter}-${product.id}`}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.15 }}
                  variants={carouselItemVariants}
                  className="flex"
              >
                <ProductCard product={product} />
              </motion.div>
          ))}
        </div>

        {/* Mobile carousel. Remounting on tab change (key) resets the scroll to
            the start and replays the entrance stagger for the new tab. */}
        <div className="lg:hidden">
          <ProductCarousel key={activeFilter} bleedRight>
            {displayProducts.map((product) => (
                <motion.div
                    key={`${activeFilter}-${product.id}`}
                    variants={carouselItemVariants}
                    className="flex-shrink-0 w-[258px] sm:w-[calc(50%-0.75rem)] snap-start flex"
                >
                  <ProductCard product={product} />
                </motion.div>
            ))}
          </ProductCarousel>
        </div>
      </Section>
  );
};
