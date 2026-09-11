export interface FamilySessionContext {
  workspaceId: string;
  eventId: string;
  participantId: string;
  familyId: string;
  familyName: string;
  accessVersion: number;
}

export interface OrganizerSessionContext {
  workspaceId: string;
  eventId?: string;
  organizerId: string;
  email: string;
  name?: string;
}

export interface FamilyParticipant {
  id: string;
  workspaceId: string;
  eventId: string;
  familyId: string;
  familyName: string;
  contactPhone?: string;
  contactEmail?: string;
  status: 'active' | 'inactive';
  accessVersion: number;
  tokenHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventOrganizer {
  id: string;
  workspaceId: string;
  eventId: string;
  email: string;
  name: string;
  status: 'active' | 'revoked';
  invitedBy?: string;
  invitedAt: string;
  joinedAt?: string;
}
