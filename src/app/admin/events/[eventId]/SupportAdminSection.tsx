'use client';

import React, { useState } from 'react';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { SupportTicket, SupportTicketStatus } from '@/modules/support/types';

interface Props {
  eventId: string;
  initialTickets: SupportTicket[];
}

export const SupportAdminSection: React.FC<Props> = ({ eventId, initialTickets }) => {
  const [tickets, setTickets] = useState<SupportTicket[]>(initialTickets);
  const [filter, setFilter] = useState<'all' | SupportTicketStatus>('all');
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  const [newInternalNote, setNewInternalNote] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [newStatus, setNewStatus] = useState<SupportTicketStatus>('in_progress');
  const [loading, setLoading] = useState(false);

  const filteredTickets = tickets.filter((t) => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  const handleUpdateTicket = async (ticketId: string) => {
    setLoading(true);

    try {
      const payload: any = {
        status: newStatus,
      };
      if (newInternalNote.trim()) {
        payload.addInternalNote = newInternalNote.trim();
      }
      if (newStatus === 'resolved' && resolutionSummary.trim()) {
        payload.resolutionSummary = resolutionSummary.trim();
      }

      const res = await fetch(`/api/admin/events/${eventId}/support/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-organizer-email': 'organizador1@colegio.edu.uy',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al actualizar ticket.');
      }

      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? data.ticket : t))
      );

      setActiveTicketId(null);
      setNewInternalNote('');
      setResolutionSummary('');
    } catch (err: any) {
      alert(err.message || 'Error al procesar la actualización.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-2)' }}>
        <div>
          <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>Mesa de Ayuda y Consultas Familiares</h3>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
            Canal de soporte familiar con notas internas confidenciales y resoluciones acordadas.
          </p>
        </div>
      </div>

      {/* Filtros de estado */}
      <div style={{ display: 'flex', gap: 'var(--spacing-2)', flexWrap: 'wrap' }}>
        <Button
          variant={filter === 'all' ? 'primary' : 'secondary'}
          onClick={() => setFilter('all')}
          style={{ minHeight: 'var(--touch-target-min)', padding: '0.35rem 0.75rem', fontSize: 'var(--font-size-xs)' }}
        >
          Todas ({tickets.length})
        </Button>
        <Button
          variant={filter === 'new' ? 'primary' : 'secondary'}
          onClick={() => setFilter('new')}
          style={{ minHeight: 'var(--touch-target-min)', padding: '0.35rem 0.75rem', fontSize: 'var(--font-size-xs)' }}
        >
          Nuevas ({tickets.filter((t) => t.status === 'new').length})
        </Button>
        <Button
          variant={filter === 'in_progress' ? 'primary' : 'secondary'}
          onClick={() => setFilter('in_progress')}
          style={{ minHeight: 'var(--touch-target-min)', padding: '0.35rem 0.75rem', fontSize: 'var(--font-size-xs)' }}
        >
          En gestión ({tickets.filter((t) => t.status === 'in_progress').length})
        </Button>
        <Button
          variant={filter === 'resolved' ? 'primary' : 'secondary'}
          onClick={() => setFilter('resolved')}
          style={{ minHeight: 'var(--touch-target-min)', padding: '0.35rem 0.75rem', fontSize: 'var(--font-size-xs)' }}
        >
          Resueltas ({tickets.filter((t) => t.status === 'resolved').length})
        </Button>
      </div>

      <Card>
        {filteredTickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--spacing-4) 0', color: 'var(--color-text-muted)' }}>
            No hay consultas en esta categoría.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            {filteredTickets.map((ticket) => {
              const isEditing = activeTicketId === ticket.id;

              return (
                <div
                  key={ticket.id}
                  style={{
                    paddingBottom: 'var(--spacing-3)',
                    borderBottom: '1px solid var(--color-surface-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--spacing-2)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 700 }}>{ticket.subject}</span>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)', marginLeft: 'var(--spacing-2)' }}>
                        Familia {ticket.familyName}
                      </span>
                    </div>

                    <Badge
                      variant={
                        ticket.status === 'resolved'
                          ? 'success'
                          : ticket.status === 'in_progress'
                          ? 'info'
                          : 'warning'
                      }
                    >
                      {ticket.status === 'new' && 'Nueva'}
                      {ticket.status === 'in_progress' && 'En gestión'}
                      {ticket.status === 'resolved' && 'Resuelta'}
                    </Badge>
                  </div>

                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-main)', whiteSpace: 'pre-wrap' }}>
                    {ticket.description}
                  </p>

                  {/* Resolución acordada visible para la familia */}
                  {ticket.resolutionSummary && (
                    <div
                      style={{
                        backgroundColor: 'var(--color-success-bg)',
                        border: '1px solid var(--color-success-border)',
                        padding: 'var(--spacing-2) var(--spacing-3)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-success-text)',
                      }}
                    >
                      <strong>Resolución informada a la familia:</strong> {ticket.resolutionSummary}
                    </div>
                  )}

                  {/* Notas internas del comité (Regla S02: protegidas) */}
                  {ticket.internalNotes && ticket.internalNotes.length > 0 && (
                    <div
                      style={{
                        backgroundColor: 'var(--color-surface-subtle)',
                        border: '1px solid var(--color-border)',
                        padding: 'var(--spacing-2) var(--spacing-3)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--font-size-xs)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--spacing-1)',
                      }}
                    >
                      <span style={{ fontWeight: 700, color: 'var(--color-text-subtle)' }}>
                        Notas internas del comité (no visibles para la familia):
                      </span>
                      {ticket.internalNotes.map((n) => (
                        <div key={n.id} style={{ color: 'var(--color-text-muted)' }}>
                          • {n.note} <span style={{ color: 'var(--color-text-subtle)' }}>({n.authorEmail})</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--spacing-1)' }}>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setActiveTicketId(isEditing ? null : ticket.id);
                        setNewStatus(ticket.status === 'new' ? 'in_progress' : ticket.status);
                        setResolutionSummary(ticket.resolutionSummary || '');
                      }}
                      style={{ minHeight: 'var(--touch-target-min)', padding: '0.35rem 0.75rem', fontSize: 'var(--font-size-xs)' }}
                    >
                      {isEditing ? 'Cerrar edición' : 'Gestionar / Responder'}
                    </Button>
                  </div>

                  {/* Panel de edición */}
                  {isEditing && (
                    <div
                      style={{
                        marginTop: 'var(--spacing-2)',
                        padding: 'var(--spacing-3)',
                        backgroundColor: 'var(--color-surface-subtle)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--spacing-2)',
                      }}
                    >
                      <div style={{ display: 'flex', gap: 'var(--spacing-2)', alignItems: 'center' }}>
                        <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Estado:</label>
                        <select
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value as SupportTicketStatus)}
                          style={{
                            padding: '0.3rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--color-border)',
                            fontSize: 'var(--font-size-xs)',
                          }}
                        >
                          <option value="new">Nueva</option>
                          <option value="in_progress">En gestión</option>
                          <option value="resolved">Resuelta</option>
                        </select>
                      </div>

                      <Input
                        label="Agregar nota interna (solo para el comité)"
                        value={newInternalNote}
                        onChange={(e) => setNewInternalNote(e.target.value)}
                        placeholder="Ej: Hablado con el proveedor de catering, confirman menú especial."
                      />

                      {newStatus === 'resolved' && (
                        <Input
                          label="Resumen de resolución (visible para la familia)"
                          value={resolutionSummary}
                          onChange={(e) => setResolutionSummary(e.target.value)}
                          placeholder="Ej: Tu consulta fue coordinada con la administración. Queda confirmada la opción."
                          required
                        />
                      )}

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-2)' }}>
                        <Button
                          variant="primary"
                          isLoading={loading}
                          onClick={() => handleUpdateTicket(ticket.id)}
                          style={{ minHeight: '30px', padding: '0.2rem 0.6rem', fontSize: 'var(--font-size-xs)' }}
                        >
                          Guardar cambios
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </section>
  );
};
