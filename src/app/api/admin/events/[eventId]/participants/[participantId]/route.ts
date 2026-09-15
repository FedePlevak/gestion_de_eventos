import { NextRequest, NextResponse } from 'next/server';
import { getOrganizerContextFromRequest, validateOrganizerEventAccess } from '@/modules/access/organizer-service';
import { deleteFamilyParticipant } from '@/modules/access/family-service';
import { AppError } from '@/server/errors';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string; participantId: string } }
) {
  try {
    const organizer = await getOrganizerContextFromRequest(request);
    await validateOrganizerEventAccess(organizer, params.eventId, organizer.workspaceId);

    const result = await deleteFamilyParticipant({
      workspaceId: organizer.workspaceId,
      eventId: params.eventId,
      participantId: params.participantId,
      actorOrganizerId: organizer.organizerId,
    });

    return NextResponse.json({
      success: true,
      deletedFamilyName: result.deletedFamilyName,
      message: `La familia "${result.deletedFamilyName}" fue eliminada correctamente del evento.`,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.userMessage, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Error al eliminar participante:', error);
    return NextResponse.json(
      { error: 'Error interno al eliminar la familia invitada.' },
      { status: 500 }
    );
  }
}
