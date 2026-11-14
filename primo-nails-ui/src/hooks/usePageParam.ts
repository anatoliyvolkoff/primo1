import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Syncs listing pagination with a `?page=` URL param so pages are
 * shareable / bookmarkable / crawlable and the browser Back button works.
 *
 * - Reads the current page from the URL (1 when absent/invalid).
 * - Clamps to [1, totalPages] and self-corrects an out-of-range `?page`
 *   (e.g. `?page=999`) back into the URL.
 * - `setPage` writes the param (dropping it for page 1 to keep clean URLs),
 *   preserves every other query param (e.g. `?color=`), and scrolls to top.
 *
 * Pagination stays 100% client-side — this only mirrors page state in the URL.
 */
export function usePageParam(
  totalPages: number
): readonly [number, (page: number, opts?: { scroll?: boolean }) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  // Strict digit-only parse: parseInt('2abc') === 2 would let `?page=2abc`
  // silently become page 2, so reject anything that isn't all digits.
  const rawParam = searchParams.get('page') ?? '';
  const requested = /^\d+$/.test(rawParam) && parseInt(rawParam, 10) > 0
    ? parseInt(rawParam, 10)
    : 1;
  const max = Math.max(1, totalPages);
  const currentPage = Math.min(requested, max);

  const setPage = useCallback(
    (page: number, opts?: { scroll?: boolean }) => {
      setSearchParams(
        (prev) => {
          const sp = new URLSearchParams(prev);
          if (page <= 1) sp.delete('page');
          else sp.set('page', String(page));
          return sp;
        },
        { replace: true }
      );
      // Only scroll on an explicit page navigation (default). Resets driven by
      // a filter change pass { scroll: false } so the viewport stays put.
      if (opts?.scroll !== false) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [setSearchParams]
  );

  // Repair an out-of-range page in the URL once totalPages is known.
  useEffect(() => {
    if (totalPages > 0 && requested > max) {
      setSearchParams(
        (prev) => {
          const sp = new URLSearchParams(prev);
          if (max <= 1) sp.delete('page');
          else sp.set('page', String(max));
          return sp;
        },
        { replace: true }
      );
    }
  }, [requested, max, totalPages, setSearchParams]);

  return [currentPage, setPage] as const;
}
