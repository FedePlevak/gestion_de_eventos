import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { Header } from '@/components/Header';
import { getAdminDb } from '@/server/firebase-admin';
import {
  getOrganizerContextFromCookies,
  validateOrganizerEventAccess,
} from '@/modules/access/organizer-service';
import { OrganizerEventTabs } from './OrganizerEventTabs';

interface PageProps {
  params: {
    eventId: string;
  };
}

export const dynamic = 'force-dynamic';

export default async function AdminEventDetailPage({ params }: PageProps) {
  const cookieStore = cookies();
  const headerStore = headers();
  let organizerContext;

  try {
    organizerContext = await getOrganizerContextFromCookies(cookieStore, headerStore);
  } catch (error) {
    console.error('Error de autenticación al cargar /admin/events/[eventId]:', error);
    redirect('/admin');
  }

  let workspaceId = organizerContext.workspaceId || 'principal';

  // Validar membresía activa del organizador en el evento y espacio autorizados (Reglas A04 y A05)
  try {
    await validateOrganizerEventAccess(organizerContext, params.eventId, workspaceId);
  } catch (error) {
    // Si no está en su workspace principal, verificar si el evento existe en otro workspace donde sí tenga membresía
    const db = getAdminDb();
    let foundAccess = false;
    try {
      const wsSnap = await db.collection('workspaces').get();
      for (const ws of wsSnap.docs) {
        if (ws.id === workspaceId) continue;
        try {
          await validateOrganizerEventAccess(organizerContext, params.eventId, ws.id);
          workspaceId = ws.id;
          foundAccess = true;
          break;
        } catch {
          // continuar con el siguiente
        }
      }
    } catch {
      // ignorar
    }

    if (!foundAccess) {
      console.warn('Acceso denegado a organizador para el evento:', {
        organizer: organizerContext.email,
        eventId: params.eventId,
        workspaceId,
      });
      notFound();
    }
  }

  const db = getAdminDb();
  const eventRef = db
    .collection('workspaces')
    .doc(workspaceId)
    .collection('events')
    .doc(params.eventId);
  const eventDoc = await eventRef.get();

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
    classCode: d.data().classCode || undefined,
    customFields: d.data().customFields || undefined,
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
        <OrganizerEventTabs
          eventId={params.eventId}
          eventName={eventName}
          eventData={eventData}
          stages={stages}
          participants={participants}
          paymentConfig={{
            enabled: Boolean(config.enabled),
            expectedAmountMinor: config.expectedAmountMinor || 0,
            currency: config.currency || 'UYU',
            bankInstructions: config.bankInstructions,
          }}
          initialSummary={initialSummary}
          initialPayments={initialPayments}
          initialTickets={initialTickets}
        />
      </main>
    </div>
  );
}
