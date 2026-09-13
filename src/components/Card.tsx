import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  titleLevel?: 'h2' | 'h3' | 'h4';
  style?: React.CSSProperties;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  action,
  titleLevel = 'h3',
  style,
  className = '',
  onClick,
}) => {
  const TitleTag = titleLevel;

  const handleKeyDown = onClick
    ? (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }
    : undefined;

  return (
    <article
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
        padding: 'var(--spacing-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-3)',
        transition: 'border-color var(--transition-speed), box-shadow var(--transition-speed)',
        cursor: onClick ? 'pointer' : 'default',
        boxSizing: 'border-box',
        ...style,
      }}
      className={className}
    >
      {(title || action) && (
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 'var(--spacing-2)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            {title && (
              <TitleTag
                style={{
                  fontSize: 'var(--font-size-lg)',
                  fontWeight: 700,
                  color: 'var(--color-text-main)',
                  lineHeight: 'var(--line-height-tight)',
                  margin: 0,
                  wordBreak: 'break-word',
                }}
              >
                {title}
              </TitleTag>
            )}
            {subtitle && (
              <div
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-subtle)',
                  marginTop: 'var(--spacing-1)',
                  lineHeight: 'var(--line-height-normal)',
                }}
              >
                {subtitle}
              </div>
            )}
          </div>
          {action && <div style={{ flexShrink: 0 }}>{action}</div>}
        </header>
      )}
      <div style={{ minWidth: 0 }}>{children}</div>
    </article>
  );
};
