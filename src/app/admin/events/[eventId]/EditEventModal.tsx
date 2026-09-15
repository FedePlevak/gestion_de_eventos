'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  initialName: string;
  initialDescription?: string;
  initialEventDate?: string | null;
  onSaved: (updatedEvent: { name: string; description: string; eventDate: string | null }) => void;
}

export const EditEventModal: React.FC<Props> = ({
  isOpen,
  onClose,
  eventId,
  initialName,
  initialDescription = '',
  initialEventDate = null,
  onSaved,
}) => {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  
  // Convertir ISO string a YYYY-MM-DD para el input type="date"
  const getLocalDateString = (isoString?: string | null) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      // Formato YYYY-MM-DD local
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  };

  const [eventDate, setEventDate] = useState(getLocalDateString(initialEventDate));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setDescription(initialDescription || '');
      setEventDate(getLocalDateString(initialEventDate));
      setError(null);
    }
  }, [isOpen, initialName, initialDescription, initialEventDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      setError('El nombre del evento debe tener al menos 2 caracteres.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let parsedDateIso: string | null = null;
      if (eventDate.trim()) {
        const [y, m, d] = eventDate.split('-').map(Number);
        if (y && m && d) {
          // Mediodía para evitar saltos por desfase horario
          const dateObj = new Date(y, m - 1, d, 12, 0, 0);
          parsedDateIso = dateObj.toISOString();
        }
      }

      const res = await fetch(`/api/admin/events/${encodeURIComponent(eventId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          eventDate: parsedDateIso,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al actualizar los datos del evento.');
      }

      onSaved({
        name: name.trim(),
        description: description.trim(),
        eventDate: parsedDateIso,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar los cambios.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 'var(--spacing-3)',
        boxSizing: 'border-box',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={{ maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <Card
          title="Editar datos del evento"
          subtitle="Modificá el nombre, la descripción o la fecha estimada de la convocatoria"
          action={
            <Button variant="secondary" onClick={onClose} style={{ padding: '0.35rem 0.6rem', fontSize: 'var(--font-size-xs)' }}>
              ✕ Cerrar
            </Button>
          }
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
            {error && (
              <div
                role="alert"
                style={{
                  padding: 'var(--spacing-3)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-danger-bg)',
                  border: '1px solid var(--color-danger-border)',
                  color: 'var(--color-danger-text)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 600,
                }}
              >
                {error}
              </div>
            )}

            <Input
              label="Nombre del evento"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Fiesta de Fin de Año 2026"
              required
            />

            <Input
              label="Descripción breve (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Celebración de egresados de 6to de Primaria"
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
              <Input
                label="Fecha estimada del evento (opcional)"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                helperText="Podés dejar este campo vacío si aún no tienen fecha definida."
              />
              {eventDate && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setEventDate('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-primary)',
                      fontSize: 'var(--font-size-xs)',
                      cursor: 'pointer',
                      padding: 'var(--spacing-1) 0',
                      textDecoration: 'underline',
                    }}
                  >
                    Quitar fecha (dejar sin fecha definida)
                  </button>
                </div>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 'var(--spacing-2)',
                marginTop: 'var(--spacing-2)',
                flexWrap: 'wrap',
              }}
            >
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" isLoading={loading}>
                Guardar cambios
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
