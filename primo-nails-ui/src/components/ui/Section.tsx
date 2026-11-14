import React from 'react';
import { cn } from './cn';
import { Container } from './Container';

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  /** Vertical rhythm size. */
  spacing?: 'sm' | 'md' | 'lg';
  /** Wrap children in the 976px Container (default true). */
  contained?: boolean;
  children?: React.ReactNode;
}

const spacings: Record<NonNullable<SectionProps['spacing']>, string> = {
  sm: 'py-10 sm:py-14',
  md: 'py-14 sm:py-20',
  lg: 'py-20 sm:py-28',
};

/**
 * A vertical section band with consistent top/bottom rhythm. Optionally centers
 * its content in the 976px grid Container.
 */
export const Section: React.FC<SectionProps> = ({
  spacing = 'md',
  contained = true,
  className,
  children,
  ...rest
}) => (
  <section className={cn(spacings[spacing], className)} {...rest}>
    {contained ? <Container>{children}</Container> : children}
  </section>
);
