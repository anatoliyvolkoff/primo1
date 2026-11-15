import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from './cn';

/** Press feedback for the − / + buttons (scale dips on tap/click). */
const STEP_BTN_FX =
  'transition-[color,opacity,scale] duration-150 active:scale-[0.85] [-webkit-tap-highlight-color:transparent]';

/**
 * Circled thin-stroke stepper glyphs — a faithful copy of the prototype's
 * `.stepper button svg` (a `r=10` circle + a `−` / `+` path). This is the
 * SINGLE source for the glyphs that ProductDetail (inline, stroke 0.9) and
 * QuickViewModal (stroke 1.5) previously each defined/inlined. The stroke width
 * differs per call-site (prototype parity — the PDP inline stepper draws a
 * hairline 0.9, the modal a 1.5), so it is a prop, not a constant.
 */
export const CircleMinus: React.FC<{ className?: string; strokeWidth?: number }> = ({
  className,
  strokeWidth = 1.5,
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M8 12h8" />
  </svg>
);

export const CirclePlus: React.FC<{ className?: string; strokeWidth?: number }> = ({
  className,
  strokeWidth = 1.5,
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M8 12h8M12 8v8" />
  </svg>
);

export type QtyStepperGlyph = 'circle' | 'lucide';

export interface QtyStepperProps {
  /** Current quantity (rendered verbatim). */
  value: number;
  /** Decrement handler (the call-site owns the clamp, e.g. Math.max(1, q-1)). */
  onDecrement: () => void;
  /** Increment handler (the call-site owns any cap, e.g. Math.min(99, q+1)). */
  onIncrement: () => void;
  decrementLabel: string;
  incrementLabel: string;
  /** `circle` = prototype SVG glyphs; `lucide` = plain Minus/Plus icons. */
  glyph?: QtyStepperGlyph;
  /** Stroke width for the `circle` glyphs (0.9 PDP inline · 1.5 modal). */
  glyphStrokeWidth?: number;
  /** Class applied to each glyph (sizing, e.g. `w-11 h-11` / `h-9 w-9` / `w-4 h-4`). */
  glyphClassName?: string;
  /** Disable the decrement control. */
  decrementDisabled?: boolean;
  /** Disable the increment control. */
  incrementDisabled?: boolean;
  /** Wrapper classes (differ per call-site — kept verbatim). */
  className?: string;
  /** Classes for BOTH −/+ buttons. */
  buttonClassName?: string;
  /** Classes for the quantity readout element. */
  readoutClassName?: string;
  /** `output` or `span` for the readout element (call-site parity). */
  readoutAs?: 'output' | 'span';
  /** Optional ARIA role on the wrapper (e.g. `group`). */
  role?: string;
  /** aria-label for the wrapper (used with `role`). */
  'aria-label'?: string;
}

/**
 * Quantity stepper shared by the two ProductDetail steppers (inline + mobile
 * sticky) and the QuickViewModal stepper. Deliberately low-logic: the −/+ click
 * handlers and the disabled flags are owned by the call-site, so each consumer
 * keeps its EXACT current behaviour (no added max cap, no auto-disabled minus,
 * no a11y change). Structure is the single shared anatomy: wrapper > [− button >
 * glyph] + [readout] + [+ button > glyph].
 */
export const QtyStepper: React.FC<QtyStepperProps> = ({
  value,
  onDecrement,
  onIncrement,
  decrementLabel,
  incrementLabel,
  glyph = 'circle',
  glyphStrokeWidth,
  glyphClassName,
  decrementDisabled,
  incrementDisabled,
  className,
  buttonClassName,
  readoutClassName,
  readoutAs = 'span',
  role,
  'aria-label': ariaLabel,
}) => {
  const MinusGlyph =
    glyph === 'lucide' ? (
      <Minus className={glyphClassName} />
    ) : (
      <CircleMinus className={glyphClassName} strokeWidth={glyphStrokeWidth} />
    );
  const PlusGlyph =
    glyph === 'lucide' ? (
      <Plus className={glyphClassName} />
    ) : (
      <CirclePlus className={glyphClassName} strokeWidth={glyphStrokeWidth} />
    );

  const Readout = readoutAs;
  const readout = (
    <Readout aria-live="polite" className={readoutClassName}>
      {value}
    </Readout>
  );

  return (
    <div className={className} role={role} aria-label={ariaLabel}>
      <button
        type="button"
        aria-label={decrementLabel}
        disabled={decrementDisabled}
        onClick={onDecrement}
        className={cn(STEP_BTN_FX, buttonClassName)}
      >
        {MinusGlyph}
      </button>
      {readout}
      <button
        type="button"
        aria-label={incrementLabel}
        disabled={incrementDisabled}
        onClick={onIncrement}
        className={cn(STEP_BTN_FX, buttonClassName)}
      >
        {PlusGlyph}
      </button>
    </div>
  );
};
