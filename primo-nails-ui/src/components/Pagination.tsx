import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /**
   * Total number of results across all pages. When provided (together with
   * `pageSize`) the control renders the "Showing X of Y results" caption from
   * the redesign — purely presentational, no effect on paging behaviour.
   */
  totalResults?: number;
  /** Items shown per page — used only to derive the "showing" caption. */
  pageSize?: number;
}

/**
 * Primo1 `.pg-nums`: pages 1–5, then "…" and the last page, for every page up
 * to 5 (page 4 of 8 shows `1 2 3 4 5 … 8`). Past page 5 the five-page window
 * follows the current page (page 7 of 12 → `1 … 5 6 7 8 9 … 12`), with the
 * first/last page and an ellipsis wherever a run is collapsed.
 */
function buildPageList(current: number, total: number): (number | 'gap')[] {
  const pages: (number | 'gap')[] = [];
  const start = current <= 5 ? 1 : Math.max(1, Math.min(current - 2, total - 4));
  const end = Math.min(total, start + 4);
  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push('gap');
  }
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total) {
    if (end < total - 1) pages.push('gap');
    pages.push(total);
  }
  return pages;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalResults,
  pageSize,
}) => {
  const { t, language } = useLanguage();
  // Tighter window on small screens (siblings=0), roomier from sm up. Driven by
  // matchMedia so the page list rebuilds when the viewport crosses 640px.
  // Hide only when there are genuinely zero pages (no results). A single-page
  // result set (e.g. a 13-product category) still renders the pill + "Showing
  // N of N" caption with Prev/Next disabled and a lone "1" — the prototype keeps
  // the pager visible so the count caption always has a home.
  if (totalPages < 1) return null;
  // Sliding window around the current page (first + last anchors + neighbours).
  // Fewer siblings on phones so the row doesn't overflow.
  const pages = buildPageList(currentPage, totalPages);

  const locale = language === 'it' ? 'it-IT' : 'en-US';
  // "Showing N of M": N is the count on the CURRENT page (not cumulative), so
  // page 2 of 125 @ 16/page reads "16 of 125", and the last partial page reads
  // its real remainder (e.g. "13 of 125"), matching the prototype.
  const shownOnPage =
    totalResults != null && pageSize != null
      ? Math.max(0, Math.min(pageSize, totalResults - (currentPage - 1) * pageSize))
      : 0;
  const showingCaption =
    totalResults != null && pageSize != null
      ? t('pagination.showing', {
          shown: shownOnPage.toLocaleString(locale),
          total: totalResults.toLocaleString(locale),
        })
      : null;

  return (
    <nav
      aria-label={t('a11y.pagination.label')}
      className="select-none"
    >
      {/* White rounded pill with soft shadow (redesign pagination.png). Holds the
          page controls on the left and the results caption on the right; wraps
          to two centred rows on narrow viewports. */}
      {/* Phones: Primo1 `.pager` — the numbers sit in their own 56px pill
          and the "Showing…" line drops below it, outside the pill. */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 bg-card border border-border shadow-card rounded-pill px-4 sm:px-6 py-3 max-sm:gap-2.5 max-sm:p-0 max-sm:bg-transparent max-sm:border-0 max-sm:shadow-none max-sm:rounded-none lg:justify-between lg:mx-auto lg:w-[860px] lg:max-w-full lg:h-[72px] lg:py-0 lg:px-[72px] lg:rounded-[36px] lg:border-[#eee] lg:shadow-[0_10px_30px_-18px_rgba(0,0,0,0.18)]">
        <div className="flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2 lg:gap-8 max-sm:gap-3 max-sm:h-14 max-sm:px-4 max-[440px]:gap-1.5 max-[440px]:px-2.5 max-sm:bg-card max-sm:border max-sm:border-[#ececec] max-sm:rounded-[28px] max-sm:shadow-[0_10px_30px_-18px_rgba(0,0,0,0.18)]">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            aria-label={t('a11y.pagination.prev')}
            className="flex items-center gap-1 shrink-0 h-10 pl-2 pr-3 max-sm:px-1.5 lg:px-0 rounded-pill text-sm lg:text-[13.5px] font-medium text-muted-foreground lg:text-[#555] hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground transition-[color,scale] duration-200 active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t('pagination.previous')}</span>
          </button>

          {/* Phones: Primo1 `.pg-nums` sizing (28px numbers, 2px gaps) so the
              widest list (1 … 3 4 5 … 8) fits a 360px screen. */}
          <ol className="flex items-center justify-center gap-1 max-sm:gap-0.5 sm:gap-1.5 lg:gap-5">
            {pages.map((page, i) => {
              if (page === 'gap') {
                return (
                  <li key={`gap-${i}`} aria-hidden="true" className="w-7 max-sm:w-4 sm:w-8 lg:w-auto text-center text-muted-foreground lg:text-[#999]">
                    …
                  </li>
                );
              }
              const isCurrent = currentPage === page;
              return (
                <li key={page}>
                  <button
                    type="button"
                    onClick={() => onPageChange(page)}
                    aria-current={isCurrent ? 'page' : undefined}
                    aria-label={isCurrent ? t('a11y.pageCurrent', { page }) : t('a11y.pageNumber', { page })}
                    className={`w-9 h-9 max-sm:w-7 max-[440px]:w-6 sm:w-10 sm:h-10 lg:w-auto lg:h-9 lg:min-w-7 lg:px-1 lg:rounded-[18px] flex items-center justify-center rounded-full text-sm lg:text-[13.5px] font-medium transition-all duration-200 active:scale-90 ${
                      isCurrent
                        ? 'bg-primary text-primary-foreground shadow-card max-sm:w-9 max-sm:font-semibold lg:shadow-none lg:min-w-9 lg:font-semibold'
                        : 'text-foreground lg:text-[#555] hover:bg-tab-track lg:hover:bg-black/5'
                    }`}
                  >
                    {page}
                  </button>
                </li>
              );
            })}
          </ol>

          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            aria-label={t('a11y.pagination.next')}
            className="flex items-center gap-1 shrink-0 h-10 pl-3 pr-2 max-sm:px-1.5 lg:px-0 rounded-pill text-sm lg:text-[13.5px] font-medium text-muted-foreground lg:text-[#555] hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground transition-[color,scale] duration-200 active:scale-95"
          >
            <span className="hidden sm:inline">{t('pagination.next')}</span>
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {showingCaption && (
          <p className="sm:ml-auto lg:ml-0 text-xs max-sm:text-[12.5px] max-sm:text-[#8a8a8a] sm:text-sm lg:text-[14px] text-muted-foreground lg:text-[#8a8a8a] whitespace-nowrap">
            {showingCaption}
          </p>
        )}
      </div>
    </nav>
  );
};
