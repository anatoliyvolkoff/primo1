import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Product } from '../types';

// ── Guard: the Home page must render the "TPO & HEMA FREE" running marquee(s)
//    between the product rails (prototype index.html:139 & :148). A home
//    restructure once displaced/altered these; this pins copy + count. ──

// i18n: echo keys so we can assert the banner copy flows through untouched.
vi.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

// Product catalogue — a tiny loaded set so Home renders its body (not the
// skeleton / error branch).
const sampleProducts: Product[] = [
  { id: '1', name: 'A', handle: 'a', price: '10', isVisible: true } as unknown as Product,
  { id: '2', name: 'B', handle: 'b', price: '20', isVisible: true } as unknown as Product,
];
vi.mock('../context/ProductContext', () => ({
  useProducts: () => ({ products: sampleProducts, loading: false, error: null }),
}));

// Store-content hooks the page + banner lean on.
vi.mock('../hooks/useStoreContent', () => ({
  useProductSlot: () => ({ handles: [] as string[] }),
  useStoreSetting: () => true,
}));

vi.mock('../lib/useSeo', () => ({ useSeo: () => {} }));

// RunningBanner: echo its text/highlight props so we can assert the TPO & HEMA
// copy is what Home passes in (rather than the default free-shipping message).
vi.mock('../components/collections/RunningBanner', () => ({
  RunningBanner: ({ text, highlight }: { text?: string; highlight?: string }) => (
    <div data-testid="running-banner">
      {text} {highlight}
    </div>
  ),
}));

// Neutralise the remaining heavy presentational children — none of them are
// under test here.
vi.mock('../components/layout/Hero', () => ({ Hero: () => <div /> }));
vi.mock('../components/ExploreCarousel', () => ({ ExploreCarousel: () => <div /> }));
vi.mock('../components/collections', () => ({
  ShopByColor: () => <div />,
  SeasonalCollections: () => <div />,
  // Re-exported from the barrel too; keep it pointing at the mocked primitive.
  RunningBanner: ({ text, highlight }: { text?: string; highlight?: string }) => (
    <div data-testid="running-banner">
      {text} {highlight}
    </div>
  ),
}));
vi.mock('../components/ReviewsCarousel', () => ({ ReviewsCarousel: () => <div /> }));
vi.mock('../components/CoursesList', () => ({ CoursesList: () => <div /> }));
vi.mock('../components/AboutBrand', () => ({ AboutBrand: () => <div /> }));
vi.mock('../components/RecentlyViewed', () => ({ RecentlyViewed: () => <div /> }));
vi.mock('../components/skeletons/HomeSkeleton', () => ({ HomeSkeleton: () => <div /> }));

import { Home } from './Home';

describe('Home — TPO & HEMA marquee', () => {
  it('renders the TPO & HEMA FREE running banner(s) with the right copy', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    // Primo1 rhythm: eight TPO & HEMA strips between the major sections, plus
    // two phone-only free-shipping strips (default copy, no text prop) after
    // Nuovi Arrivi and after the courses.
    const all = screen.getAllByTestId('running-banner');
    expect(all.length).toBe(10);
    const banners = all.filter((b) => b.textContent?.trim());
    expect(banners.length).toBe(8);
    // Each carries the TPO & HEMA copy (keys echoed by the mocked t()),
    // not the default free-shipping message.
    for (const b of banners) {
      expect(b.textContent).toContain('banner.tpoHemaText');
      expect(b.textContent).toContain('banner.tpoHemaHighlight');
    }
  });
});
