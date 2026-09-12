'use client';

import React, { useState, useEffect } from 'react';

interface StageCountdownProps {
  deadlineAt: string;
  isClosed?: boolean;
  variant?: 'compact' | 'detail';
  timezone?: string;
  className?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  isExpired: boolean;
}

export const StageCountdown: React.FC<StageCountdownProps> = ({
  deadlineAt,
  isClosed = false,
  variant = 'compact',
  timezone = 'America/Montevideo',
  className = '',
}) => {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(deadlineAt));

  function calculateTimeLeft(targetIso: string): TimeLeft {
    const target = new Date(targetIso).getTime();
    if (isNaN(target)) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, isExpired: true };
    }
    const now = Date.now();
    const diff = target - now;

    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: diff, isExpired: true };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    return { days, hours, minutes, seconds, totalMs: diff, isExpired: false };
  }

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(deadlineAt));
    }, 1000);

    return () => clearInterval(timer);
  }, [deadlineAt]);

  const targetDate = new Date(deadlineAt);
  const isValidDate = !isNaN(targetDate.getTime());

  if (!isValidDate) return null;

  const formattedShortDate = targetDate.toLocaleDateString('es-UY', {
    timeZone: timezone,
    day: 'numeric',
    month: 'short',
  }) + ' ' + targetDate.toLocaleTimeString('es-UY', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
  }) + ' hs';

  const formattedLongDate = targetDate.toLocaleDateString('es-UY', {
    timeZone: timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }) + ' a las ' + targetDate.toLocaleTimeString('es-UY', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
  }) + ' hs';

  const expired = isClosed || timeLeft.isExpired;
  const isUrgent = !expired && timeLeft.days === 0 && timeLeft.hours < 2;
  const isWarning = !expired && timeLeft.days === 0 && timeLeft.hours < 12;

  // 1. Variante compacta (para tarjetas en listas / dashboard mobile)
  if (variant === 'compact') {
    if (!mounted) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 600,
            padding: '0.2rem 0.55rem',
            borderRadius: '999px',
            backgroundColor: 'rgba(100, 116, 139, 0.08)',
            color: 'var(--color-text-subtle)',
          }}
        >
          📅 Cierre: {formattedShortDate}
        </span>
      );
    }

    if (expired) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 600,
            padding: '0.2rem 0.55rem',
            borderRadius: '999px',
            backgroundColor: 'rgba(100, 116, 139, 0.1)',
            color: 'var(--color-text-subtle)',
          }}
        >
          ⌛ Plazo finalizado
        </span>
      );
    }

    // Badge con color según urgencia
    const badgeBg = isUrgent
      ? 'rgba(239, 68, 68, 0.12)'
      : isWarning
      ? 'rgba(245, 158, 11, 0.12)'
      : 'rgba(59, 130, 246, 0.1)';

    const badgeColor = isUrgent ? '#b91c1c' : isWarning ? '#b45309' : '#1d4ed8';

    let countdownText = '';
    if (timeLeft.days > 0) {
      countdownText = `${timeLeft.days}d ${timeLeft.hours}h restantes`;
    } else if (timeLeft.hours > 0) {
      countdownText = `${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s`;
    } else {
      countdownText = `${timeLeft.minutes}m ${timeLeft.seconds}s restantes`;
    }

    return (
      <span
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          fontSize: 'var(--font-size-xs)',
          fontWeight: 700,
          padding: '0.22rem 0.6rem',
          borderRadius: '999px',
          backgroundColor: badgeBg,
          color: badgeColor,
          whiteSpace: 'nowrap',
        }}
        title={`Cierre programado: ${formattedLongDate}`}
      >
        <span>{isUrgent ? '🚨' : '⏳'}</span>
        <span>{countdownText}</span>
      </span>
    );
  }

  // 2. Variante detallada (banner interactivo first-mobile dentro de la etapa)
  return (
    <div
      className={className}
      style={{
        borderRadius: 'var(--radius-lg)',
        border: expired
          ? '1px solid var(--color-border)'
          : isUrgent
          ? '1px solid #f87171'
          : isWarning
          ? '1px solid #fbbf24'
          : '1px solid var(--color-primary-light, #bfdbfe)',
        backgroundColor: expired
          ? 'rgba(100, 116, 139, 0.04)'
          : isUrgent
          ? 'rgba(254, 242, 242, 0.8)'
          : isWarning
          ? 'rgba(255, 251, 235, 0.8)'
          : 'rgba(239, 246, 255, 0.8)',
        padding: 'var(--spacing-3) var(--spacing-4)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--spacing-2)',
        textAlign: 'center',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span style={{ fontSize: '1.1rem' }}>{expired ? '⌛' : isUrgent ? '🚨' : '⏰'}</span>
        <span
          style={{
            fontSize: 'var(--font-size-xs)',
            fontWeight: 800,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: expired ? 'var(--color-text-subtle)' : isUrgent ? '#b91c1c' : isWarning ? '#b45309' : 'var(--color-primary)',
          }}
        >
          {expired
            ? 'Plazo de participación cerrado'
            : isUrgent
            ? '¡Último momento para votar!'
            : 'Tiempo restante para participar'}
        </span>
      </div>

      {!expired ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.35rem',
            width: '100%',
            maxWidth: '340px',
            margin: '0.2rem 0',
          }}
        >
          {/* Bloque Días */}
          <div
            style={{
              flex: 1,
              minWidth: '52px',
              padding: '0.35rem 0.25rem',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div
              style={{
                fontSize: '1.4rem',
                fontWeight: 800,
                lineHeight: 1.1,
                color: isUrgent ? '#b91c1c' : 'var(--color-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {String(timeLeft.days).padStart(2, '0')}
            </div>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--color-text-subtle)', marginTop: '2px' }}>
              DÍAS
            </div>
          </div>

          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-text-subtle)' }}>:</span>

          {/* Bloque Horas */}
          <div
            style={{
              flex: 1,
              minWidth: '52px',
              padding: '0.35rem 0.25rem',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div
              style={{
                fontSize: '1.4rem',
                fontWeight: 800,
                lineHeight: 1.1,
                color: isUrgent ? '#b91c1c' : 'var(--color-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {String(timeLeft.hours).padStart(2, '0')}
            </div>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--color-text-subtle)', marginTop: '2px' }}>
              HORAS
            </div>
          </div>

          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-text-subtle)' }}>:</span>

          {/* Bloque Minutos */}
          <div
            style={{
              flex: 1,
              minWidth: '52px',
              padding: '0.35rem 0.25rem',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div
              style={{
                fontSize: '1.4rem',
                fontWeight: 800,
                lineHeight: 1.1,
                color: isUrgent ? '#b91c1c' : 'var(--color-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {String(timeLeft.minutes).padStart(2, '0')}
            </div>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--color-text-subtle)', marginTop: '2px' }}>
              MIN
            </div>
          </div>

          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-text-subtle)' }}>:</span>

          {/* Bloque Segundos */}
          <div
            style={{
              flex: 1,
              minWidth: '52px',
              padding: '0.35rem 0.25rem',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div
              style={{
                fontSize: '1.4rem',
                fontWeight: 800,
                lineHeight: 1.1,
                color: isUrgent ? '#b91c1c' : 'var(--color-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {String(timeLeft.seconds).padStart(2, '0')}
            </div>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--color-text-subtle)', marginTop: '2px' }}>
              SEG
            </div>
          </div>
        </div>
      ) : (
        <p style={{ margin: '0.2rem 0', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', fontWeight: 600 }}>
          Esta consulta cerró el {formattedLongDate}. Ya no se admiten nuevas respuestas.
        </p>
      )}

      <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
        📅 Cierre fijado: <strong>{formattedLongDate}</strong>
      </p>
    </div>
  );
};
