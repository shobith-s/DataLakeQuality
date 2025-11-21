# app/models/report.py
from typing import Any, Dict, List

from pydantic import BaseModel


class QualityReport(BaseModel):
    dataset_name: str
    quality_score: float
    quality_label: str
    status: str

    pipeline_passed: bool
    policy_failures: List[str]

    summary: Dict[str, Any]
    basic_profile: Dict[str, Any]
    contract: Dict[str, Any]
    pii: Dict[str, Any]
    outliers: Dict[str, Any]
    drift: Dict[str, Any]

    explanations: List[str]
    recommendations: List[str]

    autofix_steps: List[str]
    autofix_script: str

    generated_at: str
