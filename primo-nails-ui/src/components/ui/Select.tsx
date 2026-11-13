import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from './cn';
import { FieldShell, controlBase, controlBorder } from './Field';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: React.ReactNode;
  error?: React.ReactNode;
  hint?: React.ReactNode;
  wrapperClassName?: string;
  options?: SelectOption[];
  placeholder?: string;
  children?: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    { id, label, error, hint, required, className, wrapperClassName, options, placeholder, children, ...rest },
    ref,
  ) => {
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
        <div className="relative">
          <select
            ref={ref}
            id={fieldId}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
            className={cn(controlBase, controlBorder(!!error), 'appearance-none pr-10', className)}
            {...rest}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options
              ? options.map((o) => (
                  <option key={o.value} value={o.value} disabled={o.disabled}>
                    {o.label}
                  </option>
                ))
              : children}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
      </FieldShell>
    );
  },
);

Select.displayName = 'Select';
