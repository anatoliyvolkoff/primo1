import { render, screen, fireEvent, act } from '@testing-library/react';
import { NAIL_SWATCHES } from '../../data/swatches';
import { peekGap } from './stripPeek';

vi.mock('../../context/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'it',
    t: (k: string, v?: { count?: number }) => (v?.count != null ? `${k}:${v.count}` : k),
  }),
}));

import { StickyColorStrip } from './StickyColorStrip';

describe('peekGap — last visible dot is cut off at the right edge', () => {
  const N = NAIL_SWATCHES.length;
  it.each([180, 200, 220, 247, 260, 300, 420, 560])('row %ipx: a dot peeks in, gap stays near 16px', (w) => {
    const g = peekGap(w, N);
    expect(g).not.toBeNull();
    expect(g!).toBeGreaterThanOrEqual(12);
    expect(g!).toBeLessThanOrEqual(22);
    // Some dot k starts ~18px before the edge → partly visible.
    const starts = Array.from({ length: N }, (_, k) => 8 + k * (28 + g!));
    const cut = starts.find((x) => x < w && x + 28 > w);
    expect(cut).toBeDefined();
    expect(w - cut!).toBeGreaterThanOrEqual(11);
    expect(w - cut!).toBeLessThanOrEqual(21);
  });
  it('returns null when every dot fits', () => {
    expect(peekGap(2000, N)).toBeNull();
  });
});

describe('StickyColorStrip — swipe hints', () => {
  let ioCb: IntersectionObserverCallback | null = null;
  beforeEach(() => {
    sessionStorage.clear();
    document.body.innerHTML = '<div id="palette"></div>';
    (globalThis as any).IntersectionObserver = class {
      constructor(cb: IntersectionObserverCallback) { ioCb = cb; }
      observe() {}
      disconnect() {}
    };
  });

  const show = () => {
    const utils = render(
      <StickyColorStrip selectedColors={[]} onPick={vi.fn()} onClear={vi.fn()} count={6} />,
      { container: document.body.appendChild(document.createElement('div')) },
    );
    act(() => {
      ioCb!([{ isIntersecting: false, boundingClientRect: { top: -500 } } as any], {} as any);
    });
    return utils;
  };

  it('shows the right fade + arrow while more dots are hidden, and hides them at the end', () => {
    show();
    const row = screen.getByRole('group', { name: 'shop.cs.groupLabel' });
    Object.defineProperty(row, 'scrollWidth', { configurable: true, value: 700 });
    Object.defineProperty(row, 'clientWidth', { configurable: true, value: 250 });
    act(() => { row.scrollLeft = 0; fireEvent.scroll(row); });
    expect(screen.getByTestId('strip-fade-right')).toHaveClass('opacity-100');
    expect(screen.getByTestId('strip-more')).toHaveClass('opacity-100');
    expect(screen.getByTestId('strip-fade-left')).toHaveClass('opacity-0');

    act(() => { row.scrollLeft = 450; fireEvent.scroll(row); });
    expect(screen.getByTestId('strip-fade-right')).toHaveClass('opacity-0');
    expect(screen.getByTestId('strip-more')).toHaveClass('opacity-0');
    expect(screen.getByTestId('strip-fade-left')).toHaveClass('opacity-100');
  });

  it('no arrow when every dot fits', () => {
    show();
    const row = screen.getByRole('group', { name: 'shop.cs.groupLabel' });
    Object.defineProperty(row, 'scrollWidth', { configurable: true, value: 660 });
    Object.defineProperty(row, 'clientWidth', { configurable: true, value: 700 });
    act(() => { fireEvent.scroll(row); });
    expect(screen.queryByTestId('strip-more')).toBeNull();
  });

  it('the arrow scrolls the row on', () => {
    show();
    const row = screen.getByRole('group', { name: 'shop.cs.groupLabel' });
    Object.defineProperty(row, 'scrollWidth', { configurable: true, value: 700 });
    Object.defineProperty(row, 'clientWidth', { configurable: true, value: 250 });
    act(() => { fireEvent.scroll(row); });
    const scrollBy = vi.fn();
    (row as any).scrollBy = scrollBy;
    fireEvent.click(screen.getByTestId('strip-more'));
    expect(scrollBy).toHaveBeenCalledWith({ left: 150, behavior: 'smooth' });
  });
});
