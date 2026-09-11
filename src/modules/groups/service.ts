import { getAdminDb } from '@/server/firebase-admin';
import { WorkspaceGroup, GroupMember, ImportCandidate, ImportValidationResult } from './types';
import { ValidationError, NotFoundError } from '@/server/errors';
import { recordAuditEvent } from '../audit/service';

/**
 * Valida filas para importación de familias (Regla G05: informa filas inválidas y duplicados antes de confirmar, no envía invitaciones).
 */
export function validateTabularImport(rows: any[]): ImportValidationResult {
  const validRows: ImportCandidate[] = [];
  const invalidRows: { rowNumber: number; data: any; reason: string }[] = [];
  const seenNames = new Set<string>();
  let duplicateCount = 0;

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const familyName = (row.familyName || row.nombre || row['Familia'] || '').toString().trim();

    if (!familyName || familyName.length < 2) {
      invalidRows.push({
        rowNumber,
        data: row,
        reason: 'El nombre de la familia es obligatorio (mínimo 2 letras).',
      });
      return;
    }

    const normalized = familyName.toLowerCase();
    if (seenNames.has(normalized)) {
      duplicateCount++;
      invalidRows.push({
        rowNumber,
        data: row,
        reason: `Nombre repetido en la lista: "${familyName}".`,
      });
      return;
    }
    seenNames.add(normalized);

    validRows.push({
      familyName,
      contactEmail: (row.contactEmail || row.email || '').toString().trim() || undefined,
      contactPhone: (row.contactPhone || row.telefono || '').toString().trim() || undefined,
    });
  });

  return { validRows, invalidRows, duplicateCount };
}

/**
 * Crea un grupo reutilizable dentro de un espacio.
 */
export async function createGroup(params: {
  workspaceId: string;
  name: string;
  description?: string;
  actorOrganizerId: string;
}): Promise<WorkspaceGroup> {
  if (!params.name || params.name.trim().length < 2) {
    throw new ValidationError('El nombre del grupo es obligatorio.');
  }

  const db = getAdminDb();
  const groupRef = db.collection('workspaces').doc(params.workspaceId).collection('groups').doc();
  const now = new Date().toISOString();

  const groupData: WorkspaceGroup = {
    id: groupRef.id,
    workspaceId: params.workspaceId,
    name: params.name.trim(),
    description: params.description?.trim(),
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };

  await groupRef.set(groupData);

  await recordAuditEvent({
    workspaceId: params.workspaceId,
    actor: { type: 'organizer', id: params.actorOrganizerId },
    action: 'CREATE_GROUP',
    targetType: 'group',
    targetId: groupRef.id,
    details: { name: params.name },
  });

  return groupData;
}

/**
 * Agrega miembros a un grupo existente.
 */
export async function addMembersToGroup(params: {
  workspaceId: string;
  groupId: string;
  members: ImportCandidate[];
  actorOrganizerId: string;
}): Promise<number> {
  const db = getAdminDb();
  const groupRef = db.collection('workspaces').doc(params.workspaceId).collection('groups').doc(params.groupId);
  const groupDoc = await groupRef.get();

  if (!groupDoc.exists) {
    throw new NotFoundError('El grupo indicado no existe.');
  }

  const membersCol = groupRef.collection('members');
  const batch = db.batch();
  const now = new Date().toISOString();

  for (const item of params.members) {
    const memberDocRef = membersCol.doc();
    const memberData: GroupMember = {
      id: memberDocRef.id,
      workspaceId: params.workspaceId,
      groupId: params.groupId,
      familyId: `fam_${memberDocRef.id}`,
      familyName: item.familyName,
      contactEmail: item.contactEmail,
      contactPhone: item.contactPhone,
      createdAt: now,
    };
    batch.set(memberDocRef, memberData);
  }

  await batch.commit();

  await recordAuditEvent({
    workspaceId: params.workspaceId,
    actor: { type: 'organizer', id: params.actorOrganizerId },
    action: 'ADD_GROUP_MEMBERS',
    targetType: 'group',
    targetId: params.groupId,
    details: { count: params.members.length },
  });

  return params.members.length;
}

/**
 * Archiva un grupo (Regla G03: no afecta eventos existentes, sólo impide ofrecerlo para nuevas convocatorias).
 */
export async function archiveGroup(params: {
  workspaceId: string;
  groupId: string;
  actorOrganizerId: string;
}): Promise<void> {
  const db = getAdminDb();
  const groupRef = db.collection('workspaces').doc(params.workspaceId).collection('groups').doc(params.groupId);
  const groupDoc = await groupRef.get();

  if (!groupDoc.exists) {
    throw new NotFoundError('El grupo no existe.');
  }

  await groupRef.update({
    isArchived: true,
    updatedAt: new Date().toISOString(),
  });

  await recordAuditEvent({
    workspaceId: params.workspaceId,
    actor: { type: 'organizer', id: params.actorOrganizerId },
    action: 'ARCHIVE_GROUP',
    targetType: 'group',
    targetId: params.groupId,
  });
}
