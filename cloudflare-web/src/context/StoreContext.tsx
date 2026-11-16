import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Category, LanguageCode, Product, Review, StoreSettings } from '../types/store';

interface StoreContextValue {
  settings: StoreSettings | null;
  categories: Category[];
  products: Product[];
  reviews: Review[];
  loading: boolean;
  error: string | null;
  language: LanguageCode;
  toggleLanguage: () => void;
  refreshStorefront: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<LanguageCode>('en');

  const refreshStorefront = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getStorefront();
      setSettings(data.settings);
      setCategories(data.categories);
      setProducts(data.products);
      setReviews(data.reviews);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load storefront.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStorefront();
  }, [refreshStorefront]);

  const toggleLanguage = () => setLanguage((prev) => (prev === 'en' ? 'ur' : 'en'));

  return (
    <StoreContext.Provider
      value={{
        settings,
        categories,
        products,
        reviews,
        loading,
        error,
        language,
        toggleLanguage,
        refreshStorefront
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
