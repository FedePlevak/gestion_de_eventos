import React, { useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  id,
  className = '',
  style,
  ...props
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;
  const helpId = `${inputId}-help`;

  const describedBy = error ? errorId : helperText ? helpId : undefined;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-1)',
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
      }}
    >
      <label
        htmlFor={inputId}
        style={{
          fontSize: 'var(--font-size-sm)',
          fontWeight: 600,
          color: 'var(--color-text-main)',
          lineHeight: 'var(--line-height-normal)',
        }}
      >
        {label}
      </label>

      <input
        id={inputId}
        style={{
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          minWidth: 0,
          minHeight: 'var(--touch-target-min)',
          padding: '0.75rem 0.875rem',
          borderRadius: 'var(--radius-md)',
          border: error
            ? '2px solid var(--color-danger-text)'
            : '1px solid var(--color-control-border)',
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text-main)',
          fontSize: 'var(--font-size-base)',
          lineHeight: 'var(--line-height-normal)',
          fontFamily: 'inherit',
          ...style,
        }}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={className}
        {...props}
      />

      {error && (
        <p
          id={errorId}
          role="alert"
          style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-danger-text)',
            fontWeight: 600,
            margin: 0,
            lineHeight: 'var(--line-height-normal)',
          }}
        >
          {error}
        </p>
      )}

      {!error && helperText && (
        <p
          id={helpId}
          style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-subtle)',
            margin: 0,
            lineHeight: 'var(--line-height-normal)',
          }}
        >
          {helperText}
        </p>
      )}
    </div>
  );
};
