import { z } from 'zod';

export type StageType =
  | 'info'
  | 'single_choice'
  | 'multiple_choice'
  | 'yes_no'
  | 'open_text'
  | 'integer_quantity'
  | 'composite';

export type StageQuestionType =
  | 'info'
  | 'yes_no'
  | 'single_choice'
  | 'multiple_choice'
  | 'integer_quantity'
  | 'open_text';

export interface StageQuestionCondition {
  dependsOnQuestionId: string;
  operator: 'equals' | 'not_equals';
  value?: any;
}

export type StageStatus = 'draft' | 'open' | 'closed' | 'canceled';
export type StageVisibility = 'visible' | 'hidden';

export interface StageOption {
  id: string;
  label: string;
  description?: string;
}

export interface StageQuestion {
  id: string;
  title: string;
  description?: string;
  type: StageQuestionType;
  required: boolean;
  options?: StageOption[];
  minQuantity?: number;
  maxQuantity?: number;
  placeholder?: string;
  condition?: StageQuestionCondition;
  maxChoices?: number;
  allowDetails?: boolean;
  detailsLabel?: string;
}

export interface StageClarification {
  id: string;
  content: string;
  createdAt: string;
  authorOrganizerEmail: string;
}

export interface StageClosureRecord {
  closedAt: string;
  closedByEmail: string;
  reason?: string;
}

export interface StageReopeningRecord {
  reopenedAt: string;
  reopenedByEmail: string;
  reason: string;
  previousClosedAt: string;
  newDeadlineAt?: string;
}

export interface StageModel {
  id: string;
  workspaceId: string;
  eventId: string;
  title: string;
  description?: string;
  content?: string;
  type: StageType;
  status: StageStatus;
  visibility: StageVisibility;
  order: number;
  deadlineAt?: string; // ISO 8601 UTC
  timezone: string; // Ej: 'America/Montevideo'
  isSemanticallyLocked: boolean; // Se vuelve true con la primera respuesta o lectura confirmada
  options?: StageOption[];
  questions?: StageQuestion[];
  clarifications: StageClarification[];
  closures: StageClosureRecord[];
  reopenings: StageReopeningRecord[];
  responseCount: number;
  readCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StageResponse {
  id: string; // participantId
  workspaceId: string;
  eventId: string;
  stageId: string;
  participantId: string;
  familyId: string;
  familyName: string;
  answers: Record<string, any>;
  version: number;
  submittedAt: string;
  updatedAt: string;
}

export interface ResponseRevision {
  id: string;
  version: number;
  answers: Record<string, any>;
  savedAt: string;
  participantId: string;
}

export interface ReadConfirmation {
  id: string; // participantId
  workspaceId: string;
  eventId: string;
  stageId: string;
  participantId: string;
  familyId: string;
  familyName: string;
  confirmedAt: string;
}

// Esquemas de validación Zod
export const StageOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1, 'El texto de la opción es obligatorio'),
  description: z.string().optional(),
});

export const StageQuestionConditionSchema = z.object({
  dependsOnQuestionId: z.string().min(1),
  operator: z.enum(['equals', 'not_equals']),
  value: z.any().optional(),
});

export const StageQuestionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1, 'El título o consigna del campo es obligatorio'),
  description: z.string().optional(),
  type: z.enum(['info', 'yes_no', 'single_choice', 'multiple_choice', 'integer_quantity', 'open_text']),
  required: z.boolean().default(false),
  options: z.array(StageOptionSchema).optional(),
  minQuantity: z.number().int().optional(),
  maxQuantity: z.number().int().optional(),
  placeholder: z.string().optional(),
  condition: StageQuestionConditionSchema.optional(),
  maxChoices: z.number().int().optional(),
});

export const SubmitResponseSchema = z.object({
  answers: z.record(z.any()),
  expectedVersion: z.number().int().nonnegative().optional(),
});

export const AdminCreateStageSchema = z.object({
  title: z.string().min(2, 'El título debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  content: z.string().optional(),
  type: z.enum(['info', 'single_choice', 'multiple_choice', 'yes_no', 'open_text', 'integer_quantity', 'composite']),
  visibility: z.enum(['visible', 'hidden']).default('hidden'),
  status: z.enum(['draft', 'open', 'closed', 'canceled']).default('open'),
  order: z.number().int().default(1),
  deadlineAt: z.string().datetime().optional().nullable(),
  timezone: z.string().default('America/Montevideo'),
  options: z.array(StageOptionSchema).optional(),
  questions: z.array(StageQuestionSchema).optional(),
});

export const AdminUpdateStageSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  visibility: z.enum(['visible', 'hidden']).optional(),
  status: z.enum(['draft', 'open', 'closed', 'canceled']).optional(),
  order: z.number().int().optional(),
  deadlineAt: z.string().datetime().optional().nullable(),
  options: z.array(StageOptionSchema).optional(),
  questions: z.array(StageQuestionSchema).optional(),
});

export const AdminCloseStageSchema = z.object({
  reason: z.string().optional(),
});

export const AdminReopenStageSchema = z.object({
  reason: z.string().min(3, 'El motivo de reapertura es obligatorio'),
  newDeadlineAt: z.string().datetime().optional().nullable(),
});

export const AdminClarificationSchema = z.object({
  content: z.string().min(3, 'El texto de la aclaración es obligatorio'),
});
