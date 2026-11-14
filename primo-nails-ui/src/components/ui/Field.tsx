import React from 'react';
import { cn } from './cn';

/**
 * Shared label + error scaffolding for Input / Select / Textarea. Keeps the
 * three field primitives visually consistent without repeating markup.
 */
export interface FieldShellProps {
  id: string;
  label?: React.ReactNode;
  error?: React.ReactNode;
  hint?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const FieldShell: React.FC<FieldShellProps> = ({
  id,
  label,
  error,
  hint,
  required,
  className,
  children,
}) => (
  <div className={cn('flex flex-col gap-1.5', className)}>
    {label && (
      <label
        htmlFor={id}
        className="font-sans text-xs font-medium uppercase tracking-wide text-muted-foreground"
      >
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
    )}
    {children}
    {error ? (
      <p id={`${id}-error`} className="font-sans text-xs text-destructive">
        {error}
      </p>
    ) : hint ? (
      <p id={`${id}-hint`} className="font-sans text-xs text-muted-foreground">
        {hint}
      </p>
    ) : null}
  </div>
);

/** Base control classes shared by the text-like fields. */
export const controlBase =
  'w-full rounded-[12px] border bg-card px-4 py-2.5 font-sans text-sm text-foreground ' +
  'placeholder:text-muted-foreground/70 outline-none ' +
  'transition-[border-color,box-shadow] duration-150 ' +
  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 ' +
  'disabled:cursor-default disabled:opacity-50';

export const controlBorder = (error?: boolean) =>
  error ? 'border-destructive focus-visible:ring-destructive' : 'border-input';
