import React from 'react';
import { cn } from './cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 16px (`md`, default) or 20px (`lg`) corner radius. */
  radius?: 'md' | 'lg';
  /** Add the interactive hover lift. */
  interactive?: boolean;
  children?: React.ReactNode;
}

/**
 * White surface, 1px border, soft card shadow — the Figma base card.
 */
export const Card: React.FC<CardProps> = ({
  radius = 'md',
  interactive = false,
  className,
  children,
  ...rest
}) => (
  <div
    className={cn(
      'bg-card text-card-foreground border border-border shadow-card',
      radius === 'lg' ? 'rounded-[20px]' : 'rounded-[16px]',
      interactive &&
        'transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-elevated',
      className,
    )}
    {...rest}
  >
    {children}
  </div>
);
