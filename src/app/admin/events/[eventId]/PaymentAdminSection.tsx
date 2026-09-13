'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { FinancialSummary, PaymentReport } from '@/modules/payments/types';
import { PaymentConfig } from '@/modules/events/types';

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
  initialConfig: PaymentConfig;
  initialSummary: FinancialSummary;
  initialPayments: ParticipantPaymentItem[];
}

export const PaymentAdminSection: React.FC<Props> = ({
  eventId,
  initialConfig,
  initialSummary,
  initialPayments,
}) => {
  const router = useRouter();
  const [config, setConfig] = useState<PaymentConfig>(initialConfig);
  const [savingConfig, setSavingConfig] = useState(false);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [editAmount, setEditAmount] = useState(
    config.expectedAmountMinor ? (config.expectedAmountMinor / 100).toString() : ''
  );
  const [editCurrency, setEditCurrency] = useState(config.currency || 'UYU');
  const [editBankName, setEditBankName] = useState(config.bankInstructions?.bankName || '');
  const [editAccountHolder, setEditAccountHolder] = useState(config.bankInstructions?.accountHolder || '');
  const [editAccountNumber, setEditAccountNumber] = useState(config.bankInstructions?.accountNumber || '');
  const [editAlias, setEditAlias] = useState(config.bankInstructions?.alias || '');
  const [editNotes, setEditNotes] = useState(config.bankInstructions?.additionalNotes || '');

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

  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = payments.filter((item) => {
    const status = item.payment?.status || 'pending';
    if (filter !== 'all' && status !== filter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = item.familyName.toLowerCase().includes(q);
      const matchEmail = item.contactEmail ? item.contactEmail.toLowerCase().includes(q) : false;
      return matchName || matchEmail;
    }
    return true;
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

  const handleToggleVisibility = async (newEnabled: boolean) => {
    setSavingConfig(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentConfig: {
            ...config,
            enabled: newEnabled,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al actualizar visibilidad de la etapa de cuota.');
      }
      setConfig((prev) => ({ ...prev, enabled: newEnabled }));
      setFeedback(
        newEnabled
          ? 'Etapa de cuota PUBLICADA. Ahora es visible para todas las familias en su panel.'
          : 'Etapa de cuota OCULTADA. Las familias ya no la ven en su panel ni pueden informar transferencias.'
      );
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar la visibilidad.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setFeedback(null);
    try {
      const amountNumber = parseFloat(editAmount) || 0;
      const amountMinor = Math.round(amountNumber * 100);
      const updatedConfigPayload = {
        enabled: config.enabled,
        expectedAmountMinor: amountMinor,
        currency: editCurrency,
        bankInstructions: {
          bankName: editBankName.trim(),
          accountHolder: editAccountHolder.trim(),
          accountNumber: editAccountNumber.trim(),
          alias: editAlias.trim() || undefined,
          additionalNotes: editNotes.trim() || undefined,
        },
      };

      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentConfig: updatedConfigPayload }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar la configuración.');
      }
      setConfig((prev) => ({
        ...prev,
        expectedAmountMinor: amountMinor,
        currency: editCurrency,
        bankInstructions: updatedConfigPayload.bankInstructions,
      }));
      setFeedback('Configuración y datos bancarios de la cuota guardados con éxito.');
      setShowConfigForm(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error al guardar configuración.');
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <section id="seccion-pagos" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
      {/* Control Principal de la Etapa de Cuota / Aporte */}
      <Card
        title="Etapa de Aporte o Cuota del Evento"
        subtitle={
          config.expectedAmountMinor > 0
            ? `Importe fijado: $${(config.expectedAmountMinor / 100).toLocaleString('es-UY')} ${config.currency}`
            : 'Monto no configurado'
        }
        action={
          config.enabled ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Badge variant="success">🟢 PUBLICADA Y VISIBLE</Badge>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Badge variant="neutral">⚪ OCULTA (BORRADOR)</Badge>
            </div>
          )
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
          {/* Banner de estado y botón de activación/ocultación */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 'var(--spacing-3)',
              padding: 'var(--spacing-3)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: config.enabled ? 'rgba(34, 197, 94, 0.08)' : 'rgba(100, 116, 139, 0.08)',
              border: config.enabled ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--color-border)',
            }}
          >
            <div style={{ flex: 1, minWidth: '240px' }}>
              <p
                style={{
                  margin: 0,
                  fontWeight: 700,
                  fontSize: 'var(--font-size-sm)',
                  color: config.enabled ? '#166534' : 'var(--color-text-main)',
                }}
              >
                {config.enabled
                  ? '📢 Esta etapa está ACTIVA y VISIBLE para todas las familias.'
                  : '🔒 Esta etapa está OCULTA para las familias.'}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                {config.enabled
                  ? 'Aparece como una etapa en el panel familiar para que las familias vean los datos e informen transferencias.'
                  : 'Las familias no la ven en su panel ni pueden registrar pagos hasta que decidas publicarla.'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-2)', flexWrap: 'wrap' }}>
              <Button
                variant="outline"
                onClick={() => setShowConfigForm(!showConfigForm)}
                style={{ fontSize: 'var(--font-size-xs)', minHeight: 'var(--touch-target-min)', padding: '0.4rem 0.8rem' }}
              >
                {showConfigForm ? 'Cerrar ajustes' : 'Configurar monto y cuenta'}
              </Button>

              {config.enabled ? (
                <Button
                  variant="outline"
                  onClick={() => handleToggleVisibility(false)}
                  isLoading={savingConfig}
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    minHeight: 'var(--touch-target-min)',
                    padding: '0.4rem 0.9rem',
                    fontWeight: 600,
                  }}
                >
                  Ocultar cuota a las familias
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => handleToggleVisibility(true)}
                  isLoading={savingConfig}
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    minHeight: 'var(--touch-target-min)',
                    padding: '0.4rem 0.9rem',
                    fontWeight: 600,
                  }}
                >
                  Habilitar cuota para las familias
                </Button>
              )}
            </div>
          </div>

          {/* Formulario desplegable para configurar monto e instrucciones bancarias */}
          {showConfigForm && (
            <form
              onSubmit={handleSaveConfig}
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--spacing-3)',
                backgroundColor: 'var(--color-surface)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-3)',
              }}
            >
              <h4 style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 700 }}>
                Ajustes de la cuota e instrucciones bancarias
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--spacing-2)' }}>
                <div>
                  <Input
                    label="Monto esperado por familia"
                    type="number"
                    placeholder="Ej: 2000"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 600, marginBottom: 'var(--spacing-1)' }}>
                    Moneda
                  </label>
                  <select
                    value={editCurrency}
                    onChange={(e) => setEditCurrency(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: 'var(--touch-target-min)',
                      padding: '0.55rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-control-border)',
                      fontSize: 'var(--font-size-sm)',
                      backgroundColor: 'var(--color-surface)',
                    }}
                  >
                    <option value="UYU">UYU ($)</option>
                    <option value="USD">USD (US$)</option>
                    <option value="ARS">ARS ($)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-2)' }}>
                <Input
                  label="Banco o entidad"
                  placeholder="Ej: Banco República (BROU), Santander, Itaú"
                  value={editBankName}
                  onChange={(e) => setEditBankName(e.target.value)}
                />
                <Input
                  label="Titular de la cuenta"
                  placeholder="Ej: Comisión de Familias"
                  value={editAccountHolder}
                  onChange={(e) => setEditAccountHolder(e.target.value)}
                />
                <Input
                  label="Número de cuenta / CBU"
                  placeholder="Ej: 001234567-00001"
                  value={editAccountNumber}
                  onChange={(e) => setEditAccountNumber(e.target.value)}
                />
                <Input
                  label="Alias / Referencia (opcional)"
                  placeholder="Ej: evento.egresados.2026"
                  value={editAlias}
                  onChange={(e) => setEditAlias(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="payment-notes-input" style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 600, marginBottom: 'var(--spacing-1)' }}>
                  Notas o instrucciones para las familias
                </label>
                <textarea
                  id="payment-notes-input"
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Ej: Indicar el nombre del alumno en el concepto de la transferencia."
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-control-border)',
                    fontSize: 'var(--font-size-sm)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-main)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-2)' }}>
                <Button type="button" variant="outline" onClick={() => setShowConfigForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" isLoading={savingConfig}>
                  Guardar cambios
                </Button>
              </div>
            </form>
          )}
        </div>
      </Card>
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
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>Pagos recibidos</span>
          <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-primary)', fontVariantNumeric: 'tabular-nums' }}>
            ${(summary.verifiedTotalAmountMinor / 100).toLocaleString('es-UY')}
          </p>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-success-text)', fontVariantNumeric: 'tabular-nums' }}>
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
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>Por verificar</span>
          <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-info-text)', fontVariantNumeric: 'tabular-nums' }}>
            {summary.reportedPendingCount}
          </p>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-info-text)', fontVariantNumeric: 'tabular-nums' }}>
            ${(summary.reportedPendingAmountMinor / 100).toLocaleString('es-UY')} informados
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
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>Sin informar</span>
          <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-text-subtle)', fontVariantNumeric: 'tabular-nums' }}>
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

      {/* Buscador de familias en pagos */}
      <div style={{ width: '100%' }}>
        <input
          type="text"
          placeholder="🔍 Buscar por apellido de familia o correo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            minHeight: 'var(--touch-target-min)',
            padding: '0.65rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            fontSize: 'var(--font-size-sm)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-main)',
          }}
        />
      </div>

      {/* Filtros de lista */}
      <div style={{ display: 'flex', gap: 'var(--spacing-2)', flexWrap: 'wrap', paddingBottom: 'var(--spacing-1)' }}>
        <Button
          variant={filter === 'all' ? 'primary' : 'secondary'}
          onClick={() => setFilter('all')}
          style={{ minHeight: 'var(--touch-target-min)', padding: '0.35rem 0.75rem', fontSize: 'var(--font-size-xs)' }}
        >
          Todas ({payments.length})
        </Button>
        <Button
          variant={filter === 'reported' ? 'primary' : 'secondary'}
          onClick={() => setFilter('reported')}
          style={{ minHeight: 'var(--touch-target-min)', padding: '0.35rem 0.75rem', fontSize: 'var(--font-size-xs)' }}
        >
          Por verificar ({summary.reportedPendingCount})
        </Button>
        <Button
          variant={filter === 'verified' ? 'primary' : 'secondary'}
          onClick={() => setFilter('verified')}
          style={{ minHeight: 'var(--touch-target-min)', padding: '0.35rem 0.75rem', fontSize: 'var(--font-size-xs)' }}
        >
          Recibidos ({summary.verifiedCount})
        </Button>
        <Button
          variant={filter === 'pending' ? 'primary' : 'secondary'}
          onClick={() => setFilter('pending')}
          style={{ minHeight: 'var(--touch-target-min)', padding: '0.35rem 0.75rem', fontSize: 'var(--font-size-xs)' }}
        >
          Sin informar ({summary.pendingCount})
        </Button>
      </div>

      {/* Lista de Familias y Pagos */}
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
          {filteredItems.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--color-text-subtle)', fontSize: 'var(--font-size-sm)', padding: 'var(--spacing-4)' }}>
              No se encontraron familias que coincidan con la búsqueda o el filtro seleccionado.
            </p>
          ) : (
            filteredItems.map((item) => {
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-2)' }}>
                  <div>
                    <p style={{ fontWeight: 600 }}>Familia {item.familyName}</p>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)', fontVariantNumeric: 'tabular-nums' }}>
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
                        ? 'info'
                        : status === 'requires_revision'
                        ? 'danger'
                        : 'neutral'
                    }
                  >
                    {status === 'verified' && 'Pago recibido'}
                    {status === 'reported' && 'Pago informado'}
                    {status === 'requires_revision' && 'En revisión'}
                    {status === 'pending' && 'Sin informar'}
                  </Badge>
                </div>

                {/* Comprobante adjunto si existe */}
                {p?.attachment && (
                  <div style={{ fontSize: 'var(--font-size-xs)', display: 'flex', gap: 'var(--spacing-2)', alignItems: 'center' }}>
                    <span>Comprobante: {p.attachment.fileName}</span>
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
                        style={{ minHeight: 'var(--touch-target-min)', padding: '0.35rem 0.75rem', fontSize: 'var(--font-size-xs)' }}
                      >
                        Confirmar recepción
                      </Button>

                      {status === 'reported' && (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setActiveParticipantId(item.id);
                            setActiveAction('request_revision');
                          }}
                          style={{ minHeight: 'var(--touch-target-min)', padding: '0.35rem 0.75rem', fontSize: 'var(--font-size-xs)' }}
                        >
                          Pedir corrección
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
                      style={{ minHeight: 'var(--touch-target-min)', padding: '0.35rem 0.75rem', fontSize: 'var(--font-size-xs)' }}
                    >
                      Corregir verificación
                    </Button>
                  )}
                </div>

                {/* Formulario de acción desplegado (Mobile-First) */}
                {isEditing && activeAction && (
                  <div
                    style={{
                      padding: 'var(--spacing-3)',
                      backgroundColor: 'var(--color-surface)',
                      border: '1.5px solid var(--color-primary)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--spacing-3)',
                      marginTop: 'var(--spacing-2)',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)' }}>
                      <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-primary)' }}>
                        {activeAction === 'verify' && 'Confirmar recepción de pago:'}
                        {activeAction === 'request_revision' && 'Pedir corrección a la familia:'}
                        {activeAction === 'reverse' && 'Corregir verificación:'}
                      </span>
                    </div>

                    {activeAction === 'verify' && (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                          gap: 'var(--spacing-3)',
                          width: '100%',
                          boxSizing: 'border-box',
                        }}
                      >
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
                            ? 'Ej: El comprobante adjunto no es legible o el importe difiere'
                            : 'Ej: Se constató un error bancario o rechazo de transferencia'
                        }
                        required
                      />
                    )}

                    <div
                      style={{
                        display: 'flex',
                        gap: 'var(--spacing-2)',
                        justifyContent: 'flex-end',
                        flexWrap: 'wrap',
                        marginTop: 'var(--spacing-1)',
                      }}
                    >
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setActiveParticipantId(null);
                          setActiveAction(null);
                          setInputReason('');
                        }}
                        style={{ minHeight: 'var(--touch-target-min)', padding: '0.35rem 0.75rem', fontSize: 'var(--font-size-xs)' }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="primary"
                        isLoading={loading}
                        onClick={() => handleExecuteAction(item.id)}
                        style={{ minHeight: 'var(--touch-target-min)', padding: '0.35rem 0.75rem', fontSize: 'var(--font-size-xs)' }}
                      >
                        Confirmar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          }))}
        </div>
      </Card>
    </section>
  );
};
