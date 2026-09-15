import { NextRequest, NextResponse } from 'next/server';
import { getOrganizerContextFromRequest, validateOrganizerEventAccess } from '@/modules/access/organizer-service';
import { regenerateFamilyAccess } from '@/modules/access/family-service';
import { AppError } from '@/server/errors';

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string; participantId: string } }
) {
  try {
    const organizer = await getOrganizerContextFromRequest(request);
    await validateOrganizerEventAccess(organizer, params.eventId, organizer.workspaceId);

    const body = await request.json().catch(() => ({}));
    const reason = body?.reason || 'Regeneración solicitada por el organizador';

    const result = await regenerateFamilyAccess({
      workspaceId: organizer.workspaceId,
      eventId: params.eventId,
      participantId: params.participantId,
      actorOrganizerId: organizer.organizerId,
      reason,
    });

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;
    const accessUrl = `${baseUrl}/f#secret=${result.rawSecret}`;

    return NextResponse.json({
      success: true,
      rawSecret: result.rawSecret,
      accessVersion: result.accessVersion,
      accessUrl,
      message: 'Nuevo enlace generado con éxito. El enlace anterior fue revocado.',
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.userMessage, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Error al regenerar enlace familiar:', error);
    return NextResponse.json(
      { error: 'Error interno al regenerar el enlace.' },
      { status: 500 }
    );
  }
}
