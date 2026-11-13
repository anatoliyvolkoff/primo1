import React from 'react';
import { cn } from './cn';

export type BadgeVariant = 'sale' | 'new' | 'hit' | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children?: React.ReactNode;
}

const variants: Record<BadgeVariant, string> = {
  // Discount/sale badge — red #fe3c3c (--badge-sale), compact 11px/600 pill
  // ~16px tall to match the prototype `.disc`.
  sale: 'bg-badge-sale text-badge-sale-foreground h-4 px-[9px] text-[11px] font-semibold',
  new: 'bg-badge-new text-badge-new-foreground px-3 py-1 text-xs font-medium',
  hit: 'bg-badge-hit text-badge-hit-foreground px-3 py-1 text-xs font-medium',
  neutral: 'bg-tab-track text-foreground px-3 py-1 text-xs font-medium',
};

/**
 * Small pill label. Gotham Medium per the Figma atom; the `sale` variant
 * follows the prototype discount badge (11px/600, ~16px pill).
 */
export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  className,
  children,
  ...rest
}) => (
  <span
    className={cn(
      'inline-flex items-center rounded-pill font-sans leading-none',
      variants[variant],
      className,
    )}
    {...rest}
  >
    {children}
  </span>
);
