'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Input } from '@/components/Input';
import { FamilySupportTicket } from '@/modules/support/types';

interface Props {
  eventId: string;
}

export const FamilySupportSection: React.FC<Props> = ({ eventId }) => {
  const [tickets, setTickets] = useState<FamilySupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchTickets = async () => {
    try {
      const res = await fetch(`/api/support/tickets?eventId=${encodeURIComponent(eventId)}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.error('Error fetching support tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setMessage({ type: 'error', text: 'Por favor completá todos los campos.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          subject: subject.trim(),
          description: description.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo enviar la consulta.');
      }

      setMessage({ type: 'success', text: '¡Consulta enviada al comité organizador!' });
      setSubject('');
      setDescription('');
      setIsFormOpen(false);
      setTickets((prev) => [data.ticket, ...prev]);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al enviar la consulta.' });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge variant="warning">Enviada</Badge>;
      case 'in_progress':
        return <Badge variant="info">En revisión</Badge>;
      case 'resolved':
        return <Badge variant="success">Respondida</Badge>;
      case 'closed':
        return <Badge variant="neutral">Cerrada</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-2)' }}>
        <div>
          <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-text-main)' }}>
            Consultas al Comité Organizador
          </h3>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
            ¿Tenés dudas sobre el evento, el menú o las fechas? Escribinos directamente por aquí.
          </p>
        </div>

        {!isFormOpen && (
          <Button
            variant="outline"
            onClick={() => setIsFormOpen(true)}
            style={{ fontSize: 'var(--font-size-sm)', padding: '0.4rem 0.8rem' }}
          >
            + Hacer una consulta
          </Button>
        )}
      </div>

      {message && (
        <div
          style={{
            backgroundColor: message.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
            color: message.type === 'success' ? 'var(--color-success-text)' : 'var(--color-danger-text)',
            border: `1px solid ${message.type === 'success' ? 'var(--color-success-border)' : 'var(--color-danger-border)'}`,
            padding: 'var(--spacing-3)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          {message.text}
        </div>
      )}

      {/* Formulario desplegable */}
      {isFormOpen && (
        <Card
          title="Nueva Consulta para el Comité"
          action={
            <Button
              variant="secondary"
              onClick={() => setIsFormOpen(false)}
              style={{ padding: '0.2rem 0.5rem', fontSize: 'var(--font-size-xs)' }}
            >
              Cerrar
            </Button>
          }
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
            <Input
              label="Asunto de la consulta"
              placeholder="Ej: Consulta sobre menú celíaco o estacionamiento"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                Detalle o pregunta
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explicá tu consulta para que el comité pueda orientarte..."
                rows={4}
                required
                style={{
                  width: '100%',
                  padding: 'var(--spacing-2)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontFamily: 'inherit',
                  fontSize: 'var(--font-size-sm)',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-2)' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsFormOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={submitting}
              >
                Enviar consulta
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Listado de consultas existentes */}
      {loading ? (
        <div style={{ padding: 'var(--spacing-4)', textAlign: 'center', color: 'var(--color-text-subtle)' }}>
          Cargando consultas...
        </div>
      ) : tickets.length === 0 ? (
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--spacing-4)',
            textAlign: 'center',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-subtle)',
          }}
        >
          No tenés consultas abiertas con el comité.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
          {tickets.map((t) => (
            <Card
              key={t.id}
              title={t.subject}
              subtitle={`Enviada: ${new Date(t.createdAt).toLocaleDateString('es-UY', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}`}
              action={getStatusBadge(t.status)}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-main)', whiteSpace: 'pre-wrap' }}>
                  {t.description}
                </p>

                {/* Respuesta pública del comité si fue respondida */}
                {t.resolutionSummary && (
                  <div
                    style={{
                      backgroundColor: 'var(--color-success-bg)',
                      borderLeft: '3px solid var(--color-success)',
                      padding: 'var(--spacing-2) var(--spacing-3)',
                      borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                      marginTop: 'var(--spacing-1)',
                    }}
                  >
                    <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-success-text)' }}>
                      Respuesta del Comité:
                    </span>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-success-text)', marginTop: 'var(--spacing-1)' }}>
                      {t.resolutionSummary}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
};
