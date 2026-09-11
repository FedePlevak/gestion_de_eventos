import { getAdminDb } from '@/server/firebase-admin';
import { EventModel, ParticipantModel, PaymentConfig } from './types';
import { GroupMember } from '../groups/types';
import { generateRawSecret, hashFamilySecret } from '../access/token';
import { ValidationError, NotFoundError, ForbiddenError } from '@/server/errors';
import { recordAuditEvent } from '../audit/service';

export interface GeneratedParticipantSecret {
  participantId: string;
  familyId: string;
  familyName: string;
  rawSecret: string;
  accessUrl: string;
}

/**
 * Crea un evento a partir de un grupo existente o con lista propia (Regla G01).
 * Copia familias participantes de forma independiente y genera sus secretos individuales.
 */
export async function createEventFromGroup(params: {
  workspaceId: string;
  name: string;
  description?: string;
  timezone?: string;
  eventDate?: string;
  sourceGroupId?: string;
  paymentConfig?: Partial<PaymentConfig>;
  actorOrganizer: { id: string; email: string; name: string };
  appUrl: string;
}): Promise<{
  event: EventModel;
  secrets: GeneratedParticipantSecret[];
}> {
  if (!params.name || params.name.trim().length < 2) {
    throw new ValidationError('El nombre del evento es obligatorio.');
  }

  const db = getAdminDb();
  const eventRef = db.collection('workspaces').doc(params.workspaceId).collection('events').doc();
  const now = new Date().toISOString();

  const eventData: EventModel = {
    id: eventRef.id,
    workspaceId: params.workspaceId,
    name: params.name.trim(),
    description: params.description?.trim(),
    timezone: params.timezone || 'America/Montevideo',
    eventDate: params.eventDate,
    status: 'active',
    isArchived: false,
    sourceGroupId: params.sourceGroupId,
    paymentConfig: {
      enabled: params.paymentConfig?.enabled || false,
      expectedAmountMinor: params.paymentConfig?.expectedAmountMinor || 0,
      currency: params.paymentConfig?.currency || 'UYU',
      bankInstructions: params.paymentConfig?.bankInstructions,
    },
    createdAt: now,
    updatedAt: now,
  };

  // Asignar al creador como primer organizador activo
  const organizerRef = eventRef.collection('organizers').doc(params.actorOrganizer.id);
  const organizerData = {
    id: params.actorOrganizer.id,
    workspaceId: params.workspaceId,
    eventId: eventRef.id,
    email: params.actorOrganizer.email,
    name: params.actorOrganizer.name,
    status: 'active',
    invitedAt: now,
    joinedAt: now,
  };

  const secrets: GeneratedParticipantSecret[] = [];
  const participantsToSave: { ref: any; data: ParticipantModel; tokenRef: any; tokenData: any }[] = [];

  // Si se provee sourceGroupId, copiar sus miembros sin alterar el grupo
  if (params.sourceGroupId) {
    const groupMembersSnap = await db
      .collection('workspaces')
      .doc(params.workspaceId)
      .collection('groups')
      .doc(params.sourceGroupId)
      .collection('members')
      .get();

    for (const memberDoc of groupMembersSnap.docs) {
      const member = memberDoc.data() as GroupMember;
      const partRef = eventRef.collection('participants').doc();
      const rawSecret = generateRawSecret();
      const tokenHash = hashFamilySecret(rawSecret);

      const partData: ParticipantModel = {
        id: partRef.id,
        workspaceId: params.workspaceId,
        eventId: eventRef.id,
        familyId: member.familyId,
        familyName: member.familyName,
        contactEmail: member.contactEmail,
        contactPhone: member.contactPhone,
        status: 'active',
        accessVersion: 1,
        tokenHash,
        createdAt: now,
        updatedAt: now,
      };

      const tokenRef = db.collection('access_tokens').doc(tokenHash);
      const tokenData = {
        workspaceId: params.workspaceId,
        eventId: eventRef.id,
        participantId: partRef.id,
        accessVersion: 1,
        createdAt: now,
      };

      participantsToSave.push({ ref: partRef, data: partData, tokenRef, tokenData });
      secrets.push({
        participantId: partRef.id,
        familyId: member.familyId,
        familyName: member.familyName,
        rawSecret,
        accessUrl: `${params.appUrl}/f#secret=${rawSecret}`,
      });
    }
  }

  // Guardar evento y participantes en lotes
  const batch = db.batch();
  batch.set(eventRef, eventData);
  batch.set(organizerRef, organizerData);

  for (const item of participantsToSave) {
    batch.set(item.ref, item.data);
    batch.set(item.tokenRef, item.tokenData);
  }

  await batch.commit();

  await recordAuditEvent({
    workspaceId: params.workspaceId,
    eventId: eventRef.id,
    actor: { type: 'organizer', id: params.actorOrganizer.id },
    action: 'CREATE_EVENT',
    targetType: 'event',
    targetId: eventRef.id,
    details: {
      name: params.name,
      sourceGroupId: params.sourceGroupId,
      participantCount: participantsToSave.length,
    },
  });

  return { event: eventData, secrets };
}

/**
 * Agrega una familia individual a la convocatoria del evento (Regla G02: no modifica el grupo de origen).
 */
export async function addParticipantToEvent(params: {
  workspaceId: string;
  eventId: string;
  familyId?: string;
  familyName: string;
  contactEmail?: string;
  contactPhone?: string;
  actorOrganizerId: string;
  appUrl: string;
}): Promise<GeneratedParticipantSecret> {
  const db = getAdminDb();
  const eventRef = db.collection('workspaces').doc(params.workspaceId).collection('events').doc(params.eventId);
  const eventDoc = await eventRef.get();
  if (!eventDoc.exists) {
    throw new NotFoundError('El evento no existe.');
  }

  const partRef = eventRef.collection('participants').doc();
  const rawSecret = generateRawSecret();
  const tokenHash = hashFamilySecret(rawSecret);
  const now = new Date().toISOString();

  const partData: ParticipantModel = {
    id: partRef.id,
    workspaceId: params.workspaceId,
    eventId: params.eventId,
    familyId: params.familyId || `fam_${partRef.id}`,
    familyName: params.familyName.trim(),
    contactEmail: params.contactEmail?.trim(),
    contactPhone: params.contactPhone?.trim(),
    status: 'active',
    accessVersion: 1,
    tokenHash,
    createdAt: now,
    updatedAt: now,
  };

  const tokenRef = db.collection('access_tokens').doc(tokenHash);
  const tokenData = {
    workspaceId: params.workspaceId,
    eventId: params.eventId,
    participantId: partRef.id,
    accessVersion: 1,
    createdAt: now,
  };

  const batch = db.batch();
  batch.set(partRef, partData);
  batch.set(tokenRef, tokenData);
  await batch.commit();

  await recordAuditEvent({
    workspaceId: params.workspaceId,
    eventId: params.eventId,
    actor: { type: 'organizer', id: params.actorOrganizerId },
    action: 'ADD_EVENT_PARTICIPANT',
    targetType: 'participant',
    targetId: partRef.id,
    details: { familyName: params.familyName },
  });

  return {
    participantId: partRef.id,
    familyId: partData.familyId,
    familyName: partData.familyName,
    rawSecret,
    accessUrl: `${params.appUrl}/f#secret=${rawSecret}`,
  };
}

/**
 * Da de baja a un participante del evento (Regla G04: conserva respuestas e historial; no recalcula cierres pasados).
 */
export async function deactivateParticipant(params: {
  workspaceId: string;
  eventId: string;
  participantId: string;
  reason: string;
  actorOrganizerId: string;
}): Promise<void> {
  const db = getAdminDb();
  const partRef = db
    .collection('workspaces')
    .doc(params.workspaceId)
    .collection('events')
    .doc(params.eventId)
    .collection('participants')
    .doc(params.participantId);

  const doc = await partRef.get();
  if (!doc.exists) {
    throw new NotFoundError('Participante no encontrado.');
  }

  const now = new Date().toISOString();
  await partRef.update({
    status: 'inactive',
    inactiveReason: params.reason,
    inactivatedAt: now,
    updatedAt: now,
  });

  await recordAuditEvent({
    workspaceId: params.workspaceId,
    eventId: params.eventId,
    actor: { type: 'organizer', id: params.actorOrganizerId },
    action: 'DEACTIVATE_PARTICIPANT',
    targetType: 'participant',
    targetId: params.participantId,
    details: { reason: params.reason },
  });
}
