from __future__ import annotations

from typing import List, Dict, Any


def generate_insights(payload: Dict[str, Any]) -> List[Dict[str, str]]:
    """
    Heuristic "AI-style" insight generator.

    Accepts a dict with the key metrics we care about and returns
    a list of {category, severity, message} items. The DataQualityReport
    model will coerce these dicts into InsightItem objects.
    """
    insights: List[Dict[str, str]] = []

    missing_ratio = float(payload.get("missing_ratio", 0.0) or 0.0)
    outlier_ratio = float(payload.get("outlier_ratio", 0.0) or 0.0)
    has_pii = bool(payload.get("has_pii", False))
    pii_columns = payload.get("pii_columns") or []
    drift_severity = (payload.get("drift_severity") or "").lower()
    schema_change_status = (payload.get("schema_change_status") or "").lower()
    overall_score = float(payload.get("overall_score", 0.0) or 0.0)
    policy_passed = bool(payload.get("policy_passed", True))

    # Overall health
    if overall_score >= 95:
        insights.append(
            {
                "category": "overall",
                "severity": "info",
                "message": "Dataset quality is excellent. It is safe to onboard this dataset into downstream analytics.",
            }
        )
    elif overall_score >= 80:
        insights.append(
            {
                "category": "overall",
                "severity": "warning",
                "message": "Dataset quality is good, but addressing a few issues now will prevent future pipeline noise.",
            }
        )
    else:
        insights.append(
            {
                "category": "overall",
                "severity": "critical",
                "message": "Dataset quality is below recommended thresholds. Review missing data, outliers, and PII before using it in production.",
            }
        )

    # Missing data
    if missing_ratio > 0.3:
        insights.append(
            {
                "category": "missing",
                "severity": "critical",
                "message": f"About {missing_ratio * 100:.1f}% of cells are missing. Consider imputing or dropping heavily affected columns before modelling.",
            }
        )
    elif missing_ratio > 0.05:
        insights.append(
            {
                "category": "missing",
                "severity": "warning",
                "message": f"Missing data ({missing_ratio * 100:.1f}%) is moderate. Imputing key feature columns will stabilise model performance.",
            }
        )

    # Outliers
    if outlier_ratio > 0.15:
        insights.append(
            {
                "category": "outliers",
                "severity": "warning",
                "message": "A high fraction of numeric values are flagged as outliers. Winsorisation or robust scaling is recommended.",
            }
        )

    # PII
    if has_pii and pii_columns:
        col_names = ", ".join(c.get("column", "?") for c in pii_columns[:4])
        more = "..." if len(pii_columns) > 4 else ""
        insights.append(
            {
                "category": "pii",
                "severity": "warning",
                "message": f"Potential PII detected in columns: {col_names}{more}. Mask or tokenize these fields before sharing outside secure environments.",
            }
        )

    # Drift
    if drift_severity in {"moderate", "severe"}:
        severity = "warning" if drift_severity == "moderate" else "critical"
        insights.append(
            {
                "category": "drift",
                "severity": severity,
                "message": f"Data drift is {drift_severity}. Validate that recent data still matches business assumptions and retrain models if needed.",
            }
        )

    # Schema
    if schema_change_status == "breaking":
        insights.append(
            {
                "category": "schema",
                "severity": "critical",
                "message": "Breaking schema changes detected. Downstream pipelines that rely on the old schema may fail.",
            }
        )
    elif schema_change_status == "non_breaking":
        insights.append(
            {
                "category": "schema",
                "severity": "info",
                "message": "Non-breaking schema changes detected. Update documentation and data contracts if necessary.",
            }
        )

    # Policy
    if not policy_passed:
        insights.append(
            {
                "category": "policy",
                "severity": "critical",
                "message": "Dataset failed configured policy checks. Fix violations or relax policy thresholds before promotion.",
            }
        )

    return insights
