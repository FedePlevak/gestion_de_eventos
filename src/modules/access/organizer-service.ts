import { getAdminDb, getAdminAuth } from '@/server/firebase-admin';
import { UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from '@/server/errors';
import { OrganizerSessionContext, EventOrganizer } from './types';
import { recordAuditEvent } from '../audit/service';

import { NextRequest } from 'next/server';

/**
 * Obtiene el contexto de organizador validando cookie de sesión o emulación en desarrollo.
 */
export async function getOrganizerContextFromRequest(request: NextRequest): Promise<OrganizerSessionContext> {
  const devEmail = request.headers.get('x-dev-organizer-email') || request.cookies.get('dev_organizer_email')?.value;
  if (process.env.APP_ENV !== 'production' && devEmail) {
    return {
      organizerId: devEmail === 'organizador1@colegio.edu.uy' ? 'org_01' : 'org_02',
      email: devEmail,
      name: devEmail === 'organizador1@colegio.edu.uy' ? 'Laura Méndez' : 'Martín Cabrera',
      workspaceId: 'colegio-san-martin',
    };
  }

  const sessionCookie = request.cookies.get('organizer_session')?.value;
  return await verifyOrganizerSessionCookie(sessionCookie);
}

/**
 * Valida el token o cookie de sesión de organizador con Firebase Auth y obtiene su perfil.
 */
export async function verifyOrganizerSessionCookie(sessionCookie: string | undefined): Promise<OrganizerSessionContext> {
  if (!sessionCookie) {
    throw new UnauthorizedError('Se requiere iniciar sesión como organizador.');
  }

  try {
    const auth = getAdminAuth();
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    return {
      organizerId: decodedClaims.uid,
      email: decodedClaims.email || '',
      name: decodedClaims.name || decodedClaims.email || 'Organizador',
      workspaceId: decodedClaims.workspaceId || 'colegio-san-martin', // default fallback for dev/seed
    };
  } catch (error) {
    // Si falla o la sesión fue revocada en Auth
    throw new UnauthorizedError('Tu sesión de organizador expiró o no es válida.');
  }
}

/**
 * Valida que el organizador tenga membresía activa en el evento solicitado (Reglas A04 y A05).
 */
export async function validateOrganizerEventAccess(
  context: OrganizerSessionContext,
  eventId: string,
  workspaceId: string
): Promise<EventOrganizer> {
  const db = getAdminDb();
  const organizerRef = db
    .collection('workspaces')
    .doc(workspaceId)
    .collection('events')
    .doc(eventId)
    .collection('organizers')
    .doc(context.organizerId);

  const doc = await organizerRef.get();
  if (!doc.exists) {
    throw new ForbiddenError('No tenés asignado este evento en tu cuenta de organizador.');
  }

  const organizer = doc.data() as EventOrganizer;
  if (organizer.status !== 'active') {
    throw new ForbiddenError('Tu acceso como organizador a este evento fue revocado.');
  }

  return organizer;
}

/**
 * Revoca el acceso de un organizador al evento, asegurando que no quede sin organizadores activos (Regla G06).
 */
export async function revokeOrganizerAccess(params: {
  workspaceId: string;
  eventId: string;
  targetOrganizerId: string;
  actorOrganizerId: string;
  reason: string;
}): Promise<void> {
  const db = getAdminDb();
  const organizersRef = db
    .collection('workspaces')
    .doc(params.workspaceId)
    .collection('events')
    .doc(params.eventId)
    .collection('organizers');

  await db.runTransaction(async (transaction) => {
    // Obtener todos los organizadores activos
    const snapshot = await transaction.get(organizersRef.where('status', '==', 'active'));
    const activeOrganizers = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as EventOrganizer));

    // Verificar si el objetivo está activo
    const target = activeOrganizers.find((o) => o.id === params.targetOrganizerId);
    if (!target) {
      throw new NotFoundError('El organizador indicado no está activo en este evento.');
    }

    // Regla G06: No se puede dejar el evento sin ningún organizador activo
    if (activeOrganizers.length <= 1) {
      throw new ValidationError('No es posible revocar al único organizador activo del evento. Designá un reemplazo antes.');
    }

    const targetDocRef = organizersRef.doc(params.targetOrganizerId);
    transaction.update(targetDocRef, {
      status: 'revoked',
      revokedAt: new Date().toISOString(),
      revokedBy: params.actorOrganizerId,
    });
  });

  await recordAuditEvent({
    workspaceId: params.workspaceId,
    eventId: params.eventId,
    actor: { type: 'organizer', id: params.actorOrganizerId },
    action: 'REVOKE_ORGANIZER',
    targetType: 'organizer',
    targetId: params.targetOrganizerId,
    details: { reason: params.reason },
  });
}
