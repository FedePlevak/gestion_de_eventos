import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: React.CSSProperties;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  style,
  className = '',
}) => {
  const stylesByVariant: Record<BadgeVariant, React.CSSProperties> = {
    success: {
      backgroundColor: 'var(--color-success-bg)',
      borderColor: 'var(--color-success-border)',
      color: 'var(--color-success-text)',
    },
    warning: {
      backgroundColor: 'var(--color-warning-bg)',
      borderColor: 'var(--color-warning-border)',
      color: 'var(--color-warning-text)',
    },
    danger: {
      backgroundColor: 'var(--color-danger-bg)',
      borderColor: 'var(--color-danger-border)',
      color: 'var(--color-danger-text)',
    },
    info: {
      backgroundColor: 'var(--color-info-bg)',
      borderColor: 'var(--color-info-border)',
      color: 'var(--color-info-text)',
    },
    neutral: {
      backgroundColor: 'var(--color-surface-subtle)',
      borderColor: 'var(--color-border)',
      color: 'var(--color-text-main)',
    },
  };

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.25rem 0.625rem',
        borderRadius: 'var(--radius-full)',
        fontSize: 'var(--font-size-xs)',
        fontWeight: 600,
        lineHeight: 1.3,
        border: '1px solid transparent',
        wordBreak: 'break-word',
        maxWidth: '100%',
        ...stylesByVariant[variant],
        ...style,
      }}
    >
      {children}
    </span>
  );
};
