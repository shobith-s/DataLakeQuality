# app/core/scoring.py
from typing import Literal


def compute_quality_score(
    missing_ratio: float,
    duplicate_ratio: float,
    contract_violations: int,
    pii_column_count: int,
    overall_outlier_ratio: float,
    has_drift: bool,
) -> dict:
    """
    Heuristic scoring. We don't pretend it's perfect; we keep it transparent.
    """
    score = 100.0

    # missing values: up to -30
    score -= min(missing_ratio * 100 * 0.3, 30.0)

    # duplicates: up to -20
    score -= min(duplicate_ratio * 100 * 0.2, 20.0)

    # contract violations: up to -25
    score -= min(contract_violations * 5.0, 25.0)

    # PII columns: up to -20
    score -= min(pii_column_count * 5.0, 20.0)

    # outliers: up to -15
    score -= min(overall_outlier_ratio * 100 * 0.15, 15.0)

    # drift: -10 if present
    if has_drift:
        score -= 10.0

    score = max(0.0, min(100.0, score))

    if score >= 80:
        label: Literal["GREEN", "YELLOW", "RED"] = "GREEN"
    elif score >= 50:
        label = "YELLOW"
    else:
        label = "RED"

    return {
        "score": score,
        "label": label,
    }
