import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Product } from '../types';
import { useProducts } from './ProductContext';

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  suggestions: Product[];
  popularSearches: string[];
  aiSuggestions: Product[];
  isSearching: boolean;
  trackProductView: (productId: string) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

// Static, render-stable references so the provider value doesn't churn.
const POPULAR_SEARCHES = ['Semipermanente Rosso', 'Top Coat No Wipe', 'Acrygel Nude', 'Kit Iniziale', 'Base Coat'];
const EMPTY: Product[] = [];

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { products } = useProducts();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [isSearching] = useState(false);

  const trackProductView = useCallback((_productId: string) => {
    // TODO: track product views for future recommendations
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const q = searchQuery.toLowerCase();
      const filtered = products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      ).slice(0, 5);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }, [searchQuery, products]);

  const value = useMemo<SearchContextType>(() => ({
    searchQuery,
    setSearchQuery,
    suggestions,
    popularSearches: POPULAR_SEARCHES,
    aiSuggestions: EMPTY,
    isSearching,
    trackProductView,
  }), [searchQuery, suggestions, isSearching, trackProductView]);

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};
