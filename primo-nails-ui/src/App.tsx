import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { CartProvider } from './context/CartContext';
import { LanguageProvider } from './context/LanguageContext';
import { SearchProvider } from './context/SearchContext';
import { ContentProvider } from './context/ContentContext';
import { ProductProvider } from './context/ProductContext';
import { ToastProvider } from './context/ToastContext';

import { NewsletterPopup } from './components/NewsletterPopup';
import { ScrollToTop } from './components/ScrollToTop';
import { ScrollRestoration } from './components/ScrollRestoration';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CatalogErrorBanner } from './components/CatalogErrorBanner';
import { PageSkeleton } from './components/skeletons/PageSkeleton';
import { migrateLocalStorage } from './lib/migrateLocalStorage';

// Route components are code-split so the initial bundle ships only the shell +
// providers; each page's chunk loads on demand behind a skeleton fallback
// (UI-011). Named exports → map to a default for React.lazy.
const Home = lazy(() => import('./pages/Home').then((m) => ({ default: m.Home })));
const ProductDetail = lazy(() => import('./pages/ProductDetail').then((m) => ({ default: m.ProductDetail })));
const CategoryRoute = lazy(() => import('./pages/CategoryRoute').then((m) => ({ default: m.CategoryRoute })));
const NotFound = lazy(() => import('./pages/NotFound').then((m) => ({ default: m.NotFound })));
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })));
const CoursesPage = lazy(() => import('./pages/CoursesPage').then((m) => ({ default: m.CoursesPage })));
const CourseDetailPage = lazy(() => import('./pages/CourseDetailPage').then((m) => ({ default: m.CourseDetailPage })));
const TermsPage = lazy(() => import('./pages/TermsPage').then((m) => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })));
const ShippingPage = lazy(() => import('./pages/ShippingPage').then((m) => ({ default: m.ShippingPage })));
const Checkout = lazy(() => import('./pages/Checkout').then((m) => ({ default: m.Checkout })));
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation').then((m) => ({ default: m.OrderConfirmation })));
const PaymentReturn = lazy(() => import('./pages/PaymentReturn').then((m) => ({ default: m.PaymentReturn })));
const AllProducts = lazy(() => import('./pages/AllProducts').then((m) => ({ default: m.AllProducts })));

// Clear orphaned localStorage keys left over from older branches.
// Runs at module load (i.e. before any provider mounts) so we never
// read stale values.
migrateLocalStorage();

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <ToastProvider>
            <ContentProvider>
              <ProductProvider>
                <SearchProvider>
                  <CartProvider>
                    <BrowserRouter>
                      <ScrollRestoration />
                      <div className="min-h-screen flex flex-col relative">
                        <Header />
                        <CatalogErrorBanner />
                        <NewsletterPopup />

                        <ErrorBoundary>
                          <Suspense fallback={<PageSkeleton />}>
                            <Routes>
                              <Route path="/" element={<Home />} />
                              <Route path="/tutti-prodotti" element={<AllProducts />} />
                              <Route path="/product/:handle" element={<ProductDetail />} />
                              <Route path="/checkout" element={<Checkout />} />
                              <Route path="/checkout/payment-success" element={<PaymentReturn outcome="success" />} />
                              <Route path="/checkout/payment-cancelled" element={<PaymentReturn outcome="cancelled" />} />
                              <Route path="/checkout/confirmation/:orderId" element={<OrderConfirmation />} />
                              <Route path="/about-us" element={<AboutPage />} />
                              <Route path="/corsi" element={<CoursesPage />} />
                              <Route path="/corsi/:id" element={<CourseDetailPage />} />
                              <Route path="/termini" element={<TermsPage />} />
                              <Route path="/termini-e-condizioni" element={<TermsPage />} />
                              <Route path="/privacy" element={<PrivacyPage />} />
                              <Route path="/privacy-policy" element={<PrivacyPage />} />
                              <Route path="/spedizioni" element={<ShippingPage />} />
                              <Route path="/spedizioni-e-resi" element={<ShippingPage />} />
                              <Route path="/:categoryId" element={<CategoryRoute />} />
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </Suspense>
                        </ErrorBoundary>

                        <Footer />
                        <ScrollToTop />
                      </div>
                    </BrowserRouter>
                  </CartProvider>
                </SearchProvider>
              </ProductProvider>
            </ContentProvider>
          </ToastProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
