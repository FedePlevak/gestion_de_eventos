'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';

interface DeleteEventSectionProps {
  eventId: string;
  eventName: string;
  stageCount: number;
  participantCount: number;
}

export function DeleteEventSection({
  eventId,
  eventName,
  stageCount,
  participantCount,
}: DeleteEventSectionProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmedCheck, setConfirmedCheck] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cleanEventName = eventName.trim().toLowerCase();
  const isNameMatch = typedName.trim().toLowerCase() === cleanEventName;
  const canConfirm = confirmedCheck && isNameMatch && !isDeleting;

  const handleOpenModal = () => {
    setIsOpen(true);
    setConfirmedCheck(false);
    setTypedName('');
    setErrorMessage(null);
  };

  const handleCloseModal = () => {
    if (isDeleting) return;
    setIsOpen(false);
    setConfirmedCheck(false);
    setTypedName('');
    setErrorMessage(null);
  };

  const handleDelete = async () => {
    if (!canConfirm) return;
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/admin/events/${encodeURIComponent(eventId)}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al eliminar el evento.');
      }

      // Redirigir al panel principal de eventos
      window.location.href = '/admin';
    } catch (err: any) {
      setErrorMessage(err.message || 'Ocurrió un error inesperado al eliminar el evento.');
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div
        style={{
          border: '1px solid #fecaca',
          backgroundColor: '#fff5f5',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--spacing-4)',
          marginTop: 'var(--spacing-4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-2)' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 700, color: '#991b1b' }}>
              Zona de Peligro: Eliminar este Evento
            </h4>
            <p style={{ margin: '0.25rem 0 0', fontSize: 'var(--font-size-xs)', color: '#7f1d1d' }}>
              Si este evento ya concluyó o fue creado por error, podés eliminarlo de forma definitiva.
            </p>
          </div>
          <Button
            variant="danger"
            onClick={handleOpenModal}
            style={{ fontSize: 'var(--font-size-xs)', minHeight: '36px', backgroundColor: '#dc2626' }}
          >
            🗑️ Eliminar evento...
          </Button>
        </div>
      </div>

      {/* Modal de Doble Verificación */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--spacing-4)',
          }}
          onClick={handleCloseModal}
        >
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '2px solid #ef4444',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '520px',
              width: '100%',
              padding: 'var(--spacing-5)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-4)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Encabezado */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-3)' }}>
              <div
                style={{
                  fontSize: '2rem',
                  lineHeight: 1,
                  padding: '0.5rem',
                  backgroundColor: '#fee2e2',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                ⚠️
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 800, color: '#991b1b' }}>
                  ¿Eliminar este evento definitivamente?
                </h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
                  Acción irreversible con doble verificación de seguridad
                </p>
              </div>
            </div>

            {/* Advertencias claras */}
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--spacing-3)',
                fontSize: 'var(--font-size-xs)',
                color: '#7f1d1d',
                lineHeight: 1.5,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
              }}
            >
              <strong style={{ fontSize: 'var(--font-size-sm)', color: '#991b1b' }}>
                Al confirmar la eliminación:
              </strong>
              <div>• Se eliminarán permanentemente las <strong>{stageCount} etapas y consultas</strong> junto a todos sus votos registrados.</div>
              <div>• Se darán de baja los accesos de las <strong>{participantCount} familias convocadas</strong> y sus enlaces únicos quedarán inhabilitados.</div>
              <div>• Se suprimirán todos los registros de aportes y tickets de soporte de este evento.</div>
              <div style={{ fontWeight: 700, marginTop: '0.25rem' }}>
                🚨 Esta acción NO se puede deshacer ni recuperar.
              </div>
            </div>

            {errorMessage && (
              <div
                style={{
                  padding: 'var(--spacing-3)',
                  backgroundColor: '#fee2e2',
                  color: '#b91c1c',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 600,
                }}
              >
                {errorMessage}
              </div>
            )}

            {/* Paso 1 de Doble Verificación: Checkbox */}
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.6rem',
                cursor: 'pointer',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-main)',
                backgroundColor: 'var(--color-surface-subtle)',
                padding: 'var(--spacing-3)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
              }}
            >
              <input
                type="checkbox"
                checked={confirmedCheck}
                onChange={(e) => setConfirmedCheck(e.target.checked)}
                disabled={isDeleting}
                style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer' }}
              />
              <span>
                <strong>Paso 1:</strong> He leído las advertencias y comprendo que se eliminará toda la información del evento y sus votaciones de forma permanente.
              </span>
            </label>

            {/* Paso 2 de Doble Verificación: Escribir nombre exacto */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
              <Input
                label={`Paso 2: Para confirmar, escribí el nombre "${eventName}"`}
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder={`Escribí "${eventName}"`}
                disabled={isDeleting}
                style={{
                  borderColor: isNameMatch ? '#16a34a' : undefined,
                  backgroundColor: isNameMatch ? '#f0fdf4' : undefined,
                }}
              />
              {typedName && !isNameMatch && (
                <span style={{ fontSize: '11px', color: '#dc2626' }}>
                  El nombre no coincide exactamente.
                </span>
              )}
              {isNameMatch && (
                <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>
                  ✓ Nombre validado correctamente.
                </span>
              )}
            </div>

            {/* Acciones */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-2)' }}>
              <Button
                variant="outline"
                onClick={handleCloseModal}
                disabled={isDeleting}
                style={{ fontSize: 'var(--font-size-xs)' }}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={!canConfirm}
                isLoading={isDeleting}
                style={{
                  fontSize: 'var(--font-size-xs)',
                  backgroundColor: canConfirm ? '#dc2626' : '#9ca3af',
                  cursor: canConfirm ? 'pointer' : 'not-allowed',
                }}
              >
                {isDeleting ? 'Eliminando definitivamente...' : 'Sí, eliminar este evento'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
