export interface AggregatedOptionCount {
  optionId: string;
  label: string;
  count: number;
  percentage: number;
}

export interface StageAggregatedResults {
  stageId: string;
  stageTitle: string;
  stageType: string;
  totalEligibleFamilies: number;
  respondedFamiliesCount: number;
  responseRatePercentage: number;
  breakdown: AggregatedOptionCount[];
  publishedAt: string;
  isProvisional: boolean;
  publishedByEmail: string;
  status: 'published' | 'unpublished';
  note?: string;
}
