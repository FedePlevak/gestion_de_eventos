import { getAdminDb } from '@/server/firebase-admin';
import {
  StageModel,
  StageResponse,
  ReadConfirmation,
  StageType,
  AdminCreateStageSchema,
  AdminUpdateStageSchema,
} from './types';
import { FamilySessionContext, OrganizerSessionContext } from '@/modules/access/types';
import {
  ForbiddenError,
  NotFoundError,
  StageClosedError,
  ValidationError,
  ConflictError,
} from '@/server/errors';
import { validateOrganizerEventAccess } from '@/modules/access/organizer-service';
import { recordAuditEvent } from '@/modules/audit/service';

function validateAnswersForStageType(stage: StageModel, answers: Record<string, any>) {
  if (!answers || typeof answers !== 'object') {
    throw new ValidationError('El formato de las respuestas es inválido.');
  }

  switch (stage.type) {
    case 'single_choice': {
      if (!answers.choice || typeof answers.choice !== 'string') {
        throw new ValidationError('Debés seleccionar una opción.');
      }
      const validOptionIds = (stage.options || []).map((o) => o.id);
      if (!validOptionIds.includes(answers.choice)) {
        throw new ValidationError('La opción seleccionada no es válida.');
      }
      break;
    }

    case 'multiple_choice': {
      if (!Array.isArray(answers.choices) || answers.choices.length === 0) {
        throw new ValidationError('Debés seleccionar al menos una opción.');
      }
      const validOptionIds = (stage.options || []).map((o) => o.id);
      const allValid = answers.choices.every((c: any) => validOptionIds.includes(c));
      if (!allValid) {
        throw new ValidationError('Una o más opciones seleccionadas no son válidas.');
      }
      break;
    }

    case 'yes_no': {
      if (answers.choice !== 'yes' && answers.choice !== 'no') {
        throw new ValidationError('Debés responder Sí o No.');
      }
      break;
    }

    case 'integer_quantity': {
      const qty = Number(answers.quantity);
      if (isNaN(qty) || !Number.isInteger(qty) || qty < 0) {
        throw new ValidationError('La cantidad debe ser un número entero mayor o igual a 0.');
      }
      break;
    }

    case 'open_text': {
      if (typeof answers.text !== 'string' || answers.text.trim().length === 0) {
        throw new ValidationError('Debés ingresar un texto para responder.');
      }
      break;
    }

    case 'info': {
      throw new ValidationError('Las etapas informativas se confirman con lectura, no con respuestas.');
    }

    default:
      break;
  }
}

/**
 * Obtener etapas visibles de un evento para una familia
 */
export async function getEventStagesForFamily(
  session: FamilySessionContext
): Promise<(StageModel & { isClosed: boolean; hasResponded: boolean; hasRead: boolean })[]> {
  const db = getAdminDb();
  const stagesRef = db
    .collection('workspaces')
    .doc(session.workspaceId)
    .collection('events')
    .doc(session.eventId)
    .collection('stages');

  const snapshot = await stagesRef.get();
  const now = new Date();

  const stages: (StageModel & { isClosed: boolean; hasResponded: boolean; hasRead: boolean })[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data() as StageModel;

    // Regla E02: una etapa oculta, borrador o anulada no entrega contenido a familias
    if (data.visibility === 'hidden' || data.status === 'draft' || data.status === 'canceled') {
      continue;
    }

    const isExpired = data.deadlineAt ? now >= new Date(data.deadlineAt) : false;
    const isClosed = data.status === 'closed' || isExpired;

    // Verificar si la familia ya respondió
    const respDoc = await doc.ref.collection('responses').doc(session.participantId).get();
    const readDoc = await doc.ref.collection('read_confirmations').doc(session.participantId).get();

    stages.push({
      ...data,
      id: doc.id,
      isClosed,
      hasResponded: respDoc.exists,
      hasRead: readDoc.exists,
    });
  }

  // Ordenar por campo order ascendente
  return stages.sort((a, b) => (a.order || 0) - (b.order || 0));
}

/**
 * Obtener detalle de una etapa para la familia
 */
export async function getStageForFamily(
  session: FamilySessionContext,
  stageId: string
): Promise<{
  stage: StageModel;
  existingResponse: StageResponse | null;
  readConfirmation: ReadConfirmation | null;
  isClosed: boolean;
}> {
  const db = getAdminDb();
  const stageRef = db
    .collection('workspaces')
    .doc(session.workspaceId)
    .collection('events')
    .doc(session.eventId)
    .collection('stages')
    .doc(stageId);

  const stageSnap = await stageRef.get();
  if (!stageSnap.exists) {
    throw new NotFoundError('La etapa solicitada no existe.');
  }

  const stage = stageSnap.data() as StageModel;
  stage.id = stageSnap.id;

  // Regla E02: No entregar contenido de etapa oculta o no abierta
  if (stage.visibility === 'hidden' || stage.status === 'draft' || stage.status === 'canceled') {
    throw new ForbiddenError(
      'Esta etapa no está disponible para las familias.',
      'La consulta no está disponible o fue retirada por el comité.'
    );
  }

  const now = new Date();
  const isExpired = stage.deadlineAt ? now >= new Date(stage.deadlineAt) : false;
  const isClosed = stage.status === 'closed' || isExpired;

  const respDoc = await stageRef.collection('responses').doc(session.participantId).get();
  const readDoc = await stageRef.collection('read_confirmations').doc(session.participantId).get();

  return {
    stage,
    existingResponse: respDoc.exists ? (respDoc.data() as StageResponse) : null,
    readConfirmation: readDoc.exists ? (readDoc.data() as ReadConfirmation) : null,
    isClosed,
  };
}

/**
 * Enviar o modificar respuesta familiar con control de concurrencia y vencimiento
 */
export async function submitStageResponse(
  session: FamilySessionContext,
  stageId: string,
  answers: Record<string, any>,
  expectedVersion?: number
): Promise<StageResponse> {
  const db = getAdminDb();
  const stageRef = db
    .collection('workspaces')
    .doc(session.workspaceId)
    .collection('events')
    .doc(session.eventId)
    .collection('stages')
    .doc(stageId);

  const responseRef = stageRef.collection('responses').doc(session.participantId);

  return await db.runTransaction(async (transaction) => {
    const stageSnap = await transaction.get(stageRef);
    if (!stageSnap.exists) {
      throw new NotFoundError('La etapa no existe.');
    }

    const stage = stageSnap.data() as StageModel;

    // Regla E02: No permitir respuestas a etapas ocultas o cerradas
    if (stage.visibility === 'hidden' || stage.status !== 'open') {
      throw new StageClosedError(
        'La etapa no está abierta para recibir respuestas.',
        'Esta consulta no está abierta para responder.'
      );
    }

    // Regla E06: En el instante de vencimiento o después, se rechaza la escritura en el servidor
    const now = new Date();
    if (stage.deadlineAt && now >= new Date(stage.deadlineAt)) {
      throw new StageClosedError(
        'El plazo para responder esta etapa ya venció.',
        'El plazo para responder esta consulta ha finalizado.'
      );
    }

    // Validar tipo y formato de respuesta
    validateAnswersForStageType(stage, answers);

    // Leer respuesta anterior si existe
    const respSnap = await transaction.get(responseRef);
    let newVersion = 1;
    let submittedAt = now.toISOString();

    if (respSnap.exists) {
      const existing = respSnap.data() as StageResponse;

      // Regla E12: Control de concurrencia entre dispositivos de la misma familia
      if (expectedVersion !== undefined && existing.version !== expectedVersion) {
        throw new ConflictError(
          'Conflicto de concurrencia en respuestas.',
          'Esta respuesta fue modificada recientemente desde otro dispositivo. Por favor recargá la página para ver la versión vigente.'
        );
      }

      newVersion = existing.version + 1;
      submittedAt = existing.submittedAt;

      // Guardar revisión histórica anterior (E05)
      const revisionRef = responseRef.collection('revisions').doc(`v_${existing.version}`);
      transaction.set(revisionRef, {
        id: `v_${existing.version}`,
        version: existing.version,
        answers: existing.answers,
        savedAt: existing.updatedAt || existing.submittedAt,
        participantId: session.participantId,
      });
    } else {
      // Primera respuesta de esta familia: incrementar contador de respuestas
      transaction.update(stageRef, {
        responseCount: (stage.responseCount || 0) + 1,
      });
    }

    // Regla E09: Bloqueo semántico atómico tras la primera respuesta
    if (!stage.isSemanticallyLocked) {
      transaction.update(stageRef, {
        isSemanticallyLocked: true,
      });
    }

    const stageResponse: StageResponse = {
      id: session.participantId,
      workspaceId: session.workspaceId,
      eventId: session.eventId,
      stageId,
      participantId: session.participantId,
      familyId: session.familyId,
      familyName: session.familyName,
      answers,
      version: newVersion,
      submittedAt,
      updatedAt: now.toISOString(),
    };

    transaction.set(responseRef, stageResponse);

    return stageResponse;
  });
}

/**
 * Confirmar lectura de una etapa informativa
 */
export async function confirmStageRead(
  session: FamilySessionContext,
  stageId: string
): Promise<ReadConfirmation> {
  const db = getAdminDb();
  const stageRef = db
    .collection('workspaces')
    .doc(session.workspaceId)
    .collection('events')
    .doc(session.eventId)
    .collection('stages')
    .doc(stageId);

  const readRef = stageRef.collection('read_confirmations').doc(session.participantId);

  return await db.runTransaction(async (transaction) => {
    const stageSnap = await transaction.get(stageRef);
    if (!stageSnap.exists) {
      throw new NotFoundError('La etapa no existe.');
    }

    const stage = stageSnap.data() as StageModel;

    if (stage.visibility === 'hidden' || stage.status !== 'open') {
      throw new StageClosedError(
        'La etapa no está disponible para lectura confirmada.',
        'Esta información ya no está disponible para confirmación.'
      );
    }

    const readSnap = await transaction.get(readRef);
    if (readSnap.exists) {
      return readSnap.data() as ReadConfirmation;
    }

    const now = new Date().toISOString();
    const confirmation: ReadConfirmation = {
      id: session.participantId,
      workspaceId: session.workspaceId,
      eventId: session.eventId,
      stageId,
      participantId: session.participantId,
      familyId: session.familyId,
      familyName: session.familyName,
      confirmedAt: now,
    };

    // Incrementar lecturas y activar bloqueo semántico
    transaction.update(stageRef, {
      readCount: (stage.readCount || 0) + 1,
      isSemanticallyLocked: true,
    });

    transaction.set(readRef, confirmation);
    return confirmation;
  });
}

// ----------------------------------------------------
// ACCIONES ADMINISTRATIVAS DEL COMITÉ ORGANIZADOR
// ----------------------------------------------------

/**
 * Crear nueva etapa por el comité
 */
export async function createStageAdmin(
  organizer: OrganizerSessionContext,
  eventId: string,
  data: any
): Promise<StageModel> {
  await validateOrganizerEventAccess(organizer, eventId, organizer.workspaceId);
  const parsed = AdminCreateStageSchema.parse(data);

  const db = getAdminDb();
  const stagesCol = db
    .collection('workspaces')
    .doc(organizer.workspaceId)
    .collection('events')
    .doc(eventId)
    .collection('stages');

  const newDocRef = stagesCol.doc();
  const now = new Date().toISOString();

  const newStage: StageModel = {
    id: newDocRef.id,
    workspaceId: organizer.workspaceId,
    eventId,
    title: parsed.title,
    description: parsed.description || '',
    content: parsed.content || '',
    type: parsed.type,
    status: 'open',
    visibility: parsed.visibility,
    order: parsed.order,
    deadlineAt: parsed.deadlineAt || undefined,
    timezone: parsed.timezone || 'America/Montevideo',
    isSemanticallyLocked: false,
    options: parsed.options || [],
    clarifications: [],
    closures: [],
    reopenings: [],
    responseCount: 0,
    readCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  await newDocRef.set(newStage);

  await recordAuditEvent({
    workspaceId: organizer.workspaceId,
    eventId,
    actor: {
      type: 'organizer',
      id: organizer.organizerId,
      email: organizer.email,
    },
    action: 'STAGE_CREATED',
    targetType: 'stage',
    targetId: newDocRef.id,
    details: { title: parsed.title, type: parsed.type },
  });

  return newStage;
}

/**
 * Modificar configuración de una etapa existente (con bloqueo semántico E09)
 */
export async function updateStageAdmin(
  organizer: OrganizerSessionContext,
  eventId: string,
  stageId: string,
  data: any
): Promise<void> {
  await validateOrganizerEventAccess(organizer, eventId, organizer.workspaceId);
  let parsed;
  try {
    parsed = AdminUpdateStageSchema.parse(data);
  } catch (zodError: any) {
    const errorMsg = zodError.errors?.[0]?.message || 'Datos de etapa inválidos';
    throw new ValidationError(errorMsg, errorMsg);
  }

  const db = getAdminDb();
  const stageRef = db
    .collection('workspaces')
    .doc(organizer.workspaceId)
    .collection('events')
    .doc(eventId)
    .collection('stages')
    .doc(stageId);

  await db.runTransaction(async (transaction) => {
    const stageSnap = await transaction.get(stageRef);
    if (!stageSnap.exists) {
      throw new NotFoundError('La etapa no existe.');
    }

    const stage = stageSnap.data() as StageModel;

    // Regla E09: Desde la primera respuesta o lectura confirmada, se protegen las opciones semánticas
    if (stage.isSemanticallyLocked && parsed.options !== undefined) {
      const currentOptions = stage.options || [];
      const hasOptionsChanged =
        parsed.options.length !== currentOptions.length ||
        parsed.options.some((opt, idx) => {
          const curr = currentOptions[idx];
          return !curr || opt.id !== curr.id || opt.label.trim() !== curr.label.trim();
        });

      if (hasOptionsChanged) {
        throw new ValidationError(
          'No se pueden cambiar las opciones porque ya se recibieron respuestas de familias. Para cambiar las opciones o el significado, creá una nueva etapa.',
          'No se pueden cambiar las opciones porque ya se recibieron respuestas de familias. Podés prorrogar la fecha y hora de cierre o modificar el título/descripción.'
        );
      }
    }

    const updates: Partial<StageModel> = {
      updatedAt: new Date().toISOString(),
    };

    if (parsed.title !== undefined) updates.title = parsed.title;
    if (parsed.description !== undefined) updates.description = parsed.description;
    if (parsed.content !== undefined) updates.content = parsed.content;
    if (parsed.visibility !== undefined) updates.visibility = parsed.visibility;
    if (parsed.status !== undefined) updates.status = parsed.status;
    if (parsed.order !== undefined) updates.order = parsed.order;
    if (parsed.deadlineAt !== undefined) updates.deadlineAt = parsed.deadlineAt || undefined;
    if (!stage.isSemanticallyLocked && parsed.options !== undefined) {
      updates.options = parsed.options;
    }

    transaction.update(stageRef, updates);
  });

  await recordAuditEvent({
    workspaceId: organizer.workspaceId,
    eventId,
    actor: {
      type: 'organizer',
      id: organizer.organizerId,
      email: organizer.email,
    },
    action: 'STAGE_UPDATED',
    targetType: 'stage',
    targetId: stageId,
    details: data,
  });
}

/**
 * Añadir aclaración separada a la etapa (Regla E14)
 */
export async function addClarificationAdmin(
  organizer: OrganizerSessionContext,
  eventId: string,
  stageId: string,
  content: string
): Promise<void> {
  await validateOrganizerEventAccess(organizer, eventId, organizer.workspaceId);
  if (!content || content.trim().length < 3) {
    throw new ValidationError('El texto de la aclaración es obligatorio.');
  }

  const db = getAdminDb();
  const stageRef = db
    .collection('workspaces')
    .doc(organizer.workspaceId)
    .collection('events')
    .doc(eventId)
    .collection('stages')
    .doc(stageId);

  const stageSnap = await stageRef.get();
  if (!stageSnap.exists) {
    throw new NotFoundError('La etapa no existe.');
  }

  const stage = stageSnap.data() as StageModel;
  const newClarification = {
    id: `clar_${Date.now()}`,
    content: content.trim(),
    createdAt: new Date().toISOString(),
    authorOrganizerEmail: organizer.email,
  };

  const updatedClarifications = [...(stage.clarifications || []), newClarification];

  await stageRef.update({
    clarifications: updatedClarifications,
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
    action: 'STAGE_CLARIFICATION_ADDED',
    targetType: 'stage',
    targetId: stageId,
    details: { clarificationId: newClarification.id },
  });
}

/**
 * Cierre manual de la etapa por el comité
 */
export async function closeStageAdmin(
  organizer: OrganizerSessionContext,
  eventId: string,
  stageId: string,
  reason?: string
): Promise<void> {
  await validateOrganizerEventAccess(organizer, eventId, organizer.workspaceId);

  const db = getAdminDb();
  const stageRef = db
    .collection('workspaces')
    .doc(organizer.workspaceId)
    .collection('events')
    .doc(eventId)
    .collection('stages')
    .doc(stageId);

  const stageSnap = await stageRef.get();
  if (!stageSnap.exists) {
    throw new NotFoundError('La etapa no existe.');
  }

  const stage = stageSnap.data() as StageModel;
  const now = new Date().toISOString();

  const closure = {
    closedAt: now,
    closedByEmail: organizer.email,
    reason: reason?.trim() || 'Cierre manual por el comité organizador',
  };

  await stageRef.update({
    status: 'closed',
    closures: [...(stage.closures || []), closure],
    updatedAt: now,
  });

  await recordAuditEvent({
    workspaceId: organizer.workspaceId,
    eventId,
    actor: {
      type: 'organizer',
      id: organizer.organizerId,
      email: organizer.email,
    },
    action: 'STAGE_CLOSED',
    targetType: 'stage',
    targetId: stageId,
    details: { reason },
  });
}

/**
 * Reapertura de etapa con motivo obligatorio (Regla E11)
 */
export async function reopenStageAdmin(
  organizer: OrganizerSessionContext,
  eventId: string,
  stageId: string,
  reason: string,
  newDeadlineAt?: string | null
): Promise<void> {
  await validateOrganizerEventAccess(organizer, eventId, organizer.workspaceId);
  if (!reason || reason.trim().length < 3) {
    throw new ValidationError('El motivo de reapertura es obligatorio.');
  }

  const db = getAdminDb();
  const stageRef = db
    .collection('workspaces')
    .doc(organizer.workspaceId)
    .collection('events')
    .doc(eventId)
    .collection('stages')
    .doc(stageId);

  const stageSnap = await stageRef.get();
  if (!stageSnap.exists) {
    throw new NotFoundError('La etapa no existe.');
  }

  const stage = stageSnap.data() as StageModel;
  const now = new Date().toISOString();

  const lastClosure = stage.closures && stage.closures.length > 0
    ? stage.closures[stage.closures.length - 1].closedAt
    : now;

  const reopening = {
    reopenedAt: now,
    reopenedByEmail: organizer.email,
    reason: reason.trim(),
    previousClosedAt: lastClosure,
    newDeadlineAt: newDeadlineAt || undefined,
  };

  await stageRef.update({
    status: 'open',
    deadlineAt: newDeadlineAt || null,
    reopenings: [...(stage.reopenings || []), reopening],
    updatedAt: now,
  });

  await recordAuditEvent({
    workspaceId: organizer.workspaceId,
    eventId,
    actor: {
      type: 'organizer',
      id: organizer.organizerId,
      email: organizer.email,
    },
    action: 'STAGE_REOPENED',
    targetType: 'stage',
    targetId: stageId,
    details: { reason, newDeadlineAt },
  });
}
