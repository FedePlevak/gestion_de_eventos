import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  submitStageResponse,
  confirmStageRead,
  getStageForFamily,
  getEventStagesForFamily,
  updateStageAdmin,
  reopenStageAdmin,
  closeStageAdmin,
  deleteStageAdmin,
} from '../src/modules/stages/service';
import {
  getDefaultNewQuestion,
  getTitlePlaceholder,
  getDescriptionPlaceholder,
  getOptionPlaceholder,
  isQuestionComplete,
} from '../src/app/admin/events/[eventId]/StageQuestionBuilder';
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
        data: () => data,
        ref: createDocRef(currentPath),
      };
    },
    set: async (data: any) => {
      memoryStore.set(currentPath, data);
    },
    update: async (data: any) => {
      const current = memoryStore.get(currentPath) || {};
      memoryStore.set(currentPath, { ...current, ...data });
    },
    delete: async () => {
      memoryStore.delete(currentPath);
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
      // Devolver todos los docs cuyo path comience con currentPath y tengan exactamente un segmento más
      const docs: any[] = [];
      const prefix = `${currentPath}/`;
      for (const [key, value] of memoryStore.entries()) {
        if (key.startsWith(prefix)) {
          const rest = key.substring(prefix.length);
          if (!rest.includes('/')) {
            docs.push({
              id: key.split('/').pop() || '',
              exists: true,
              data: () => value,
              ref: createDocRef(key),
            });
          }
        }
      }
      return { docs };
    },
    where: () => createCollectionRef(currentPath),
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

describe('Incremento 2: Criterios de Aceptación de Etapas y Respuestas', () => {
  const familySession: FamilySessionContext = {
    workspaceId: 'ws_colegio',
    eventId: 'evento_fiesta_2026',
    participantId: 'part_familia_01',
    familyId: 'fam_01',
    familyName: 'Familia Gómez',
    accessVersion: 1,
  };

  const organizerSession: OrganizerSessionContext = {
    workspaceId: 'ws_colegio',
    eventId: 'evento_fiesta_2026',
    organizerId: 'org_01',
    email: 'organizador1@colegio.edu.uy',
  };

  beforeEach(() => {
    memoryStore.clear();
  });

  describe('Criterio E01: Coexistencia y orden de etapas visibles', () => {
    it('debe listar etapas visibles ordenadas por su campo order', async () => {
      // Etapa 2 (order: 2)
      memoryStore.set('workspaces/ws_colegio/events/evento_fiesta_2026/stages/stage_asistencia', {
        id: 'stage_asistencia',
        title: 'Confirmación de Asistencia',
        type: 'yes_no',
        status: 'open',
        visibility: 'visible',
        order: 2,
      });

      // Etapa 1 (order: 1)
      memoryStore.set('workspaces/ws_colegio/events/evento_fiesta_2026/stages/stage_menu', {
        id: 'stage_menu',
        title: 'Elección de Menú',
        type: 'single_choice',
        status: 'open',
        visibility: 'visible',
        order: 1,
        options: [{ id: 'opt_trad', label: 'Tradicional' }],
      });

      const stages = await getEventStagesForFamily(familySession);

      expect(stages.length).toBe(2);
      expect(stages[0].id).toBe('stage_menu');
      expect(stages[1].id).toBe('stage_asistencia');
    });
  });

  describe('Criterio E02: Protección de etapas ocultas, borrador o anuladas', () => {
    it('no debe entregar contenido ni permitir responder a una etapa oculta', async () => {
      memoryStore.set('workspaces/ws_colegio/events/evento_fiesta_2026/stages/stage_oculta', {
        id: 'stage_oculta',
        title: 'Etapa Secreta',
        type: 'single_choice',
        status: 'open',
        visibility: 'hidden', // OCULTA
        options: [{ id: 'opt_1', label: 'Opción 1' }],
      });

      // Rechazar lectura de contenido para la familia
      await expect(
        getStageForFamily(familySession, 'stage_oculta')
      ).rejects.toThrow('Esta etapa no está disponible para las familias.');

      // Rechazar respuesta directa en servidor
      await expect(
        submitStageResponse(familySession, 'stage_oculta', { choice: 'opt_1' })
      ).rejects.toThrow('La etapa no está abierta');
    });
  });

  describe('Criterio E03: Validación estricta de tipos de respuesta en servidor', () => {
    it('debe rechazar opciones inválidas en selección única', async () => {
      memoryStore.set('workspaces/ws_colegio/events/evento_fiesta_2026/stages/stage_menu', {
        id: 'stage_menu',
        title: 'Elección de Menú',
        type: 'single_choice',
        status: 'open',
        visibility: 'visible',
        options: [
          { id: 'opt_carne', label: 'Carne' },
          { id: 'opt_pasta', label: 'Pasta' },
        ],
      });

      // Opción inexistente 'opt_pescado'
      await expect(
        submitStageResponse(familySession, 'stage_menu', { choice: 'opt_pescado' })
      ).rejects.toThrow('La opción seleccionada no es válida.');
    });

    it('debe rechazar cantidades negativas en cantidad entera', async () => {
      memoryStore.set('workspaces/ws_colegio/events/evento_fiesta_2026/stages/stage_invitados', {
        id: 'stage_invitados',
        title: 'Cantidad de Invitados',
        type: 'integer_quantity',
        status: 'open',
        visibility: 'visible',
      });

      await expect(
        submitStageResponse(familySession, 'stage_invitados', { quantity: -5 })
      ).rejects.toThrow('La cantidad debe ser un número entero mayor o igual a 0.');
    });
  });

  describe('Criterio E04: Lectura explícita en etapa informativa', () => {
    it('debe confirmar lectura sin exigir respuesta de datos', async () => {
      memoryStore.set('workspaces/ws_colegio/events/evento_fiesta_2026/stages/stage_cronograma', {
        id: 'stage_cronograma',
        title: 'Cronograma del Evento',
        content: 'La fiesta comenzará a las 20:00.',
        type: 'info',
        status: 'open',
        visibility: 'visible',
        isSemanticallyLocked: false,
        readCount: 0,
      });

      const confirmation = await confirmStageRead(familySession, 'stage_cronograma');

      expect(confirmation.participantId).toBe('part_familia_01');
      expect(confirmation.confirmedAt).toBeDefined();

      const updatedStage = memoryStore.get('workspaces/ws_colegio/events/evento_fiesta_2026/stages/stage_cronograma');
      expect(updatedStage.isSemanticallyLocked).toBe(true);
      expect(updatedStage.readCount).toBe(1);
    });
  });

  describe('Criterios E05 y E06: Modificaciones, versiones y vencimiento estricto', () => {
    it('E05: modificar respuesta antes del vencimiento incrementa versión y guarda historial', async () => {
      memoryStore.set('workspaces/ws_colegio/events/evento_fiesta_2026/stages/stage_menu', {
        id: 'stage_menu',
        title: 'Elección de Menú',
        type: 'single_choice',
        status: 'open',
        visibility: 'visible',
        options: [
          { id: 'opt_carne', label: 'Carne' },
          { id: 'opt_veg', label: 'Vegetariano' },
        ],
        isSemanticallyLocked: false,
      });

      // 1. Primera respuesta: Carne
      const resp1 = await submitStageResponse(familySession, 'stage_menu', { choice: 'opt_carne' });
      expect(resp1.version).toBe(1);
      expect(resp1.answers.choice).toBe('opt_carne');

      // 2. Modificación: Vegetariano (con expectedVersion = 1)
      const resp2 = await submitStageResponse(familySession, 'stage_menu', { choice: 'opt_veg' }, 1);
      expect(resp2.version).toBe(2);
      expect(resp2.answers.choice).toBe('opt_veg');

      // Verificar que la revisión histórica v_1 fue almacenada
      const rev1 = memoryStore.get(
        'workspaces/ws_colegio/events/evento_fiesta_2026/stages/stage_menu/responses/part_familia_01/revisions/v_1'
      );
      expect(rev1).toBeDefined();
      expect(rev1.answers.choice).toBe('opt_carne');
    });

    it('E06: rechazar respuesta en el servidor si la etapa ya venció', async () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString(); // Hace 1 hora

      memoryStore.set('workspaces/ws_colegio/events/evento_fiesta_2026/stages/stage_menu_vencido', {
        id: 'stage_menu_vencido',
        title: 'Elección de Menú Vencido',
        type: 'single_choice',
        status: 'open',
        visibility: 'visible',
        deadlineAt: pastDate,
        options: [{ id: 'opt_carne', label: 'Carne' }],
      });

      await expect(
        submitStageResponse(familySession, 'stage_menu_vencido', { choice: 'opt_carne' })
      ).rejects.toThrow('El plazo para responder esta etapa ya venció.');
    });
  });

  describe('Criterio E09: Bloqueo semántico de opciones tras primera respuesta', () => {
    it('debe rechazar que un organizador altere opciones una vez recibida la primera respuesta', async () => {
      memoryStore.set('workspaces/ws_colegio/events/evento_fiesta_2026/stages/stage_menu_bloqueado', {
        id: 'stage_menu_bloqueado',
        title: 'Elección de Menú',
        type: 'single_choice',
        status: 'open',
        visibility: 'visible',
        isSemanticallyLocked: true, // Bloqueada porque ya respondieron
        options: [{ id: 'opt_carne', label: 'Carne' }],
      });

      // El organizador intenta cambiar las opciones
      await expect(
        updateStageAdmin(organizerSession, 'evento_fiesta_2026', 'stage_menu_bloqueado', {
          options: [{ id: 'opt_pescado', label: 'Pescado' }],
        })
      ).rejects.toThrow('No se pueden cambiar las opciones porque ya se recibieron respuestas');
    });

    it('debe permitir modificar fecha límite o título aun con bloqueo semántico', async () => {
      memoryStore.set('workspaces/ws_colegio/events/evento_fiesta_2026/stages/stage_menu_bloqueado', {
        id: 'stage_menu_bloqueado',
        title: 'Elección de Menú Original',
        type: 'single_choice',
        status: 'open',
        visibility: 'visible',
        isSemanticallyLocked: true,
        options: [{ id: 'opt_carne', label: 'Carne' }],
      });

      // Modificar título o plazo sí está permitido
      await updateStageAdmin(organizerSession, 'evento_fiesta_2026', 'stage_menu_bloqueado', {
        title: 'Elección de Menú (Plazo Extendido)',
      });

      const updated = memoryStore.get('workspaces/ws_colegio/events/evento_fiesta_2026/stages/stage_menu_bloqueado');
      expect(updated.title).toBe('Elección de Menú (Plazo Extendido)');
    });

    it('debe permitir actualizar fecha y hora de vencimiento aun si se envían las opciones originales sin modificar', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      memoryStore.set('workspaces/ws_colegio/events/evento_fiesta_2026/stages/stage_menu_bloqueado_2', {
        id: 'stage_menu_bloqueado_2',
        title: 'Elección de Fecha',
        type: 'single_choice',
        status: 'open',
        visibility: 'visible',
        isSemanticallyLocked: true,
        options: [{ id: 'opt_1', label: 'Opción 1' }],
      });

      // El organizador actualiza deadlineAt y envía las opciones originales
      await updateStageAdmin(organizerSession, 'evento_fiesta_2026', 'stage_menu_bloqueado_2', {
        deadlineAt: futureDate,
        options: [{ id: 'opt_1', label: 'Opción 1' }],
      });

      const updated = memoryStore.get('workspaces/ws_colegio/events/evento_fiesta_2026/stages/stage_menu_bloqueado_2');
      expect(updated.deadlineAt).toBe(futureDate);
    });
  });

  describe('Criterio E11: Reapertura de etapas', () => {
    it('debe exigir motivo de reapertura y conservar historial de cierres', async () => {
      memoryStore.set('workspaces/ws_colegio/events/evento_fiesta_2026/stages/stage_cerrada', {
        id: 'stage_cerrada',
        title: 'Elección de Menú',
        type: 'single_choice',
        status: 'closed',
        closures: [{ closedAt: '2026-09-01T12:00:00Z', closedByEmail: 'admin@colegio.edu.uy', reason: 'Plazo cumplido' }],
        reopenings: [],
      });

      // Rechazar si no se especifica motivo
      await expect(
        reopenStageAdmin(organizerSession, 'evento_fiesta_2026', 'stage_cerrada', '')
      ).rejects.toThrow('El motivo de reapertura es obligatorio.');

      // Reabrir con motivo
      await reopenStageAdmin(
        organizerSession,
        'evento_fiesta_2026',
        'stage_cerrada',
        'Familias adicionales solicitaron plazo'
      );

      const reopened = memoryStore.get('workspaces/ws_colegio/events/evento_fiesta_2026/stages/stage_cerrada');
      expect(reopened.status).toBe('open');
      expect(reopened.reopenings.length).toBe(1);
      expect(reopened.reopenings[0].reason).toBe('Familias adicionales solicitaron plazo');
    });
  });

  describe('Criterio E12: Detección de conflicto de concurrencia entre dispositivos', () => {
    it('debe lanzar conflicto si otro dispositivo incrementó la versión mientras la pantalla estaba abierta', async () => {
      memoryStore.set('workspaces/ws_colegio/events/evento_fiesta_2026/stages/stage_menu', {
        id: 'stage_menu',
        title: 'Elección de Menú',
        type: 'single_choice',
        status: 'open',
        visibility: 'visible',
        options: [
          { id: 'opt_carne', label: 'Carne' },
          { id: 'opt_veg', label: 'Vegetariano' },
        ],
      });

      // Dispositivo A guardó y la versión quedó en 2
      memoryStore.set(
        'workspaces/ws_colegio/events/evento_fiesta_2026/stages/stage_menu/responses/part_familia_01',
        {
          id: 'part_familia_01',
          version: 2,
          answers: { choice: 'opt_carne' },
        }
      );

      // Dispositivo B tenía la pantalla abierta desde la versión 1 y envía expectedVersion: 1
      await expect(
        submitStageResponse(familySession, 'stage_menu', { choice: 'opt_veg' }, 1)
      ).rejects.toThrow('Conflicto de concurrencia');
    });
  });

  describe('Criterio E15: Etapas compuestas y lógica condicional de preguntas', () => {
    const compositeStage = {
      id: 'stage_convocatoria',
      workspaceId: 'ws_colegio',
      eventId: 'evento_fiesta_2026',
      title: 'Convocatoria y Asistencia a la Fiesta',
      type: 'composite',
      status: 'open',
      visibility: 'visible',
      order: 1,
      isSemanticallyLocked: false,
      questions: [
        {
          id: 'q_asiste',
          title: '¿Confirmás tu asistencia?',
          type: 'yes_no',
          required: true,
        },
        {
          id: 'q_adultos',
          title: 'Cantidad de adultos',
          type: 'integer_quantity',
          required: true,
          minQuantity: 0,
          condition: {
            dependsOnQuestionId: 'q_asiste',
            operator: 'equals',
            value: 'yes',
          },
        },
        {
          id: 'q_ninos',
          title: 'Cantidad de niños',
          type: 'integer_quantity',
          required: true,
          minQuantity: 0,
          condition: {
            dependsOnQuestionId: 'q_asiste',
            operator: 'equals',
            value: 'yes',
          },
        },
        {
          id: 'q_restricciones',
          title: 'Restricciones alimentarias',
          type: 'open_text',
          required: false,
          condition: {
            dependsOnQuestionId: 'q_asiste',
            operator: 'equals',
            value: 'yes',
          },
        },
        {
          id: 'q_motivo',
          title: 'Motivo de inasistencia',
          type: 'open_text',
          required: true,
          condition: {
            dependsOnQuestionId: 'q_asiste',
            operator: 'equals',
            value: 'no',
          },
        },
      ],
    };

    beforeEach(() => {
      memoryStore.set(
        'workspaces/ws_colegio/events/evento_fiesta_2026/stages/stage_convocatoria',
        JSON.parse(JSON.stringify(compositeStage))
      );
    });

    it('debe permitir responder cuando asiste y provee adultos y niños válidos', async () => {
      const resp = await submitStageResponse(familySession, 'stage_convocatoria', {
        q_asiste: 'yes',
        q_adultos: 2,
        q_ninos: 1,
        q_restricciones: 'Sin gluten para un menor',
      });

      expect(resp).toBeDefined();
      expect(resp.answers.q_asiste).toBe('yes');
      expect(resp.answers.q_adultos).toBe(2);
      expect(resp.answers.q_ninos).toBe(1);
    });

    it('debe exigir cantidad de adultos si respondió que sí asiste', async () => {
      await expect(
        submitStageResponse(familySession, 'stage_convocatoria', {
          q_asiste: 'yes',
          // falta q_adultos
          q_ninos: 1,
        })
      ).rejects.toThrow('El campo "Cantidad de adultos" es obligatorio.');
    });

    it('debe rechazar cantidades negativas en campos numéricos', async () => {
      await expect(
        submitStageResponse(familySession, 'stage_convocatoria', {
          q_asiste: 'yes',
          q_adultos: -2,
          q_ninos: 1,
        })
      ).rejects.toThrow('debe ser un número entero mayor o igual a 0');
    });

    it('no debe exigir campos de asistencia (adultos/niños) si la familia responde que NO asiste', async () => {
      // Si q_asiste es 'no', q_adultos y q_ninos no son visibles por su condición.
      // Pero q_motivo sí es visible y obligatorio.
      const resp = await submitStageResponse(familySession, 'stage_convocatoria', {
        q_asiste: 'no',
        q_motivo: 'Viaje familiar programado previamente',
      });

      expect(resp).toBeDefined();
      expect(resp.answers.q_asiste).toBe('no');
      expect(resp.answers.q_motivo).toBe('Viaje familiar programado previamente');
      expect(resp.answers.q_adultos).toBeUndefined();
    });

    it('debe exigir motivo de inasistencia si responde que NO asiste', async () => {
      await expect(
        submitStageResponse(familySession, 'stage_convocatoria', {
          q_asiste: 'no',
          // Falta q_motivo
        })
      ).rejects.toThrow('El campo "Motivo de inasistencia" es obligatorio.');
    });
  });

  describe('Criterio E16: Eliminación de consultas (etapas)', () => {
    it('permite a un organizador eliminar una consulta existente y registra auditoría', async () => {
      // Crear consulta en memoria
      const stagePath = 'workspaces/ws_1/events/event_1/stages/stage_a_borrar';
      memoryStore.set(stagePath, {
        id: 'stage_a_borrar',
        title: 'Consulta accidental para borrar',
        type: 'composite',
        status: 'draft',
        order: 1,
      });

      const organizer: OrganizerSessionContext = {
        organizerId: 'org_1',
        email: 'organizador@ejemplo.com',
        workspaceId: 'ws_1',
      };

      const result = await deleteStageAdmin(organizer, 'event_1', 'stage_a_borrar');
      expect(result.deletedTitle).toBe('Consulta accidental para borrar');

      // Verificar que ya no existe en el store
      expect(memoryStore.has(stagePath)).toBe(false);
    });

    it('rechaza la eliminación si la consulta no existe', async () => {
      const organizer: OrganizerSessionContext = {
        organizerId: 'org_1',
        email: 'organizador@ejemplo.com',
        workspaceId: 'ws_1',
      };

      await expect(
        deleteStageAdmin(organizer, 'event_1', 'stage_inexistente')
      ).rejects.toThrow('La consulta que querés eliminar no existe.');
    });
  });

  describe('Criterio E17: Etapas sin autocompletar, placeholders de ejemplo y estado sin completar', () => {
    it('inicializa nuevas preguntas con título vacío para que no se completen automáticamente', () => {
      const types = ['yes_no', 'integer_quantity', 'single_choice', 'multiple_choice', 'open_text', 'info'] as const;

      for (const t of types) {
        const q = getDefaultNewQuestion(t);
        expect(q.title).toBe('');
        if (t === 'integer_quantity' || t === 'multiple_choice' || t === 'open_text' || t === 'info') {
          expect(q.description).toBe('');
        }
        if (t === 'single_choice' || t === 'multiple_choice') {
          expect(q.options).toBeDefined();
          expect(q.options?.length).toBeGreaterThanOrEqual(2);
          for (const opt of q.options!) {
            expect(opt.label).toBe('');
          }
        }
      }
    });

    it('provee placeholders descriptivos de ejemplo para cada tipo de pregunta y opción', () => {
      expect(getTitlePlaceholder('yes_no')).toContain('¿Confirmás');
      expect(getTitlePlaceholder('integer_quantity')).toContain('adultos');
      expect(getTitlePlaceholder('single_choice')).toContain('menú');
      expect(getDescriptionPlaceholder('yes_no')).toContain('Responder');
      expect(getOptionPlaceholder('single_choice', 0)).toContain('Menú Tradicional');
      expect(getOptionPlaceholder('single_choice', 1)).toContain('Vegetariano');
    });

    it('identifica correctamente cuándo una pregunta está sin completar y cuándo está lista', () => {
      const qEmpty = getDefaultNewQuestion('yes_no');
      expect(isQuestionComplete(qEmpty)).toBe(false);

      const qWithTitle = { ...qEmpty, title: '¿Asistirá la familia?' };
      expect(isQuestionComplete(qWithTitle)).toBe(true);

      const qChoiceEmpty = getDefaultNewQuestion('single_choice');
      qChoiceEmpty.title = 'Plato principal';
      // Las opciones tienen label vacío
      expect(isQuestionComplete(qChoiceEmpty)).toBe(false);

      qChoiceEmpty.options = [
        { id: 'opt_1', label: 'Carne' },
        { id: 'opt_2', label: 'Pasta' },
      ];
      expect(isQuestionComplete(qChoiceEmpty)).toBe(true);
    });
  });
});

