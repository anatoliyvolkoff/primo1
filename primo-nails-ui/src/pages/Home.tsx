import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { Hero } from '../components/layout/Hero';
import { ExploreCarousel } from '../components/ExploreCarousel';
import { ShopByColor, SeasonalCollections, RunningBanner } from '../components/collections';
import { ReviewsCarousel } from '../components/ReviewsCarousel';
import { CoursesList } from '../components/CoursesList';
import { AboutBrand } from '../components/AboutBrand';
import { RecentlyViewed } from '../components/RecentlyViewed';
import { useLanguage } from '../context/LanguageContext';
import { useProducts } from '../context/ProductContext';
import { useProductSlot } from '../hooks/useStoreContent';
import { useSeo } from '../lib/useSeo';
import { organizationJsonLd, websiteJsonLd } from '../lib/seo';
import { HomeSkeleton } from '../components/skeletons/HomeSkeleton';
import type { Product } from '../types';

/**
 * Resolves an ordered list of product handles into the matching Product
 * view models, preserving the admin-configured order. Unknown handles
 * are dropped silently. When the slot is empty, falls back to the
 * provided default list so the homepage stays populated.
 */
function resolveSlot(
  handles: string[],
  byHandle: Map<string, Product>,
  fallback: Product[]
): Product[] {
  if (handles.length === 0) return fallback;
  const resolved = handles.map(h => byHandle.get(h)).filter((p): p is Product => !!p);
  return resolved.length > 0 ? resolved : fallback;
}

export function Home() {
  const { t } = useLanguage();
  useSeo({
    titleKey: 'pageTitle.home',
    descriptionKey: 'seo.home.description',
    canonicalPath: '/',
    jsonLd: [organizationJsonLd(), websiteJsonLd()],
  });
  const { products, loading, error } = useProducts();
  // Each homepage carousel is bound to an admin-controlled slot. Empty
  // slot → falls back to the auto-derived defaults below.
  const bestSellersSlot = useProductSlot('homepage.bestSellers');
  const novitaSlot = useProductSlot('homepage.novita');
  const saldiSlot = useProductSlot('homepage.saldi');
  const newArrivalsSlot = useProductSlot('homepage.newArrivals');
  const forYouSlot = useProductSlot('homepage.forYou');
  const mostLovedSlot = useProductSlot('homepage.mostLoved');

  if (loading) {
    return <HomeSkeleton />;
  }

  // Product fetch failed: render an explicit error state with a retry
  // affordance instead of silently rendering an empty homepage. The exact
  // outage message is already surfaced by the global CatalogErrorBanner
  // (App.tsx), so we show the heading + retry here rather than repeat it.
  if (error) {
    return (
      <main className="flex-1">
        <Hero />
        <div
          role="alert"
          className="container-premium py-20 sm:py-28 text-center flex flex-col items-center gap-6"
        >
          <AlertTriangle className="w-8 h-8 text-destructive shrink-0" />
          <p className="text-base sm:text-lg text-muted-foreground font-medium max-w-md">
            {t('errorBoundary.title')}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="h-12 sm:h-14 px-8 sm:px-10 bg-foreground text-background text-[10px] sm:text-[11px] font-black tracking-[0.25em] sm:tracking-[0.3em] uppercase rounded-full transition-all duration-500 hover:bg-foreground/85 shadow-lg shadow-black/10"
          >
            {t('errorBoundary.retry')}
          </button>
        </div>
      </main>
    );
  }

  const visibleProducts = products.filter(p => p.isVisible !== false);
  const promotedProducts = visibleProducts.filter(p => p.isPromoted);
  const byHandle = new Map<string, Product>(visibleProducts.map(p => [p.handle ?? p.id, p]));

  // Auto-derived fallbacks for slots admins haven't configured yet.
  // Rank once (promoted first, then the rest) and dedup, then take disjoint
  // slices so New Arrivals never overlaps Best Sellers (LB201-2). The old
  // code ranked the two lists differently, so overlap was possible.
  const rankedDefaults = Array.from(new Set([...promotedProducts, ...visibleProducts]));
  const defaultBestSellers = rankedDefaults.slice(0, 4);
  const defaultNewArrivals = rankedDefaults.slice(4, 12);
  const defaultNovita = visibleProducts.filter(p => /^(NEW|NUOVO)$/i.test(p.badge ?? '')).slice(0, 8);
  const defaultSaldi = visibleProducts.filter(p => /^(SALE|SALDI)$/i.test(p.badge ?? '')).slice(0, 8);

  const bestSellers = resolveSlot(bestSellersSlot.handles, byHandle, defaultBestSellers);
  const novita = resolveSlot(novitaSlot.handles, byHandle, defaultNovita.length > 0 ? defaultNovita : defaultNewArrivals.slice(0, 4));
  const saldi = resolveSlot(saldiSlot.handles, byHandle, defaultSaldi.length > 0 ? defaultSaldi : visibleProducts.slice(0, 4));
  const newArrivals = resolveSlot(newArrivalsSlot.handles, byHandle, defaultNewArrivals.slice(0, 4));
  const forYou = resolveSlot(forYouSlot.handles, byHandle, defaultNewArrivals.slice(4, 8));
  const mostLoved = resolveSlot(mostLovedSlot.handles, byHandle, visibleProducts.slice(0, 4));

  // TPO & HEMA FREE running line — the prototype (index.html) places one black
  // marquee between every major section on desktop. Same call signature as
  // PDP/catalogue (another agent owns RunningBanner internals; we only reuse the
  // existing props). Rendered as a helper to keep the section rhythm readable.
  // Primo1 shows some strips on desktop only (`.marquee.d-only`). `gap` adds
  // Primo1's desktop 120px rhythm above the strip (sections ending flush).
  const marquee = (desktopOnly = false, gap = false) => {
    const strip = (
      <RunningBanner
          text={t('banner.tpoHemaText')}
          highlight={t('banner.tpoHemaHighlight')}
          highlightClassName="text-green-bright"
          Icon={ShieldCheck}
          desktopOnly={desktopOnly}
      />
    );
    return gap ? <div className="lg:mt-[120px]">{strip}</div> : strip;
  };

  return (
      <main className="flex-1 lg:pb-[120px]">
        {/* Desktop: Primo1 `main{padding-bottom:120px}` before the footer. */}
        <Hero />

        {/* I Più Venduti — admin-curated, 3-tab carousel. Title uses the same
            48px bold desktop / 30px phone style as every other rail. */}
        <div id="bestsellers" className="scroll-mt-28 sm:scroll-mt-36">
          <ExploreCarousel
              title={t('explore.bestSellers')}
              subtitle={t('explore.bestSellersSub')}
              products={bestSellers}
              filterTabs={{ bestsellers: bestSellers, new: novita, sale: saldi }}
          />
        </div>

        {marquee(true, true)}

        {/* Shop by color — prototype places it right after the best-seller block. */}
        <ShopByColor />

        {marquee(true)}

        {/* Nuovi Arrivi — phones only, like primo1 (`#new.m-only`). */}
        <div id="newArrivals" className="m-only scroll-mt-28 sm:scroll-mt-36">
          <ExploreCarousel
              title={t('explore.newArrivals')}
              subtitle={t('explore.newArrivalsSub')}
              subtitleXl
              products={newArrivals}
          />
        </div>

        {/* Phones: Primo1's free-shipping strip after Nuovi Arrivi (`.marquee.m-only`). */}
        <RunningBanner mobileOnly />

        {/* The Seasons — leave exactly as-is per the client (do not restyle/move
            its internals). It follows ShopByColor per the prototype order. */}
        <SeasonalCollections />

        {marquee(true)}

        {/* Consigliati per te — our extra rail. */}
        {/* Primo1 titles this rail "I Più Venduti" on desktop. */}
        <ExploreCarousel
            title={<><span className="m-only">{t('explore.forYou')}</span><span className="d-only">{t('explore.bestSellers')}</span></>}
            subtitle={<><span className="m-only">{t('explore.forYouSub')}</span><span className="d-only">{t('explore.bestSellersSub')}</span></>}
            products={forYou}
        />

        {marquee(false, true)}

        {/* I Più Amati — our extra rail. */}
        <ExploreCarousel
            title={<><span className="m-only">{t('explore.mostLoved')}</span><span className="d-only">{t('explore.bestSellers')}</span></>}
            subtitle={t('explore.bestSellersSub')}
            products={mostLoved}
        />

        {marquee(false, true)}

        <ReviewsCarousel />

        {marquee(true, true)}

        <AboutBrand />

        {marquee(true, true)}

        <CoursesList />

        {/* Primo1: free-shipping strip on phones, TPO & HEMA strip on desktop. */}
        <RunningBanner mobileOnly />
        {marquee(true)}

        {/* Visti di Recente — phones keep Primo1's compact rail; desktop shows the
            standard 4-card row (client request). */}
        <RecentlyViewed compact />

      </main>
  );
}
