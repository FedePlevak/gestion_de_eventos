import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { getAdminDb } from '@/server/firebase-admin';
import { StageAdminControls } from './StageAdminControls';
import { PaymentAdminSection } from './PaymentAdminSection';
import { WhatsAppAdminSection } from './WhatsAppAdminSection';
import { SupportAdminSection } from './SupportAdminSection';
import { ExportAdminSection } from './ExportAdminSection';
import { ParticipantImportSection } from './ParticipantImportSection';
import { OrganizerTeamSection } from './OrganizerTeamSection';

interface PageProps {
  params: {
    eventId: string;
  };
}

export const dynamic = 'force-dynamic';

export default async function AdminEventDetailPage({ params }: PageProps) {
  const db = getAdminDb();
  let workspaceId = 'principal';
  let eventRef = db.collection('workspaces').doc(workspaceId).collection('events').doc(params.eventId);
  let eventDoc = await eventRef.get();

  // Si no está en principal, buscar en otros workspaces (ej. en caso de datos de tests)
  if (!eventDoc.exists) {
    const wsSnap = await db.collection('workspaces').get();
    for (const ws of wsSnap.docs) {
      const eDoc = await ws.ref.collection('events').doc(params.eventId).get();
      if (eDoc.exists) {
        workspaceId = ws.id;
        eventRef = ws.ref.collection('events').doc(params.eventId);
        eventDoc = eDoc;
        break;
      }
    }
  }

  if (!eventDoc.exists) {
    notFound();
  }

  const eventData = eventDoc.data()!;
  const eventName = eventData.name || 'Evento sin título';

  const stagesSnap = await eventRef.collection('stages').orderBy('order').get();
  const stages = stagesSnap.docs.map((d) => {
    const s = d.data();
    return {
      id: d.id,
      title: s.title,
      description: s.description || '',
      type: s.type,
      status: s.status || 'open',
      visibility: s.visibility || 'hidden',
      order: s.order ?? 1,
      deadlineAt: s.deadlineAt || undefined,
      responseCount: s.responseCount || 0,
      readCount: s.readCount || 0,
      isSemanticallyLocked: Boolean(s.isSemanticallyLocked),
      options: s.options || [],
      clarifications: s.clarifications || [],
    };
  });

  // 2. Obtener participantes activos
  const partsSnap = await eventRef.collection('participants').where('status', '==', 'active').get();
  const participants = partsSnap.docs.map((d) => ({
    id: d.id,
    familyId: d.data().familyId,
    familyName: d.data().familyName,
    contactPhone: d.data().contactPhone,
    contactEmail: d.data().contactEmail,
    secret: d.data().tokenHash,
  }));

  // 3. Obtener pagos
  const paymentsSnap = await eventRef.collection('payments').get();
  const paymentsMap = new Map<string, any>();
  paymentsSnap.docs.forEach((d) => paymentsMap.set(d.id, d.data()));

  const config = eventData.paymentConfig || {};
  const expectedAmountMinor = config.expectedAmountMinor || 0;
  const currency = config.currency || 'UYU';

  let pendingCount = 0;
  let reportedPendingCount = 0;
  let reportedPendingAmountMinor = 0;
  let verifiedCount = 0;
  let verifiedTotalAmountMinor = 0;

  const initialPayments = participants.map((p) => {
    const pRecord = paymentsMap.get(p.id);
    if (!pRecord || pRecord.status === 'pending') {
      pendingCount++;
    } else if (pRecord.status === 'reported') {
      reportedPendingCount++;
      reportedPendingAmountMinor += pRecord.declaredAmountMinor || expectedAmountMinor;
    } else if (pRecord.status === 'verified') {
      verifiedCount++;
      verifiedTotalAmountMinor += pRecord.verifiedAmountMinor || expectedAmountMinor;
    }
    return {
      id: p.id,
      familyId: p.familyId,
      familyName: p.familyName,
      contactEmail: p.contactEmail,
      payment: pRecord || undefined,
    };
  });

  const initialSummary = {
    totalFamilies: participants.length,
    expectedAmountPerFamilyMinor: expectedAmountMinor,
    currency,
    totalExpectedAmountMinor: participants.length * expectedAmountMinor,
    pendingCount,
    reportedPendingCount,
    reportedPendingAmountMinor,
    requiresRevisionCount: 0,
    verifiedCount,
    verifiedTotalAmountMinor,
  };

  // 4. Obtener tickets de soporte
  const ticketsSnap = await eventRef.collection('support_tickets').get();
  const initialTickets = ticketsSnap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as any[];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header eventName={eventName} isOrganizer />
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
          {eventData.description && (
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
              {eventData.description}
            </p>
          )}
          <div style={{ display: 'flex', gap: 'var(--spacing-2)', flexWrap: 'wrap' }}>
            <Badge variant="success">Activo</Badge>
            <Badge variant="neutral">Zona: {eventData.timezone || 'America/Montevideo'}</Badge>
            <Badge variant="info">{participants.length} Familias convocadas</Badge>
            {eventData.eventDate && (
              <Badge variant="neutral">
                Fecha: {new Date(eventData.eventDate).toLocaleDateString('es-UY', { dateStyle: 'medium' })}
              </Badge>
            )}
          </div>
        </section>

        {/* Sección 1: Convocatoria e Importación de Familias (Excel/CSV y manual) */}
        <ParticipantImportSection eventId={params.eventId} />

        {/* Sección 2: Equipo Organizador del Evento */}
        <OrganizerTeamSection eventId={params.eventId} />

        {/* Sección 3: Etapas del Evento y Votación en Vivo */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>Consultas y Etapas del Evento</h3>
          </div>

          <StageAdminControls eventId={params.eventId} initialStages={stages} />
        </section>

        {/* Sección 4: Asistente de Comunicación y Enlaces WhatsApp */}
        <WhatsAppAdminSection eventName={eventName} participants={participants} />

        {/* Sección 5: Pagos y Aportes Financieros (si está habilitado) */}
        {config.enabled && (
          <PaymentAdminSection
            eventId={params.eventId}
            initialSummary={initialSummary}
            initialPayments={initialPayments}
          />
        )}

        {/* Sección 6: Mesa de Ayuda y Consultas Familiares */}
        <SupportAdminSection eventId={params.eventId} initialTickets={initialTickets} />

        {/* Sección 7: Exportación y Descarga de Planillas (RFC 4180 / Excel UTF-8 BOM) */}
        <ExportAdminSection eventId={params.eventId} />
      </main>
    </div>
  );
}
