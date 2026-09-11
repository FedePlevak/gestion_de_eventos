import React from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { StageAdminControls } from './StageAdminControls';
import { PaymentAdminSection } from './PaymentAdminSection';
import { WhatsAppAdminSection } from './WhatsAppAdminSection';
import { SupportAdminSection } from './SupportAdminSection';
import { ExportAdminSection } from './ExportAdminSection';

interface PageProps {
  params: {
    eventId: string;
  };
}

export default function AdminEventDetailPage({ params }: PageProps) {
  const isFiesta = params.eventId === 'fiesta-egresados-2026';
  const eventName = isFiesta ? 'Fiesta de Fin de Año 2026' : 'Asamblea Anual de Padres 2026';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header eventName={eventName} isOrganizer userBadge="organizador1@colegio.edu.uy" />
      <main className="app-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
          <Link
            href="/admin"
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-primary)',
              fontWeight: 600,
            }}
          >
            ← Volver a mis eventos
          </Link>
        </div>

        {/* Resumen del evento */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
          <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-primary)' }}>
            {eventName}
          </h2>
          <div style={{ display: 'flex', gap: 'var(--spacing-2)', flexWrap: 'wrap' }}>
            <Badge variant="success">En curso</Badge>
            <Badge variant="neutral">Zona: America/Montevideo</Badge>
            <Badge variant="info">80 Familias convocadas</Badge>
          </div>
        </section>

        {/* Resumen operativo de participación */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--spacing-3) var(--spacing-4)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 'var(--spacing-2)',
          }}
        >
          <div>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>Participación de Familias</span>
            <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-primary)' }}>
              62 de 80 familias han respondido las consultas
            </p>
          </div>
          <Badge variant="success">77.5% de respuesta</Badge>
        </div>

        {/* Sección de Etapas con controles administrativos reales */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>Etapas del Evento</h3>
          </div>

          <StageAdminControls
            eventId={params.eventId}
            initialStages={[
              {
                id: 'etapa_menu',
                title: '1. Elección del Plato Principal',
                type: 'single_choice',
                status: 'open',
                deadlineAt: '2026-09-20T23:59:00Z',
                responseCount: 62,
                readCount: 0,
                isSemanticallyLocked: true,
                clarifications: [],
              },
            ]}
          />
        </section>

        {/* Sección de Pagos y Aportes Familiares */}
        <PaymentAdminSection
          eventId={params.eventId}
          initialSummary={{
            totalFamilies: 10,
            expectedAmountPerFamilyMinor: 300000,
            currency: 'UYU',
            totalExpectedAmountMinor: 3000000,
            pendingCount: 8,
            reportedPendingCount: 1,
            reportedPendingAmountMinor: 300000,
            requiresRevisionCount: 0,
            verifiedCount: 1,
            verifiedTotalAmountMinor: 300000,
          }}
          initialPayments={[
            {
              id: 'part_fam_01',
              familyId: 'fam_01',
              familyName: 'Álvarez Pérez',
              contactEmail: 'familia.alvarez@ejemplo.com',
              payment: {
                id: 'part_fam_01',
                workspaceId: 'colegio-san-martin',
                eventId: params.eventId,
                participantId: 'part_fam_01',
                familyId: 'fam_01',
                familyName: 'Álvarez Pérez',
                status: 'verified',
                expectedAmountMinor: 300000,
                currency: 'UYU',
                verifiedAmountMinor: 300000,
                verifiedAt: new Date().toISOString(),
                verifiedBy: 'organizador1@colegio.edu.uy',
                version: 1,
                history: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            },
            {
              id: 'part_fam_02',
              familyId: 'fam_02',
              familyName: 'Bianchi Gómez',
              contactEmail: 'familia.bianchi@ejemplo.com',
              payment: {
                id: 'part_fam_02',
                workspaceId: 'colegio-san-martin',
                eventId: params.eventId,
                participantId: 'part_fam_02',
                familyId: 'fam_02',
                familyName: 'Bianchi Gómez',
                status: 'reported',
                expectedAmountMinor: 300000,
                currency: 'UYU',
                declaredAmountMinor: 300000,
                transferDate: new Date().toISOString().split('T')[0],
                version: 1,
                history: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            },
            {
              id: 'part_fam_03',
              familyId: 'fam_03',
              familyName: 'Cardozo Silva',
              contactEmail: 'familia.cardozo@ejemplo.com',
            },
          ]}
        />

        {/* Asistente de Comunicación y Plantillas WhatsApp (Regla S03) */}
        <WhatsAppAdminSection
          eventName={eventName}
          participants={[
            {
              id: 'part_fam_01',
              familyId: 'fam_01',
              familyName: 'Álvarez Pérez',
              contactPhone: '+59899123456',
              contactEmail: 'familia.alvarez@ejemplo.com',
            },
            {
              id: 'part_fam_02',
              familyId: 'fam_02',
              familyName: 'Bianchi Gómez',
              contactPhone: '+59899234567',
              contactEmail: 'familia.bianchi@ejemplo.com',
            },
            {
              id: 'part_fam_03',
              familyId: 'fam_03',
              familyName: 'Cardozo Silva',
              contactPhone: '+59899345678',
              contactEmail: 'familia.cardozo@ejemplo.com',
            },
          ]}
        />

        {/* Mesa de Ayuda y Consultas Familiares (Reglas S01, S02) */}
        <SupportAdminSection
          eventId={params.eventId}
          initialTickets={[
            {
              id: 'ticket_demo_01',
              workspaceId: 'colegio-san-martin',
              eventId: params.eventId,
              participantId: 'part_fam_01',
              familyId: 'fam_01',
              familyName: 'Álvarez Pérez',
              subject: 'Consulta menú celíaco',
              description: 'Hola, queríamos consultar si el menú de celíacos incluye postre sin TACC.',
              status: 'new',
              internalNotes: [
                {
                  id: 'note_1',
                  authorEmail: 'organizador1@colegio.edu.uy',
                  note: 'Verificado con el servicio de catering, sí incluye postre especial.',
                  createdAt: new Date().toISOString(),
                },
              ],
              createdAt: new Date(Date.now() - 3600000).toISOString(),
              updatedAt: new Date(Date.now() - 1800000).toISOString(),
            },
          ]}
        />

        {/* Exportación y Conciliación Final (Incremento 5) */}
        <ExportAdminSection eventId={params.eventId} />
      </main>
    </div>
  );
}
