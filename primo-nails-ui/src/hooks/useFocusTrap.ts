import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface UseFocusTrapOptions {
  active: boolean;
  onEscape?: () => void;
  returnFocus?: boolean;
}

const getFocusables = (container: HTMLElement): HTMLElement[] => {
  const nodes = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
  const result: HTMLElement[] = [];
  nodes.forEach(el => {
    if (!el.hasAttribute('disabled') && el.offsetParent !== null) {
      result.push(el);
    }
  });
  return result;
};

export function useFocusTrap<T extends HTMLElement>({ active, onEscape, returnFocus = true }: UseFocusTrapOptions) {
  const containerRef = useRef<T | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const container = containerRef.current;
    if (!container) return;

    const focusFirst = () => {
      const focusables = getFocusables(container);
      const firstFocusable = focusables.find(el => !el.hasAttribute('data-focus-skip'));
      (firstFocusable || container).focus();
    };

    let focusTimer: number | undefined;
    if (!container.contains(document.activeElement)) {
      focusTimer = window.setTimeout(focusFirst, 20);
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onEscape) {
        event.stopPropagation();
        onEscape();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusables = getFocusables(container);

      if (focusables.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (activeEl === first || !container.contains(activeEl)) {
          event.preventDefault();
          last.focus();
        }
      } else if (activeEl === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Cancel a still-pending initial-focus timer so it can't fire (and steal
      // focus / touch a detached container) after the trap has been torn down.
      if (focusTimer !== undefined) window.clearTimeout(focusTimer);
      const toRestore = previouslyFocused.current;
      previouslyFocused.current = null;
      if (returnFocus && toRestore && document.body.contains(toRestore)) {
        toRestore.focus();
      }
    };
  }, [active, onEscape, returnFocus]);

  return containerRef;
}
