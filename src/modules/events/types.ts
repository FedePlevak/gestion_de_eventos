export interface BankInstructions {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  accountType?: string;
  routingOrCbu?: string;
  alias?: string;
  additionalNotes?: string;
}

export interface PaymentConfig {
  enabled: boolean;
  expectedAmountMinor: number; // en centavos / unidades menores
  currency: string; // ej. 'UYU', 'ARS', 'USD'
  bankInstructions?: BankInstructions;
  instructionsUpdatedAt?: string;
}

export interface EventModel {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  timezone: string; // ej. 'America/Montevideo'
  eventDate?: string;
  status: 'draft' | 'active' | 'archived';
  isArchived: boolean;
  sourceGroupId?: string;
  paymentConfig: PaymentConfig;
  createdAt: string;
  updatedAt: string;
}

export interface ParticipantModel {
  id: string;
  workspaceId: string;
  eventId: string;
  familyId: string;
  familyName: string;
  contactEmail?: string;
  contactPhone?: string;
  status: 'active' | 'inactive';
  inactiveReason?: string;
  inactivatedAt?: string;
  accessVersion: number;
  tokenHash: string;
  createdAt: string;
  updatedAt: string;
}
