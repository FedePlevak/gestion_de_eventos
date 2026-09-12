import { getAdminDb } from '@/server/firebase-admin';
import { UnauthorizedError, ForbiddenError, NotFoundError } from '@/server/errors';
import { generateRawSecret, hashFamilySecret, generateSessionId, hashSessionId } from './token';
import { FamilySessionContext, FamilyParticipant } from './types';
import { recordAuditEvent } from '../audit/service';

const SESSION_TTL_DAYS = 30;

/**
 * Canjea un secreto plano familiar por un ID de sesión.
 */
export async function redeemFamilySecret(secret: string): Promise<{
  sessionId: string;
  context: FamilySessionContext;
}> {
  if (!secret || secret.trim().length < 16) {
    throw new UnauthorizedError('El enlace es inválido o está incompleto.');
  }

  const cleanSecret = secret.trim();
  const tokenHash = hashFamilySecret(cleanSecret);
  const db = getAdminDb();

  // 1. Buscar token indexado por hash HMAC
  let tokenDoc = await db.collection('access_tokens').doc(tokenHash).get();

  // 2. Si no existe por HMAC, verificar si el enlace trajo directamente el identificador de token
  if (!tokenDoc.exists) {
    const directDoc = await db.collection('access_tokens').doc(cleanSecret).get();
    if (directDoc.exists) {
      tokenDoc = directDoc;
    }
  }

  if (!tokenDoc.exists) {
    throw new UnauthorizedError('El enlace no es válido o ya fue reemplazado.');
  }

  const tokenData = tokenDoc.data()!;
  const { workspaceId, eventId, participantId, accessVersion } = tokenData;

  // Cargar participante
  const participantRef = db
    .collection('workspaces')
    .doc(workspaceId)
    .collection('events')
    .doc(eventId)
    .collection('participants')
    .doc(participantId);

  const participantDoc = await participantRef.get();
  if (!participantDoc.exists) {
    throw new NotFoundError('No se encontró el registro de la familia en este evento.');
  }

  const participant = participantDoc.data() as FamilyParticipant;

  if (participant.status !== 'active') {
    throw new ForbiddenError('La participación de esta familia no se encuentra activa en este evento.');
  }

  if (participant.accessVersion !== accessVersion) {
    throw new UnauthorizedError('Este enlace fue reemplazado por uno más reciente.');
  }

  // Generar sesión
  const rawSessionId = generateSessionId();
  const sessionHash = hashSessionId(rawSessionId);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await db.collection('family_sessions').doc(sessionHash).set({
    workspaceId,
    eventId,
    participantId,
    accessVersion,
    familyId: participant.familyId,
    familyName: participant.familyName,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });

  return {
    sessionId: rawSessionId,
    context: {
      workspaceId,
      eventId,
      participantId,
      familyId: participant.familyId,
      familyName: participant.familyName,
      accessVersion,
    },
  };
}

/**
 * Valida la sesión familiar actual y verifica que pertenezca al evento solicitado.
 */
export async function validateFamilySession(
  rawSessionId: string | undefined,
  eventId: string
): Promise<FamilySessionContext> {
  if (!rawSessionId) {
    throw new UnauthorizedError('Sesión no encontrada. Por favor ingresá mediante tu enlace personal.');
  }

  const sessionHash = hashSessionId(rawSessionId);
  const db = getAdminDb();

  const sessionDoc = await db.collection('family_sessions').doc(sessionHash).get();
  if (!sessionDoc.exists) {
    throw new UnauthorizedError('Tu sesión ha expirado o no es válida. Reingresá con tu enlace.');
  }

  const sessionData = sessionDoc.data()!;
  const now = new Date();
  if (new Date(sessionData.expiresAt) < now) {
    throw new UnauthorizedError('Tu sesión ha expirado. Reingresá con tu enlace.');
  }

  // Regla A03: Conocer ID de otro evento o familia no habilita su acceso
  if (sessionData.eventId !== eventId) {
    throw new ForbiddenError('Tu acceso corresponde a otro evento.');
  }

  // Verificar estado del participante y versión de acceso actual en el servidor
  const participantRef = db
    .collection('workspaces')
    .doc(sessionData.workspaceId)
    .collection('events')
    .doc(sessionData.eventId)
    .collection('participants')
    .doc(sessionData.participantId);

  const participantDoc = await participantRef.get();
  if (!participantDoc.exists) {
    throw new NotFoundError('Participación no encontrada.');
  }

  const participant = participantDoc.data() as FamilyParticipant;

  if (participant.status !== 'active') {
    throw new ForbiddenError('La participación de esta familia fue dada de baja.');
  }

  // Regla A02: Si se regeneró el enlace, la versión de acceso cambió y las sesiones previas quedan invalidadas
  if (participant.accessVersion !== sessionData.accessVersion) {
    throw new UnauthorizedError('Este enlace fue reemplazado. Usá el nuevo enlace provisto por el comité.');
  }

  return {
    workspaceId: sessionData.workspaceId,
    eventId: sessionData.eventId,
    participantId: sessionData.participantId,
    familyId: sessionData.familyId,
    familyName: sessionData.familyName,
    accessVersion: participant.accessVersion,
  };
}

/**
 * Regenera el enlace familiar invalidando de inmediato sesiones y enlaces anteriores.
 */
export async function regenerateFamilyAccess(params: {
  workspaceId: string;
  eventId: string;
  participantId: string;
  actorOrganizerId: string;
  reason: string;
}): Promise<{ rawSecret: string; accessVersion: number }> {
  const db = getAdminDb();
  const newSecret = generateRawSecret();
  const newTokenHash = hashFamilySecret(newSecret);

  const participantRef = db
    .collection('workspaces')
    .doc(params.workspaceId)
    .collection('events')
    .doc(params.eventId)
    .collection('participants')
    .doc(params.participantId);

  let newVersion = 1;

  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(participantRef);
    if (!doc.exists) {
      throw new NotFoundError('Participante no encontrado.');
    }

    const data = doc.data() as FamilyParticipant;
    newVersion = (data.accessVersion || 1) + 1;

    // Actualizar participante con nueva versión y nuevo hash
    transaction.update(participantRef, {
      tokenHash: newTokenHash,
      accessVersion: newVersion,
      updatedAt: new Date().toISOString(),
    });

    // Crear nuevo puntero de token
    const tokenRef = db.collection('access_tokens').doc(newTokenHash);
    transaction.set(tokenRef, {
      workspaceId: params.workspaceId,
      eventId: params.eventId,
      participantId: params.participantId,
      accessVersion: newVersion,
      createdAt: new Date().toISOString(),
    });
  });

  await recordAuditEvent({
    workspaceId: params.workspaceId,
    eventId: params.eventId,
    actor: { type: 'organizer', id: params.actorOrganizerId },
    action: 'REGENERATE_FAMILY_ACCESS',
    targetType: 'participant',
    targetId: params.participantId,
    details: {
      reason: params.reason,
      newAccessVersion: newVersion,
    },
  });

  return { rawSecret: newSecret, accessVersion: newVersion };
}
