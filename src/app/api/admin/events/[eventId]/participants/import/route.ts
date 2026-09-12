import { NextRequest, NextResponse } from 'next/server';
import {
  getOrganizerContextFromRequest,
  validateOrganizerEventAccess,
} from '@/modules/access/organizer-service';
import { getAdminDb } from '@/server/firebase-admin';
import { generateRawSecret, hashFamilySecret } from '@/modules/access/token';
import { AppError, ValidationError, NotFoundError } from '@/server/errors';
import { recordAuditEvent } from '@/modules/audit/service';

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const organizer = await getOrganizerContextFromRequest(request);
    const workspaceId = organizer.workspaceId || 'principal';
    await validateOrganizerEventAccess(organizer, params.eventId, workspaceId);

    const body = await request.json();
    const { participants } = body;

    if (!Array.isArray(participants) || participants.length === 0) {
      throw new ValidationError('Debés proporcionar una lista con al menos un participante.');
    }

    const db = getAdminDb();
    const eventRef = db
      .collection('workspaces')
      .doc(workspaceId)
      .collection('events')
      .doc(params.eventId);

    const eventDoc = await eventRef.get();
    if (!eventDoc.exists) {
      throw new NotFoundError('El evento no existe.');
    }

    const now = new Date().toISOString();
    const importedParticipants: Array<{
      participantId: string;
      familyName: string;
      contactPhone?: string;
      contactEmail?: string;
      rawSecret: string;
    }> = [];

    // Lotes de hasta 200 familias (400 escrituras en Firestore por lote)
    const BATCH_SIZE = 200;
    for (let i = 0; i < participants.length; i += BATCH_SIZE) {
      const slice = participants.slice(i, i + BATCH_SIZE);
      const batch = db.batch();

      for (const item of slice) {
        const familyName = (item.familyName || item.name || '').trim();
        if (!familyName) continue;

        const partRef = eventRef.collection('participants').doc();
        const rawSecret = generateRawSecret();
        const tokenHash = hashFamilySecret(rawSecret);

        const classCode = item.classCode ? String(item.classCode).trim() : undefined;
        const customFields = item.customFields && typeof item.customFields === 'object' ? item.customFields : undefined;

        const partData: any = {
          id: partRef.id,
          workspaceId,
          eventId: params.eventId,
          familyId: `fam_${partRef.id}`,
          familyName,
          contactPhone: item.contactPhone?.toString().trim() || '',
          contactEmail: item.contactEmail?.toString().trim() || '',
          status: 'active',
          accessVersion: 1,
          tokenHash,
          createdAt: now,
          updatedAt: now,
        };

        if (classCode) {
          partData.classCode = classCode;
        }
        if (customFields && Object.keys(customFields).length > 0) {
          partData.customFields = customFields;
        }

        const tokenRef = db.collection('access_tokens').doc(tokenHash);
        const tokenData = {
          workspaceId,
          eventId: params.eventId,
          participantId: partRef.id,
          accessVersion: 1,
          createdAt: now,
        };

        batch.set(partRef, partData);
        batch.set(tokenRef, tokenData);

        importedParticipants.push({
          participantId: partRef.id,
          familyName,
          contactPhone: partData.contactPhone,
          contactEmail: partData.contactEmail,
          rawSecret,
        });
      }

      await batch.commit();
    }

    await recordAuditEvent({
      workspaceId,
      eventId: params.eventId,
      actor: { type: 'organizer', id: organizer.organizerId },
      action: 'IMPORT_PARTICIPANTS',
      targetType: 'event',
      targetId: params.eventId,
      details: {
        totalImported: importedParticipants.length,
      },
    });

    return NextResponse.json({
      success: true,
      count: importedParticipants.length,
      participants: importedParticipants,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.userMessage }, { status: error.statusCode });
    }
    console.error('Error al importar participantes:', error);
    return NextResponse.json(
      { error: error.message || 'Error al importar los participantes.' },
      { status: 500 }
    );
  }
}
