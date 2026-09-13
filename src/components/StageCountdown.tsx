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

  const formattedShortDate =
    targetDate.toLocaleDateString('es-UY', {
      timeZone: timezone,
      day: 'numeric',
      month: 'short',
    }) +
    ', ' +
    targetDate.toLocaleTimeString('es-UY', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
    }) +
    ' h';

  const formattedLongDate =
    targetDate.toLocaleDateString('es-UY', {
      timeZone: timezone,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }) +
    ' a las ' +
    targetDate.toLocaleTimeString('es-UY', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
    }) +
    ' h';

  const expired = isClosed || timeLeft.isExpired;
  const isUrgent = !expired && timeLeft.days === 0 && timeLeft.hours < 2;
  const isWarning = !expired && timeLeft.days === 0 && timeLeft.hours < 12;

  // 1. Variante compacta (para tarjetas en listas / resumen mobile)
  if (variant === 'compact') {
    if (!mounted) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 600,
            padding: '0.2rem 0.55rem',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-surface-subtle)',
            color: 'var(--color-text-subtle)',
          }}
        >
          Cierre: {formattedShortDate}
        </span>
      );
    }

    if (isClosed) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 600,
            padding: '0.2rem 0.55rem',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-surface-subtle)',
            color: 'var(--color-text-subtle)',
          }}
        >
          Consulta cerrada
        </span>
      );
    }

    if (expired) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 600,
            padding: '0.2rem 0.55rem',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-warning-bg)',
            color: 'var(--color-warning-text)',
          }}
        >
          Plazo finalizado
        </span>
      );
    }

    const badgeBg = isUrgent
      ? 'var(--color-danger-bg)'
      : isWarning
      ? 'var(--color-warning-bg)'
      : 'var(--color-primary-light)';

    const badgeColor = isUrgent
      ? 'var(--color-danger-text)'
      : isWarning
      ? 'var(--color-warning-text)'
      : 'var(--color-primary)';

    let countdownText = '';
    if (timeLeft.days > 0) {
      countdownText = `${timeLeft.days} d ${timeLeft.hours} h restantes`;
    } else if (timeLeft.hours > 0) {
      countdownText = `${timeLeft.hours} h ${timeLeft.minutes} m restantes`;
    } else {
      countdownText = `${timeLeft.minutes} m ${timeLeft.seconds} s restantes`;
    }

    return (
      <span
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          fontSize: 'var(--font-size-xs)',
          fontWeight: 600,
          padding: '0.2rem 0.55rem',
          borderRadius: 'var(--radius-full)',
          backgroundColor: badgeBg,
          color: badgeColor,
          whiteSpace: 'nowrap',
        }}
        title={`Cierre programado: ${formattedLongDate}`}
      >
        {countdownText}
      </span>
    );
  }

  // 2. Variante detallada
  return (
    <div
      className={className}
      style={{
        borderRadius: 'var(--radius-lg)',
        border: isClosed || expired
          ? '1px solid var(--color-border)'
          : isUrgent
          ? '1px solid var(--color-danger-border)'
          : isWarning
          ? '1px solid var(--color-warning-border)'
          : '1px solid var(--color-border)',
        backgroundColor: isClosed || expired
          ? 'var(--color-surface-subtle)'
          : isUrgent
          ? 'var(--color-danger-bg)'
          : isWarning
          ? 'var(--color-warning-bg)'
          : 'var(--color-primary-light)',
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
        <strong
          style={{
            fontSize: 'var(--font-size-sm)',
            color: isClosed || expired
              ? 'var(--color-text-subtle)'
              : isUrgent
              ? 'var(--color-danger-text)'
              : isWarning
              ? 'var(--color-warning-text)'
              : 'var(--color-primary)',
          }}
        >
          {isClosed
            ? 'Consulta cerrada'
            : expired
            ? 'Plazo finalizado'
            : isUrgent
            ? 'Últimas horas para responder'
            : 'Tiempo disponible para responder'}
        </strong>
      </div>

      {!expired ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.35rem',
            width: '100%',
            maxWidth: '320px',
            margin: '0.2rem 0',
          }}
        >
          {/* Días */}
          <div
            style={{
              flex: 1,
              padding: '0.35rem 0.25rem',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--color-text-main)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {String(timeLeft.days).padStart(2, '0')}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-subtle)' }}>
              días
            </div>
          </div>

          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-subtle)' }}>:</span>

          {/* Horas */}
          <div
            style={{
              flex: 1,
              padding: '0.35rem 0.25rem',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--color-text-main)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {String(timeLeft.hours).padStart(2, '0')}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-subtle)' }}>
              horas
            </div>
          </div>

          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-subtle)' }}>:</span>

          {/* Minutos */}
          <div
            style={{
              flex: 1,
              padding: '0.35rem 0.25rem',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--color-text-main)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {String(timeLeft.minutes).padStart(2, '0')}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-subtle)' }}>
              min
            </div>
          </div>
        </div>
      ) : (
        <p style={{ margin: '0.2rem 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
          {isClosed
            ? 'El comité cerró la recepción de respuestas.'
            : 'El plazo fijado ha concluido. Podés consultar lo que quedó guardado.'}
        </p>
      )}

      <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
        Fecha de cierre: <strong>{formattedLongDate}</strong>
      </p>
    </div>
  );
};
