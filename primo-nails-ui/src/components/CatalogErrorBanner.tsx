import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useProducts } from '../context/ProductContext';
import { useLanguage } from '../context/LanguageContext';

/**
 * Shown at the top of every page when the Medusa product fetch failed.
 * Replaces the old silent fallback to the static PRODUCTS array — outages
 * are now visible instead of masked.
 */
export const CatalogErrorBanner: React.FC = () => {
  const { error, loading } = useProducts();
  const { t } = useLanguage();
  if (loading || !error) return null;

  return (
    <div
      role="alert"
      className="relative z-40 pt-20 sm:pt-24 bg-destructive/10 border-b border-destructive/30 text-destructive"
    >
      <div className="container-premium py-3 flex items-center gap-3">
        <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span className="font-sans text-sm font-medium">{t('catalog.loadError')}</span>
      </div>
    </div>
  );
};
