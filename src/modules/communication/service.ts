import { getAdminDb } from '@/server/firebase-admin';
import { WhatsAppTemplateType, WhatsAppMessageData, PreparedWhatsAppMessage } from './types';
import { OrganizerSessionContext, FamilyParticipant } from '@/modules/access/types';
import { EventModel } from '@/modules/events/types';
import { StageModel } from '@/modules/stages/types';
import { PaymentReport } from '@/modules/payments/types';
import { NotFoundError } from '@/server/errors';
import { validateOrganizerEventAccess } from '@/modules/access/organizer-service';

import { buildWhatsAppMessage } from './formatter';
export { buildWhatsAppMessage };

/**
 * Obtener lista de familias pendientes con sus mensajes de WhatsApp preparados (Regla S03)
 */
export async function getPendingFamiliesWhatsAppList(
  organizer: OrganizerSessionContext,
  eventId: string,
  filterType: 'stage_pending' | 'payment_pending' | 'all',
  stageId?: string
): Promise<{
  participantId: string;
  familyId: string;
  familyName: string;
  contactPhone?: string;
  contactEmail?: string;
  isPending: boolean;
  message: PreparedWhatsAppMessage;
}[]> {
  await validateOrganizerEventAccess(organizer, eventId, organizer.workspaceId);

  const db = getAdminDb();
  const eventRef = db
    .collection('workspaces')
    .doc(organizer.workspaceId)
    .collection('events')
    .doc(eventId);

  const eventDoc = await eventRef.get();
  if (!eventDoc.exists) throw new NotFoundError('Evento no encontrado.');
  const event = eventDoc.data() as EventModel;

  const partsSnap = await eventRef.collection('participants').where('status', '==', 'active').get();
  const participants = partsSnap.docs.map((d) => d.data() as FamilyParticipant);

  let stage: StageModel | null = null;
  const stageRespondedSet = new Set<string>();

  if (stageId) {
    const stageSnap = await eventRef.collection('stages').doc(stageId).get();
    if (stageSnap.exists) {
      stage = stageSnap.data() as StageModel;
      const respSnap = await stageSnap.ref.collection('responses').get();
      for (const d of respSnap.docs) stageRespondedSet.add(d.id);
    }
  }

  const paymentsSnap = await eventRef.collection('payments').get();
  const verifiedPaymentsSet = new Set<string>();
  for (const d of paymentsSnap.docs) {
    const p = d.data() as PaymentReport;
    if (p.status === 'verified') verifiedPaymentsSet.add(d.id);
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3000';

  const result = [];

  for (const p of participants) {
    let isPending = false;
    let templateType: WhatsAppTemplateType = 'INVITATION';

    if (filterType === 'stage_pending') {
      isPending = !stageRespondedSet.has(p.id);
      templateType = 'STAGE_REMINDER';
    } else if (filterType === 'payment_pending') {
      isPending = !verifiedPaymentsSet.has(p.id);
      templateType = 'PAYMENT_REMINDER';
    } else {
      isPending = true;
      templateType = 'INVITATION';
    }

    // Por seguridad, si el secreto no está expuesto en claro, usamos la ruta de acceso familiar general
    // o el enlace de recuperación si estuviera generado
    const accessUrl = `${appUrl}/f`;

    const message = buildWhatsAppMessage(templateType, {
      recipientName: p.familyName,
      recipientPhone: p.contactPhone,
      eventName: event.name,
      accessUrl,
      stageTitle: stage?.title,
      deadlineText: stage?.deadlineAt ? new Date(stage.deadlineAt).toLocaleDateString('es-UY') : undefined,
      amountText: (event.paymentConfig?.enabled && event.paymentConfig?.expectedAmountMinor)
        ? `$${(event.paymentConfig.expectedAmountMinor / 100).toLocaleString('es-UY')} ${event.paymentConfig.currency}`
        : undefined,
    });

    result.push({
      participantId: p.id,
      familyId: p.familyId,
      familyName: p.familyName,
      contactPhone: p.contactPhone,
      contactEmail: p.contactEmail,
      isPending,
      message,
    });
  }

  return result;
}
