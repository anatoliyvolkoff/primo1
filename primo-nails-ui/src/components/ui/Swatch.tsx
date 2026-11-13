import React from 'react';
import { cn } from './cn';

export interface SwatchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  /** Solid CSS color for the swatch fill. */
  color?: string;
  /** Image URL for the swatch fill (takes precedence over `color`). */
  image?: string;
  selected?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizes: Record<NonNullable<SwatchProps['size']>, string> = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
};

/**
 * Color swatch (Figma):
 *   - circle; selected → 2px black border + soft shadow.
 *   - unselected → 1px #E2E2E2 (swatch-border).
 */
export const Swatch: React.FC<SwatchProps> = ({
  color,
  image,
  selected = false,
  size = 'md',
  className,
  style,
  ...rest
}) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    className={cn(
      'rounded-full bg-cover bg-center bg-no-repeat transition-all duration-200',
      'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'hover:scale-105 active:scale-95',
      sizes[size],
      selected
        ? 'border-2 border-primary shadow-card'
        : 'border border-swatch-border',
      className,
    )}
    style={{
      ...(image ? { backgroundImage: `url(${image})` } : (color?.includes('gradient') ? { background: color } : { backgroundColor: color })),
      ...style,
    }}
    {...rest}
  />
);

export interface SwatchMoreChipProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  count: number;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * "+N" overflow chip: 1px #6E6E6E (chip-border) border, text #646464 (chip-text).
 */
export const SwatchMoreChip: React.FC<SwatchMoreChipProps> = ({
  count,
  size = 'md',
  className,
  ...rest
}) => (
  <button
    type="button"
    className={cn(
      'inline-flex items-center justify-center rounded-full border border-chip-border',
      'font-sans text-xs font-medium text-chip-text transition-all duration-200',
      'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'hover:scale-105 active:scale-95',
      sizes[size],
      className,
    )}
    {...rest}
  >
    +{count}
  </button>
);
