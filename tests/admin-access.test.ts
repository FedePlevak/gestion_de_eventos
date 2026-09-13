import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateOrganizerEventAccess,
  getOrganizerContextFromCookies,
} from '../src/modules/access/organizer-service';
import { UnauthorizedError, ForbiddenError } from '../src/server/errors';

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
    where: (field: string, op: string, value: any) => ({
      get: async () => {
        const docs: any[] = [];
        const prefix = `${currentPath}/`;
        for (const [key, data] of memoryStore.entries()) {
          if (key.startsWith(prefix)) {
            const rest = key.substring(prefix.length);
            if (!rest.includes('/') && data && data[field] === value) {
              docs.push({
                id: key.split('/').pop() || '',
                exists: true,
                data: () => JSON.parse(JSON.stringify(data)),
              });
            }
          }
        }
        return { docs };
      },
    }),
  };
}

vi.mock('../src/server/firebase-admin', () => {
  return {
    getAdminDb: () => ({
      collection: (colName: string) => createCollectionRef(colName),
    }),
    getAdminAuth: () => ({
      verifySessionCookie: async (cookie: string) => {
        if (cookie === 'valid-admin-session') {
          return {
            uid: 'org_valid',
            email: 'admin@colegio.edu.uy',
            name: 'Organizador Válido',
            workspaceId: 'ws_colegio',
          };
        }
        throw new Error('Invalid session');
      },
    }),
  };
});

describe('Validación de Acceso y Autorización Administrativa (RP01 - RP05)', () => {
  const workspaceId = 'ws_colegio';
  const eventId = 'evento_egresados_2026';

  beforeEach(() => {
    memoryStore.clear();

    // Evento en ws_colegio
    memoryStore.set(`workspaces/${workspaceId}/events/${eventId}`, {
      id: eventId,
      workspaceId,
      name: 'Fiesta de Egresados',
      status: 'active',
    });

    // Organizador 1 activo en ws_colegio
    memoryStore.set(`workspaces/${workspaceId}/events/${eventId}/organizers/org_valid`, {
      id: 'org_valid',
      workspaceId,
      eventId,
      email: 'admin@colegio.edu.uy',
      name: 'Organizador Válido',
      status: 'active',
    });

    // Organizador 2 con membresía revocada
    memoryStore.set(`workspaces/${workspaceId}/events/${eventId}/organizers/org_revoked`, {
      id: 'org_revoked',
      workspaceId,
      eventId,
      email: 'revocado@colegio.edu.uy',
      name: 'Organizador Revocado',
      status: 'revoked',
    });
  });

  it('RP01: Rechaza acceso anónimo sin cookie ni headers de organizador', async () => {
    const emptyCookies = { get: (_name: string) => undefined };
    await expect(getOrganizerContextFromCookies(emptyCookies)).rejects.toThrow(UnauthorizedError);
  });

  it('RP02: Rechaza organizador autenticado pero sin membresía en el evento', async () => {
    const context = {
      organizerId: 'org_ajeno',
      email: 'ajeno@colegio.edu.uy',
      workspaceId,
      name: 'Organizador Ajeno',
    };

    await expect(
      validateOrganizerEventAccess(context, eventId, workspaceId)
    ).rejects.toThrow(ForbiddenError);
  });

  it('RP03: Rechaza organizador con membresía revocada en el evento', async () => {
    const context = {
      organizerId: 'org_revoked',
      email: 'revocado@colegio.edu.uy',
      workspaceId,
      name: 'Organizador Revocado',
    };

    await expect(
      validateOrganizerEventAccess(context, eventId, workspaceId)
    ).rejects.toThrow(ForbiddenError);
  });

  it('RP04: Impide acceso a eventos de otro espacio (aislamiento multi-tenant)', async () => {
    const context = {
      organizerId: 'org_valid',
      email: 'admin@colegio.edu.uy',
      workspaceId: 'ws_otro_colegio',
      name: 'Organizador Válido',
    };

    // Buscar en ws_otro_colegio debe fallar porque el evento no está allí
    await expect(
      validateOrganizerEventAccess(context, eventId, 'ws_otro_colegio')
    ).rejects.toThrow(ForbiddenError);
  });

  it('RP05: Permite acceso a organizador con sesión válida y membresía activa', async () => {
    const context = {
      organizerId: 'org_valid',
      email: 'admin@colegio.edu.uy',
      workspaceId,
      name: 'Organizador Válido',
    };

    const organizer = await validateOrganizerEventAccess(context, eventId, workspaceId);
    expect(organizer).toBeDefined();
    expect(organizer.id).toBe('org_valid');
    expect(organizer.status).toBe('active');
  });
});
