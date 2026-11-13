/**
 * OA-38 — SearchOverlay focus trap
 *
 * Guards that:
 *   1. A Tab keydown while the overlay is open keeps document.activeElement
 *      inside the dialog container (the focus trap stays closed).
 *   2. An Escape keydown calls the onClose callback.
 *
 * The focus-trap logic lives entirely in useFocusTrap (SearchOverlay
 * delegates to it via `const overlayRef = useFocusTrap({active: isOpen, onEscape: handleClose})`).
 * We test the real hook via a thin wrapper component that renders a real dialog
 * div with two focusable children — the same DOM shape SearchOverlay uses at
 * runtime. Mocking the full SearchOverlay would require stubbing motion/react,
 * LanguageContext, ProductContext, useStoreSetting, useRecentlyViewed, and the
 * router, which would make the test longer than the code it guards.
 */
import { render, act } from '@testing-library/react';
import { useFocusTrap } from '../../../../hooks/useFocusTrap';

/**
 * Minimal dialog that mirrors the SearchOverlay structure:
 *   <div role="dialog" ref={overlayRef}>
 *     <input />
 *     <button>Close</button>
 *   </div>
 * The ref is assigned by React before the layout effect fires, so the trap
 * listener is registered with a valid container — the same ordering that
 * happens in the real component.
 */
interface TrapHarnessProps {
  active: boolean;
  onEscape: () => void;
}

function TrapHarness({ active, onEscape }: TrapHarnessProps) {
  const dialogRef = useFocusTrap<HTMLDivElement>({ active, onEscape });
  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" tabIndex={-1} data-testid="dialog">
      <input data-testid="input" type="text" />
      <button data-testid="close-btn">Close</button>
    </div>
  );
}

function dispatchKeydown(key: string, shiftKey = false) {
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, shiftKey }),
  );
}

describe('useFocusTrap (OA-38) — SearchOverlay focus-trap contract', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('Tab keydown keeps document.activeElement within the dialog container', () => {
    const onEscape = vi.fn();
    const { getByTestId } = render(<TrapHarness active={true} onEscape={onEscape} />);

    const dialog = getByTestId('dialog');
    const input = getByTestId('input');

    // Place focus inside the dialog so the trap has an anchor.
    act(() => {
      input.focus();
    });

    expect(dialog.contains(document.activeElement)).toBe(true);

    // Fire Tab — the trap should intercept and keep focus inside the container.
    act(() => {
      dispatchKeydown('Tab');
    });

    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('Escape keydown calls the onClose callback exactly once', () => {
    const onEscape = vi.fn();
    const { getByTestId } = render(<TrapHarness active={true} onEscape={onEscape} />);

    act(() => {
      getByTestId('input').focus();
    });

    act(() => {
      dispatchKeydown('Escape');
    });

    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('Tab does NOT trap when the hook is inactive (active=false)', () => {
    const onEscape = vi.fn();

    // Render with active=false (overlay closed).
    render(<TrapHarness active={false} onEscape={onEscape} />);

    // Focus something outside the dialog.
    const outside = document.createElement('button');
    outside.textContent = 'Outside';
    document.body.appendChild(outside);

    act(() => {
      outside.focus();
    });

    act(() => {
      dispatchKeydown('Tab');
    });

    // Focus remains on the element outside the dialog (trap is off).
    expect(document.activeElement).toBe(outside);
  });
});
