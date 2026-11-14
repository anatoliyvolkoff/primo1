import React from 'react';
import { cn } from './cn';

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type HeadingSize = 'display' | 'xl' | 'lg' | 'md' | 'sm';

export interface HeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: HeadingLevel;
  size?: HeadingSize;
  children?: React.ReactNode;
}

const sizeClasses: Record<HeadingSize, string> = {
  display: 'text-[clamp(32px,6vw,48px)] font-bold leading-none',
  xl: 'text-3xl sm:text-4xl font-bold leading-tight',
  lg: 'text-2xl sm:text-3xl font-bold leading-tight',
  md: 'text-xl sm:text-2xl font-semibold leading-snug',
  sm: 'text-lg font-semibold leading-snug',
};

/**
 * Typography helper bound to the heading scale. Uses Gotham (`--font-sans`) per
 * the client rule — Montserrat is only for `SectionTitle`. Pick `level` for
 * semantics and `size` for visual weight independently.
 */
export const Heading: React.FC<HeadingProps> = ({
  level = 2,
  size = 'lg',
  className,
  children,
  ...rest
}) => {
  const Tag = `h${level}` as const;
  return (
    <Tag
      className={cn('font-sans tracking-tight text-card-foreground', sizeClasses[size], className)}
      {...rest}
    >
      {children}
    </Tag>
  );
};
