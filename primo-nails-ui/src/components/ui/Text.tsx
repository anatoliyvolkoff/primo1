import React from 'react';
import { cn } from './cn';

export type TextSize = 'xs' | 'sm' | 'base' | 'lg';
export type TextTone = 'default' | 'muted' | 'inverse';

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'p' | 'span' | 'div' | 'label';
  size?: TextSize;
  tone?: TextTone;
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  children?: React.ReactNode;
}

const sizeClasses: Record<TextSize, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
};

const toneClasses: Record<TextTone, string> = {
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  inverse: 'text-primary-foreground',
};

const weightClasses = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
} as const;

/**
 * Body-copy helper bound to the type scale. Gotham throughout.
 */
export const Text: React.FC<TextProps> = ({
  as: Tag = 'p',
  size = 'base',
  tone = 'default',
  weight = 'normal',
  className,
  children,
  ...rest
}) => (
  <Tag
    className={cn(
      'font-sans leading-relaxed',
      sizeClasses[size],
      toneClasses[tone],
      weightClasses[weight],
      className,
    )}
    {...rest}
  >
    {children}
  </Tag>
);
