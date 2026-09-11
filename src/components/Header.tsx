import React from 'react';

interface HeaderProps {
  eventName?: string;
  userBadge?: string;
  isOrganizer?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ eventName, userBadge, isOrganizer = false }) => {
  return (
    <header
      style={{
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        padding: 'var(--spacing-3) var(--spacing-4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: 'var(--shadow-sm)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <h1
          style={{
            fontSize: 'var(--font-size-base)',
            fontWeight: 700,
            color: 'var(--color-primary)',
            lineHeight: 'var(--line-height-tight)',
          }}
        >
          {eventName || 'Gestión de Eventos'}
        </h1>
        {isOrganizer ? (
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
            Panel de Organización
          </span>
        ) : (
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
            Espacio Familiar
          </span>
        )}
      </div>

      {userBadge && (
        <div
          style={{
            backgroundColor: isOrganizer ? 'var(--color-surface-subtle)' : 'var(--color-primary-light)',
            color: isOrganizer ? 'var(--color-text-main)' : 'var(--color-primary)',
            padding: '0.25rem 0.625rem',
            borderRadius: 'var(--radius-full)',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 600,
            maxWidth: '200px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {userBadge}
        </div>
      )}
    </header>
  );
};
