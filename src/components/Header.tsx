import React from 'react';
import Link from 'next/link';

interface HeaderProps {
  eventName?: string;
  userBadge?: string;
  isOrganizer?: boolean;
  contextLabel?: string;
}

export const Header: React.FC<HeaderProps> = ({
  eventName,
  userBadge,
  isOrganizer = false,
  contextLabel,
}) => {
  const homeHref = isOrganizer ? '/admin' : '/';

  return (
    <header
      style={{
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        padding: 'var(--spacing-3) var(--spacing-4)',
        boxShadow: 'var(--shadow-sm)',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      <div
        style={{
          maxWidth: isOrganizer ? '1120px' : '640px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--spacing-3)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', minWidth: 0 }}>
          <Link
            href={homeHref}
            aria-label="Rondia - Ir al inicio"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/rondia/logo-principal.svg"
              alt="Rondia"
              width={120}
              height={32}
              style={{ display: 'block', height: '32px', width: 'auto' }}
            />
          </Link>

          {eventName && (
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <h1
                style={{
                  fontSize: 'var(--font-size-base)',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                  lineHeight: 'var(--line-height-tight)',
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '260px',
                }}
                title={eventName}
              >
                {eventName}
              </h1>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)', lineHeight: 1.2 }}>
                {contextLabel ? contextLabel : isOrganizer ? 'Organización' : 'Espacio familiar'}
              </span>
            </div>
          )}
        </div>

        {userBadge && (
          <div
            style={{
              backgroundColor: isOrganizer ? 'var(--color-surface-subtle)' : 'var(--color-primary-light)',
              color: isOrganizer ? 'var(--color-text-main)' : 'var(--color-primary)',
              border: `1px solid ${isOrganizer ? 'var(--color-border)' : 'var(--color-border-hover)'}`,
              padding: '0.25rem 0.625rem',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 600,
              maxWidth: '220px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={userBadge}
          >
            {userBadge}
          </div>
        )}
      </div>
    </header>
  );
};
