from typing import List
from ..models.report import DataQualityReport, Alert, ColumnProfile


# Simple thresholds – you can tune these later
MISSING_WARN_THRESHOLD = 0.05   # 5%
OUTLIER_WARN_THRESHOLD = 0.05   # 5%


def build_alerts(report: DataQualityReport) -> List[Alert]:
    """
    Build human-readable alerts from the data quality report.
    This is run-friendly (only current run; history-based jumps can be added later).
    """
    alerts: List[Alert] = []

    # 1) Dataset-level missing / outliers
    if report.missing_ratio > MISSING_WARN_THRESHOLD:
        alerts.append(
            Alert(
                level="warning",
                code="HIGH_MISSING_RATIO",
                message=f"Overall missing ratio is {report.missing_ratio:.1%}, "
                        f"which is above the {MISSING_WARN_THRESHOLD:.0%} threshold.",
            )
        )

    if report.outlier_ratio > OUTLIER_WARN_THRESHOLD:
        alerts.append(
            Alert(
                level="warning",
                code="HIGH_OUTLIER_RATIO",
                message=f"Overall outlier ratio is {report.outlier_ratio:.1%}, "
                        f"which is above the {OUTLIER_WARN_THRESHOLD:.0%} threshold.",
            )
        )

    # 2) Drift & PSI severity (column-level)
    for col in report.columns:
        # Drift severity if available
        if col.drift_severity in {"moderate", "severe"}:
            alerts.append(
                Alert(
                    level="error" if col.drift_severity == "severe" else "warning",
                    code="DRIFT_DETECTED",
                    message=(
                        f"Drift detected on column '{col.name}' "
                        f"(severity = {col.drift_severity}"
                        + (f", PSI = {col.psi:.3f}" if col.psi is not None else "")
                        + ")."
                    ),
                )
            )

        # PII detection
        if col.pii_type:
            alerts.append(
                Alert(
                    level="warning",
                    code="PII_DETECTED",
                    message=f"PII of type '{col.pii_type}' detected in column '{col.name}'.",
                )
            )

        # High missing per column
        if col.missing_ratio is not None and col.missing_ratio > MISSING_WARN_THRESHOLD:
            alerts.append(
                Alert(
                    level="warning",
                    code="COLUMN_MISSING_HIGH",
                    message=f"Column '{col.name}' has missing ratio {col.missing_ratio:.1%}.",
                )
            )

    # 3) Policy failures → always errors
    for pf in report.policy_failures:
        alerts.append(
            Alert(
                level="error",
                code=f"POLICY_{pf.code.upper()}",
                message=pf.message,
            )
        )

    # 4) If pipeline failed but we somehow have no specific failures
    if not report.policy_passed and not report.policy_failures:
        alerts.append(
            Alert(
                level="error",
                code="PIPELINE_FAILED",
                message="Pipeline did not pass the policy engine, but no specific failures were listed.",
            )
        )

    # 5) Fallback if nothing else fired
    if not alerts:
        alerts.append(
            Alert(
                level="info",
                code="ALL_GOOD",
                message="No significant data quality issues detected in this run.",
            )
        )

    return alerts
