import React from 'react';
import { motion } from 'motion/react';
import { cn } from './cn';

export interface SegmentedTabOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface SegmentedTabsProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: Array<SegmentedTabOption<T>>;
  className?: string;
  /**
   * Extra classes applied to every tab button. Used e.g. to make each tab
   * fill its grid cell on desktop (`lg:w-full lg:px-0`) when the container is
   * laid out as a fixed-width CSS grid rather than content-sized inline-flex.
   */
  buttonClassName?: string;
  'aria-label'?: string;
}

// Unique layoutId per control instance so multiple SegmentedTabs on one page
// animate their own pill (shared ids would make pills jump between controls).
let pillSeq = 0;

/**
 * Controlled segmented pill control (Figma):
 *   - track  #F2F2F2 (tab-track)
 *   - active pill: black bg, white text (a single sliding pill — the prototype's
 *     `.tab-pill` — animated between cells via motion `layoutId`)
 *   - inactive: transparent, black text; hover bg #D9D9D9 (tab-hover)
 *   - label: Gotham Medium 500 / 14; pill padding 0 36px, height 40, gap 8.
 */
export function SegmentedTabs<T extends string = string>({
  value,
  onChange,
  options,
  className,
  buttonClassName,
  'aria-label': ariaLabel,
}: SegmentedTabsProps<T>) {
  // Stable per-instance id for the shared-layout pill animation.
  const pillId = React.useMemo(() => `segmented-pill-${pillSeq++}`, []);
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-2 rounded-pill bg-tab-track p-1',
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            disabled={opt.disabled}
            onClick={() => !opt.disabled && onChange(opt.value)}
            className={cn(
              'relative inline-flex h-10 items-center justify-center rounded-pill px-9',
              'font-sans text-sm font-medium leading-none',
              'transition-[color,background-color,scale] duration-200 active:scale-[0.96]',
              'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-tab-track',
              'disabled:opacity-40 disabled:pointer-events-none',
              // The pill carries the active background; text color still toggles
              // here. Hover tint only applies to inactive tabs.
              active ? 'text-primary-foreground' : 'bg-transparent text-primary hover:bg-tab-hover',
              buttonClassName,
            )}
          >
            {active && (
              <motion.span
                layoutId={pillId}
                aria-hidden="true"
                className="absolute inset-0 rounded-pill bg-primary"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
