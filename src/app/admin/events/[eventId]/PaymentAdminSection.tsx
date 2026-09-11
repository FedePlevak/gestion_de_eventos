'use client';

import React, { useState } from 'react';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { FinancialSummary, PaymentReport } from '@/modules/payments/types';

export interface ParticipantPaymentItem {
  id: string; // participantId
  familyId: string;
  familyName: string;
  contactEmail?: string;
  contactPhone?: string;
  payment?: PaymentReport;
}

interface Props {
  eventId: string;
  initialSummary: FinancialSummary;
  initialPayments: ParticipantPaymentItem[];
}

export const PaymentAdminSection: React.FC<Props> = ({
  eventId,
  initialSummary,
  initialPayments,
}) => {
  const [summary, setSummary] = useState<FinancialSummary>(initialSummary);
  const [payments, setPayments] = useState<ParticipantPaymentItem[]>(initialPayments);
  const [filter, setFilter] = useState<'all' | 'reported' | 'verified' | 'pending' | 'requires_revision'>('all');

  const [activeParticipantId, setActiveParticipantId] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<'verify' | 'request_revision' | 'reverse' | null>(null);
  const [inputReason, setInputReason] = useState('');
  const [inputAmount, setInputAmount] = useState('');
  const [inputDate, setInputDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const filteredItems = payments.filter((item) => {
    const status = item.payment?.status || 'pending';
    if (filter === 'all') return true;
    return status === filter;
  });

  const handleExecuteAction = async (participantId: string) => {
    if (!activeAction) return;
    setLoading(true);
    setFeedback(null);

    try {
      const payload: any = { action: activeAction };
      if (activeAction === 'verify') {
        const amountMinor = inputAmount ? Math.round(parseFloat(inputAmount) * 100) : undefined;
        payload.verifiedAmountMinor = amountMinor;
        payload.receptionDate = inputDate;
      } else if (activeAction === 'request_revision' || activeAction === 'reverse') {
        if (!inputReason.trim()) {
          alert('El motivo es obligatorio.');
          setLoading(false);
          return;
        }
        payload.reason = inputReason.trim();
      }

      const res = await fetch(`/api/admin/events/${eventId}/payments/${participantId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-organizer-email': 'organizador1@colegio.edu.uy',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar acción sobre el pago.');
      }

      setFeedback('Acción aplicada con éxito.');
      // Actualizar listado localmente
      setPayments((prev) =>
        prev.map((item) => {
          if (item.id !== participantId) return item;
          return {
            ...item,
            payment: data.payment,
          };
        })
      );

      // Recalcular métricas de resumen
      const updatedPayments = payments.map((item) => (item.id === participantId ? { ...item, payment: data.payment } : item));
      let verCount = 0;
      let verTotal = 0;
      let repCount = 0;
      let repTotal = 0;
      let reqCount = 0;

      for (const it of updatedPayments) {
        const p = it.payment;
        if (!p) continue;
        if (p.status === 'verified') {
          verCount++;
          verTotal += p.verifiedAmountMinor || p.expectedAmountMinor;
        } else if (p.status === 'reported') {
          repCount++;
          repTotal += p.declaredAmountMinor || 0;
        } else if (p.status === 'requires_revision') {
          reqCount++;
        }
      }

      setSummary((s) => ({
        ...s,
        verifiedCount: verCount,
        verifiedTotalAmountMinor: verTotal,
        reportedPendingCount: repCount,
        reportedPendingAmountMinor: repTotal,
        requiresRevisionCount: reqCount,
        pendingCount: Math.max(0, s.totalFamilies - (verCount + repCount + reqCount)),
      }));

      setActiveParticipantId(null);
      setActiveAction(null);
      setInputReason('');
      setInputAmount('');
    } catch (err: any) {
      alert(err.message || 'Ocurrió un error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
      {/* Métricas Financieras del Evento */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--spacing-3)' }}>
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--spacing-3)',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>Pagos Verificados</span>
          <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-primary)' }}>
            $ {(summary.verifiedTotalAmountMinor / 100).toLocaleString('es-UY')}
          </p>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-success-text)' }}>
            {summary.verifiedCount} de {summary.totalFamilies} aportes
          </span>
        </div>

        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--spacing-3)',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>Por Verificar</span>
          <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-warning-text)' }}>
            {summary.reportedPendingCount}
          </p>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-warning-text)' }}>
            $ {(summary.reportedPendingAmountMinor / 100).toLocaleString('es-UY')} informados
          </span>
        </div>

        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--spacing-3)',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>Sin Informar</span>
          <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-text-subtle)' }}>
            {summary.pendingCount}
          </p>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
            Familias pendientes
          </span>
        </div>
      </div>

      {feedback && (
        <div
          style={{
            backgroundColor: 'var(--color-success-bg)',
            border: '1px solid var(--color-success-border)',
            color: 'var(--color-success-text)',
            padding: 'var(--spacing-2) var(--spacing-3)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          ✓ {feedback}
        </div>
      )}

      {/* Filtros de lista */}
      <div style={{ display: 'flex', gap: 'var(--spacing-2)', overflowX: 'auto', paddingBottom: 'var(--spacing-1)' }}>
        <Button
          variant={filter === 'all' ? 'primary' : 'secondary'}
          onClick={() => setFilter('all')}
          style={{ minHeight: '32px', padding: '0.25rem 0.6rem', fontSize: 'var(--font-size-xs)' }}
        >
          Todas ({payments.length})
        </Button>
        <Button
          variant={filter === 'reported' ? 'primary' : 'secondary'}
          onClick={() => setFilter('reported')}
          style={{ minHeight: '32px', padding: '0.25rem 0.6rem', fontSize: 'var(--font-size-xs)' }}
        >
          Por verificar ({summary.reportedPendingCount})
        </Button>
        <Button
          variant={filter === 'verified' ? 'primary' : 'secondary'}
          onClick={() => setFilter('verified')}
          style={{ minHeight: '32px', padding: '0.25rem 0.6rem', fontSize: 'var(--font-size-xs)' }}
        >
          Verificados ({summary.verifiedCount})
        </Button>
        <Button
          variant={filter === 'pending' ? 'primary' : 'secondary'}
          onClick={() => setFilter('pending')}
          style={{ minHeight: '32px', padding: '0.25rem 0.6rem', fontSize: 'var(--font-size-xs)' }}
        >
          Pendientes ({summary.pendingCount})
        </Button>
      </div>

      {/* Lista de Familias y Pagos */}
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
          {filteredItems.map((item) => {
            const p = item.payment;
            const status = p?.status || 'pending';
            const isEditing = activeParticipantId === item.id;

            return (
              <div
                key={item.id}
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
                    <p style={{ fontWeight: 600 }}>Familia {item.familyName}</p>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
                      {status === 'verified' && `Verificado: $${(p!.verifiedAmountMinor! / 100).toLocaleString('es-UY')}`}
                      {status === 'reported' && `Informó $${(p!.declaredAmountMinor! / 100).toLocaleString('es-UY')} el ${p!.transferDate}`}
                      {status === 'requires_revision' && `Corrección solicitada: "${p!.revisionReason}"`}
                      {status === 'pending' && 'Sin informe de pago registrado'}
                    </span>
                  </div>

                  <Badge
                    variant={
                      status === 'verified'
                        ? 'success'
                        : status === 'reported'
                        ? 'warning'
                        : status === 'requires_revision'
                        ? 'danger'
                        : 'neutral'
                    }
                  >
                    {status === 'verified' && 'Verificado'}
                    {status === 'reported' && 'Por verificar'}
                    {status === 'requires_revision' && 'En revisión'}
                    {status === 'pending' && 'Pendiente'}
                  </Badge>
                </div>

                {/* Comprobante adjunto si existe */}
                {p?.attachment && (
                  <div style={{ fontSize: 'var(--font-size-xs)', display: 'flex', gap: 'var(--spacing-2)', alignItems: 'center' }}>
                    <span>📄 Comprobante: {p.attachment.fileName}</span>
                    <a
                      href={`/api/payments/receipts/${p.attachment.id}?eventId=${eventId}&participantId=${item.id}&path=${encodeURIComponent(p.attachment.storagePath)}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--color-primary)', fontWeight: 600 }}
                    >
                      Abrir archivo ↗
                    </a>
                  </div>
                )}

                {/* Botones de acción administrativa */}
                <div style={{ display: 'flex', gap: 'var(--spacing-2)', flexWrap: 'wrap' }}>
                  {status !== 'verified' ? (
                    <>
                      <Button
                        variant="primary"
                        onClick={() => {
                          setActiveParticipantId(item.id);
                          setActiveAction('verify');
                          setInputAmount(String((p?.declaredAmountMinor || summary.expectedAmountPerFamilyMinor) / 100));
                        }}
                        style={{ minHeight: '30px', padding: '0.2rem 0.5rem', fontSize: 'var(--font-size-xs)' }}
                      >
                        ✓ Verificar recepción
                      </Button>

                      {status === 'reported' && (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setActiveParticipantId(item.id);
                            setActiveAction('request_revision');
                          }}
                          style={{ minHeight: '30px', padding: '0.2rem 0.5rem', fontSize: 'var(--font-size-xs)' }}
                        >
                          Solicitar corrección
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setActiveParticipantId(item.id);
                        setActiveAction('reverse');
                      }}
                      style={{ minHeight: '30px', padding: '0.2rem 0.5rem', fontSize: 'var(--font-size-xs)' }}
                    >
                      Revertir verificación
                    </Button>
                  )}
                </div>

                {/* Formulario de acción desplegado */}
                {isEditing && activeAction && (
                  <div
                    style={{
                      padding: 'var(--spacing-3)',
                      backgroundColor: 'var(--color-surface-subtle)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--spacing-2)',
                      marginTop: 'var(--spacing-1)',
                    }}
                  >
                    <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700 }}>
                      {activeAction === 'verify' && 'Confirmar recepción verificada:'}
                      {activeAction === 'request_revision' && 'Solicitar corrección a la familia (motivo visible):'}
                      {activeAction === 'reverse' && 'Revertir verificación (motivo obligatorio):'}
                    </span>

                    {activeAction === 'verify' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-2)' }}>
                        <Input
                          label="Importe recibido ($)"
                          type="number"
                          value={inputAmount}
                          onChange={(e) => setInputAmount(e.target.value)}
                          required
                        />
                        <Input
                          label="Fecha de acreditación"
                          type="date"
                          value={inputDate}
                          onChange={(e) => setInputDate(e.target.value)}
                          required
                        />
                      </div>
                    )}

                    {(activeAction === 'request_revision' || activeAction === 'reverse') && (
                      <Input
                        label="Motivo"
                        value={inputReason}
                        onChange={(e) => setInputReason(e.target.value)}
                        placeholder={
                          activeAction === 'request_revision'
                            ? 'Ej: El comprobante adjunto es ilegible o el importe no coincide'
                            : 'Ej: Se constató un error bancario o rechazo de transferencia'
                        }
                        required
                      />
                    )}

                    <div style={{ display: 'flex', gap: 'var(--spacing-2)', justifyContent: 'flex-end' }}>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setActiveParticipantId(null);
                          setActiveAction(null);
                        }}
                        style={{ minHeight: '30px', padding: '0.2rem 0.6rem', fontSize: 'var(--font-size-xs)' }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="primary"
                        isLoading={loading}
                        onClick={() => handleExecuteAction(item.id)}
                        style={{ minHeight: '30px', padding: '0.2rem 0.6rem', fontSize: 'var(--font-size-xs)' }}
                      >
                        Confirmar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </section>
  );
};
