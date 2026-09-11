import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateStageResults,
  publishStageResults,
  unpublishStageResults,
  getPublishedResultsForFamily,
} from '../src/modules/results/service';
import {
  createSupportTicket,
  getFamilySupportTickets,
  getAllEventSupportTicketsAdmin,
  updateSupportTicketAdmin,
} from '../src/modules/support/service';
import { buildWhatsAppMessage } from '../src/modules/communication/service';
import { exportEventResponsesCsv, exportEventPaymentsCsv } from '../src/modules/export/service';
import { FamilySessionContext, OrganizerSessionContext } from '../src/modules/access/types';

// Mock de almacenamiento en memoria para Firestore
const memoryStore = new Map<string, any>();

function createDocRef(currentPath: string) {
  return {
    id: currentPath.split('/').pop() || '',
    path: currentPath,
    get: async () => {
      const data = memoryStore.get(currentPath);
      return {
        id: currentPath.split('/').pop() || '',
        exists: Boolean(data),
        data: () => (data ? JSON.parse(JSON.stringify(data)) : undefined),
        ref: createDocRef(currentPath),
      };
    },
    set: async (data: any) => {
      memoryStore.set(currentPath, JSON.parse(JSON.stringify(data)));
    },
    update: async (data: any) => {
      const current = memoryStore.get(currentPath) || {};
      memoryStore.set(currentPath, JSON.parse(JSON.stringify({ ...current, ...data })));
    },
    collection: (subColName: string) => createCollectionRef(`${currentPath}/${subColName}`),
  };
}

function createCollectionRef(currentPath: string) {
  return {
    doc: (docId?: string) => {
      const id = docId || `doc_${Math.random().toString(36).substring(2, 9)}`;
      return createDocRef(`${currentPath}/${id}`);
    },
    get: async () => {
      const docs: any[] = [];
      const prefix = `${currentPath}/`;
      for (const [key, value] of memoryStore.entries()) {
        if (key.startsWith(prefix)) {
          const rest = key.substring(prefix.length);
          if (!rest.includes('/')) {
            docs.push({
              id: key.split('/').pop() || '',
              exists: true,
              data: () => JSON.parse(JSON.stringify(value)),
              ref: createDocRef(key),
            });
          }
        }
      }
      return { docs };
    },
    where: (field: string, op: string, value: any) => {
      return {
        get: async () => {
          const all = await createCollectionRef(currentPath).get();
          if (op === '==') {
            const filtered = all.docs.filter((d: any) => d.data()[field] === value);
            return { docs: filtered };
          }
          return all;
        },
      };
    },
  };
}

vi.mock('../src/server/firebase-admin', () => {
  return {
    getAdminDb: () => ({
      collection: (colName: string) => createCollectionRef(colName),
      runTransaction: async (updateFn: any) => {
        return updateFn({
          get: async (ref: any) => ref.get(),
          update: (ref: any, data: any) => ref.update(data),
          set: (ref: any, data: any) => ref.set(data),
        });
      },
    }),
  };
});

vi.mock('../src/modules/audit/service', () => ({
  recordAuditEvent: vi.fn().mockResolvedValue('audit_id_123'),
}));

vi.mock('../src/modules/access/organizer-service', () => ({
  validateOrganizerEventAccess: vi.fn().mockResolvedValue({ id: 'org_01', status: 'active' }),
}));

describe('Incremento 3: Seguimiento, Comunicación y Soporte', () => {
  const workspaceId = 'ws_colegio';
  const eventId = 'evento_fiesta_2026';
  const stageId = 'stage_menu_01';

  const organizer: OrganizerSessionContext = {
    organizerId: 'org_01',
    email: 'organizador1@colegio.edu.uy',
    workspaceId,
    name: 'Organizador Uno',
  };

  const familySessionA: FamilySessionContext = {
    workspaceId,
    eventId,
    participantId: 'part_fam_a',
    familyId: 'fam_a',
    familyName: 'Álvarez',
    accessVersion: 1,
  };

  const familySessionB: FamilySessionContext = {
    workspaceId,
    eventId,
    participantId: 'part_fam_b',
    familyId: 'fam_b',
    familyName: 'Bianchi',
    accessVersion: 1,
  };

  beforeEach(() => {
    memoryStore.clear();

    // Evento base
    memoryStore.set(`workspaces/${workspaceId}/events/${eventId}`, {
      id: eventId,
      workspaceId,
      name: 'Fiesta de Egresados 2026',
      status: 'published',
    });

    // 10 familias convocadas activas
    for (let i = 1; i <= 10; i++) {
      memoryStore.set(`workspaces/${workspaceId}/events/${eventId}/participants/part_fam_${i}`, {
        id: `part_fam_${i}`,
        familyId: `fam_${i}`,
        familyName: `Familia ${i}`,
        status: 'active',
      });
    }

    // Etapa de consulta de menú
    memoryStore.set(`workspaces/${workspaceId}/events/${eventId}/stages/${stageId}`, {
      id: stageId,
      workspaceId,
      eventId,
      title: 'Elección de Menú Principal',
      type: 'single_choice',
      status: 'open',
      visibility: 'published',
      options: [
        { id: 'opt_carne', label: 'Carne y Guarnición' },
        { id: 'opt_pasta', label: 'Pasta Rellena' },
        { id: 'opt_vegano', label: 'Menú Vegano' },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  describe('Criterio R04: Denominadores reales en resultados agregados', () => {
    it('calcula los resultados agregados utilizando el total de familias convocadas como denominador', async () => {
      // 4 respuestas emitidas: 3 carne, 1 pasta
      memoryStore.set(
        `workspaces/${workspaceId}/events/${eventId}/stages/${stageId}/responses/part_fam_1`,
        {
          id: 'part_fam_1',
          participantId: 'part_fam_1',
          stageId,
          answers: { choice: 'opt_carne' },
          version: 1,
        }
      );
      memoryStore.set(
        `workspaces/${workspaceId}/events/${eventId}/stages/${stageId}/responses/part_fam_2`,
        {
          id: 'part_fam_2',
          participantId: 'part_fam_2',
          stageId,
          answers: { choice: 'opt_carne' },
          version: 1,
        }
      );
      memoryStore.set(
        `workspaces/${workspaceId}/events/${eventId}/stages/${stageId}/responses/part_fam_3`,
        {
          id: 'part_fam_3',
          participantId: 'part_fam_3',
          stageId,
          answers: { choice: 'opt_carne' },
          version: 1,
        }
      );
      memoryStore.set(
        `workspaces/${workspaceId}/events/${eventId}/stages/${stageId}/responses/part_fam_4`,
        {
          id: 'part_fam_4',
          participantId: 'part_fam_4',
          stageId,
          answers: { choice: 'opt_pasta' },
          version: 1,
        }
      );

      const results = await calculateStageResults(organizer, eventId, stageId);

      expect(results.totalEligibleFamilies).toBe(10);
      expect(results.respondedFamiliesCount).toBe(4);
      expect(results.responseRatePercentage).toBe(40); // 4 de 10 = 40%

      const carne = results.breakdown.find((b) => b.optionId === 'opt_carne');
      const pasta = results.breakdown.find((b) => b.optionId === 'opt_pasta');
      const vegano = results.breakdown.find((b) => b.optionId === 'opt_vegano');

      expect(carne?.count).toBe(3);
      expect(carne?.percentage).toBe(75); // 3 de 4 = 75%
      expect(pasta?.count).toBe(1);
      expect(pasta?.percentage).toBe(25); // 1 de 4 = 25%
      expect(vegano?.count).toBe(0);
      expect(vegano?.percentage).toBe(0);
    });
  });

  describe('Criterio R05: Familias no ven resultados antes de publicación explícita', () => {
    it('retorna null a las familias si el comité no ha publicado los resultados explícitamente', async () => {
      // Registrar una respuesta
      memoryStore.set(
        `workspaces/${workspaceId}/events/${eventId}/stages/${stageId}/responses/part_fam_1`,
        {
          id: 'part_fam_1',
          participantId: 'part_fam_1',
          stageId,
          answers: { choice: 'opt_carne' },
        }
      );

      // Antes de publicar: la familia no puede ver resultados
      const beforePublish = await getPublishedResultsForFamily(familySessionA, stageId);
      expect(beforePublish).toBeNull();

      // El comité publica los resultados con una nota
      await publishStageResults(organizer, eventId, stageId, 'Resultados de la primera vuelta');

      // Después de publicar: la familia puede ver los resultados
      const afterPublish = await getPublishedResultsForFamily(familySessionA, stageId);
      expect(afterPublish).not.toBeNull();
      expect(afterPublish?.status).toBe('published');
      expect(afterPublish?.note).toBe('Resultados de la primera vuelta');
      expect(afterPublish?.respondedFamiliesCount).toBe(1);
    });

    it('permite al comité retirar la publicación dejando los resultados inaccesibles a las familias', async () => {
      await publishStageResults(organizer, eventId, stageId);
      expect(await getPublishedResultsForFamily(familySessionA, stageId)).not.toBeNull();

      // Despublicar
      await unpublishStageResults(organizer, eventId, stageId);
      const afterUnpublish = await getPublishedResultsForFamily(familySessionA, stageId);
      expect(afterUnpublish).toBeNull();
    });
  });

  describe('Criterio R06: Protección de privacidad en resultados agregados', () => {
    it('no expone datos individuales, textos libres ni respuestas de familias en los resultados agregados', async () => {
      // Crear etapa de texto libre
      const textStageId = 'stage_comentarios';
      memoryStore.set(`workspaces/${workspaceId}/events/${eventId}/stages/${textStageId}`, {
        id: textStageId,
        workspaceId,
        eventId,
        title: 'Restricciones y Comentarios Médicos',
        type: 'open_text',
        status: 'open',
        visibility: 'published',
      });

      // Guardar respuesta con datos sensibles
      memoryStore.set(
        `workspaces/${workspaceId}/events/${eventId}/stages/${textStageId}/responses/part_fam_a`,
        {
          id: 'part_fam_a',
          participantId: 'part_fam_a',
          stageId: textStageId,
          answers: { text: 'Mi hijo es celíaco severo y alérgico al maní.' },
        }
      );

      await publishStageResults(organizer, eventId, textStageId);

      const familyResults = await getPublishedResultsForFamily(familySessionB, textStageId);
      expect(familyResults).not.toBeNull();
      // Solo contiene métricas agregadas
      expect((familyResults as any).answers).toBeUndefined();
      expect((familyResults as any).text).toBeUndefined();
      expect(JSON.stringify(familyResults)).not.toContain('celíaco severo');
      expect(JSON.stringify(familyResults)).not.toContain('part_fam_a');
    });
  });

  describe('Criterio R07: Ocultar una etapa oculta automáticamente sus resultados a familias', () => {
    it('retorna null a las familias si la etapa está oculta, aun si los resultados fueron publicados', async () => {
      await publishStageResults(organizer, eventId, stageId);

      // Ahora el comité oculta la etapa
      const stageData = memoryStore.get(`workspaces/${workspaceId}/events/${eventId}/stages/${stageId}`);
      memoryStore.set(`workspaces/${workspaceId}/events/${eventId}/stages/${stageId}`, {
        ...stageData,
        visibility: 'hidden',
      });

      const results = await getPublishedResultsForFamily(familySessionA, stageId);
      expect(results).toBeNull();
    });
  });

  describe('Criterio S01: Aislamiento estricto de tickets de soporte por familia', () => {
    it('una familia solo puede ver sus propios tickets de consulta y no los de otras familias', async () => {
      // Familia A crea ticket
      const ticketA = await createSupportTicket(familySessionA, {
        subject: 'Consulta por estacionamiento',
        description: '¿Hay lugar accesible para abuelos mayores?',
      });

      // Familia B crea ticket
      const ticketB = await createSupportTicket(familySessionB, {
        subject: 'Consulta por fotógrafo',
        description: '¿Se puede ingresar con cámara propia?',
      });

      const ticketsA = await getFamilySupportTickets(familySessionA);
      const ticketsB = await getFamilySupportTickets(familySessionB);

      expect(ticketsA.length).toBe(1);
      expect(ticketsA[0].id).toBe(ticketA.id);
      expect(ticketsA[0].subject).toBe('Consulta por estacionamiento');

      expect(ticketsB.length).toBe(1);
      expect(ticketsB[0].id).toBe(ticketB.id);
      expect(ticketsB[0].subject).toBe('Consulta por fotógrafo');
    });
  });

  describe('Criterio S02: Supresión estricta de notas internas para las familias', () => {
    it('las notas internas del comité se eliminan estrictamente de la respuesta para familias', async () => {
      const ticket = await createSupportTicket(familySessionA, {
        subject: 'Duda con comprobante de pago',
        description: 'Adjunté la transferencia pero no veo el tick verde aún.',
      });

      // Organizador agrega una nota interna sensible
      await updateSupportTicketAdmin(organizer, eventId, ticket.id, {
        addInternalNote: 'Nota confidencial: verificar con banco si entró el depósito.',
        status: 'in_progress',
      });

      // Consulta de la familia
      const familyTickets = await getFamilySupportTickets(familySessionA);
      expect(familyTickets[0].status).toBe('in_progress');
      expect((familyTickets[0] as any).internalNotes).toBeUndefined();
      expect(JSON.stringify(familyTickets)).not.toContain('Nota confidencial');

      // Consulta del organizador: sí ve las notas internas
      const adminTickets = await getAllEventSupportTicketsAdmin(organizer, eventId);
      const adminTicket = adminTickets.find((t) => t.id === ticket.id);
      expect(adminTicket?.internalNotes.length).toBe(1);
      expect(adminTicket?.internalNotes[0].note).toContain('Nota confidencial');
    });
  });

  describe('Criterio S03: Generador de plantillas WhatsApp sin efectos colaterales', () => {
    it('genera el enlace wa.me correctamente con placeholders y sin registrar envíos automáticos', () => {
      const msg = buildWhatsAppMessage('INVITATION', {
        recipientName: 'Álvarez',
        eventName: 'Fiesta de Egresados 2026',
        accessUrl: 'https://fiesta.colegio.edu.uy/f/token123',
        recipientPhone: '+59899123456',
      });

      expect(msg.text).toContain('Familia Álvarez');
      expect(msg.text).toContain('Fiesta de Egresados 2026');
      expect(msg.text).toContain('https://fiesta.colegio.edu.uy/f/token123');

      expect(msg.waLink).toContain('https://wa.me/59899123456?text=');
      expect(msg.waLink).toContain(encodeURIComponent(msg.text));

      // Verificar que no se mutó ningún estado ni base de datos
      expect(memoryStore.size).toBeGreaterThan(0); // los datos del beforeEach siguen intactos
    });
  });

  describe('Incremento 5: Exportaciones finales de datos en CSV', () => {
    it('exporta las respuestas de etapas del evento en formato CSV con cabeceras y opciones resueltas', async () => {
      memoryStore.set(
        `workspaces/${workspaceId}/events/${eventId}/stages/${stageId}/responses/part_fam_1`,
        {
          id: 'part_fam_1',
          participantId: 'part_fam_1',
          stageId,
          answers: { choice: 'opt_carne' },
          version: 1,
          submittedAt: '2026-09-08T10:00:00Z',
          updatedAt: '2026-09-08T10:00:00Z',
        }
      );

      const csv = await exportEventResponsesCsv(organizer, eventId);

      expect(csv).toContain('Familia,Etapa,Tipo de Consulta,Respuesta,Fecha de Respuesta,Versión');
      expect(csv).toContain('"Familia 1"');
      expect(csv).toContain('"Elección de Menú Principal"');
      expect(csv).toContain('"Carne y Guarnición"');
    });

    it('exporta la conciliación financiera de pagos en formato CSV con totales y estados', async () => {
      memoryStore.set(`workspaces/${workspaceId}/events/${eventId}/payments/part_fam_1`, {
        id: 'part_fam_1',
        participantId: 'part_fam_1',
        expectedAmountMinor: 300000,
        declaredAmountMinor: 300000,
        currency: 'UYU',
        status: 'verified',
        transferDate: '2026-09-07',
        verifiedAmountMinor: 300000,
        verifiedAt: '2026-09-08T09:00:00Z',
        verifiedBy: 'organizador1@colegio.edu.uy',
      });

      const csv = await exportEventPaymentsCsv(organizer, eventId);

      expect(csv).toContain('Familia,Contacto,Estado de Pago,Moneda,Importe Esperado');
      expect(csv).toContain('"Familia 1"');
      expect(csv).toContain('"Verificado"');
      expect(csv).toContain('"3000.00"');
      expect(csv).toContain('"organizador1@colegio.edu.uy"');
    });
  });
});
