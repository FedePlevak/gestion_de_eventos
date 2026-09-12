'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Badge } from '@/components/Badge';

interface OrganizerItem {
  id: string;
  email: string;
  name: string;
  status: string;
  joinedAt?: string;
}

interface OrganizerTeamSectionProps {
  eventId: string;
}

export function OrganizerTeamSection({ eventId }: OrganizerTeamSectionProps) {
  const [organizers, setOrganizers] = useState<OrganizerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchOrganizers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/events/${encodeURIComponent(eventId)}/organizers`);
      const data = await res.json();
      if (res.ok && data.organizers) {
        setOrganizers(data.organizers);
      }
    } catch (err) {
      console.error('Error al cargar organizadores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizers();
  }, [eventId]);

  const handleAddOrganizer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    setAddLoading(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/events/${encodeURIComponent(eventId)}/organizers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput.trim(),
          name: nameInput.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al agregar organizador.');

      setFeedback({
        type: 'success',
        message: `✓ Se concedió acceso de organizador a "${emailInput.trim()}".`,
      });

      setEmailInput('');
      setNameInput('');
      fetchOrganizers();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'No se pudo agregar al organizador.',
      });
    } finally {
      setAddLoading(false);
    }
  };

  const handleRevoke = async (organizerId: string, orgEmail: string) => {
    if (!confirm(`¿Estás seguro de revocar el acceso de organizador a ${orgEmail}?`)) return;

    setFeedback(null);
    try {
      const res = await fetch(
        `/api/admin/events/${encodeURIComponent(eventId)}/organizers?organizerId=${encodeURIComponent(organizerId)}`,
        { method: 'DELETE' }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo revocar el acceso.');

      setFeedback({
        type: 'success',
        message: `✓ Se revocó el acceso de organizador a ${orgEmail}.`,
      });
      fetchOrganizers();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error al revocar acceso.',
      });
    }
  };

  return (
    <Card
      title="Equipo de Organizadores"
      subtitle="Usuarios con acceso administrativo y capacidad de gestión para este evento"
      action={
        <Button
          variant={isExpanded ? 'secondary' : 'outline'}
          onClick={() => setIsExpanded(!isExpanded)}
          style={{ minHeight: '36px', fontSize: 'var(--font-size-xs)' }}
        >
          {isExpanded ? 'Cerrar' : '+ Agregar Organizador'}
        </Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
        {feedback && (
          <div
            style={{
              padding: 'var(--spacing-3)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: feedback.type === 'success' ? 'var(--color-success-surface, #e8f5e9)' : 'var(--color-error-surface, #ffebee)',
              color: feedback.type === 'success' ? 'var(--color-success-text, #2e7d32)' : 'var(--color-error-text, #c62828)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 600,
            }}
          >
            {feedback.message}
          </div>
        )}

        {/* Formulario para agregar organizador */}
        {isExpanded && (
          <form
            onSubmit={handleAddOrganizer}
            style={{
              padding: 'var(--spacing-4)',
              backgroundColor: 'var(--color-surface-subtle)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-3)',
            }}
          >
            <strong style={{ fontSize: 'var(--font-size-sm)' }}>
              Invitar o asignar un nuevo organizador al evento
            </strong>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
              Si el usuario ya tiene cuenta en el sistema, se le asignará el evento inmediatamente. Si es nuevo, se creará su cuenta para que pueda ingresar.
            </p>

            <Input
              label="Correo electrónico"
              type="email"
              placeholder="ejemplo@correo.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              required
            />

            <Input
              label="Nombre o Apellido (opcional)"
              placeholder="Ej: Laura Méndez"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-2)' }}>
              <Button type="button" variant="outline" onClick={() => setIsExpanded(false)} style={{ minHeight: '36px' }}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" isLoading={addLoading} style={{ minHeight: '36px' }}>
                Conceder Acceso
              </Button>
            </div>
          </form>
        )}

        {/* Lista de organizadores actuales */}
        {loading && organizers.length === 0 ? (
          <div style={{ color: 'var(--color-text-subtle)', fontSize: 'var(--font-size-sm)', textAlign: 'center', padding: 'var(--spacing-2)' }}>
            Cargando equipo...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
            {organizers.map((org) => {
              const isActive = org.status === 'active';
              return (
                <div
                  key={org.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 'var(--spacing-3)',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    flexWrap: 'wrap',
                    gap: 'var(--spacing-2)',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 'var(--font-size-sm)' }}>{org.name || org.email}</strong>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)', display: 'block' }}>
                      ✉️ {org.email}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                    <Badge variant={isActive ? 'success' : 'neutral'}>
                      {isActive ? 'Organizador Activo' : 'Acceso Revocado'}
                    </Badge>

                    {isActive && organizers.filter((o) => o.status === 'active').length > 1 && (
                      <Button
                        variant="outline"
                        onClick={() => handleRevoke(org.id, org.email)}
                        style={{ fontSize: 'var(--font-size-xs)', minHeight: '28px', padding: '0.2rem 0.5rem', color: 'var(--color-error-text, #c62828)' }}
                      >
                        Revocar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
