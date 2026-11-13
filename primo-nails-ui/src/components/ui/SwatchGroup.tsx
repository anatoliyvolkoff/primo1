import React from 'react';
import { cn } from './cn';

export interface SwatchGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Required accessible name for the radiogroup. */
  'aria-label': string;
  children?: React.ReactNode;
}

/**
 * Wrapper for a row of `<Swatch>` controls.
 *
 * Each `Swatch` renders `role="radio"`; per the ARIA spec those radios must be
 * owned by a `role="radiogroup"` container with an accessible name. This tiny
 * wrapper supplies that grouping so the shade selector is announced correctly.
 */
export const SwatchGroup: React.FC<SwatchGroupProps> = ({
  className,
  children,
  ...rest
}) => (
  <div role="radiogroup" className={cn(className)} {...rest}>
    {children}
  </div>
);
