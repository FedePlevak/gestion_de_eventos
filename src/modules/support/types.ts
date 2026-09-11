import { z } from 'zod';

export type SupportTicketStatus = 'new' | 'in_progress' | 'resolved';

export interface InternalNote {
  id: string;
  note: string;
  authorEmail: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  workspaceId: string;
  eventId: string;
  participantId: string;
  familyId: string;
  familyName: string;
  subject: string;
  description: string;
  status: SupportTicketStatus;
  assignedToEmail?: string;
  resolutionSummary?: string;
  internalNotes: InternalNote[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

// Vista que se entrega a la familia (Regla S02: sin notas internas)
export type FamilySupportTicket = Omit<SupportTicket, 'internalNotes'>;

export const CreateSupportTicketSchema = z.object({
  subject: z.string().min(3, 'El asunto debe tener al menos 3 caracteres.'),
  description: z.string().min(5, 'El detalle de la consulta debe tener al menos 5 caracteres.'),
});

export const UpdateSupportTicketAdminSchema = z.object({
  status: z.enum(['new', 'in_progress', 'resolved']).optional(),
  assignedToEmail: z.string().email().optional().nullable(),
  resolutionSummary: z.string().optional(),
  addInternalNote: z.string().min(2).optional(),
});
