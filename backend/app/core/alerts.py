# backend/app/core/alerts.py

from typing import List, Literal, Mapping, Any, TypedDict

AlertLevel = Literal["error", "warning", "info"]


class AlertDict(TypedDict):
    level: AlertLevel
    code: str
    message: str


MISSING_WARN_THRESHOLD = 0.05   # 5%
OUTLIER_WARN_THRESHOLD = 0.05   # 5%
DUPLICATE_WARN_THRESHOLD = 0.02 # 2%


def _to_dict(obj: Any) -> Mapping[str, Any]:
    """
    Helper to turn a Pydantic model or other object into a dict-like mapping.
    - If it has `.dict()`, use that (Pydantic BaseModel).
    - Otherwise assume it's already a mapping (dict).
    """
    if hasattr(obj, "dict"):
        return obj.dict()  # type: ignore[no-any-return]
    return obj  # type: ignore[no-any-return]


def build_alerts(report: Any) -> List[AlertDict]:
    """
    Build human-readable alerts from the data quality report.

    Works with:
      - Pydantic models (with .dict())
      - Plain dicts
    """
    raw = _to_dict(report)
    alerts: List[AlertDict] = []

    summary = _to_dict(raw.get("summary") or {})

    # --- Dataset-level metrics ---
    def _safe_float(x: Any, default: float = 0.0) -> float:
        try:
            if x is None:
                return default
            return float(x)
        except Exception:
            return default

    missing_ratio = _safe_float(
        raw.get("missing_ratio", summary.get("missing_ratio", 0.0))
    )

    outlier_ratio = _safe_float(
        raw.get("outlier_ratio", raw.get("overall_outlier_ratio", 0.0))
    )

    duplicate_ratio = _safe_float(summary.get("duplicate_ratio", 0.0))

    if missing_ratio > MISSING_WARN_THRESHOLD:
        alerts.append(
            AlertDict(
                level="warning",
                code="HIGH_MISSING_RATIO",
                message=(
                    f"Overall missing ratio is {missing_ratio:.1%}, "
                    f"which is above the {MISSING_WARN_THRESHOLD:.0%} threshold."
                ),
            )
        )

    if outlier_ratio > OUTLIER_WARN_THRESHOLD:
        alerts.append(
            AlertDict(
                level="warning",
                code="HIGH_OUTLIER_RATIO",
                message=(
                    f"Overall outlier ratio is {outlier_ratio:.1%}, "
                    f"which is above the {OUTLIER_WARN_THRESHOLD:.0%} threshold."
                ),
            )
        )

    if duplicate_ratio > DUPLICATE_WARN_THRESHOLD:
        alerts.append(
            AlertDict(
                level="warning",
                code="HIGH_DUPLICATE_RATIO",
                message=(
                    f"Duplicate row ratio is {duplicate_ratio:.1%}, "
                    f"which is above the {DUPLICATE_WARN_THRESHOLD:.0%} threshold."
                ),
            )
        )

    # --- Column-level metrics ---
    columns = raw.get("columns") or []
    for col in columns:
        c = _to_dict(col)
        # tolerate both "name" and "column"
        name = c.get("name") or c.get("column") or "<unknown>"

        drift_severity = c.get("drift_severity")
        psi = c.get("psi")
        pii_type = c.get("pii_type")
        col_missing_ratio = c.get("missing_ratio")

        # Drift alerts
        if drift_severity in {"moderate", "severe"}:
            level: AlertLevel = "error" if drift_severity == "severe" else "warning"
            msg = f"Drift detected on column '{name}' (severity = {drift_severity}"
            if psi is not None:
                try:
                    msg += f", PSI = {float(psi):.3f}"
                except Exception:
                    pass
            msg += ")."

            alerts.append(
                AlertDict(
                    level=level,
                    code="DRIFT_DETECTED",
                    message=msg,
                )
            )

        # PII alerts at column level (if your column profiles carry pii_type)
        if pii_type:
            alerts.append(
                AlertDict(
                    level="warning",
                    code="PII_DETECTED_COLUMN",
                    message=f"PII of type '{pii_type}' detected in column '{name}'.",
                )
            )

        # High missing per column
        if col_missing_ratio is not None:
            try:
                col_missing_ratio_f = float(col_missing_ratio)
            except (TypeError, ValueError):
                col_missing_ratio_f = 0.0

            if col_missing_ratio_f > MISSING_WARN_THRESHOLD:
                alerts.append(
                    AlertDict(
                        level="warning",
                        code="COLUMN_MISSING_HIGH",
                        message=(
                            f"Column '{name}' has missing ratio {col_missing_ratio_f:.1%}."
                        ),
                    )
                )

    # --- PII summary alerts ---
    pii_columns = raw.get("pii_columns") or []
    pii_column_count = raw.get("pii_column_count")
    has_pii = bool(
        raw.get("has_pii")
        or (pii_column_count or 0) > 0
        or (len(pii_columns) > 0)
    )

    if has_pii:
        names = []
        for c in pii_columns:
            cd = _to_dict(c)
            if cd.get("column"):
                names.append(cd["column"])
        if names:
            alerts.append(
                AlertDict(
                    level="warning",
                    code="PII_DETECTED",
                    message=(
                        "PII patterns detected in columns: "
                        + ", ".join(sorted(set(names)))
                    ),
                )
            )
        else:
            alerts.append(
                AlertDict(
                    level="warning",
                    code="PII_DETECTED",
                    message="PII patterns detected in this dataset.",
                )
            )

    # --- Policy failures ---
    policy_failures = raw.get("policy_failures") or []
    for pf in policy_failures:
        p = _to_dict(pf)
        code = str(p.get("code", "UNKNOWN"))
        message = str(p.get("message", "Policy failure"))
        alerts.append(
            AlertDict(
                level="error",
                code=f"POLICY_{code.upper()}",
                message=message,
            )
        )

    policy_passed = bool(raw.get("policy_passed", True))
    if not policy_passed and not policy_failures:
        alerts.append(
            AlertDict(
                level="error",
                code="PIPELINE_FAILED",
                message=(
                    "Pipeline did not pass the policy engine, "
                    "but no specific failures were listed."
                ),
            )
        )

    # --- Fallback: everything looks fine ---
    if not alerts:
        alerts.append(
            AlertDict(
                level="info",
                code="ALL_GOOD",
                message="No significant data quality issues detected in this run.",
            )
        )

    return alerts
