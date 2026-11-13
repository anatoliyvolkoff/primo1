import { useEffect } from 'react';

// Refcounted body scroll-lock shared by every overlay (cart, search, filter
// sheet, quick-view, season modal, newsletter, mobile menu). Without a shared
// counter, each modal set/cleared `documentElement.style.overflow`
// independently, so closing one would unlock the page while another was still
// open — or leave scroll stuck. Here the page is locked while ANY consumer is
// active and only restored once the last one releases.

let count = 0;
let prevOverflow = '';
let prevPaddingRight = '';
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function lockScroll() {
  if (count === 0) {
    const el = document.documentElement;
    // Compensate for the disappearing scrollbar so the page doesn't shift
    // (the "shake" when opening the cart/search on desktop). Add padding
    // equal to the scrollbar width before hiding overflow.
    const scrollbarWidth = window.innerWidth - el.clientWidth;
    prevOverflow = el.style.overflow;
    prevPaddingRight = el.style.paddingRight;
    if (scrollbarWidth > 0) {
      el.style.paddingRight = `${scrollbarWidth}px`;
      // Expose the compensation so position:fixed elements (the header) — which
      // are laid out against the viewport and ignore the html padding above —
      // can shift in lockstep with the body instead of jumping when the
      // scrollbar disappears.
      el.style.setProperty('--scrollbar-comp', `${scrollbarWidth}px`);
    }
    el.style.overflow = 'hidden';
  }
  count += 1;
  notify();
}

export function unlockScroll() {
  count = Math.max(0, count - 1);
  if (count === 0) {
    const el = document.documentElement;
    el.style.overflow = prevOverflow;
    el.style.paddingRight = prevPaddingRight;
    el.style.removeProperty('--scrollbar-comp');
  }
  notify();
}

/** True while at least one overlay holds the lock. */
export function isScrollLocked() {
  return count > 0;
}

/** Subscribe to lock/unlock changes; returns an unsubscribe fn. */
export function subscribeScrollLock(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Lock the page scroll while `active` is true; auto-releases on cleanup. */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lockScroll();
    return () => unlockScroll();
  }, [active]);
}
