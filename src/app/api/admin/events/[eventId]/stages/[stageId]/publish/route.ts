import { NextRequest, NextResponse } from 'next/server';
import { getOrganizerContextFromRequest } from '@/modules/access/organizer-service';
import { publishStageResults, unpublishStageResults } from '@/modules/results/service';
import { AppError } from '@/server/errors';

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string; stageId: string } }
) {
  try {
    const organizer = await getOrganizerContextFromRequest(request);
    const body = await request.json();
    const { action, note } = body;

    if (action === 'unpublish') {
      await unpublishStageResults(organizer, params.eventId, params.stageId);
      return NextResponse.json({ success: true, status: 'unpublished' });
    }

    const results = await publishStageResults(organizer, params.eventId, params.stageId, note);
    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.userMessage, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Error al publicar/despublicar resultados:', error);
    return NextResponse.json({ error: 'Error al procesar la publicación.' }, { status: 500 });
  }
}
