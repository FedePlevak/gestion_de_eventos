import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  submitStageResponse,
  confirmStageRead,
  getStageForFamily,
  getEventStagesForFamily,
  updateStageAdmin,
  reopenStageAdmin,
  closeStageAdmin,
} from '../src/modules/stages/service';
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
});
