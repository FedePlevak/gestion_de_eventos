import React from 'react';

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
  const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      <label
        htmlFor={inputId}
        style={{
          fontSize: 'var(--font-size-sm)',
          fontWeight: 600,
          color: 'var(--color-text-main)',
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
          padding: '0.75rem',
          borderRadius: 'var(--radius-md)',
          border: error ? '2px solid var(--color-danger-text)' : '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text-main)',
          fontSize: 'var(--font-size-base)',
          outline: 'none',
          ...style,
        }}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-help` : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-danger-text)' }}>
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={`${inputId}-help`} style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
          {helperText}
        </p>
      )}
    </div>
  );
};
