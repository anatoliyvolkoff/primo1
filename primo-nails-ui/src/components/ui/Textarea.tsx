import React, { useId } from 'react';
import { cn } from './cn';
import { FieldShell, controlBase, controlBorder } from './Field';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: React.ReactNode;
  error?: React.ReactNode;
  hint?: React.ReactNode;
  wrapperClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ id, label, error, hint, required, className, wrapperClassName, rows = 4, ...rest }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
      <FieldShell
        id={fieldId}
        label={label}
        error={error}
        hint={hint}
        required={required}
        className={wrapperClassName}
      >
        <textarea
          ref={ref}
          id={fieldId}
          rows={rows}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          className={cn(controlBase, controlBorder(!!error), 'resize-y', className)}
          {...rest}
        />
      </FieldShell>
    );
  },
);

Textarea.displayName = 'Textarea';
