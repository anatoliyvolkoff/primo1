import { render, screen, fireEvent } from '@testing-library/react';

// Neutralise i18n — echo the key, then append any interpolation vars so tests
// can assert on the caption's computed numbers (shown/total) and page labels.
vi.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, vars?: Record<string, unknown>) => {
      if (!vars) return k;
      if ('page' in vars) return `${k}:${vars.page}`;
      return `${k}:${Object.values(vars).join('/')}`;
    },
    language: 'en',
  }),
}));

import { Pagination } from './Pagination';

// Helper: the visible page-number buttons, in order (ignores Prev/Next + …).
function pageButtons(): string[] {
  return screen
    .getAllByRole('button')
    .map((b) => b.textContent?.trim() ?? '')
    .filter((txt) => /^\d+$/.test(txt));
}

describe('Pagination — page-number window tracks the current page', () => {
  it('renders a proper sliding window around a middle page (first + neighbours + last, both ellipses)', () => {
    render(
      <Pagination currentPage={50} totalPages={99} onPageChange={() => {}} />
    );

    const nums = pageButtons();

    // First and last anchors are always present.
    expect(nums).toContain('1');
    expect(nums).toContain('99');

    // The current page AND its immediate neighbours must be visible — this is
    // the whole point of a pager: it reflects where you are. The broken
    // "lead window" showed 1 2 3 4 5 50 … 99 (no 49/51), which this catches.
    expect(nums).toContain('49');
    expect(nums).toContain('50');
    expect(nums).toContain('51');

    // Deep in the middle, the leading pages 2..5 are NOT part of the window —
    // they belong to the broken static prototype pager.
    expect(nums).not.toContain('3');

    // An ellipsis must separate page 1 from the current window (no silent
    // 1 → 49 jump). There are gaps on BOTH sides here.
    const gaps = screen.getAllByText('…');
    expect(gaps.length).toBe(2);
  });

  it('shows a left ellipsis + no right ellipsis when the current page is near the end', () => {
    render(
      <Pagination currentPage={98} totalPages={99} onPageChange={() => {}} />
    );
    const nums = pageButtons();
    expect(nums).toContain('1');
    expect(nums).toContain('97');
    expect(nums).toContain('98');
    expect(nums).toContain('99');
    // Only the left gap (1 … 97 98 99) — 98/99 are adjacent to the end.
    expect(screen.getAllByText('…').length).toBe(1);
  });

  it('disables Prev on the first page and Next on the last page', () => {
    const { rerender } = render(
      <Pagination currentPage={1} totalPages={10} onPageChange={() => {}} />
    );
    expect(screen.getByLabelText('a11y.pagination.prev')).toBeDisabled();
    expect(screen.getByLabelText('a11y.pagination.next')).not.toBeDisabled();

    rerender(
      <Pagination currentPage={10} totalPages={10} onPageChange={() => {}} />
    );
    expect(screen.getByLabelText('a11y.pagination.prev')).not.toBeDisabled();
    expect(screen.getByLabelText('a11y.pagination.next')).toBeDisabled();
  });

  it('calls onPageChange with the clicked page number', () => {
    const onPageChange = vi.fn();
    render(
      <Pagination currentPage={1} totalPages={10} onPageChange={onPageChange} />
    );
    fireEvent.click(screen.getByText('2'));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('rebuilds the window around a far page after a jump (e.g. landing on page 8)', () => {
    // Jumping straight to a far page must centre the window on that page, not
    // leave a stale lead window. Page 8 of 20 (siblings=2) → 1 … 6 7 8 9 10 … 20.
    render(<Pagination currentPage={8} totalPages={20} onPageChange={() => {}} />);
    const nums = pageButtons();
    expect(nums).toContain('1');
    expect(nums).toContain('20');
    expect(nums).toContain('6');
    expect(nums).toContain('8'); // current, centred
    expect(nums).toContain('10');
    // Pages just outside the window are collapsed behind the ellipses.
    expect(nums).not.toContain('5');
    expect(nums).not.toContain('11');
    expect(screen.getAllByText('…').length).toBe(2);
  });

  it('clicking a page in a far window reports that exact page (the "click 8" case)', () => {
    // From page 50, the window exposes 48..52; clicking "48" must emit 48 (not
    // an off-by-one or a window-relative index).
    const onPageChange = vi.fn();
    render(<Pagination currentPage={50} totalPages={99} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByText('48'));
    expect(onPageChange).toHaveBeenCalledWith(48);
  });

  it('keeps Primo1\'s 1 2 3 4 5 … N for every page up to 5', () => {
    // Page 4 of 8 → 1 2 3 4 5 … 8 (not 1 2 3 4 5 6 … 8).
    render(<Pagination currentPage={4} totalPages={8} onPageChange={() => {}} />);
    expect(pageButtons()).toEqual(['1', '2', '3', '4', '5', '8']);
    expect(screen.getAllByText('…').length).toBe(1);
  });

  it('shows a right ellipsis + no left ellipsis when the current page is near the start', () => {
    // Page 2 of 99 → Primo1's five-page window: 1 2 3 4 5 … 99 — the left side
    // is contiguous.
    render(<Pagination currentPage={2} totalPages={99} onPageChange={() => {}} />);
    const nums = pageButtons();
    expect(nums).toContain('1');
    expect(nums).toContain('5');
    expect(nums).toContain('99');
    expect(nums).not.toContain('6');
    expect(screen.getAllByText('…').length).toBe(1);
  });
});

describe('Pagination — single-page result sets still render (M44)', () => {
  it('renders the pill + caption with a lone "1" and both arrows disabled for a 13-product set', () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={1}
        onPageChange={() => {}}
        totalResults={13}
        pageSize={16}
      />
    );

    // The single page button is present (and current)…
    expect(pageButtons()).toEqual(['1']);
    // …both navigation arrows are disabled (nowhere to go)…
    expect(screen.getByLabelText('a11y.pagination.prev')).toBeDisabled();
    expect(screen.getByLabelText('a11y.pagination.next')).toBeDisabled();
    // …and the count caption renders "13 of 13" for the single page.
    expect(screen.getByText('pagination.showing:13/13')).toBeTruthy();
  });

  it('renders nothing only when there are zero pages (no results)', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={0} onPageChange={() => {}} totalResults={0} pageSize={16} />
    );
    expect(container.firstChild).toBeNull();
  });
});

describe('Pagination — "Showing N of M" is the current-page count, not cumulative (M45)', () => {
  it('shows a full page count on a non-final page (16 of 125 on page 2, not 32)', () => {
    render(
      <Pagination
        currentPage={2}
        totalPages={8}
        onPageChange={() => {}}
        totalResults={125}
        pageSize={16}
      />
    );
    expect(screen.getByText('pagination.showing:16/125')).toBeTruthy();
  });

  it('shows the partial remainder on the final page (13 of 125 on page 8)', () => {
    render(
      <Pagination
        currentPage={8}
        totalPages={8}
        onPageChange={() => {}}
        totalResults={125}
        pageSize={16}
      />
    );
    // 125 - 7*16 = 13 items on the last page.
    expect(screen.getByText('pagination.showing:13/125')).toBeTruthy();
  });
});
