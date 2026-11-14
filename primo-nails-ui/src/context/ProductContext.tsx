import React, { createContext, useContext, useMemo } from 'react';
import { Product, medusaProductToProduct } from '../types';
import { useMedusaProducts } from '../hooks/useProducts';
import { useLanguage } from './LanguageContext';

interface ProductContextType {
  products: Product[];
  loading: boolean;
  error: string | null;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language } = useLanguage();
  const { data, isLoading, error } = useMedusaProducts();

  // Locale-aware projection — recomputes on language change but doesn't
  // refetch from Medusa (translations come from product metadata).
  const products = useMemo(
    () => (data?.raw || []).map((p: any) => medusaProductToProduct(p, language)),
    [data?.raw, language]
  );

  const value = useMemo(
    () => ({
      products,
      loading: isLoading,
      error: error?.message || null,
    }),
    [products, isLoading, error]
  );

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};
