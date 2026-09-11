import { getAdminDb } from '@/server/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface AuditActor {
  type: 'organizer' | 'family' | 'system';
  id: string;
  name?: string;
  email?: string;
}

export interface AuditEventParams {
  workspaceId: string;
  eventId?: string;
  actor: AuditActor;
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, any>;
}

/**
 * Registra un evento de auditoría inmutable (solo agregado).
 */
export async function recordAuditEvent(params: AuditEventParams): Promise<string> {
  const db = getAdminDb();
  
  const auditData = {
    workspaceId: params.workspaceId,
    eventId: params.eventId || null,
    actor: params.actor,
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId,
    details: params.details || {},
    createdAt: FieldValue.serverTimestamp(),
    timestampIso: new Date().toISOString(),
  };

  if (params.eventId) {
    const ref = await db
      .collection('workspaces')
      .doc(params.workspaceId)
      .collection('events')
      .doc(params.eventId)
      .collection('audit')
      .add(auditData);
    return ref.id;
  } else {
    const ref = await db
      .collection('workspaces')
      .doc(params.workspaceId)
      .collection('audit')
      .add(auditData);
    return ref.id;
  }
}
