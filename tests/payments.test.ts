import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  submitFamilyPaymentReport,
  verifyPaymentAdmin,
  requestPaymentRevisionAdmin,
  reverseVerificationAdmin,
  getEventFinancialSummary,
} from '../src/modules/payments/service';
import { validateAndUploadReceipt } from '../src/modules/payments/storage-service';
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
    getAdminStorage: () => ({
      bucket: () => ({
        file: (path: string) => ({
          save: vi.fn().mockResolvedValue(true),
          exists: vi.fn().mockResolvedValue([true]),
          getMetadata: vi.fn().mockResolvedValue([{ contentType: 'application/pdf' }]),
          download: vi.fn().mockResolvedValue([Buffer.from('mock content')]),
        }),
      }),
    }),
  };
});

vi.mock('../src/modules/audit/service', () => ({
  recordAuditEvent: vi.fn().mockResolvedValue('audit_123'),
}));

vi.mock('../src/modules/access/organizer-service', () => ({
  validateOrganizerEventAccess: vi.fn().mockResolvedValue({ id: 'org_01', status: 'active' }),
}));

describe('Incremento 4: Criterios de Aceptación de Pagos y Verificación', () => {
  const familySession: FamilySessionContext = {
    workspaceId: 'ws_colegio',
    eventId: 'evento_fiesta_2026',
    participantId: 'part_fam_01',
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

    // Evento con cobro habilitado de $3.000 UYU (300.000 minor units)
    memoryStore.set('workspaces/ws_colegio/events/evento_fiesta_2026', {
      id: 'evento_fiesta_2026',
      workspaceId: 'ws_colegio',
      name: 'Fiesta de Fin de Año 2026',
      status: 'active',
      paymentConfig: {
        enabled: true,
        expectedAmountMinor: 300000,
        currency: 'UYU',
      },
    });

    // Participante familia 01
    memoryStore.set('workspaces/ws_colegio/events/evento_fiesta_2026/participants/part_fam_01', {
      id: 'part_fam_01',
      familyId: 'fam_01',
      familyName: 'Familia Gómez',
      status: 'active',
      accessVersion: 1,
    });
  });

  describe('Criterio P02: Informe familiar y separación de fechas', () => {
    it('debe registrar el pago con estado reported y fechas declarada y real separadas', async () => {
      const report = await submitFamilyPaymentReport(familySession, {
        declaredAmountMinor: 300000,
        transferDate: '2026-09-05',
        reference: 'BROU 847291',
      });

      expect(report.status).toBe('reported');
      expect(report.declaredAmountMinor).toBe(300000);
      expect(report.transferDate).toBe('2026-09-05'); // Fecha declarada de la transferencia
      expect(report.reportedAt).toBeDefined(); // Fecha real del servidor al presentar el informe
      expect(report.reportedAt).not.toBe('2026-09-05');
      expect(report.version).toBe(1);
    });
  });

  describe('Criterio P05: Solicitud de revisión y bloqueo de pagos verificados', () => {
    it('debe permitir a la familia corregir mientras el pago no esté verificado', async () => {
      // 1. Informe inicial
      await submitFamilyPaymentReport(familySession, {
        declaredAmountMinor: 250000, // Importe menor por error
        transferDate: '2026-09-05',
      });

      // 2. El comité solicita revisión con motivo visible
      await requestPaymentRevisionAdmin(
        organizerSession,
        'evento_fiesta_2026',
        'part_fam_01',
        'El importe transferido debe ser $3.000 UYU según lo acordado'
      );

      const afterRevisionReq = memoryStore.get(
        'workspaces/ws_colegio/events/evento_fiesta_2026/payments/part_fam_01'
      );
      expect(afterRevisionReq.status).toBe('requires_revision');
      expect(afterRevisionReq.revisionReason).toContain('$3.000 UYU');

      // 3. La familia corrige el informe enviando el importe correcto
      const corrected = await submitFamilyPaymentReport(
        familySession,
        {
          declaredAmountMinor: 300000,
          transferDate: '2026-09-06',
        },
        2 // expectedVersion
      );

      expect(corrected.status).toBe('reported');
      expect(corrected.declaredAmountMinor).toBe(300000);
      expect(corrected.version).toBe(3);
    });

    it('P03/P05: rechazar modificación familiar si el pago ya fue verificado por el comité', async () => {
      // Registrar e inmediatamente verificar por el comité
      await submitFamilyPaymentReport(familySession, {
        declaredAmountMinor: 300000,
        transferDate: '2026-09-05',
      });

      await verifyPaymentAdmin(organizerSession, 'evento_fiesta_2026', 'part_fam_01');

      // La familia intenta modificar el pago verificado
      await expect(
        submitFamilyPaymentReport(familySession, {
          declaredAmountMinor: 300000,
          transferDate: '2026-09-07',
        })
      ).rejects.toThrow('El pago ya fue verificado por el comité y no admite modificaciones.');
    });
  });

  describe('Criterio P06: Verificación idempotente por el comité', () => {
    it('no debe duplicar registros ni totales ante doble clic o verificaciones concurrentes', async () => {
      await submitFamilyPaymentReport(familySession, {
        declaredAmountMinor: 300000,
        transferDate: '2026-09-05',
      });

      // Primera verificación
      const v1 = await verifyPaymentAdmin(organizerSession, 'evento_fiesta_2026', 'part_fam_01', {
        verifiedAmountMinor: 300000,
        receptionDate: '2026-09-05',
      });
      expect(v1.status).toBe('verified');
      expect(v1.verifiedAmountMinor).toBe(300000);

      // Segunda verificación (ej: doble clic o reintento de red)
      const v2 = await verifyPaymentAdmin(organizerSession, 'evento_fiesta_2026', 'part_fam_01', {
        verifiedAmountMinor: 300000,
        receptionDate: '2026-09-05',
      });
      expect(v2.version).toBe(v1.version); // No generó una versión extra ni duplicó
    });
  });

  describe('Criterio P07: Reversión justificada de verificación', () => {
    it('debe exigir motivo obligatorio y descontar el total verificado exactamente una vez', async () => {
      await submitFamilyPaymentReport(familySession, {
        declaredAmountMinor: 300000,
        transferDate: '2026-09-05',
      });

      await verifyPaymentAdmin(organizerSession, 'evento_fiesta_2026', 'part_fam_01', {
        verifiedAmountMinor: 300000,
      });

      // Intentar revertir sin motivo
      await expect(
        reverseVerificationAdmin(organizerSession, 'evento_fiesta_2026', 'part_fam_01', '')
      ).rejects.toThrow('El motivo de reversión debe contener al menos 5 caracteres.');

      // Revertir con motivo
      const reversed = await reverseVerificationAdmin(
        organizerSession,
        'evento_fiesta_2026',
        'part_fam_01',
        'La transferencia bancaria fue rechazada por el banco de origen'
      );

      expect(reversed.status).toBe('requires_revision');
      expect(reversed.verifiedAmountMinor).toBeUndefined();

      // Verificar resumen financiero: el importe no debe constar como verificado
      const summary = await getEventFinancialSummary(organizerSession, 'evento_fiesta_2026');
      expect(summary.verifiedCount).toBe(0);
      expect(summary.verifiedTotalAmountMinor).toBe(0);
      expect(summary.requiresRevisionCount).toBe(1);
    });
  });

  describe('Criterio P09: Validación y límites de comprobantes (3 MB)', () => {
    it('debe rechazar archivos mayores a 3 MB (3.000.000 bytes)', async () => {
      const oversizedBuffer = Buffer.alloc(3_000_001); // 1 byte por encima del límite

      await expect(
        validateAndUploadReceipt(
          familySession,
          oversizedBuffer,
          'comprobante_grande.pdf',
          'application/pdf'
        )
      ).rejects.toThrow('El comprobante supera el tamaño máximo permitido de 3 MB');
    });

    it('debe rechazar tipos MIME no permitidos (ej. ejecutables o scripts)', async () => {
      const buffer = Buffer.from('contenido de prueba');

      await expect(
        validateAndUploadReceipt(
          familySession,
          buffer,
          'archivo.exe',
          'application/x-msdownload'
        )
      ).rejects.toThrow('Tipo de archivo no permitido');
    });

    it('debe aceptar imágenes y PDFs dentro de los 3 MB', async () => {
      const validBuffer = Buffer.from('PDF_DUMMY_CONTENT');

      const meta = await validateAndUploadReceipt(
        familySession,
        validBuffer,
        'recibo.pdf',
        'application/pdf'
      );

      expect(meta.id).toBeDefined();
      expect(meta.sizeBytes).toBe(validBuffer.length);
      expect(meta.contentType).toBe('application/pdf');
    });
  });

  describe('Criterio P10: Registro administrativo de recepción', () => {
    it('debe identificar una verificación directa como registro administrativo sin atribuir acción a la familia', async () => {
      // Familia 02 nunca envió informe
      memoryStore.set('workspaces/ws_colegio/events/evento_fiesta_2026/participants/part_fam_02', {
        id: 'part_fam_02',
        familyId: 'fam_02',
        familyName: 'Familia Bianchi',
        status: 'active',
        accessVersion: 1,
      });

      const direct = await verifyPaymentAdmin(
        organizerSession,
        'evento_fiesta_2026',
        'part_fam_02',
        { verifiedAmountMinor: 300000, receptionDate: '2026-09-08' }
      );

      expect(direct.status).toBe('verified');
      expect(direct.isAdministrativeRecord).toBe(true);
      expect(direct.history[0].reason).toContain('directamente por administración');
    });
  });
});
