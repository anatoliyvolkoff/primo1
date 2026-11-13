import React from 'react';
import { ProductGridSkeleton } from './ProductGridSkeleton';
import { useLanguage } from '../../context/LanguageContext';

export const HomeSkeleton: React.FC = () => {
  const { t } = useLanguage();
  return (
  <main aria-busy="true" aria-label={t('a11y.loading' as any)} className="flex-1">
    {/* Hero */}
    <section className="relative">
      <div className="container-premium py-16 sm:py-20 lg:py-28 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <div className="space-y-6">
          <div className="h-3 w-32 rounded-full bg-muted/60 animate-pulse" />
          <div className="h-12 sm:h-16 w-4/5 rounded-2xl bg-muted/60 animate-pulse" />
          <div className="h-5 w-3/4 rounded-full bg-muted/40 animate-pulse" />
          <div className="h-5 w-2/3 rounded-full bg-muted/40 animate-pulse" />
          <div className="flex gap-3 pt-4">
            <div className="h-12 w-44 rounded-full bg-muted/60 animate-pulse" />
            <div className="h-12 w-36 rounded-full bg-muted/40 animate-pulse" />
          </div>
        </div>
        <div className="aspect-[4/5] w-full rounded-[32px] bg-muted/60 animate-pulse" />
      </div>
    </section>

    {/* Carousel placeholder */}
    <section className="container-premium py-12 sm:py-16">
      <div className="flex items-end justify-between mb-10">
        <div className="space-y-3">
          <div className="h-3 w-24 rounded-full bg-muted/60 animate-pulse" />
          <div className="h-8 w-64 rounded-2xl bg-muted/60 animate-pulse" />
        </div>
        <div className="hidden sm:block h-10 w-28 rounded-full bg-muted/40 animate-pulse" />
      </div>
      <ProductGridSkeleton count={4} />
    </section>

    {/* Second band */}
    <section className="container-premium py-12 sm:py-16">
      <div className="h-40 w-full rounded-[32px] bg-muted/50 animate-pulse" />
    </section>
  </main>
  );
};
