import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from './cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'wide';

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  uppercase?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  /** Render as a different element (e.g. an anchor) while keeping the styles. */
  as?: 'button' | 'a';
  href?: string;
  children?: React.ReactNode;
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-pill font-sans font-medium ' +
  'transition-[background-color,color,border-color,box-shadow,transform] duration-200 ease-out ' +
  'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 ' +
  'active:scale-[0.98] select-none';

const variants: Record<ButtonVariant, string> = {
  // Black pill — the primary action color (prototype: no hover restyle, just a
  // subtle press via the shared `active:scale-[0.98]` in `base`).
  primary:
    'bg-primary text-primary-foreground border border-primary shadow-card',
  // Outline pill — grey border/text, no hover-invert, light press fill
  // (prototype `.pill-btn`: 1.2px #444 border, #656565 text, :active #f3f3f3).
  secondary:
    'bg-transparent text-[#656565] border-[1.2px] border-[#444] ' +
    'active:bg-[#f3f3f3]',
  // Minimal, no chrome.
  ghost:
    'bg-transparent text-primary border border-transparent ' +
    'hover:bg-tab-track',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-xs',
  md: 'h-11 px-6 text-sm',
  lg: 'h-12 px-8 text-base',
  // Taller pill with wide horizontal padding (prototype `.pill-btn.wide`).
  wide: 'h-[52px] px-[60px] text-[18px]',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      uppercase = false,
      loading = false,
      fullWidth = false,
      leadingIcon,
      trailingIcon,
      as = 'button',
      className,
      disabled,
      children,
      ...rest
    },
    ref,
  ) => {
    const classes = cn(
      base,
      variants[variant],
      sizes[size],
      uppercase && 'uppercase tracking-widest',
      fullWidth && 'w-full',
      className,
    );

    const content = (
      <>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          leadingIcon
        )}
        {children}
        {!loading && trailingIcon}
      </>
    );

    if (as === 'a') {
      // Anchor variant (asChild-lite): no `disabled` attr on <a>; guard via aria.
      const { href, ...anchorRest } = rest as ButtonProps &
        React.AnchorHTMLAttributes<HTMLAnchorElement>;
      return (
        <a
          href={disabled ? undefined : href}
          aria-disabled={disabled || undefined}
          className={classes}
          {...(anchorRest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {content}
        </a>
      );
    }

    return (
      <button
        ref={ref}
        type={rest.type ?? 'button'}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={classes}
        {...rest}
      >
        {content}
      </button>
    );
  },
);

Button.displayName = 'Button';
