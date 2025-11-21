# app/models/history.py
from typing import Optional

from pydantic import BaseModel


class RunHistoryEntry(BaseModel):
    dataset_name: str
    generated_at: Optional[str]
    quality_score: float
    missing_ratio: float
    duplicate_ratio: float
    overall_outlier_ratio: float
    has_drift: bool
