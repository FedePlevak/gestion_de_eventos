import { getAdminDb } from '@/server/firebase-admin';
import { OrganizerSessionContext } from '@/modules/access/types';
import { validateOrganizerEventAccess } from '@/modules/access/organizer-service';
import { StageModel, StageResponse } from '@/modules/stages/types';
import { PaymentReport } from '@/modules/payments/types';

/**
 * Escapa valores para formato CSV seguro (RFC 4180)
 */
function escapeCsv(value: any): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Exporta todas las respuestas de etapas del evento en formato CSV
 */
export async function exportEventResponsesCsv(
  organizer: OrganizerSessionContext,
  eventId: string
): Promise<string> {
  await validateOrganizerEventAccess(organizer, eventId, organizer.workspaceId);
  const db = getAdminDb();
  const eventRef = db.collection('workspaces').doc(organizer.workspaceId).collection('events').doc(eventId);

  // Obtener etapas del evento
  const stagesSnap = await eventRef.collection('stages').get();
  const stages = stagesSnap.docs.map((d) => d.data() as StageModel);

  // Obtener participantes activos
  const partsSnap = await eventRef.collection('participants').where('status', '==', 'active').get();
  const participants = partsSnap.docs.map((d) => d.data());

  const rows: string[] = [];
  rows.push(['Familia', 'Etapa', 'Tipo de Consulta', 'Respuesta', 'Fecha de Respuesta', 'Versión'].join(','));

  for (const stage of stages) {
    const respSnap = await eventRef.collection('stages').doc(stage.id).collection('responses').get();
    const responsesMap = new Map<string, StageResponse>();
    for (const doc of respSnap.docs) {
      responsesMap.set(doc.id, doc.data() as StageResponse);
    }

    for (const p of participants) {
      const resp = responsesMap.get(p.id);
      let answerText = 'Sin responder';
      if (resp) {
        if (resp.answers.choice) {
          const opt = stage.options?.find((o) => o.id === resp.answers.choice);
          answerText = opt ? opt.label : resp.answers.choice;
        } else if (resp.answers.choices) {
          answerText = resp.answers.choices.join('; ');
        } else if (resp.answers.quantity !== undefined) {
          answerText = String(resp.answers.quantity);
        } else if (resp.answers.text) {
          answerText = resp.answers.text;
        }
      }

      rows.push([
        escapeCsv(p.familyName),
        escapeCsv(stage.title),
        escapeCsv(stage.type),
        escapeCsv(answerText),
        escapeCsv(resp?.updatedAt || resp?.submittedAt || ''),
        escapeCsv(resp?.version || ''),
      ].join(','));
    }
  }

  return rows.join('\r\n');
}

/**
 * Exporta la conciliación y estado financiero del evento en formato CSV
 */
export async function exportEventPaymentsCsv(
  organizer: OrganizerSessionContext,
  eventId: string
): Promise<string> {
  await validateOrganizerEventAccess(organizer, eventId, organizer.workspaceId);
  const db = getAdminDb();
  const eventRef = db.collection('workspaces').doc(organizer.workspaceId).collection('events').doc(eventId);

  const partsSnap = await eventRef.collection('participants').where('status', '==', 'active').get();
  const participants = partsSnap.docs.map((d) => d.data());

  const paymentsSnap = await eventRef.collection('payments').get();
  const paymentsMap = new Map<string, PaymentReport>();
  for (const doc of paymentsSnap.docs) {
    paymentsMap.set(doc.id, doc.data() as PaymentReport);
  }

  const rows: string[] = [];
  rows.push([
    'Familia',
    'Contacto',
    'Estado de Pago',
    'Moneda',
    'Importe Esperado',
    'Importe Declarado',
    'Fecha de Transferencia',
    'Importe Verificado',
    'Fecha de Verificación',
    'Verificado Por',
    'Tiene Comprobante Adjunto',
  ].join(','));

  for (const p of participants) {
    const pay = paymentsMap.get(p.id);
    const expected = pay ? (pay.expectedAmountMinor / 100).toFixed(2) : '0.00';
    const declared = pay?.declaredAmountMinor !== undefined ? (pay.declaredAmountMinor / 100).toFixed(2) : '';
    const verified = pay?.verifiedAmountMinor !== undefined ? (pay.verifiedAmountMinor / 100).toFixed(2) : '';
    const hasAttachment = pay?.attachment ? 'Sí' : 'No';

    let statusText = 'Pendiente';
    if (pay?.status === 'verified') statusText = 'Verificado';
    else if (pay?.status === 'reported') statusText = 'Informado (a verificar)';
    else if (pay?.status === 'requires_revision') statusText = 'En revisión';

    rows.push([
      escapeCsv(p.familyName),
      escapeCsv(p.contactEmail || p.contactPhone || ''),
      escapeCsv(statusText),
      escapeCsv(pay?.currency || 'UYU'),
      escapeCsv(expected),
      escapeCsv(declared),
      escapeCsv(pay?.transferDate || ''),
      escapeCsv(verified),
      escapeCsv(pay?.verifiedAt || ''),
      escapeCsv(pay?.verifiedBy || ''),
      escapeCsv(hasAttachment),
    ].join(','));
  }

  return rows.join('\r\n');
}
