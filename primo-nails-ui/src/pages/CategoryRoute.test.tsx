import { render, screen } from '@testing-library/react';
import type { Product } from '../types';

// Mock react-router's useParams so we control the requested slug.
const mockParams = { current: {} as { categoryId?: string } };
vi.mock('react-router-dom', () => ({
  useParams: () => mockParams.current,
}));

// Mock the ProductContext hook so we can drive loading/error/products directly.
const mockProducts = {
  current: { products: [] as Product[], loading: false, error: null as string | null },
};
vi.mock('../context/ProductContext', () => ({
  useProducts: () => mockProducts.current,
}));

// Stub the three leaf components so the test asserts purely on CategoryRoute's
// branching (no need to satisfy Language/SEO/etc. contexts they depend on).
vi.mock('./CategoryPage', () => ({
  CategoryPage: () => <div data-testid="category-page" />,
}));
vi.mock('./NotFound', () => ({
  NotFound: () => <div data-testid="not-found" />,
}));
vi.mock('../components/skeletons/HomeSkeleton', () => ({
  HomeSkeleton: () => <div data-testid="home-skeleton" />,
}));

import { CategoryRoute } from './CategoryRoute';

// Minimal product carrying only the handle fields CategoryRoute reads.
const productIn = (handle: string): Product =>
  ({ categoryHandle: handle } as unknown as Product);

describe('CategoryRoute gate', () => {
  beforeEach(() => {
    mockParams.current = { categoryId: 'semipermanente' };
    mockProducts.current = { products: [], loading: false, error: null };
  });

  it('does NOT 404 a valid slug when the catalogue fetch errored (empty products + error)', () => {
    // Transient backend/network blip: products resolved empty, error is set.
    // Must not turn every category URL into a hard 404 (bad for users + crawlers).
    mockProducts.current = { products: [], loading: false, error: 'Network error' };

    render(<CategoryRoute />);

    expect(screen.queryByTestId('not-found')).not.toBeInTheDocument();
    // Optimistically renders the category page (which shows its own empty state);
    // the global CatalogErrorBanner surfaces the outage above it.
    expect(screen.getByTestId('category-page')).toBeInTheDocument();
  });

  it('renders the loading skeleton while the catalogue is loading', () => {
    mockProducts.current = { products: [], loading: true, error: null };

    render(<CategoryRoute />);

    expect(screen.getByTestId('home-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('not-found')).not.toBeInTheDocument();
  });

  it('STILL renders NotFound for a genuinely-missing category after a successful load', () => {
    // Catalogue loaded fine (no error), but this slug is in no product → real 404.
    mockParams.current = { categoryId: 'does-not-exist' };
    mockProducts.current = {
      products: [productIn('semipermanente'), productIn('gel')],
      loading: false,
      error: null,
    };

    render(<CategoryRoute />);

    expect(screen.getByTestId('not-found')).toBeInTheDocument();
    expect(screen.queryByTestId('category-page')).not.toBeInTheDocument();
  });

  it('renders the category page for a valid slug after a successful load', () => {
    mockProducts.current = {
      products: [productIn('semipermanente')],
      loading: false,
      error: null,
    };

    render(<CategoryRoute />);

    expect(screen.getByTestId('category-page')).toBeInTheDocument();
    expect(screen.queryByTestId('not-found')).not.toBeInTheDocument();
  });
});
