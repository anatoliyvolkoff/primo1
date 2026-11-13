import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Generic full-page loading skeleton, used as the Suspense fallback while a
 * lazily-loaded route chunk downloads (UI-011). Mirrors the muted/animate-pulse
 * style of HomeSkeleton so route transitions read as intentional, not broken.
 */
export const PageSkeleton: React.FC = () => {
  const { t } = useLanguage();
  return (
    <main aria-busy="true" aria-label={t('a11y.loading' as any)} className="flex-1">
      <div className="container-premium py-16 sm:py-20 lg:py-28 space-y-10">
        <div className="space-y-4 max-w-2xl">
          <div className="h-3 w-32 rounded-full bg-muted/60 animate-pulse" />
          <div className="h-10 sm:h-14 w-4/5 rounded-2xl bg-muted/60 animate-pulse" />
          <div className="h-5 w-3/4 rounded-full bg-muted/40 animate-pulse" />
          <div className="h-5 w-2/3 rounded-full bg-muted/40 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {['a', 'b', 'c', 'd'].map((k) => (
            <div
              key={k}
              className="aspect-[3/4] w-full rounded-[24px] bg-muted/50 animate-pulse"
            />
          ))}
        </div>
      </div>
    </main>
  );
};
