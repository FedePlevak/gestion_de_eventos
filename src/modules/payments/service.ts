import { getAdminDb } from '@/server/firebase-admin';
import {
  PaymentReport,
  FinancialSummary,
  AttachmentMetadata,
  PaymentHistoryEntry,
  SubmitPaymentReportSchema,
  AdminVerifyPaymentSchema,
  AdminRequestRevisionSchema,
  AdminReverseVerificationSchema,
} from './types';
import { FamilySessionContext, OrganizerSessionContext, FamilyParticipant } from '@/modules/access/types';
import { EventModel } from '@/modules/events/types';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  PaymentLockedError,
  ForbiddenError,
} from '@/server/errors';
import { validateOrganizerEventAccess } from '@/modules/access/organizer-service';
import { recordAuditEvent } from '@/modules/audit/service';

/**
 * Obtener estado de pago para la familia
 */
export async function getFamilyPaymentStatus(session: FamilySessionContext): Promise<{
  enabled: boolean;
  currency: string;
  expectedAmountMinor: number;
  bankInstructions?: any;
  payment: PaymentReport;
}> {
  const db = getAdminDb();
  const eventDoc = await db
    .collection('workspaces')
    .doc(session.workspaceId)
    .collection('events')
    .doc(session.eventId)
    .get();

  if (!eventDoc.exists) {
    throw new NotFoundError('El evento no existe.');
  }

  const event = eventDoc.data() as EventModel;
  const config = event.paymentConfig;

  if (!config || !config.enabled) {
    return {
      enabled: false,
      currency: 'UYU',
      expectedAmountMinor: 0,
      payment: {
        id: session.participantId,
        workspaceId: session.workspaceId,
        eventId: session.eventId,
        participantId: session.participantId,
        familyId: session.familyId,
        familyName: session.familyName,
        status: 'pending',
        expectedAmountMinor: 0,
        currency: 'UYU',
        version: 1,
        history: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  }

  const paymentDoc = await db
    .collection('workspaces')
    .doc(session.workspaceId)
    .collection('events')
    .doc(session.eventId)
    .collection('payments')
    .doc(session.participantId)
    .get();

  const now = new Date().toISOString();

  let payment: PaymentReport;
  if (!paymentDoc.exists) {
    payment = {
      id: session.participantId,
      workspaceId: session.workspaceId,
      eventId: session.eventId,
      participantId: session.participantId,
      familyId: session.familyId,
      familyName: session.familyName,
      status: 'pending',
      expectedAmountMinor: config.expectedAmountMinor,
      currency: config.currency,
      version: 1,
      history: [],
      createdAt: now,
      updatedAt: now,
    };
  } else {
    payment = paymentDoc.data() as PaymentReport;
  }

  return {
    enabled: true,
    currency: config.currency,
    expectedAmountMinor: config.expectedAmountMinor,
    bankInstructions: config.bankInstructions,
    payment,
  };
}

/**
 * Informe de pago por la familia (Reglas P01, P02, P03, P04, P05)
 */
export async function submitFamilyPaymentReport(
  session: FamilySessionContext,
  data: {
    declaredAmountMinor: number;
    transferDate: string;
    reference?: string;
    attachment?: AttachmentMetadata;
    expectedVersion?: number;
  },
  expectedVersionArg?: number
): Promise<PaymentReport> {
  const effectiveExpectedVersion = expectedVersionArg !== undefined ? expectedVersionArg : data.expectedVersion;
  const parsed = SubmitPaymentReportSchema.parse({
    declaredAmountMinor: data.declaredAmountMinor,
    transferDate: data.transferDate,
    reference: data.reference,
    expectedVersion: effectiveExpectedVersion,
  });

  const db = getAdminDb();
  const eventRef = db
    .collection('workspaces')
    .doc(session.workspaceId)
    .collection('events')
    .doc(session.eventId);

  const paymentRef = eventRef.collection('payments').doc(session.participantId);

  return await db.runTransaction(async (transaction) => {
    const eventDoc = await transaction.get(eventRef);
    if (!eventDoc.exists) {
      throw new NotFoundError('El evento no existe.');
    }

    const event = eventDoc.data() as EventModel;
    if (!event.paymentConfig?.enabled) {
      throw new ValidationError('El cobro no está habilitado para este evento.');
    }

    const paymentDoc = await transaction.get(paymentRef);
    const now = new Date();

    let currentVersion = 1;
    let existingHistory: PaymentHistoryEntry[] = [];
    let isInitial = true;

    if (paymentDoc.exists) {
      const existing = paymentDoc.data() as PaymentReport;
      isInitial = false;

      // Regla P03 y P05: Si el pago ya fue verificado por el comité, bloquea edición familiar
      if (existing.status === 'verified') {
        throw new PaymentLockedError(
          'El pago ya fue verificado por el comité y no admite modificaciones.',
          'Tu aporte ya fue verificado por el comité. No es necesario realizar modificaciones.'
        );
      }

      // Control de concurrencia (Regla E12 / P05)
      if (parsed.expectedVersion !== undefined && existing.version !== parsed.expectedVersion) {
        throw new ConflictError(
          'Conflicto en actualización de pago.',
          'El estado del pago cambió recientemente. Por favor recargá la página antes de enviar.'
        );
      }

      currentVersion = (existing.version || 1) + 1;
      existingHistory = existing.history || [];
    }

    const historyEntry: PaymentHistoryEntry = {
      version: currentVersion,
      action: isInitial ? 'REPORTED' : 'REVISED',
      actor: {
        type: 'family',
        id: session.participantId,
      },
      declaredAmountMinor: parsed.declaredAmountMinor,
      transferDate: parsed.transferDate,
      attachmentFileName: data.attachment?.fileName,
      timestamp: now.toISOString(),
    };

    const updatedPayment: PaymentReport = {
      id: session.participantId,
      workspaceId: session.workspaceId,
      eventId: session.eventId,
      participantId: session.participantId,
      familyId: session.familyId,
      familyName: session.familyName,
      // Regla P02: Un pago informado deja estado pendiente de verificación
      status: 'reported',
      expectedAmountMinor: event.paymentConfig.expectedAmountMinor,
      currency: event.paymentConfig.currency,
      declaredAmountMinor: parsed.declaredAmountMinor,
      transferDate: parsed.transferDate,
      // Regla P02: Registra fecha declarada de transferencia y fecha real de presentación por separado
      reportedAt: now.toISOString(),
      reference: parsed.reference || '',
      attachment: data.attachment || (paymentDoc.exists ? paymentDoc.data()?.attachment : null),
      version: currentVersion,
      history: [...existingHistory, historyEntry],
      createdAt: paymentDoc.exists ? paymentDoc.data()?.createdAt : now.toISOString(),
      updatedAt: now.toISOString(),
    };

    transaction.set(paymentRef, updatedPayment);
    return updatedPayment;
  });
}

/**
 * Verificación administrativa de recepción por el comité (Reglas P06, P10)
 */
export async function verifyPaymentAdmin(
  organizer: OrganizerSessionContext,
  eventId: string,
  participantId: string,
  data?: { verifiedAmountMinor?: number; receptionDate?: string }
): Promise<PaymentReport> {
  await validateOrganizerEventAccess(organizer, eventId, organizer.workspaceId);

  const db = getAdminDb();
  const eventRef = db
    .collection('workspaces')
    .doc(organizer.workspaceId)
    .collection('events')
    .doc(eventId);

  const paymentRef = eventRef.collection('payments').doc(participantId);
  const participantRef = eventRef.collection('participants').doc(participantId);

  const result = await db.runTransaction(async (transaction) => {
    const eventDoc = await transaction.get(eventRef);
    if (!eventDoc.exists) throw new NotFoundError('El evento no existe.');
    const event = eventDoc.data() as EventModel;

    const paymentDoc = await transaction.get(paymentRef);
    const now = new Date();
    const effectiveReceptionDate = data?.receptionDate || now.toISOString().split('T')[0];

    let payment: PaymentReport;
    let isAdministrativeRecord = false;

    if (!paymentDoc.exists) {
      // Regla P10: Registro administrativo de recepción no aparece como informe de la familia
      const partDoc = await transaction.get(participantRef);
      if (!partDoc.exists) throw new NotFoundError('Participante no encontrado.');
      const part = partDoc.data() as FamilyParticipant;

      isAdministrativeRecord = true;
      const verifiedAmount = data?.verifiedAmountMinor || event.paymentConfig.expectedAmountMinor;

      const historyEntry: PaymentHistoryEntry = {
        version: 1,
        action: 'VERIFIED',
        actor: {
          type: 'organizer',
          id: organizer.organizerId,
          email: organizer.email,
        },
        declaredAmountMinor: verifiedAmount,
        transferDate: effectiveReceptionDate,
        reason: 'Recepción registrada directamente por administración',
        timestamp: now.toISOString(),
      };

      payment = {
        id: participantId,
        workspaceId: organizer.workspaceId,
        eventId,
        participantId,
        familyId: part.familyId,
        familyName: part.familyName,
        status: 'verified',
        expectedAmountMinor: event.paymentConfig.expectedAmountMinor,
        currency: event.paymentConfig.currency,
        verifiedAmountMinor: verifiedAmount,
        verifiedAt: now.toISOString(),
        verifiedBy: organizer.email,
        isAdministrativeRecord: true,
        version: 1,
        history: [historyEntry],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
    } else {
      const existing = paymentDoc.data() as PaymentReport;

      // Regla P06: Idempotencia: Si ya está verificado por el mismo monto, no duplicar
      const verifiedAmount = data?.verifiedAmountMinor || existing.declaredAmountMinor || event.paymentConfig.expectedAmountMinor;
      if (existing.status === 'verified' && existing.verifiedAmountMinor === verifiedAmount) {
        return existing;
      }

      const historyEntry: PaymentHistoryEntry = {
        version: (existing.version || 1) + 1,
        action: 'VERIFIED',
        actor: {
          type: 'organizer',
          id: organizer.organizerId,
          email: organizer.email,
        },
        declaredAmountMinor: verifiedAmount,
        transferDate: effectiveReceptionDate,
        timestamp: now.toISOString(),
      };

      payment = {
        ...existing,
        status: 'verified',
        verifiedAmountMinor: verifiedAmount,
        verifiedAt: now.toISOString(),
        verifiedBy: organizer.email,
        version: (existing.version || 1) + 1,
        history: [...(existing.history || []), historyEntry],
        updatedAt: now.toISOString(),
      };
    }

    transaction.set(paymentRef, payment);
    return payment;
  });

  await recordAuditEvent({
    workspaceId: organizer.workspaceId,
    eventId,
    actor: {
      type: 'organizer',
      id: organizer.organizerId,
      email: organizer.email,
    },
    action: 'PAYMENT_VERIFIED',
    targetType: 'payment',
    targetId: participantId,
    details: {
      verifiedAmountMinor: result.verifiedAmountMinor,
      isAdministrativeRecord: result.isAdministrativeRecord,
    },
  });

  return result;
}

/**
 * Solicitud de revisión del pago con motivo visible (Regla P05)
 */
export async function requestPaymentRevisionAdmin(
  organizer: OrganizerSessionContext,
  eventId: string,
  participantId: string,
  reason: string
): Promise<PaymentReport> {
  await validateOrganizerEventAccess(organizer, eventId, organizer.workspaceId);
  const parsed = AdminRequestRevisionSchema.parse({ reason });

  const db = getAdminDb();
  const paymentRef = db
    .collection('workspaces')
    .doc(organizer.workspaceId)
    .collection('events')
    .doc(eventId)
    .collection('payments')
    .doc(participantId);

  const result = await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(paymentRef);
    if (!doc.exists) {
      throw new NotFoundError('No se encontró un pago registrado para este participante.');
    }

    const existing = doc.data() as PaymentReport;
    if (existing.status === 'verified') {
      throw new ValidationError('Para solicitar revisión de un pago ya verificado, primero debe revertirse la verificación.');
    }

    const now = new Date().toISOString();
    const historyEntry: PaymentHistoryEntry = {
      version: (existing.version || 1) + 1,
      action: 'REQUESTED_REVISION',
      actor: {
        type: 'organizer',
        id: organizer.organizerId,
        email: organizer.email,
      },
      reason: parsed.reason,
      timestamp: now,
    };

    const updated: PaymentReport = {
      ...existing,
      status: 'requires_revision',
      revisionReason: parsed.reason,
      version: (existing.version || 1) + 1,
      history: [...(existing.history || []), historyEntry],
      updatedAt: now,
    };

    transaction.set(paymentRef, updated);
    return updated;
  });

  await recordAuditEvent({
    workspaceId: organizer.workspaceId,
    eventId,
    actor: {
      type: 'organizer',
      id: organizer.organizerId,
      email: organizer.email,
    },
    action: 'PAYMENT_REVISION_REQUESTED',
    targetType: 'payment',
    targetId: participantId,
    details: { reason: parsed.reason },
  });

  return result;
}

/**
 * Reversión justificada de verificación (Regla P07)
 */
export async function reverseVerificationAdmin(
  organizer: OrganizerSessionContext,
  eventId: string,
  participantId: string,
  reason: string
): Promise<PaymentReport> {
  await validateOrganizerEventAccess(organizer, eventId, organizer.workspaceId);
  const parsed = AdminReverseVerificationSchema.parse({ reason });

  const db = getAdminDb();
  const paymentRef = db
    .collection('workspaces')
    .doc(organizer.workspaceId)
    .collection('events')
    .doc(eventId)
    .collection('payments')
    .doc(participantId);

  const result = await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(paymentRef);
    if (!doc.exists) throw new NotFoundError('Pago no encontrado.');

    const existing = doc.data() as PaymentReport;
    if (existing.status !== 'verified') {
      throw new ValidationError('El pago no está verificado actualmente.');
    }

    const now = new Date().toISOString();
    const historyEntry: PaymentHistoryEntry = {
      version: (existing.version || 1) + 1,
      action: 'VERIFICATION_REVERSED',
      actor: {
        type: 'organizer',
        id: organizer.organizerId,
        email: organizer.email,
      },
      reason: parsed.reason,
      timestamp: now,
    };

    const updated: PaymentReport = {
      ...existing,
      status: 'requires_revision',
      revisionReason: parsed.reason,
      verifiedAt: undefined,
      verifiedBy: undefined,
      verifiedAmountMinor: undefined,
      version: (existing.version || 1) + 1,
      history: [...(existing.history || []), historyEntry],
      updatedAt: now,
    };

    transaction.set(paymentRef, updated);
    return updated;
  });

  await recordAuditEvent({
    workspaceId: organizer.workspaceId,
    eventId,
    actor: {
      type: 'organizer',
      id: organizer.organizerId,
      email: organizer.email,
    },
    action: 'PAYMENT_VERIFICATION_REVERSED',
    targetType: 'payment',
    targetId: participantId,
    details: { reason: parsed.reason },
  });

  return result;
}

/**
 * Obtener resumen financiero del evento para el comité (Reglas P01, P04, P06)
 */
export async function getEventFinancialSummary(
  organizer: OrganizerSessionContext,
  eventId: string
): Promise<FinancialSummary> {
  await validateOrganizerEventAccess(organizer, eventId, organizer.workspaceId);

  const db = getAdminDb();
  const eventRef = db
    .collection('workspaces')
    .doc(organizer.workspaceId)
    .collection('events')
    .doc(eventId);

  const eventDoc = await eventRef.get();
  if (!eventDoc.exists) throw new NotFoundError('El evento no existe.');
  const event = eventDoc.data() as EventModel;

  const expectedAmountPerFamily = event.paymentConfig?.expectedAmountMinor || 0;
  const currency = event.paymentConfig?.currency || 'UYU';

  const participantsSnap = await eventRef.collection('participants').where('status', '==', 'active').get();
  const totalFamilies = participantsSnap.docs.length;

  const paymentsSnap = await eventRef.collection('payments').get();
  const payments = paymentsSnap.docs.map((d) => d.data() as PaymentReport);

  let verifiedCount = 0;
  let verifiedTotalAmountMinor = 0;
  let reportedPendingCount = 0;
  let reportedPendingAmountMinor = 0;
  let requiresRevisionCount = 0;

  for (const p of payments) {
    if (p.status === 'verified') {
      verifiedCount++;
      verifiedTotalAmountMinor += p.verifiedAmountMinor || p.expectedAmountMinor;
    } else if (p.status === 'reported') {
      reportedPendingCount++;
      reportedPendingAmountMinor += p.declaredAmountMinor || 0;
    } else if (p.status === 'requires_revision') {
      requiresRevisionCount++;
    }
  }

  const pendingCount = Math.max(0, totalFamilies - (verifiedCount + reportedPendingCount + requiresRevisionCount));

  return {
    totalFamilies,
    expectedAmountPerFamilyMinor: expectedAmountPerFamily,
    currency,
    totalExpectedAmountMinor: totalFamilies * expectedAmountPerFamily,
    pendingCount,
    reportedPendingCount,
    reportedPendingAmountMinor,
    requiresRevisionCount,
    verifiedCount,
    verifiedTotalAmountMinor,
  };
}

/**
 * Listado de todos los participantes y su estado de cobro para la tabla de administración
 */
export async function getAllEventPaymentsAdmin(
  organizer: OrganizerSessionContext,
  eventId: string
): Promise<(FamilyParticipant & { payment?: PaymentReport })[]> {
  await validateOrganizerEventAccess(organizer, eventId, organizer.workspaceId);

  const db = getAdminDb();
  const eventRef = db
    .collection('workspaces')
    .doc(organizer.workspaceId)
    .collection('events')
    .doc(eventId);

  const partsSnap = await eventRef.collection('participants').get();
  const paymentsSnap = await eventRef.collection('payments').get();

  const paymentMap = new Map<string, PaymentReport>();
  for (const doc of paymentsSnap.docs) {
    paymentMap.set(doc.id, doc.data() as PaymentReport);
  }

  return partsSnap.docs.map((doc) => {
    const part = doc.data() as FamilyParticipant;
    return {
      ...part,
      payment: paymentMap.get(doc.id),
    };
  });
}
