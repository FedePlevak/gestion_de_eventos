import { NextRequest, NextResponse } from 'next/server';
import {
  getOrganizerContextFromRequest,
  validateOrganizerEventAccess,
} from '@/modules/access/organizer-service';
import { getAdminDb } from '@/server/firebase-admin';
import { AppError, NotFoundError } from '@/server/errors';
import { recordAuditEvent } from '@/modules/audit/service';

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const organizer = await getOrganizerContextFromRequest(request);
    const workspaceId = organizer.workspaceId || 'principal';
    await validateOrganizerEventAccess(organizer, params.eventId, workspaceId);

    const db = getAdminDb();
    const eventRef = db.collection('workspaces').doc(workspaceId).collection('events').doc(params.eventId);
    const eventSnap = await eventRef.get();

    if (!eventSnap.exists) {
      throw new NotFoundError('El evento no existe.');
    }

    return NextResponse.json({
      success: true,
      event: { id: eventSnap.id, ...eventSnap.data() },
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.userMessage }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Error al obtener el evento.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const organizer = await getOrganizerContextFromRequest(request);
    const workspaceId = organizer.workspaceId || 'principal';
    await validateOrganizerEventAccess(organizer, params.eventId, workspaceId);

    const db = getAdminDb();
    const eventRef = db.collection('workspaces').doc(workspaceId).collection('events').doc(params.eventId);
    const eventSnap = await eventRef.get();

    if (!eventSnap.exists) {
      throw new NotFoundError('El evento no existe.');
    }

    const eventName = eventSnap.data()?.name || params.eventId;

    // 1. Limpiar tokens de acceso de los participantes del evento
    const participantsSnap = await eventRef.collection('participants').get();
    const tokenHashes = participantsSnap.docs
      .map((d) => d.data()?.tokenHash)
      .filter(Boolean);

    for (const hash of tokenHashes) {
      try {
        await db.collection('access_tokens').doc(hash).delete();
      } catch (err) {
        console.error('Error al eliminar token:', hash, err);
      }
    }

    // 2. Eliminar recursivamente el evento y todas sus subcolecciones
    await db.recursiveDelete(eventRef);

    // 3. Registrar auditoría global de la eliminación
    await recordAuditEvent({
      workspaceId,
      eventId: params.eventId,
      actor: { type: 'organizer', id: organizer.organizerId },
      action: 'DELETE_EVENT',
      targetType: 'event',
      targetId: params.eventId,
      details: {
        eventName,
        deletedParticipantsCount: participantsSnap.size,
      },
    });

    return NextResponse.json({
      success: true,
      message: `El evento "${eventName}" fue eliminado definitivamente.`,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.userMessage }, { status: error.statusCode });
    }
    console.error('Error al eliminar evento:', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar el evento.' },
      { status: 500 }
    );
  }
}
