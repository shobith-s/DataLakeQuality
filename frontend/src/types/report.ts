// frontend/src/types/report.ts

export type AlertLevel = "error" | "warning" | "info";

export interface Alert {
  level: AlertLevel;
  code: string;
  message: string;
}

export interface Summary {
  row_count: number;
  column_count: number;
  total_missing_cells: number;
  missing_ratio: number;
  duplicate_rows?: number;
  duplicate_ratio?: number;
}

export interface BasicProfile {
  missing_by_column?: Record<string, number>;
  inferred_types?: Record<string, string>;
  column_stats?: Record<string, any>;
}

export interface ColumnProfile {
  name?: string;
  column?: string;
  dtype?: string;
  missing_ratio?: number;
  outlier_ratio?: number;
  pii_type?: string | null;
  drift_severity?: string | null;
  psi?: number | null;
  [key: string]: any;
}

export interface PolicyFailure {
  code: string;
  message: string;
}

export interface HistoryPoint {
  timestamp: string;
  overall_score?: number;
  missing_ratio?: number;
  outlier_ratio?: number;
}

export interface HistorySnapshot {
  points: HistoryPoint[];
  [key: string]: unknown;
}

export interface PiiColumn {
  column: string;
  detected_types: string[];
}

export interface ScoreGrade {
  letter: string;
  label: string;
  reason?: string;
}

export interface ScoreBreakdown {
  base?: number;
  penalty_missing?: number;
  penalty_outliers?: number;
  penalty_duplicates?: number;
  penalty_pii?: number;
  penalty_drift?: number;
  total_penalty?: number;
  final_score?: number;
  [key: string]: any;
}

export interface SchemaTypeChange {
  column: string;
  before: string | null;
  after: string | null;
}

export interface SchemaPIIInfo {
  has_pii: boolean;
  pii_types?: string[];
}

export interface SchemaPIIChange {
  column: string;
  before: SchemaPIIInfo;
  after: SchemaPIIInfo;
}

export interface SchemaChanges {
  status: string;
  added_columns: string[];
  removed_columns: string[];
  type_changes: SchemaTypeChange[];
  pii_changes: SchemaPIIChange[];
  is_breaking: boolean;
}

export interface DataQualityReport {
  dataset_name: string;
  run_id: string;
  timestamp: string;

  summary?: Summary;
  basic_profile?: BasicProfile;

  overall_score?: number;
  missing_ratio: number;
  outlier_ratio: number;
  duplicate_ratio?: number;

  has_drift?: boolean;
  psi_severity?: string | null;

  columns: ColumnProfile[];

  pii_columns?: PiiColumn[];
  pii_column_count?: number;
  has_pii?: boolean;

  policy_passed: boolean;
  policy_failures: PolicyFailure[];

  alerts: Alert[];

  autofix_plan?: unknown;
  autofix_script?: string;

  history_snapshot?: HistorySnapshot;

  score_grade?: ScoreGrade;
  score_breakdown?: ScoreBreakdown;

  schema_changes?: SchemaChanges;

  [key: string]: unknown;
}
