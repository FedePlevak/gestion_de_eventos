import { NextRequest, NextResponse } from 'next/server';
import { getOrganizerContextFromRequest } from '@/modules/access/organizer-service';
import {
  updateStageAdmin,
  closeStageAdmin,
  reopenStageAdmin,
  addClarificationAdmin,
} from '@/modules/stages/service';
import { AppError } from '@/server/errors';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { eventId: string; stageId: string } }
) {
  try {
    const organizer = await getOrganizerContextFromRequest(request);
    const body = await request.json();

    await updateStageAdmin(organizer, params.eventId, params.stageId, body);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.userMessage, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Error al actualizar etapa:', error);
    return NextResponse.json({ error: 'Error al actualizar la etapa.' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string; stageId: string } }
) {
  try {
    const organizer = await getOrganizerContextFromRequest(request);
    const body = await request.json();
    const { action, reason, content, newDeadlineAt } = body;

    switch (action) {
      case 'close':
        await closeStageAdmin(organizer, params.eventId, params.stageId, reason);
        break;

      case 'reopen':
        await reopenStageAdmin(organizer, params.eventId, params.stageId, reason, newDeadlineAt);
        break;

      case 'clarify':
        await addClarificationAdmin(organizer, params.eventId, params.stageId, content);
        break;

      default:
        return NextResponse.json({ error: 'Acción no reconocida.' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.userMessage, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Error en acción administrativa de etapa:', error);
    return NextResponse.json({ error: 'Error al procesar la acción.' }, { status: 500 });
  }
}
