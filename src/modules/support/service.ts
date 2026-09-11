import { getAdminDb } from '@/server/firebase-admin';
import {
  SupportTicket,
  FamilySupportTicket,
  SupportTicketStatus,
  CreateSupportTicketSchema,
  UpdateSupportTicketAdminSchema,
} from './types';
import { FamilySessionContext, OrganizerSessionContext } from '@/modules/access/types';
import { NotFoundError, ValidationError } from '@/server/errors';
import { validateOrganizerEventAccess } from '@/modules/access/organizer-service';
import { recordAuditEvent } from '@/modules/audit/service';

/**
 * La familia crea una nueva consulta o ticket de soporte (Regla S01)
 */
export async function createSupportTicket(
  session: FamilySessionContext,
  data: { subject: string; description: string }
): Promise<FamilySupportTicket> {
  const parsed = CreateSupportTicketSchema.parse(data);
  const db = getAdminDb();

  const ticketsCol = db
    .collection('workspaces')
    .doc(session.workspaceId)
    .collection('events')
    .doc(session.eventId)
    .collection('support');

  const docRef = ticketsCol.doc();
  const now = new Date().toISOString();

  const ticket: SupportTicket = {
    id: docRef.id,
    workspaceId: session.workspaceId,
    eventId: session.eventId,
    participantId: session.participantId,
    familyId: session.familyId,
    familyName: session.familyName,
    subject: parsed.subject.trim(),
    description: parsed.description.trim(),
    status: 'new',
    internalNotes: [],
    createdAt: now,
    updatedAt: now,
  };

  await docRef.set(ticket);

  await recordAuditEvent({
    workspaceId: session.workspaceId,
    eventId: session.eventId,
    actor: {
      type: 'family',
      id: session.participantId,
    },
    action: 'SUPPORT_TICKET_CREATED',
    targetType: 'support_ticket',
    targetId: docRef.id,
    details: { subject: ticket.subject },
  });

  // Retornar sin notas internas (Regla S02)
  const { internalNotes, ...familyView } = ticket;
  return familyView;
}

/**
 * Consulta de tickets por una familia (Regla S01: solo ve los propios, S02: sin notas internas)
 */
export async function getFamilySupportTickets(
  session: FamilySessionContext
): Promise<FamilySupportTicket[]> {
  const db = getAdminDb();
  const ticketsCol = db
    .collection('workspaces')
    .doc(session.workspaceId)
    .collection('events')
    .doc(session.eventId)
    .collection('support');

  const snapshot = await ticketsCol.where('participantId', '==', session.participantId).get();

  return snapshot.docs.map((doc) => {
    const data = doc.data() as SupportTicket;
    // Regla S02: Las notas internas nunca se entregan en respuestas destinadas a familias
    const { internalNotes, ...familySafeData } = data;
    return familySafeData;
  });
}

/**
 * Bandeja administrativa completa de soporte para el comité
 */
export async function getAllEventSupportTicketsAdmin(
  organizer: OrganizerSessionContext,
  eventId: string
): Promise<SupportTicket[]> {
  await validateOrganizerEventAccess(organizer, eventId, organizer.workspaceId);

  const db = getAdminDb();
  const ticketsCol = db
    .collection('workspaces')
    .doc(organizer.workspaceId)
    .collection('events')
    .doc(eventId)
    .collection('support');

  const snapshot = await ticketsCol.get();

  return snapshot.docs.map((doc) => doc.data() as SupportTicket);
}

/**
 * Modificación administrativa de ticket (responsable, estado, notas internas y resolución)
 */
export async function updateSupportTicketAdmin(
  organizer: OrganizerSessionContext,
  eventId: string,
  ticketId: string,
  updates: {
    status?: SupportTicketStatus;
    assignedToEmail?: string | null;
    resolutionSummary?: string;
    addInternalNote?: string;
  }
): Promise<SupportTicket> {
  await validateOrganizerEventAccess(organizer, eventId, organizer.workspaceId);
  const parsed = UpdateSupportTicketAdminSchema.parse(updates);

  const db = getAdminDb();
  const ticketRef = db
    .collection('workspaces')
    .doc(organizer.workspaceId)
    .collection('events')
    .doc(eventId)
    .collection('support')
    .doc(ticketId);

  const updatedTicket = await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(ticketRef);
    if (!doc.exists) {
      throw new NotFoundError('Ticket de soporte no encontrado.');
    }

    const current = doc.data() as SupportTicket;
    const now = new Date().toISOString();

    const patch: Partial<SupportTicket> = {
      updatedAt: now,
    };

    if (parsed.status) {
      patch.status = parsed.status;
      if (parsed.status === 'resolved') {
        patch.resolvedAt = now;
      }
    }

    if (parsed.assignedToEmail !== undefined) {
      patch.assignedToEmail = parsed.assignedToEmail || undefined;
    }

    if (parsed.resolutionSummary !== undefined) {
      patch.resolutionSummary = parsed.resolutionSummary.trim();
    }

    if (parsed.addInternalNote) {
      const newNote = {
        id: `note_${Date.now()}`,
        note: parsed.addInternalNote.trim(),
        authorEmail: organizer.email,
        createdAt: now,
      };
      patch.internalNotes = [...(current.internalNotes || []), newNote];
    }

    transaction.update(ticketRef, patch);
    return { ...current, ...patch };
  });

  await recordAuditEvent({
    workspaceId: organizer.workspaceId,
    eventId,
    actor: {
      type: 'organizer',
      id: organizer.organizerId,
      email: organizer.email,
    },
    action: 'SUPPORT_TICKET_UPDATED',
    targetType: 'support_ticket',
    targetId: ticketId,
    details: updates,
  });

  return updatedTicket;
}
