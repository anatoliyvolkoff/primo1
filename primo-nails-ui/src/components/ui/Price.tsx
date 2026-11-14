import React from 'react';
import { cn } from './cn';

export interface PriceProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Current (possibly discounted) price, pre-formatted (e.g. "€19,90"). */
  current: React.ReactNode;
  /** Original price shown struck-through when a discount is active. */
  original?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizes: Record<NonNullable<PriceProps['size']>, string> = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-2xl',
};

/**
 * Product price atom (Figma):
 *   - current: Gotham Black (900), letter-spacing .05em; red #FF0000 (sale-price)
 *     when discounted, otherwise foreground.
 *   - old price: same weight, 50% black, strikethrough.
 */
export const Price: React.FC<PriceProps> = ({
  current,
  original,
  size = 'md',
  className,
  ...rest
}) => {
  const onSale = original != null && original !== '';
  return (
    <div className={cn('flex items-baseline gap-2', className)} {...rest}>
      <span
        className={cn(
          'whitespace-nowrap font-sans font-black tracking-[0.05em]',
          sizes[size],
          onSale ? 'text-sale-price' : 'text-foreground',
        )}
      >
        {current}
      </span>
      {onSale && (
        <span
          className={cn(
            'whitespace-nowrap font-sans font-black tracking-[0.05em] text-muted-foreground line-through',
            size === 'lg' ? 'text-lg' : size === 'md' ? 'text-sm' : 'text-xs',
          )}
        >
          {original}
        </span>
      )}
    </div>
  );
};
