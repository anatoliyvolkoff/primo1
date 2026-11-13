import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { usePageParam } from './usePageParam';

// ── Probe component: surfaces the resolved currentPage + the live URL query, and
//    exposes setPage so tests can drive navigation. window.scrollTo is a no-op
//    in happy-dom but the hook calls it, so stub it to keep the console quiet. ──
beforeEach(() => {
  // scrollTo isn't implemented in happy-dom; make it a silent no-op spy.
  window.scrollTo = vi.fn();
});

let api: {
  page: number;
  url: string;
  setPage: (p: number, opts?: { scroll?: boolean }) => void;
};

function Probe({ totalPages }: { totalPages: number }) {
  const [sp] = useSearchParams();
  const [page, setPage] = usePageParam(totalPages);
  api = { page, url: sp.toString(), setPage };
  return <div data-testid="page">{page}</div>;
}

const renderAt = (url: string, totalPages: number) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Probe totalPages={totalPages} />
    </MemoryRouter>
  );

describe('usePageParam — reading & clamping ?page=', () => {
  it('defaults to page 1 when ?page= is absent', () => {
    renderAt('/x', 5);
    expect(api.page).toBe(1);
  });

  it('reads a valid in-range ?page=', () => {
    renderAt('/x?page=3', 5);
    expect(api.page).toBe(3);
  });

  it('clamps an out-of-range ?page= down to the last page', () => {
    renderAt('/x?page=999', 5);
    expect(api.page).toBe(5);
  });

  it('falls back to page 1 for ?page=0 and negative pages', () => {
    renderAt('/x?page=0', 5);
    expect(api.page).toBe(1);
  });

  it('rejects a non-digit ?page= (e.g. "2abc") instead of parseInt-ing it to 2', () => {
    // parseInt('2abc') === 2 — the strict /^\d+$/ guard must reject it → page 1.
    renderAt('/x?page=2abc', 5);
    expect(api.page).toBe(1);
  });

  it('treats a non-numeric ?page= as page 1', () => {
    renderAt('/x?page=foo', 5);
    expect(api.page).toBe(1);
  });

  it('clamps to 1 when totalPages is 0 (empty result set)', () => {
    renderAt('/x?page=4', 0);
    expect(api.page).toBe(1);
  });
});

describe('usePageParam — out-of-range repair writes the URL back', () => {
  it('rewrites ?page=999 to the real last page in the URL once totalPages is known', () => {
    renderAt('/x?page=999', 5);
    // The repair effect runs after mount; it clamps the URL param to the max.
    expect(api.url).toContain('page=5');
    expect(api.page).toBe(5);
  });

  it('drops ?page= entirely when the only valid page is 1 (max <= 1)', () => {
    renderAt('/x?page=999', 1);
    // A single-page set: the repair deletes the param rather than writing page=1.
    expect(api.url).not.toContain('page');
    expect(api.page).toBe(1);
  });
});

describe('usePageParam — setPage writes the URL', () => {
  it('writes ?page=N for N>1 and scrolls to top', () => {
    renderAt('/x', 5);
    act(() => { api.setPage(3); });
    expect(api.url).toContain('page=3');
    expect(window.scrollTo).toHaveBeenCalled();
  });

  it('drops ?page= for page 1 (clean URLs)', () => {
    renderAt('/x?page=3', 5);
    act(() => { api.setPage(1); });
    expect(api.url).not.toContain('page');
    expect(api.page).toBe(1);
  });

  it('preserves every other query param when writing ?page=', () => {
    renderAt('/x?color=rosso&q=gel', 5);
    act(() => { api.setPage(2); });
    expect(api.url).toContain('color=rosso');
    expect(api.url).toContain('q=gel');
    expect(api.url).toContain('page=2');
  });

  it('does NOT scroll when { scroll: false } (filter-reset path)', () => {
    renderAt('/x?page=2', 5);
    act(() => { api.setPage(1, { scroll: false }); });
    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});
