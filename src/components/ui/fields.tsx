'use client';

import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

interface FieldShellProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

/** Etiqueta siempre visible arriba, error vinculado con aria-describedby. */
function FieldShell({ id, label, error, hint, required, children, className }: FieldShellProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={id} className="text-content text-sm font-medium">
        {label}
        {required && (
          <span aria-hidden="true" className="text-danger">
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-content-muted text-xs">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

const controlClass = (error?: string, extra?: string): string =>
  cn(
    'min-h-12 w-full rounded-lg border bg-surface px-3 py-2 text-base text-content placeholder:text-content-disabled',
    'focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/20',
    'disabled:bg-background disabled:text-content-muted',
    error ? 'border-danger' : 'border-border',
    extra,
  );

const describedBy = (id: string, error?: string, hint?: string): string | undefined =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

export interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(function InputField(
  { label, error, hint, required, id, className, containerClassName, ...rest },
  ref,
) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <FieldShell
      id={fieldId}
      label={label}
      error={error}
      hint={hint}
      required={required}
      className={containerClassName}
    >
      <input
        ref={ref}
        id={fieldId}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(fieldId, error, hint)}
        required={required}
        className={controlClass(error, className)}
        {...rest}
      />
    </FieldShell>
  );
});

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  options: Array<{ value: string | number; label: string }>;
  containerClassName?: string;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  {
    label,
    error,
    hint,
    required,
    id,
    className,
    options,
    placeholder,
    containerClassName,
    ...rest
  },
  ref,
) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <FieldShell
      id={fieldId}
      label={label}
      error={error}
      hint={hint}
      required={required}
      className={containerClassName}
    >
      <select
        ref={ref}
        id={fieldId}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(fieldId, error, hint)}
        required={required}
        className={controlClass(error, className)}
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
});

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
  currentLength?: number;
  containerClassName?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  {
    label,
    error,
    hint,
    required,
    id,
    className,
    maxLength,
    currentLength,
    containerClassName,
    ...rest
  },
  ref,
) {
  const generated = useId();
  const fieldId = id ?? generated;
  const counter =
    maxLength !== undefined && currentLength !== undefined
      ? `${currentLength}/${maxLength}`
      : undefined;
  return (
    <FieldShell
      id={fieldId}
      label={label}
      error={error}
      hint={counter ? `${hint ? `${hint} · ` : ''}${counter}` : hint}
      required={required}
      className={containerClassName}
    >
      <textarea
        ref={ref}
        id={fieldId}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(fieldId, error, hint)}
        required={required}
        maxLength={maxLength}
        className={controlClass(error, cn('min-h-28 resize-y', className))}
        {...rest}
      />
    </FieldShell>
  );
});

/** Selector de fecha nativo con formato único (DateField del catálogo). */
export const DateField = forwardRef<HTMLInputElement, Omit<InputFieldProps, 'type'>>(
  function DateField(props, ref) {
    return <InputField ref={ref} type="date" {...props} />;
  },
);
