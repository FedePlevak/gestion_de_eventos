import { getAdminDb } from '@/server/firebase-admin';
import { StageAggregatedResults, AggregatedOptionCount } from './types';
import { FamilySessionContext, OrganizerSessionContext } from '@/modules/access/types';
import { StageModel, StageResponse } from '@/modules/stages/types';
import { NotFoundError, ForbiddenError } from '@/server/errors';
import { validateOrganizerEventAccess } from '@/modules/access/organizer-service';
import { recordAuditEvent } from '@/modules/audit/service';

/**
 * Calcula los resultados agregados de una etapa con denominadores reales (Regla R04)
 */
export async function calculateStageResults(
  organizer: OrganizerSessionContext,
  eventId: string,
  stageId: string
): Promise<StageAggregatedResults> {
  await validateOrganizerEventAccess(organizer, eventId, organizer.workspaceId);

  const db = getAdminDb();
  const eventRef = db
    .collection('workspaces')
    .doc(organizer.workspaceId)
    .collection('events')
    .doc(eventId);

  const stageRef = eventRef.collection('stages').doc(stageId);
  const stageSnap = await stageRef.get();
  if (!stageSnap.exists) {
    throw new NotFoundError('La etapa no existe.');
  }

  const stage = stageSnap.data() as StageModel;

  // Obtener familias convocadas activas (denominador total)
  const partsSnap = await eventRef.collection('participants').where('status', '==', 'active').get();
  const totalEligibleFamilies = partsSnap.docs.length;

  // Obtener respuestas enviadas
  const respSnap = await stageRef.collection('responses').get();
  const responses = respSnap.docs.map((d) => d.data() as StageResponse);
  const respondedFamiliesCount = responses.length;

  const responseRatePercentage = totalEligibleFamilies > 0
    ? Math.round((respondedFamiliesCount / totalEligibleFamilies) * 100)
    : 0;

  const breakdown: AggregatedOptionCount[] = [];

  if (stage.type === 'single_choice' || stage.type === 'multiple_choice') {
    const counts = new Map<string, number>();
    for (const opt of stage.options || []) {
      counts.set(opt.id, 0);
    }

    for (const r of responses) {
      if (stage.type === 'single_choice' && r.answers?.choice) {
        const cur = counts.get(r.answers.choice) || 0;
        counts.set(r.answers.choice, cur + 1);
      } else if (stage.type === 'multiple_choice' && Array.isArray(r.answers?.choices)) {
        for (const c of r.answers.choices) {
          const cur = counts.get(c) || 0;
          counts.set(c, cur + 1);
        }
      }
    }

    for (const opt of stage.options || []) {
      const c = counts.get(opt.id) || 0;
      const pct = respondedFamiliesCount > 0 ? Math.round((c / respondedFamiliesCount) * 100) : 0;
      breakdown.push({
        optionId: opt.id,
        label: opt.label,
        count: c,
        percentage: pct,
      });
    }
  } else if (stage.type === 'yes_no') {
    let yesCount = 0;
    let noCount = 0;
    for (const r of responses) {
      if (r.answers?.choice === 'yes') yesCount++;
      if (r.answers?.choice === 'no') noCount++;
    }
    const yesPct = respondedFamiliesCount > 0 ? Math.round((yesCount / respondedFamiliesCount) * 100) : 0;
    const noPct = respondedFamiliesCount > 0 ? Math.round((noCount / respondedFamiliesCount) * 100) : 0;
    breakdown.push({ optionId: 'yes', label: 'Sí', count: yesCount, percentage: yesPct });
    breakdown.push({ optionId: 'no', label: 'No', count: noCount, percentage: noPct });
  }

  const isProvisional = stage.status === 'open' || (stage.reopenings && stage.reopenings.length > 0);

  return {
    stageId,
    stageTitle: stage.title,
    stageType: stage.type,
    totalEligibleFamilies,
    respondedFamiliesCount,
    responseRatePercentage,
    breakdown,
    publishedAt: new Date().toISOString(),
    isProvisional,
    publishedByEmail: organizer.email,
    status: 'published',
  };
}

/**
 * Publicar explícitamente los resultados de una etapa (Regla R05, R06, R07)
 */
export async function publishStageResults(
  organizer: OrganizerSessionContext,
  eventId: string,
  stageId: string,
  customNote?: string
): Promise<StageAggregatedResults> {
  const results = await calculateStageResults(organizer, eventId, stageId);
  if (customNote) {
    results.note = customNote;
  }

  const db = getAdminDb();
  const publishedDocRef = db
    .collection('workspaces')
    .doc(organizer.workspaceId)
    .collection('events')
    .doc(eventId)
    .collection('stages')
    .doc(stageId)
    .collection('published_results')
    .doc('latest');

  await publishedDocRef.set(results);

  await recordAuditEvent({
    workspaceId: organizer.workspaceId,
    eventId,
    actor: {
      type: 'organizer',
      id: organizer.organizerId,
      email: organizer.email,
    },
    action: 'RESULTS_PUBLISHED',
    targetType: 'stage',
    targetId: stageId,
    details: {
      respondedFamiliesCount: results.respondedFamiliesCount,
      totalEligibleFamilies: results.totalEligibleFamilies,
      isProvisional: results.isProvisional,
    },
  });

  return results;
}

/**
 * Retirar publicación de resultados
 */
export async function unpublishStageResults(
  organizer: OrganizerSessionContext,
  eventId: string,
  stageId: string
): Promise<void> {
  await validateOrganizerEventAccess(organizer, eventId, organizer.workspaceId);

  const db = getAdminDb();
  const publishedDocRef = db
    .collection('workspaces')
    .doc(organizer.workspaceId)
    .collection('events')
    .doc(eventId)
    .collection('stages')
    .doc(stageId)
    .collection('published_results')
    .doc('latest');

  await publishedDocRef.update({
    status: 'unpublished',
    updatedAt: new Date().toISOString(),
  });

  await recordAuditEvent({
    workspaceId: organizer.workspaceId,
    eventId,
    actor: {
      type: 'organizer',
      id: organizer.organizerId,
      email: organizer.email,
    },
    action: 'RESULTS_UNPUBLISHED',
    targetType: 'stage',
    targetId: stageId,
  });
}

/**
 * Consulta de resultados por una familia (Regla R05, R06, R07)
 */
export async function getPublishedResultsForFamily(
  session: FamilySessionContext,
  stageId: string
): Promise<StageAggregatedResults | null> {
  const db = getAdminDb();
  const stageRef = db
    .collection('workspaces')
    .doc(session.workspaceId)
    .collection('events')
    .doc(session.eventId)
    .collection('stages')
    .doc(stageId);

  const stageSnap = await stageRef.get();
  if (!stageSnap.exists) throw new NotFoundError('Etapa no encontrada.');

  const stage = stageSnap.data() as StageModel;

  // Regla R07: Ocultar una etapa oculta también sus resultados a las familias
  if (stage.visibility === 'hidden' || stage.status === 'draft' || stage.status === 'canceled') {
    return null;
  }

  const publishedRef = stageRef.collection('published_results').doc('latest');
  const publishedSnap = await publishedRef.get();

  if (!publishedSnap.exists) {
    // Regla R05: Las familias no ven resultados antes de publicación explícita
    return null;
  }

  const data = publishedSnap.data() as StageAggregatedResults;
  if (data.status !== 'published') {
    return null;
  }

  // Regla R06: Nunca expone textos libres, datos individuales ni notas internas
  return {
    stageId: data.stageId,
    stageTitle: data.stageTitle,
    stageType: data.stageType,
    totalEligibleFamilies: data.totalEligibleFamilies,
    respondedFamiliesCount: data.respondedFamiliesCount,
    responseRatePercentage: data.responseRatePercentage,
    breakdown: data.breakdown,
    publishedAt: data.publishedAt,
    isProvisional: data.isProvisional,
    publishedByEmail: data.publishedByEmail,
    status: 'published',
    note: data.note,
  };
}
