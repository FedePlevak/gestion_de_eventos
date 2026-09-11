import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateTabularImport } from '../src/modules/groups/service';
import { generateRawSecret, hashFamilySecret, generateSessionId, hashSessionId } from '../src/modules/access/token';

// Mock de Firestore Admin en memoria recursivo
const memoryStore = new Map<string, any>();

function createDocRef(currentPath: string) {
  return {
    id: currentPath.split('/').pop(),
    get: async () => {
      const data = memoryStore.get(currentPath);
      return {
        exists: Boolean(data),
        data: () => data,
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
    where: () => ({
      get: async () => ({
        docs: [],
      }),
    }),
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

describe('Reglas de Negocio y Criterios de Aceptación', () => {
  beforeEach(() => {
    memoryStore.clear();
    process.env.FAMILY_TOKEN_PEPPER = 'clave-secreta-para-pruebas-unitarias-minimo-32-chars';
    process.env.APP_ENV = 'test';
  });

  describe('Criterio G05: Importación Tabular de Familias', () => {
    it('debe informar filas inválidas y posibles duplicados antes de confirmar', () => {
      const rows = [
        { familyName: 'Familia Gómez', email: 'gomez@ejemplo.com' },
        { familyName: 'Familia Pérez', email: 'perez@ejemplo.com' },
        { familyName: '', email: 'invalido@ejemplo.com' }, // Inválido: sin nombre
        { familyName: 'Familia Gómez', email: 'otro@ejemplo.com' }, // Duplicado
      ];

      const result = validateTabularImport(rows);

      expect(result.validRows.length).toBe(2);
      expect(result.invalidRows.length).toBe(2);
      expect(result.duplicateCount).toBe(1);
      expect(result.invalidRows[0].reason).toContain('obligatorio');
      expect(result.invalidRows[1].reason).toContain('Nombre repetido');
    });
  });

  describe('Criterios A01, A02, A03: Canje y Aislamiento de Accesos Familiares', () => {
    it('debe hashear el secreto con HMAC pepper y no almacenar el secreto plano (A01)', () => {
      const secret = generateRawSecret();
      const hash1 = hashFamilySecret(secret);
      const hash2 = hashFamilySecret(secret);

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(secret);
      expect(hash1.length).toBe(64); // SHA-256 hex
    });

    it('A03: rechazar acceso si la sesión familiar pertenece a otro evento', async () => {
      const { validateFamilySession } = await import('../src/modules/access/family-service');

      const rawSessionId = generateSessionId();
      const sessionHash = hashSessionId(rawSessionId);

      // Guardar sesión en evento A
      memoryStore.set(`family_sessions/${sessionHash}`, {
        workspaceId: 'ws_01',
        eventId: 'evento_A',
        participantId: 'part_01',
        accessVersion: 1,
        familyId: 'fam_01',
        familyName: 'Familia Gómez',
        expiresAt: new Date(Date.now() + 100000).toISOString(),
      });

      // Intentar validar para evento B
      await expect(
        validateFamilySession(rawSessionId, 'evento_B')
      ).rejects.toThrow('Tu acceso corresponde a otro evento.');
    });

    it('A02: invalidar sesiones anteriores cuando se regenera el enlace familiar', async () => {
      const { validateFamilySession } = await import('../src/modules/access/family-service');

      const rawSessionId = generateSessionId();
      const sessionHash = hashSessionId(rawSessionId);

      // Sesión creada con accessVersion = 1
      memoryStore.set(`family_sessions/${sessionHash}`, {
        workspaceId: 'ws_01',
        eventId: 'evento_A',
        participantId: 'part_01',
        accessVersion: 1,
        familyId: 'fam_01',
        familyName: 'Familia Gómez',
        expiresAt: new Date(Date.now() + 100000).toISOString(),
      });

      // Pero en Firestore el participante ya tiene accessVersion = 2 (enlace regenerado)
      memoryStore.set('workspaces/ws_01/events/evento_A/participants/part_01', {
        id: 'part_01',
        status: 'active',
        accessVersion: 2,
        familyName: 'Familia Gómez',
      });

      await expect(
        validateFamilySession(rawSessionId, 'evento_A')
      ).rejects.toThrow('Este enlace fue reemplazado');
    });
  });

  describe('Criterios A04, G06: Permisos de Organizadores', () => {
    it('A04: denegar acceso a organizador que no tiene membresía en el evento', async () => {
      const { validateOrganizerEventAccess } = await import('../src/modules/access/organizer-service');

      const context = {
        workspaceId: 'ws_01',
        organizerId: 'org_ajeno',
        email: 'ajeno@colegio.edu.uy',
      };

      // No existe documento de organizador en el evento
      await expect(
        validateOrganizerEventAccess(context, 'evento_A', 'ws_01')
      ).rejects.toThrow('No tenés asignado este evento');
    });

    it('A04: denegar acceso si la membresía del organizador fue revocada', async () => {
      const { validateOrganizerEventAccess } = await import('../src/modules/access/organizer-service');

      const context = {
        workspaceId: 'ws_01',
        organizerId: 'org_revocado',
        email: 'revocado@colegio.edu.uy',
      };

      memoryStore.set('workspaces/ws_01/events/evento_A/organizers/org_revocado', {
        id: 'org_revocado',
        status: 'revoked',
      });

      await expect(
        validateOrganizerEventAccess(context, 'evento_A', 'ws_01')
      ).rejects.toThrow('Tu acceso como organizador a este evento fue revocado.');
    });
  });
});
