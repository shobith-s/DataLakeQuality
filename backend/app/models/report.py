# app/models/report.py
from typing import Any, Dict

from pydantic import BaseModel


class QualityReport(BaseModel):
    dataset_name: str
    quality_score: float
    quality_label: str
    status: str
    summary: Dict[str, Any]
    basic_profile: Dict[str, Any]
    contract: Dict[str, Any]
    pii: Dict[str, Any]
    outliers: Dict[str, Any]
    drift: Dict[str, Any]
    generated_at: str
