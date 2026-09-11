export interface WorkspaceGroup {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  id: string;
  workspaceId: string;
  groupId: string;
  familyId: string;
  familyName: string;
  contactEmail?: string;
  contactPhone?: string;
  createdAt: string;
}

export interface ImportCandidate {
  familyName: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface ImportValidationResult {
  validRows: ImportCandidate[];
  invalidRows: { rowNumber: number; data: any; reason: string }[];
  duplicateCount: number;
}
