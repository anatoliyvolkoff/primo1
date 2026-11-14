import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useProducts } from '../context/ProductContext';
import { CategoryPage } from './CategoryPage';
import { NotFound } from './NotFound';
import { HomeSkeleton } from '../components/skeletons/HomeSkeleton';

/**
 * Gatekeeper for the `/:categoryId` slot. Previously this route
 * unconditionally rendered CategoryPage, so any unknown URL —
 * `/login`, typos, dropped legacy routes — silently rendered an
 * "empty category" page and confused users + crawlers.
 *
 * Now we build a runtime allow-list from the loaded product set's
 * `categoryHandle` + `subCategoryHandle` values and render NotFound
 * when the slug isn't in that set. Loading state shows the same
 * skeleton the rest of the app uses so the gate doesn't flash 404
 * before the catalogue resolves.
 *
 * The allow-list gate only fires once the catalogue has actually
 * LOADED successfully. On a fetch error the product set resolves
 * empty, which would make every slug look "unknown" and 404 the
 * whole catalogue on a transient blip. Instead we render CategoryPage
 * optimistically — it shows its own empty state, and the global
 * CatalogErrorBanner (App.tsx) surfaces the outage above it — so a
 * network error never masquerades as a 404 to users or crawlers.
 */
export function CategoryRoute() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const { products, loading, error } = useProducts();

  const allowed = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.categoryHandle) set.add(p.categoryHandle);
      if (p.subCategoryHandle) set.add(p.subCategoryHandle);
    }
    return set;
  }, [products]);

  if (loading) return <HomeSkeleton />;
  // Don't derive a 404 from a failed fetch: only gate to NotFound when the
  // catalogue loaded cleanly. On error, let CategoryPage render its own
  // empty state (the global CatalogErrorBanner explains the outage).
  if (error) return <CategoryPage />;
  if (!categoryId || !allowed.has(categoryId)) return <NotFound />;
  return <CategoryPage />;
}
