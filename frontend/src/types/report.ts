export interface Summary {
  row_count: number;
  column_count: number;
  total_missing_cells: number;
  missing_ratio: number;
  duplicate_rows: number;
  duplicate_ratio: number;
}

export interface BasicProfile {
  missing_by_column: Record<string, number>;
  inferred_types: Record<string, string>;
  column_stats: Record<string, any>;
}

export interface PiiColumn {
  column: string;
  detected_types: string[];
}

export interface ColumnOutlierProfile {
  column: string;
  mean?: number | null;
  std?: number | null;
  outlier_count: number;
  value_count: number;
  outlier_ratio: number;
  severity: string;
}

export interface HistoryPoint {
  timestamp: string;
  score: number;
  missing_ratio: number;
  outlier_ratio: number;
}

export interface HistorySnapshot {
  points: HistoryPoint[];
}

export interface AlertItem {
  level?: string;
  code?: string;
  message?: string;
}

export interface InsightItem {
  category: string;
  severity: string;
  message: string;
}

export interface DataQualityReport {
  dataset_name: string;
  run_id: string;
  timestamp: string;

  summary: Summary;
  basic_profile: BasicProfile;

  pii_columns: PiiColumn[];
  pii_column_count: number;
  has_pii: boolean;

  columns: ColumnOutlierProfile[];
  total_outliers: number;
  total_numeric_values: number;
  overall_outlier_ratio: number;

  contract_suggestion: Record<string, any>;
  policy_passed: boolean;
  policy_failures: any[];

  autofix_plan: any[];
  autofix_script: string;

  missing_ratio: number;
  outlier_ratio: number;
  overall_score: number;

  history_snapshot: HistorySnapshot;
  alerts: AlertItem[];

  // NEW
  insights?: InsightItem[];
  contract_yaml?: string | null;
}
