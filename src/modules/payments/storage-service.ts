import { getAdminStorage } from '@/server/firebase-admin';
import { AttachmentMetadata } from './types';
import { FamilySessionContext, OrganizerSessionContext } from '@/modules/access/types';
import { ForbiddenError, ValidationError, NotFoundError } from '@/server/errors';
import { validateOrganizerEventAccess } from '@/modules/access/organizer-service';
import crypto from 'crypto';

export const MAX_FILE_SIZE_BYTES = 3_000_000; // 3 MB estrictos
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

/**
 * Valida y almacena un comprobante privado en Cloud Storage
 */
export async function validateAndUploadReceipt(
  session: FamilySessionContext,
  fileBuffer: Buffer,
  originalFileName: string,
  contentType: string
): Promise<AttachmentMetadata> {
  // 1. Validar tamaño estricto (3 MB / 3.000.000 bytes)
  if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
    throw new ValidationError(
      `El comprobante supera el tamaño máximo permitido de 3 MB (${fileBuffer.length} bytes recibidos).`,
      'El archivo es demasiado grande. Seleccioná una imagen o PDF de hasta 3 MB.'
    );
  }

  // 2. Validar tipo MIME
  if (!ALLOWED_MIME_TYPES.includes(contentType)) {
    throw new ValidationError(
      `Tipo de archivo no permitido: ${contentType}.`,
      'Formato de archivo no válido. Se admiten únicamente imágenes JPEG, PNG, WebP o documentos PDF.'
    );
  }

  const fileExt = contentType === 'application/pdf'
    ? 'pdf'
    : contentType.replace('image/', '');

  const attachmentId = `rec_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  const storagePath = `workspaces/${session.workspaceId}/events/${session.eventId}/receipts/${session.participantId}/${attachmentId}.${fileExt}`;

  const storage = getAdminStorage();
  const bucket = storage.bucket();
  const file = bucket.file(storagePath);

  const now = new Date().toISOString();

  await file.save(fileBuffer, {
    metadata: {
      contentType,
      metadata: {
        workspaceId: session.workspaceId,
        eventId: session.eventId,
        participantId: session.participantId,
        familyId: session.familyId,
        uploadedAt: now,
      },
    },
    resumable: false,
  });

  return {
    id: attachmentId,
    storagePath,
    fileName: originalFileName || `comprobante.${fileExt}`,
    contentType: contentType as any,
    sizeBytes: fileBuffer.length,
    uploadedAt: now,
  };
}

/**
 * Obtiene el archivo privado validando autorización de acceso (Regla P09)
 */
export async function getReceiptFile(
  userContext: { type: 'family'; session: FamilySessionContext } | { type: 'organizer'; session: OrganizerSessionContext },
  eventId: string,
  participantId: string,
  storagePath: string
): Promise<{ buffer: Buffer; contentType: string; fileName: string }> {
  // Regla P09: Un comprobante solo es accesible a su familia o comité autorizado
  if (userContext.type === 'family') {
    if (userContext.session.participantId !== participantId || userContext.session.eventId !== eventId) {
      throw new ForbiddenError(
        'Acceso denegado al comprobante de otra familia o evento.',
        'No tenés permisos para ver este comprobante.'
      );
    }
  } else {
    await validateOrganizerEventAccess(userContext.session, eventId, userContext.session.workspaceId);
  }

  const storage = getAdminStorage();
  const bucket = storage.bucket();
  const file = bucket.file(storagePath);

  const [exists] = await file.exists();
  if (!exists) {
    throw new NotFoundError('El archivo del comprobante no existe en el almacenamiento.');
  }

  const [metadata] = await file.getMetadata();
  const [buffer] = await file.download();

  return {
    buffer,
    contentType: metadata.contentType || 'application/octet-stream',
    fileName: storagePath.split('/').pop() || 'comprobante',
  };
}
