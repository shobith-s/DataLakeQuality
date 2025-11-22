from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class Summary(BaseModel):
    row_count: int
    column_count: int
    total_missing_cells: int
    missing_ratio: float
    duplicate_rows: int
    duplicate_ratio: float


class BasicProfile(BaseModel):
    missing_by_column: dict
    inferred_types: dict
    column_stats: dict


class PiiColumn(BaseModel):
    column: str
    detected_types: List[str]


class ColumnOutlierProfile(BaseModel):
    column: str
    mean: Optional[float] = None
    std: Optional[float] = None
    outlier_count: int
    value_count: int
    outlier_ratio: float
    severity: str


class HistoryPoint(BaseModel):
    timestamp: datetime
    score: float
    missing_ratio: float
    outlier_ratio: float


class HistorySnapshot(BaseModel):
    points: List[HistoryPoint] = []


class Alert(BaseModel):
    level: str
    code: str
    message: str


class InsightItem(BaseModel):
    """
    Lightweight AI-style insight generated from the profiling result.
    """

    category: str  # e.g. "missing", "pii", "schema", "drift", "overall"
    severity: str  # "info" | "warning" | "critical" | "suggestion"
    message: str


class DataQualityReport(BaseModel):
    dataset_name: str
    run_id: str
    timestamp: datetime

    summary: Summary
    basic_profile: BasicProfile

    pii_columns: List[PiiColumn] = []
    pii_column_count: int = 0
    has_pii: bool = False

    columns: List[ColumnOutlierProfile] = []
    total_outliers: int = 0
    total_numeric_values: int = 0
    overall_outlier_ratio: float = 0.0

    # Policy / pipeline gate
    contract_suggestion: dict = {}
    policy_passed: bool = True
    policy_failures: List[dict] = []

    # AutoFix
    autofix_plan: List[dict] = []
    autofix_script: str = ""

    # High-level score & ratios
    missing_ratio: float = 0.0
    outlier_ratio: float = 0.0
    overall_score: float = 0.0

    # History + alerts
    history_snapshot: HistorySnapshot = HistorySnapshot()
    alerts: List[Alert] = []

    # ⭐ NEW: AI-style insights
    insights: List[InsightItem] = []

    # ⭐ NEW: inline contract YAML text for preview / download
    contract_yaml: Optional[str] = None
