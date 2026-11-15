import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { useRef } from 'react';
import { useSheetDragDismiss } from '../useSheetDragDismiss';

function Sheet({ onDismiss }: { onDismiss: () => void }) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  useSheetDragDismiss({ enabled: true, sheetRef, backdropRef, onDismiss });
  return (
    <>
      <div ref={backdropRef} data-testid="backdrop" />
      <div ref={sheetRef} data-testid="sheet">
        <div data-testid="scroller" style={{ overflowY: 'auto' }}>
          <p data-testid="content">content</p>
        </div>
      </div>
    </>
  );
}

function touch(el: Element, type: string, x: number, y: number, t: number) {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  const list = type === 'touchend' ? [] : [{ clientX: x, clientY: y }];
  Object.defineProperty(ev, 'touches', { value: list });
  Object.defineProperty(ev, 'timeStamp', { value: t });
  el.dispatchEvent(ev);
  return ev;
}

function swipe(el: Element, path: Array<[number, number]>, stepMs = 16) {
  let t = 0;
  touch(el, 'touchstart', path[0][0], path[0][1], t);
  const moves = path.slice(1).map(([x, y]) => touch(el, 'touchmove', x, y, (t += stepMs)));
  touch(el, 'touchend', 0, 0, (t += stepMs));
  return moves;
}

function setup() {
  const onDismiss = vi.fn();
  const utils = render(<Sheet onDismiss={onDismiss} />);
  const sheet = utils.getByTestId('sheet');
  // jsdom has no layout: give the sheet a height for the threshold maths.
  sheet.getBoundingClientRect = () => ({ height: 600 }) as DOMRect;
  return { ...utils, onDismiss, sheet };
}

describe('useSheetDragDismiss', () => {
  // Phone viewport, motion allowed.
  beforeEach(() => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: !q.includes('reduced-motion'), addEventListener() {}, removeEventListener() {} }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('closes after a long swipe down and blocks native scrolling during it', () => {
    const { onDismiss, getByTestId } = setup();
    const moves = swipe(getByTestId('content'), [[100, 100], [100, 110], [100, 200], [100, 300]], 60);
    expect(moves[1].defaultPrevented).toBe(true);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('closes on a quick short flick', () => {
    const { onDismiss, getByTestId } = setup();
    swipe(getByTestId('content'), [[100, 100], [100, 110], [100, 140], [100, 170]], 10);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('springs back after a short slow drag and moves the sheet with the finger meanwhile', () => {
    const { onDismiss, getByTestId, sheet } = setup();
    const el = getByTestId('content');
    touch(el, 'touchstart', 100, 100, 0);
    touch(el, 'touchmove', 100, 110, 100);
    touch(el, 'touchmove', 100, 160, 400);
    expect(sheet.style.translate).toBe('0 50px');
    expect(getByTestId('backdrop').style.filter).toMatch(/^opacity\(0\.9/);
    touch(el, 'touchend', 0, 0, 800);
    expect(onDismiss).not.toHaveBeenCalled();
    expect(sheet.style.translate || '').toBe('');
  });

  it('leaves horizontal swipes (photo carousel) alone', () => {
    const { onDismiss, getByTestId, sheet } = setup();
    const moves = swipe(getByTestId('content'), [[100, 100], [140, 106], [220, 140], [300, 200]], 10);
    expect(moves.some((m) => m.defaultPrevented)).toBe(false);
    expect(sheet.style.translate || '').toBe('');
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('scrolls the content instead when it is not at the top', () => {
    const { onDismiss, getByTestId } = setup();
    const scroller = getByTestId('scroller');
    Object.defineProperty(scroller, 'scrollHeight', { value: 2000 });
    Object.defineProperty(scroller, 'clientHeight', { value: 500 });
    scroller.scrollTop = 300;
    const moves = swipe(getByTestId('content'), [[100, 100], [100, 120], [100, 300], [100, 500]], 10);
    expect(moves.some((m) => m.defaultPrevented)).toBe(false);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('ignores an upward swipe (content scroll)', () => {
    const { onDismiss, getByTestId } = setup();
    swipe(getByTestId('content'), [[100, 400], [100, 380], [100, 200]], 10);
    expect(onDismiss).not.toHaveBeenCalled();
  });
});

describe('useSheetDragDismiss on a desktop viewport', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('does nothing when the media query does not match', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    const { onDismiss, getByTestId } = setup();
    swipe(getByTestId('content'), [[100, 100], [100, 110], [100, 300], [100, 500]], 10);
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
