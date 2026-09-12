import { NextRequest, NextResponse } from 'next/server';
import { getOrganizerContextFromRequest, validateOrganizerEventAccess } from '@/modules/access/organizer-service';
import { createStageAdmin } from '@/modules/stages/service';
import { getAdminDb } from '@/server/firebase-admin';
import { AppError } from '@/server/errors';
import { StageModel } from '@/modules/stages/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const organizer = await getOrganizerContextFromRequest(request);
    await validateOrganizerEventAccess(organizer, params.eventId, organizer.workspaceId);

    const db = getAdminDb();
    const stagesSnap = await db
      .collection('workspaces')
      .doc(organizer.workspaceId)
      .collection('events')
      .doc(params.eventId)
      .collection('stages')
      .orderBy('order', 'asc')
      .get();

    const stages = stagesSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as StageModel[];
    return NextResponse.json({ success: true, stages });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.userMessage, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Error al listar etapas:', error);
    return NextResponse.json({ error: 'Error al obtener las etapas.' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const organizer = await getOrganizerContextFromRequest(request);
    const body = await request.json();

    const stage = await createStageAdmin(organizer, params.eventId, body);

    return NextResponse.json({ success: true, stage }, { status: 201 });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.userMessage, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Error al crear etapa:', error);
    return NextResponse.json({ error: 'Error al crear la etapa.' }, { status: 500 });
  }
}
