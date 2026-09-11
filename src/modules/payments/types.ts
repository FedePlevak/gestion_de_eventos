import { z } from 'zod';

export type PaymentStatus = 'pending' | 'reported' | 'requires_revision' | 'verified';

export type PaymentHistoryAction =
  | 'REPORTED'
  | 'REVISED'
  | 'REQUESTED_REVISION'
  | 'VERIFIED'
  | 'VERIFICATION_REVERSED';

export interface AttachmentMetadata {
  id: string;
  storagePath: string;
  fileName: string;
  contentType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';
  sizeBytes: number;
  uploadedAt: string;
}

export interface PaymentHistoryEntry {
  version: number;
  action: PaymentHistoryAction;
  actor: {
    type: 'family' | 'organizer';
    id: string;
    email?: string;
  };
  declaredAmountMinor?: number;
  transferDate?: string;
  reason?: string;
  attachmentFileName?: string;
  timestamp: string;
}

export interface PaymentReport {
  id: string; // participantId
  workspaceId: string;
  eventId: string;
  participantId: string;
  familyId: string;
  familyName: string;
  status: PaymentStatus;
  expectedAmountMinor: number;
  currency: string;
  declaredAmountMinor?: number;
  transferDate?: string; // YYYY-MM-DD
  reportedAt?: string;
  reference?: string;
  attachment?: AttachmentMetadata;
  revisionReason?: string;
  version: number;
  verifiedAt?: string;
  verifiedBy?: string;
  verifiedAmountMinor?: number;
  isAdministrativeRecord?: boolean;
  history: PaymentHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface FinancialSummary {
  totalFamilies: number;
  expectedAmountPerFamilyMinor: number;
  currency: string;
  totalExpectedAmountMinor: number;
  pendingCount: number;
  reportedPendingCount: number;
  reportedPendingAmountMinor: number;
  requiresRevisionCount: number;
  verifiedCount: number;
  verifiedTotalAmountMinor: number;
}

// Esquemas Zod para validación
export const SubmitPaymentReportSchema = z.object({
  declaredAmountMinor: z.number().int().positive('El importe transferido debe ser mayor a cero.'),
  transferDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha de transferencia debe tener formato AAAA-MM-DD.'),
  reference: z.string().max(100).optional(),
  expectedVersion: z.number().int().nonnegative().optional(),
});

export const AdminVerifyPaymentSchema = z.object({
  verifiedAmountMinor: z.number().int().positive('El importe recibido debe ser un número entero positivo.'),
  receptionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha de recepción debe tener formato AAAA-MM-DD.').optional(),
});

export const AdminRequestRevisionSchema = z.object({
  reason: z.string().min(5, 'El motivo de solicitud de revisión debe contener al menos 5 caracteres.'),
});

export const AdminReverseVerificationSchema = z.object({
  reason: z.string().min(5, 'El motivo de reversión debe contener al menos 5 caracteres.'),
});
