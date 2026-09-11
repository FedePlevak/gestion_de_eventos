import { NextRequest, NextResponse } from 'next/server';
import { getOrganizerContextFromRequest, validateOrganizerEventAccess } from '@/modules/access/organizer-service';
import {
  updateStageAdmin,
  closeStageAdmin,
  reopenStageAdmin,
  addClarificationAdmin,
} from '@/modules/stages/service';
import { getAdminDb } from '@/server/firebase-admin';
import { AppError, NotFoundError } from '@/server/errors';
import { StageModel, StageResponse, ReadConfirmation } from '@/modules/stages/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string; stageId: string } }
) {
  try {
    const organizer = await getOrganizerContextFromRequest(request);
    await validateOrganizerEventAccess(organizer, params.eventId, organizer.workspaceId);

    const db = getAdminDb();
    const eventRef = db
      .collection('workspaces')
      .doc(organizer.workspaceId)
      .collection('events')
      .doc(params.eventId);

    const stageRef = eventRef.collection('stages').doc(params.stageId);
    const stageSnap = await stageRef.get();
    if (!stageSnap.exists) {
      throw new NotFoundError('La etapa no existe.');
    }

    const stage = stageSnap.data() as StageModel;
    stage.id = stageSnap.id;

    // Obtener familias participantes activas
    const partsSnap = await eventRef.collection('participants').where('status', '==', 'active').get();
    const participants = partsSnap.docs.map((d) => ({
      id: d.id,
      familyId: d.data().familyId,
      familyName: d.data().familyName,
      contactPhone: d.data().contactPhone,
      contactEmail: d.data().contactEmail,
    }));

    // Obtener respuestas enviadas
    const respSnap = await stageRef.collection('responses').get();
    const responses = respSnap.docs.map((d) => d.data() as StageResponse);

    // Obtener confirmaciones de lectura
    const readsSnap = await stageRef.collection('read_confirmations').get();
    const reads = readsSnap.docs.map((d) => d.data() as ReadConfirmation);

    // Estado de publicación de resultados
    const pubSnap = await stageRef.collection('published_results').doc('latest').get();
    const publishedResults = pubSnap.exists ? pubSnap.data() : null;

    const totalEligible = participants.length;
    const totalResponded = responses.length;
    const totalRead = reads.length;

    // Mapear breakdown por opción
    const optionCounts = new Map<string, { count: number; familyNames: string[] }>();
    if (stage.options) {
      for (const opt of stage.options) {
        optionCounts.set(opt.id, { count: 0, familyNames: [] });
      }
    }
    if (stage.type === 'yes_no') {
      optionCounts.set('yes', { count: 0, familyNames: [] });
      optionCounts.set('no', { count: 0, familyNames: [] });
    }

    const respondedParticipantIds = new Set<string>();
    const familyResponsesList: Array<{
      participantId: string;
      familyName: string;
      answersText: string;
      submittedAt: string;
      version: number;
    }> = [];

    for (const r of responses) {
      respondedParticipantIds.add(r.participantId);
      let answersText = '';
      if (stage.type === 'single_choice') {
        const opt = stage.options?.find((o) => o.id === r.answers?.choice);
        answersText = opt?.label || r.answers?.choice || 'Sin selección';
        const entry = optionCounts.get(r.answers?.choice);
        if (entry) {
          entry.count++;
          entry.familyNames.push(r.familyName);
        }
      } else if (stage.type === 'multiple_choice') {
        const choices: string[] = Array.isArray(r.answers?.choices) ? r.answers.choices : [];
        const labels = choices.map((c) => stage.options?.find((o) => o.id === c)?.label || c);
        answersText = labels.join(', ') || 'Ninguna seleccionada';
        for (const c of choices) {
          const entry = optionCounts.get(c);
          if (entry) {
            entry.count++;
            entry.familyNames.push(r.familyName);
          }
        }
      } else if (stage.type === 'yes_no') {
        answersText = r.answers?.choice === 'yes' ? 'Sí' : r.answers?.choice === 'no' ? 'No' : 'Sin responder';
        const entry = optionCounts.get(r.answers?.choice);
        if (entry) {
          entry.count++;
          entry.familyNames.push(r.familyName);
        }
      } else if (stage.type === 'integer_quantity') {
        answersText = `${r.answers?.quantity || 0} personas/entradas`;
      } else if (stage.type === 'open_text') {
        answersText = r.answers?.text || '';
      }

      familyResponsesList.push({
        participantId: r.participantId,
        familyName: r.familyName,
        answersText,
        submittedAt: r.submittedAt,
        version: r.version,
      });
    }

    const breakdown = Array.from(optionCounts.entries()).map(([optId, data]) => {
      let label = optId;
      if (optId === 'yes') label = 'Sí';
      else if (optId === 'no') label = 'No';
      else {
        const found = stage.options?.find((o) => o.id === optId);
        if (found) label = found.label;
      }
      const pct = totalResponded > 0 ? Math.round((data.count / totalResponded) * 100) : 0;
      return {
        optionId: optId,
        label,
        count: data.count,
        percentage: pct,
        familyNames: data.familyNames,
      };
    });

    const pendingFamilies = participants.filter((p) => !respondedParticipantIds.has(p.id));

    return NextResponse.json({
      success: true,
      stage,
      totalEligible,
      totalResponded,
      totalRead,
      responseRatePercentage: totalEligible > 0 ? Math.round((totalResponded / totalEligible) * 100) : 0,
      breakdown,
      familyResponsesList,
      pendingFamilies,
      readsList: reads.map((rd) => ({
        participantId: rd.participantId,
        familyName: rd.familyName,
        confirmedAt: rd.confirmedAt,
      })),
      isPublished: publishedResults?.status === 'published',
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.userMessage, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Error al obtener avance de etapa:', error);
    return NextResponse.json({ error: 'Error al obtener datos de la etapa.' }, { status: 500 });
  }
}

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
