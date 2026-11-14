import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { ProductCard } from './ProductCard';
import { ProductCarousel, carouselItemVariants } from './ProductCarousel';
import { Section, SectionTitle } from './ui';
import { useLanguage } from '../context/LanguageContext';
import { useProducts } from '../context/ProductContext';

export const RecentlyViewed: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { recentlyViewedIds } = useRecentlyViewed();
  const { products } = useProducts();
  const { t } = useLanguage();

  // Resolve stored ids against the LIVE products so price/stock/name are
  // always current (and removed/hidden products drop out). Recency order kept
  // (newest first).
  const recentlyViewed = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p]));
    return recentlyViewedIds
      .map((id) => byId.get(id))
      .filter((p): p is NonNullable<typeof p> => !!p && p.isVisible !== false);
  }, [recentlyViewedIds, products]);

  if (recentlyViewed.length === 0) {
    return null;
  }

  return (
    // Desktop: same rhythm as the other product rails (120px above, standard
    // 232px cards, 48/50 title); phones keep the compact left-aligned header.
    <Section spacing="lg" className={`${compact ? 'max-lg:pt-[36px]! max-lg:pb-[52px]! ' : ''}lg:pt-[120px]! lg:pb-[104px]!`}>
      <div className={compact ? 'mb-[27px] lg:mb-10' : 'mb-10 sm:mb-12 lg:mb-10'}>
        {/* compact = primo1 home `.recent`: a left-aligned title, no subtitle on phones. */}
        <SectionTitle
          title={t('recentlyViewed.title')}
          subtitle={t('recentlyViewed.subtitle')}
          align={compact ? 'left' : 'center'}
          className="lg:items-center lg:text-center lg:gap-4"
          titleClassName={`${compact ? 'px-[14px] lg:px-0 ' : ''}lg:text-[48px] lg:leading-[50px] lg:font-bold lg:tracking-[1.05px] lg:text-[#1e1e1e]`}
          subtitleClassName={`${compact ? 'max-lg:hidden ' : ''}lg:text-[20px] lg:leading-[31px] lg:font-semibold lg:tracking-[0.37px] lg:text-[#8a8a8a]`}
        />
      </div>

      {/* Phones / tablets: swipe row. */}
      <div className="lg:hidden">
        <ProductCarousel bleedRight>
          {recentlyViewed.map((product) => (
            <motion.div
              key={product.id}
              variants={carouselItemVariants}
              className="flex-shrink-0 w-[258px] sm:w-[calc(50%-0.75rem)] snap-start flex"
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </ProductCarousel>
      </div>

      {/* Desktop: the standard 4 × 232px card row. */}
      <div className="hidden lg:grid lg:grid-cols-[repeat(4,232px)] lg:gap-4 lg:justify-center">
        {recentlyViewed.slice(0, 4).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </Section>
  );
};
