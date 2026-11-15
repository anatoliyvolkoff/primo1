import { useEffect, useRef, type RefObject } from 'react';

// Swipe-down-to-close for mobile bottom sheets (product / kit quick view,
// filters, course enrol). Touch-only, so desktop mouse use is untouched.
//
// - Dragging down moves the sheet with the finger and fades its backdrop.
// - Releasing past ~25% of the sheet height (or with a quick flick) closes it;
//   otherwise it springs back.
// - Inner scrolling wins: if the touch starts inside a scroller that is not at
//   its top, the gesture scrolls the content instead of dragging the sheet.
// - Horizontal gestures (photo carousel, shade rows) are left alone: the
//   direction is decided on the first few px of movement.
//
// The offset is applied through the CSS `translate` / `filter` properties so it
// never fights the `transform` / `opacity` that motion animates on the same
// elements (open/close animations keep working unchanged).

interface Options {
  enabled: boolean;
  sheetRef: RefObject<HTMLElement | null>;
  /** Element that dims the page; it fades as the sheet is dragged down. */
  backdropRef?: RefObject<HTMLElement | null>;
  onDismiss: () => void;
  /** Only react while this media query matches (default: phones/tablets). */
  mediaQuery?: string;
}

const DECIDE_PX = 4;
const NO_DRAG_SELECTOR = 'textarea, select, input[type="range"], [data-sheet-nodrag]';

function prefersReducedMotion() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** True when a vertical scroller between `target` and `sheet` (inclusive) is scrolled down. */
function contentScrolled(target: Element | null, sheet: HTMLElement) {
  let el: Element | null = target;
  while (el) {
    if (el instanceof HTMLElement && el.scrollTop > 0) {
      const oy = getComputedStyle(el).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight) return true;
    }
    if (el === sheet) break;
    el = el.parentElement;
  }
  return false;
}

export function useSheetDragDismiss({
  enabled,
  sheetRef,
  backdropRef,
  onDismiss,
  mediaQuery = '(max-width: 1023px)',
}: Options) {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!enabled) return;
    const sheet = sheetRef.current;
    if (!sheet) return;

    let state: 'idle' | 'pending' | 'drag' | 'ignore' = 'idle';
    let startX = 0;
    let startY = 0;
    let dy = 0;
    let height = 1;
    let samples: Array<{ y: number; t: number }> = [];

    const setOffset = (offset: number, animate: boolean) => {
      const reduce = prefersReducedMotion();
      const transition = animate && !reduce ? '280ms cubic-bezier(.2,.8,.2,1)' : '0s';
      sheet.style.transition = animate ? `translate ${transition}` : 'none';
      sheet.style.translate = offset ? `0 ${offset}px` : '';
      const backdrop = backdropRef?.current;
      if (backdrop) {
        backdrop.style.transition = animate ? `filter ${transition}` : 'none';
        backdrop.style.filter = offset ? `opacity(${Math.max(0, 1 - offset / height)})` : '';
      }
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || (typeof window.matchMedia === 'function' && !window.matchMedia(mediaQuery).matches)) {
        state = 'ignore';
        return;
      }
      const target = e.target as Element | null;
      if (target?.closest?.(NO_DRAG_SELECTOR) || contentScrolled(target, sheet)) {
        state = 'ignore';
        return;
      }
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      dy = 0;
      height = sheet.getBoundingClientRect().height || 1;
      samples = [{ y: t.clientY, t: e.timeStamp }];
      state = 'pending';
    };

    const onMove = (e: TouchEvent) => {
      if (state === 'idle' || state === 'ignore') return;
      const t = e.touches[0];
      const ddx = t.clientX - startX;
      const ddy = t.clientY - startY;
      if (state === 'pending') {
        if (Math.max(Math.abs(ddx), Math.abs(ddy)) < DECIDE_PX) return;
        // Down and mostly vertical → drag the sheet; anything else is a
        // scroll / carousel swipe and belongs to the content.
        if (ddy > 0 && ddy > Math.abs(ddx)) {
          state = 'drag';
          startY = t.clientY; // start moving from here so the sheet doesn't jump
        } else {
          state = 'ignore';
          return;
        }
      }
      if (e.cancelable) e.preventDefault();
      dy = Math.max(0, t.clientY - startY);
      samples.push({ y: t.clientY, t: e.timeStamp });
      if (samples.length > 5) samples.shift();
      setOffset(dy, false);
    };

    const onEnd = () => {
      if (state !== 'drag') {
        state = 'idle';
        return;
      }
      state = 'idle';
      const first = samples[0];
      const last = samples[samples.length - 1];
      const dt = Math.max(1, last.t - first.t);
      const velocity = (last.y - first.y) / dt; // px per ms, + = downward
      const close = dy > Math.min(140, height * 0.25) || (velocity > 0.5 && dy > 24);
      if (close) {
        // Leave the sheet where the finger dropped it; the component's own
        // exit animation slides it out from there.
        onDismissRef.current();
      } else {
        setOffset(0, true);
      }
    };

    sheet.addEventListener('touchstart', onStart, { passive: true });
    sheet.addEventListener('touchmove', onMove, { passive: false });
    sheet.addEventListener('touchend', onEnd);
    sheet.addEventListener('touchcancel', onEnd);
    return () => {
      sheet.removeEventListener('touchstart', onStart);
      sheet.removeEventListener('touchmove', onMove);
      sheet.removeEventListener('touchend', onEnd);
      sheet.removeEventListener('touchcancel', onEnd);
    };
  }, [enabled, sheetRef, backdropRef, mediaQuery]);
}
