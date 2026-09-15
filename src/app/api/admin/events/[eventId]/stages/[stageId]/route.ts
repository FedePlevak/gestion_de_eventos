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

    // Si la etapa contiene preguntas estructuradas (compuesta)
    const questionsBreakdown: any[] = [];
    if (stage.questions && stage.questions.length > 0) {
      for (const q of stage.questions) {
        if (q.type === 'info') continue;

        if (q.type === 'yes_no') {
          let yesCount = 0;
          let noCount = 0;
          const yesFamilies: string[] = [];
          const noFamilies: string[] = [];
          for (const r of responses) {
            const val = r.answers?.[q.id];
            if (val === 'yes') {
              yesCount++;
              yesFamilies.push(r.familyName);
            } else if (val === 'no') {
              noCount++;
              noFamilies.push(r.familyName);
            }
          }
          const totalValid = yesCount + noCount;
          questionsBreakdown.push({
            questionId: q.id,
            title: q.title,
            type: q.type,
            options: [
              { optionId: 'yes', label: 'Sí', count: yesCount, percentage: totalValid > 0 ? Math.round((yesCount / totalValid) * 100) : 0, familyNames: yesFamilies },
              { optionId: 'no', label: 'No', count: noCount, percentage: totalValid > 0 ? Math.round((noCount / totalValid) * 100) : 0, familyNames: noFamilies },
            ],
          });
        } else if (q.type === 'single_choice' || q.type === 'multiple_choice') {
          const optMap = new Map<string, { count: number; familyNames: string[] }>();
          for (const opt of q.options || []) {
            optMap.set(opt.id, { count: 0, familyNames: [] });
          }
          for (const r of responses) {
            const val = r.answers?.[q.id];
            if (q.type === 'single_choice' && typeof val === 'string') {
              const entry = optMap.get(val);
              if (entry) {
                entry.count++;
                entry.familyNames.push(r.familyName);
              }
            } else if (q.type === 'multiple_choice' && Array.isArray(val)) {
              for (const c of val) {
                const entry = optMap.get(c);
                if (entry) {
                  entry.count++;
                  entry.familyNames.push(r.familyName);
                }
              }
            }
          }
          const optionsList = (q.options || []).map((opt) => {
            const entry = optMap.get(opt.id) || { count: 0, familyNames: [] };
            const pct = totalResponded > 0 ? Math.round((entry.count / totalResponded) * 100) : 0;
            return {
              optionId: opt.id,
              label: opt.label,
              count: entry.count,
              percentage: pct,
              familyNames: entry.familyNames,
            };
          });
          questionsBreakdown.push({
            questionId: q.id,
            title: q.title,
            type: q.type,
            options: optionsList,
          });
        } else if (q.type === 'integer_quantity') {
          let sum = 0;
          let count = 0;
          const entries: Array<{ familyName: string; quantity: number }> = [];
          for (const r of responses) {
            const val = r.answers?.[q.id];
            if (val !== undefined && val !== null && val !== '') {
              const num = Number(val);
              if (!isNaN(num)) {
                sum += num;
                count++;
                entries.push({ familyName: r.familyName, quantity: num });
              }
            }
          }
          questionsBreakdown.push({
            questionId: q.id,
            title: q.title,
            type: q.type,
            totalSum: sum,
            average: count > 0 ? (sum / count).toFixed(1) : 0,
            respondedCount: count,
            entries,
          });
        } else if (q.type === 'open_text') {
          const textEntries: Array<{ familyName: string; text: string }> = [];
          for (const r of responses) {
            const val = r.answers?.[q.id];
            if (val && typeof val === 'string' && val.trim()) {
              textEntries.push({ familyName: r.familyName, text: val.trim() });
            }
          }
          questionsBreakdown.push({
            questionId: q.id,
            title: q.title,
            type: q.type,
            entries: textEntries,
          });
        }
      }
    }

    // Mapear breakdown por opción para etapas clásicas
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
      answersMap?: Record<string, any>;
      submittedAt: string;
      version: number;
    }> = [];

    for (const r of responses) {
      respondedParticipantIds.add(r.participantId);
      let answersText = '';

      if (stage.questions && stage.questions.length > 0) {
        const parts: string[] = [];
        for (const q of stage.questions) {
          if (q.type === 'info') continue;
          const val = r.answers?.[q.id];
          if (val === undefined || val === null || val === '') continue;

          let displayVal = String(val);
          if (q.type === 'yes_no') {
            displayVal = val === 'yes' ? 'Sí' : 'No';
          } else if (q.type === 'single_choice') {
            const foundOpt = q.options?.find((o) => o.id === val);
            displayVal = foundOpt ? foundOpt.label : String(val);
          } else if (q.type === 'multiple_choice' && Array.isArray(val)) {
            const labels = val.map((c) => q.options?.find((o) => o.id === c)?.label || c);
            displayVal = labels.join(', ');
          }
          parts.push(`${q.title}: ${displayVal}`);
        }
        answersText = parts.join(' • ') || 'Sin respuestas';
      } else if (stage.type === 'single_choice') {
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
        answersMap: r.answers,
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
      questionsBreakdown,
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
