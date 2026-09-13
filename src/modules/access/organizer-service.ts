import { getAdminDb, getAdminAuth } from '@/server/firebase-admin';
import { UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from '@/server/errors';
import { OrganizerSessionContext, EventOrganizer } from './types';
import { recordAuditEvent } from '../audit/service';

import { NextRequest } from 'next/server';

export async function getOrganizerContextFromCookies(
  cookieStore: { get: (name: string) => { value: string } | undefined },
  headersList?: { get: (name: string) => string | null }
): Promise<OrganizerSessionContext> {
  const sessionCookie = cookieStore.get('organizer_session')?.value;
  if (sessionCookie) {
    try {
      return await verifyOrganizerSessionCookie(sessionCookie, false);
    } catch (err) {
      // Si la cookie es inválida y estamos en desarrollo, probamos dev fallback
      if (process.env.APP_ENV === 'production') throw err;
    }
  }

  const devEmail =
    headersList?.get('x-dev-organizer-email') ||
    cookieStore.get('dev_organizer_email')?.value ||
    cookieStore.get('organizer_email')?.value;

  if (process.env.APP_ENV !== 'production' && devEmail) {
    let workspaceId = 'principal';
    let organizerId = devEmail;
    let name = devEmail.split('@')[0];

    try {
      const db = getAdminDb();
      const dirDoc = await db.collection('organizer_directory').doc(devEmail.toLowerCase()).get();
      if (dirDoc.exists) {
        const dData = dirDoc.data()!;
        if (dData.workspaceId) workspaceId = dData.workspaceId;
        if (dData.uid) organizerId = dData.uid;
        if (dData.name) name = dData.name;
      } else if (devEmail === 'organizador1@colegio.edu.uy') {
        workspaceId = 'colegio-san-martin';
        organizerId = 'org_01';
        name = 'Laura Méndez';
      }
    } catch {
      if (devEmail === 'organizador1@colegio.edu.uy') {
        workspaceId = 'colegio-san-martin';
        organizerId = 'org_01';
        name = 'Laura Méndez';
      }
    }

    return {
      organizerId,
      email: devEmail,
      name,
      workspaceId,
    };
  }

  return await verifyOrganizerSessionCookie(sessionCookie, false);
}

export async function getOrganizerContextFromRequest(request: NextRequest): Promise<OrganizerSessionContext> {
  return getOrganizerContextFromCookies(request.cookies, request.headers);
}

/**
 * Valida el token o cookie de sesión de organizador con Firebase Auth y obtiene su perfil.
 */
export async function verifyOrganizerSessionCookie(
  sessionCookie: string | undefined,
  checkRevoked: boolean = false
): Promise<OrganizerSessionContext> {
  if (!sessionCookie) {
    throw new UnauthorizedError('Se requiere iniciar sesión como organizador.');
  }

  try {
    const auth = getAdminAuth();
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, checkRevoked);
    return {
      organizerId: decodedClaims.uid,
      email: decodedClaims.email || '',
      name: decodedClaims.name || decodedClaims.email?.split('@')[0] || 'Organizador',
      workspaceId: decodedClaims.workspaceId || 'principal',
    };
  } catch (error) {
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
  const organizersColl = db
    .collection('workspaces')
    .doc(workspaceId)
    .collection('events')
    .doc(eventId)
    .collection('organizers');

  let doc = await organizersColl.doc(context.organizerId).get();
  if (!doc?.exists && context.email) {
    // Buscar si fue registrado por correo
    const emailSnap = await organizersColl.where('email', '==', context.email.toLowerCase()).get();
    if (emailSnap.docs && emailSnap.docs.length > 0) {
      doc = emailSnap.docs[0];
    }
  }

  if (!doc || !doc.exists) {
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
