import React, { useId } from 'react';
import { cn } from './cn';
import { FieldShell, controlBase, controlBorder } from './Field';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  error?: React.ReactNode;
  hint?: React.ReactNode;
  /** Extra classes on the wrapping field, not the <input>. */
  wrapperClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ id, label, error, hint, required, className, wrapperClassName, ...rest }, ref) => {
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
        <input
          ref={ref}
          id={fieldId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          className={cn(controlBase, controlBorder(!!error), className)}
          {...rest}
        />
      </FieldShell>
    );
  },
);

Input.displayName = 'Input';
