import React from 'react';
import { cn } from './cn';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Render as a different block element (e.g. `section`, `main`). */
  as?: React.ElementType;
  children?: React.ReactNode;
}

/**
 * 976px content container (Figma 8-col grid: 108px col + 16px gutter → 976px).
 * Centered, with responsive side padding (mobile margin 24px, gutter 16px).
 *
 * The width cap lives in the `--grid-max` token so screens can share one value.
 * NOTE: this is the NEW grid — the legacy `.container-premium` (1300px) is left
 * untouched; screens migrate onto this container individually later.
 */
export const Container: React.FC<ContainerProps> = ({
  as: Tag = 'div',
  className,
  children,
  ...rest
}) => (
  <Tag
    className={cn(
      'mx-auto w-full max-w-[var(--grid-max)] px-6 sm:px-4',
      className,
    )}
    {...rest}
  >
    {children}
  </Tag>
);
