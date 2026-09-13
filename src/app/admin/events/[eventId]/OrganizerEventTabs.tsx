'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { StageCountdown } from '@/components/StageCountdown';
import { StageAdminControls } from './StageAdminControls';
import { PaymentAdminSection } from './PaymentAdminSection';
import { WhatsAppAdminSection } from './WhatsAppAdminSection';
import { SupportAdminSection } from './SupportAdminSection';
import { ExportAdminSection } from './ExportAdminSection';
import { ParticipantImportSection } from './ParticipantImportSection';
import { OrganizerTeamSection } from './OrganizerTeamSection';
import { DeleteEventSection } from './DeleteEventSection';

import { PaymentConfig } from '@/modules/events/types';

export type TabKey = 'resumen' | 'etapas' | 'pagos' | 'familias' | 'soporte' | 'ajustes';

interface Props {
  eventId: string;
  eventName: string;
  eventData: {
    description?: string;
    timezone?: string;
    eventDate?: string;
    [key: string]: any;
  };
  stages: any[];
  participants: any[];
  paymentConfig: PaymentConfig;
  initialSummary: {
    totalFamilies: number;
    expectedAmountPerFamilyMinor: number;
    currency: string;
    totalExpectedAmountMinor: number;
    pendingCount: number;
    reportedPendingCount: number;
    reportedPendingAmountMinor: number;
    requiresRevisionCount: number;
    verifiedCount: number;
    verifiedTotalAmountMinor: number;
  };
  initialPayments: any[];
  initialTickets: any[];
}

export const OrganizerEventTabs: React.FC<Props> = ({
  eventId,
  eventName,
  eventData,
  stages,
  participants,
  paymentConfig,
  initialSummary,
  initialPayments,
  initialTickets,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('resumen');

  // Sincronizar tab con hash de la URL (#resumen, #etapas, #pagos, etc.)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '') as TabKey;
      if (['resumen', 'etapas', 'pagos', 'familias', 'soporte', 'ajustes'].includes(hash)) {
        setActiveTab(hash);
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const changeTab = (tab: TabKey) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      window.location.hash = tab;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Métricas calculadas para el dashboard
  const activeStages = useMemo(() => stages.filter((s) => s.visibility === 'visible' || s.visibility === 'public'), [stages]);
  const totalResponses = useMemo(() => stages.reduce((acc, s) => acc + (s.responseCount || 0), 0), [stages]);
  const totalViews = useMemo(() => stages.reduce((acc, s) => acc + (s.readCount || 0), 0), [stages]);

  const openTickets = useMemo(
    () => initialTickets.filter((t) => t.status !== 'resolved'),
    [initialTickets]
  );

  const percentCollected = useMemo(() => {
    if (!initialSummary.totalExpectedAmountMinor || initialSummary.totalExpectedAmountMinor <= 0) return 0;
    return Math.min(100, Math.round((initialSummary.verifiedTotalAmountMinor / initialSummary.totalExpectedAmountMinor) * 100));
  }, [initialSummary]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', width: '100%' }}>
      {/* Navegación de retorno */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--spacing-2)' }}>
        <Link
          href="/admin"
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-primary)',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          ← Volver a mis eventos
        </Link>
      </div>

      {/* Encabezado del Evento */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
        <h2
          style={{
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 800,
            color: 'var(--color-primary)',
            lineHeight: 'var(--line-height-tight)',
            wordBreak: 'break-word',
          }}
        >
          {eventName}
        </h2>
        {eventData.description && (
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
            {eventData.description}
          </p>
        )}
        <div style={{ display: 'flex', gap: 'var(--spacing-2)', flexWrap: 'wrap', alignItems: 'center' }}>
          <Badge variant="success">Activo</Badge>
          <Badge variant="info">{participants.length} Familias convocadas</Badge>
          {eventData.eventDate && (
            <Badge variant="neutral">
              📅 {new Date(eventData.eventDate).toLocaleDateString('es-UY', { dateStyle: 'medium' })}
            </Badge>
          )}
          <Badge variant="neutral">Zona: {eventData.timezone || 'America/Montevideo'}</Badge>
        </div>
      </section>

      {/* Menú de Navegación Mobile-First (Rondia Accessible Tab Bar) */}
      <nav
        aria-label="Secciones del evento"
        style={{
          position: 'sticky',
          top: '56px',
          zIndex: 8,
          backgroundColor: 'var(--color-background)',
          paddingTop: 'var(--spacing-2)',
          paddingBottom: 'var(--spacing-2)',
          marginTop: '-0.25rem',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div
          role="tablist"
          style={{
            display: 'flex',
            gap: 'var(--spacing-2)',
            flexWrap: 'wrap',
            paddingBottom: '2px',
          }}
        >
          {/* Pestaña 1: Resumen */}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'resumen'}
            onClick={() => changeTab('resumen')}
            style={{
              minHeight: 'var(--touch-target-min)',
              padding: '0.5rem 0.9rem',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: activeTab === 'resumen' ? 700 : 600,
              backgroundColor: activeTab === 'resumen' ? 'var(--color-primary)' : 'var(--color-surface)',
              color: activeTab === 'resumen' ? 'var(--color-text-on-primary)' : 'var(--color-text-main)',
              border: activeTab === 'resumen' ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'resumen' ? 'var(--shadow-sm)' : 'none',
              transition: 'background-color var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast)',
            }}
          >
            <span>Resumen</span>
          </button>

          {/* Pestaña 2: Consultas */}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'etapas'}
            onClick={() => changeTab('etapas')}
            style={{
              minHeight: 'var(--touch-target-min)',
              padding: '0.5rem 0.9rem',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: activeTab === 'etapas' ? 700 : 600,
              backgroundColor: activeTab === 'etapas' ? 'var(--color-primary)' : 'var(--color-surface)',
              color: activeTab === 'etapas' ? 'var(--color-text-on-primary)' : 'var(--color-text-main)',
              border: activeTab === 'etapas' ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'etapas' ? 'var(--shadow-sm)' : 'none',
              transition: 'background-color var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast)',
            }}
          >
            <span>Consultas</span>
            <span
              style={{
                fontVariantNumeric: 'tabular-nums',
                fontSize: 'var(--font-size-xs)',
                opacity: 0.85,
              }}
            >
              ({stages.length})
            </span>
          </button>

          {/* Pestaña 3: Pagos */}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'pagos'}
            onClick={() => changeTab('pagos')}
            style={{
              minHeight: 'var(--touch-target-min)',
              padding: '0.5rem 0.9rem',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: activeTab === 'pagos' ? 700 : 600,
              backgroundColor: activeTab === 'pagos' ? 'var(--color-primary)' : 'var(--color-surface)',
              color: activeTab === 'pagos' ? 'var(--color-text-on-primary)' : 'var(--color-text-main)',
              border: activeTab === 'pagos' ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'pagos' ? 'var(--shadow-sm)' : 'none',
              transition: 'background-color var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast)',
            }}
          >
            <span>Pagos</span>
            {initialSummary.reportedPendingCount > 0 && (
              <span
                style={{
                  backgroundColor: activeTab === 'pagos' ? '#ffffff' : 'var(--color-info-bg)',
                  color: activeTab === 'pagos' ? 'var(--color-primary)' : 'var(--color-info-text)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-full)',
                  padding: '0.1rem 0.45rem',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {initialSummary.reportedPendingCount}
              </span>
            )}
          </button>

          {/* Pestaña 4: Familias */}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'familias'}
            onClick={() => changeTab('familias')}
            style={{
              minHeight: 'var(--touch-target-min)',
              padding: '0.5rem 0.9rem',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: activeTab === 'familias' ? 700 : 600,
              backgroundColor: activeTab === 'familias' ? 'var(--color-primary)' : 'var(--color-surface)',
              color: activeTab === 'familias' ? 'var(--color-text-on-primary)' : 'var(--color-text-main)',
              border: activeTab === 'familias' ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'familias' ? 'var(--shadow-sm)' : 'none',
              transition: 'background-color var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast)',
            }}
          >
            <span>Familias</span>
            <span
              style={{
                fontVariantNumeric: 'tabular-nums',
                fontSize: 'var(--font-size-xs)',
                opacity: 0.85,
              }}
            >
              ({participants.length})
            </span>
          </button>

          {/* Pestaña 5: Ayuda */}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'soporte'}
            onClick={() => changeTab('soporte')}
            style={{
              minHeight: 'var(--touch-target-min)',
              padding: '0.5rem 0.9rem',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: activeTab === 'soporte' ? 700 : 600,
              backgroundColor: activeTab === 'soporte' ? 'var(--color-primary)' : 'var(--color-surface)',
              color: activeTab === 'soporte' ? 'var(--color-text-on-primary)' : 'var(--color-text-main)',
              border: activeTab === 'soporte' ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'soporte' ? 'var(--shadow-sm)' : 'none',
              transition: 'background-color var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast)',
            }}
          >
            <span>Ayuda</span>
            {openTickets.length > 0 && (
              <span
                style={{
                  backgroundColor: activeTab === 'soporte' ? '#ffffff' : 'var(--color-warning-bg)',
                  color: activeTab === 'soporte' ? 'var(--color-primary)' : 'var(--color-warning-text)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-full)',
                  padding: '0.1rem 0.45rem',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {openTickets.length}
              </span>
            )}
          </button>

          {/* Pestaña 6: Ajustes */}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'ajustes'}
            onClick={() => changeTab('ajustes')}
            style={{
              minHeight: 'var(--touch-target-min)',
              padding: '0.5rem 0.9rem',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: activeTab === 'ajustes' ? 700 : 600,
              backgroundColor: activeTab === 'ajustes' ? 'var(--color-primary)' : 'var(--color-surface)',
              color: activeTab === 'ajustes' ? 'var(--color-text-on-primary)' : 'var(--color-text-main)',
              border: activeTab === 'ajustes' ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'ajustes' ? 'var(--shadow-sm)' : 'none',
              transition: 'background-color var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast)',
            }}
          >
            <span>Ajustes</span>
          </button>
        </div>
      </nav>

      {/* CONTENIDO SEGÚN LA PESTAÑA ACTIVA */}

      {/* 1. DASHBOARD PRINCIPAL / RESUMEN */}
      {activeTab === 'resumen' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          {/* Alertas accionables prioritarias */}
          {initialSummary.reportedPendingCount > 0 && (
            <div
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1.5px solid var(--color-info)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--spacing-3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--spacing-3)',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-info)' }}>
                  Pagos pendientes de verificación
                </span>
                <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                  Hay {initialSummary.reportedPendingCount} familia(s) que informó transferencia por un total de{' '}
                  {initialSummary.currency} ${(initialSummary.reportedPendingAmountMinor / 100).toLocaleString('es-UY')}.
                </p>
              </div>
              <Button
                variant="primary"
                onClick={() => changeTab('pagos')}
                style={{ minHeight: 'var(--touch-target-min)', padding: '0.4rem 0.9rem', fontSize: 'var(--font-size-xs)' }}
              >
                Ir a verificar pagos
              </Button>
            </div>
          )}

          {openTickets.length > 0 && (
            <div
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-warning-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--spacing-3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--spacing-3)',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-warning-text)' }}>
                  Consultas de familias
                </span>
                <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                  Hay {openTickets.length} consulta(s) abierta(s) en la mesa de ayuda esperando respuesta.
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => changeTab('soporte')}
                style={{ minHeight: 'var(--touch-target-min)', padding: '0.4rem 0.9rem', fontSize: 'var(--font-size-xs)' }}
              >
                Ver consultas
              </Button>
            </div>
          )}

          {/* Métricas Principales (KPI Cards) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 'var(--spacing-3)',
            }}
          >
            {/* Card 1: Familias */}
            <div
              onClick={() => changeTab('familias')}
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--spacing-3)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-1)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)', fontWeight: 600 }}>
                Familias
              </span>
              <span style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-primary)', fontVariantNumeric: 'tabular-nums' }}>
                {participants.length}
              </span>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
                Convocadas con enlace único
              </span>
            </div>

            {/* Card 2: Consultas Activas */}
            <div
              onClick={() => changeTab('etapas')}
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--spacing-3)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-1)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)', fontWeight: 600 }}>
                Consultas activas
              </span>
              <span style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-primary)', fontVariantNumeric: 'tabular-nums' }}>
                {activeStages.length}{' '}
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-text-subtle)' }}>
                  / {stages.length}
                </span>
              </span>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)', fontVariantNumeric: 'tabular-nums' }}>
                {totalResponses} respuestas recibidas
              </span>
            </div>

            {/* Card 3: Recaudación Cuota */}
            <div
              onClick={() => changeTab('pagos')}
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--spacing-3)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-1)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)', fontWeight: 600 }}>
                Recaudación
              </span>
              <span style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--color-success-text)', fontVariantNumeric: 'tabular-nums' }}>
                ${(initialSummary.verifiedTotalAmountMinor / 100).toLocaleString('es-UY')} {initialSummary.currency}
              </span>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)', fontVariantNumeric: 'tabular-nums' }}>
                {initialSummary.verifiedCount} de {participants.length} verificadas ({percentCollected}%)
              </span>
            </div>

            {/* Card 4: Visualizaciones */}
            <div
              onClick={() => changeTab('etapas')}
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--spacing-3)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-1)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)', fontWeight: 600 }}>
                Lecturas
              </span>
              <span style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-text-main)', fontVariantNumeric: 'tabular-nums' }}>
                {totalViews}
              </span>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
                Aperturas de consultas
              </span>
            </div>
          </div>

          {/* Accesos Rápidos */}
          <Card title="Accesos rápidos para el organizador">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: 'var(--spacing-2)',
              }}
            >
              <Button
                variant="outline"
                onClick={() => changeTab('etapas')}
                style={{
                  minHeight: 'var(--touch-target-min)',
                  justifyContent: 'flex-start',
                  fontSize: 'var(--font-size-sm)',
                  textAlign: 'left',
                  padding: '0.5rem 0.75rem',
                }}
              >
                Crear o editar consultas
              </Button>
              <Button
                variant="outline"
                onClick={() => changeTab('pagos')}
                style={{
                  minHeight: 'var(--touch-target-min)',
                  justifyContent: 'flex-start',
                  fontSize: 'var(--font-size-sm)',
                  textAlign: 'left',
                  padding: '0.5rem 0.75rem',
                }}
              >
                Verificar aportes y cuota
              </Button>
              <Button
                variant="outline"
                onClick={() => changeTab('familias')}
                style={{
                  minHeight: 'var(--touch-target-min)',
                  justifyContent: 'flex-start',
                  fontSize: 'var(--font-size-sm)',
                  textAlign: 'left',
                  padding: '0.5rem 0.75rem',
                }}
              >
                Enviar enlaces por WhatsApp
              </Button>
              <Button
                variant="outline"
                onClick={() => changeTab('familias')}
                style={{
                  minHeight: 'var(--touch-target-min)',
                  justifyContent: 'flex-start',
                  fontSize: 'var(--font-size-sm)',
                  textAlign: 'left',
                  padding: '0.5rem 0.75rem',
                }}
              >
                Cargar participantes (Excel/CSV)
              </Button>
            </div>
          </Card>

          {/* Estado de Etapas Abiertas y Publicadas */}
          <Card title={`Consultas activas de cara a las familias (${activeStages.length})`}>
            {activeStages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--spacing-4)', color: 'var(--color-text-subtle)' }}>
                <p style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}>
                  Aún no hay consultas publicadas para las familias en este evento.
                </p>
                <div style={{ marginTop: 'var(--spacing-2)' }}>
                  <Button variant="primary" onClick={() => changeTab('etapas')}>
                    Publicar o crear una consulta
                  </Button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                {activeStages.map((st) => (
                  <div
                    key={st.id}
                    style={{
                      padding: 'var(--spacing-3)',
                      backgroundColor: 'var(--color-surface-subtle)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--spacing-2)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--spacing-2)', flexWrap: 'wrap' }}>
                      <div>
                        <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-primary)' }}>
                          Orden #{st.order} • {st.type === 'vote' ? 'Votación' : st.type === 'date_survey' ? 'Encuesta de fechas' : 'Consulta'}
                        </span>
                        <h4 style={{ margin: '0.2rem 0', fontSize: 'var(--font-size-base)', fontWeight: 700 }}>
                          {st.title}
                        </h4>
                      </div>

                      <div style={{ display: 'flex', gap: 'var(--spacing-1)', alignItems: 'center', flexWrap: 'wrap' }}>
                        <Badge variant="success">Visible</Badge>
                        {st.status === 'closed' && <Badge variant="neutral">Cerrada</Badge>}
                      </div>
                    </div>

                    {/* Cuenta regresiva de vencimiento si existe */}
                    {st.deadlineAt && (
                      <div style={{ marginTop: '0.1rem' }}>
                        <StageCountdown deadlineAt={st.deadlineAt} variant="compact" />
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-2)', paddingTop: 'var(--spacing-1)', borderTop: '1px solid var(--color-border)' }}>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)', fontVariantNumeric: 'tabular-nums' }}>
                        <strong>{st.responseCount || 0}</strong> respuestas recibidas • <strong>{st.readCount || 0}</strong> lecturas
                      </span>

                      <Button
                        variant="secondary"
                        onClick={() => changeTab('etapas')}
                        style={{ minHeight: 'var(--touch-target-min)', padding: '0.35rem 0.75rem', fontSize: 'var(--font-size-xs)' }}
                      >
                        Gestionar consulta →
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* 2. PESTAÑA ETAPAS Y VOTACIONES */}
      {activeTab === 'etapas' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-primary)' }}>
              Consultas del evento
            </h3>
          </div>
          <StageAdminControls eventId={eventId} initialStages={stages} />
        </section>
      )}

      {/* 3. PESTAÑA CUOTA Y PAGOS */}
      {activeTab === 'pagos' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
          <PaymentAdminSection
            eventId={eventId}
            initialConfig={paymentConfig}
            initialSummary={initialSummary}
            initialPayments={initialPayments}
          />
        </section>
      )}

      {/* 4. PESTAÑA FAMILIAS Y ENLACES (WhatsApp + Importación) */}
      {activeTab === 'familias' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          {/* Asistente de Enlaces y WhatsApp */}
          <WhatsAppAdminSection eventName={eventName} participants={participants} />

          {/* Importación y Gestión de Participantes */}
          <ParticipantImportSection eventId={eventId} />
        </section>
      )}

      {/* 5. PESTAÑA MESA DE AYUDA */}
      {activeTab === 'soporte' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
          <SupportAdminSection eventId={eventId} initialTickets={initialTickets} />
        </section>
      )}

      {/* 6. PESTAÑA AJUSTES Y EQUIPO */}
      {activeTab === 'ajustes' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          {/* Equipo Organizador */}
          <OrganizerTeamSection eventId={eventId} />

          {/* Exportación de Planillas */}
          <ExportAdminSection eventId={eventId} />

          {/* Zona de Peligro - Eliminar Evento */}
          <DeleteEventSection
            eventId={eventId}
            eventName={eventName}
            stageCount={stages.length}
            participantCount={participants.length}
          />
        </section>
      )}
    </div>
  );
};
