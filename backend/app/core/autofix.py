# app/core/autofix.py
from typing import Any, Dict, List


def build_recommendations(
    summary: Dict[str, Any],
    basic_profile: Dict[str, Any],
    contract: Dict[str, Any],
    pii: Dict[str, Any],
    outliers: Dict[str, Any],
    drift: Dict[str, Any],
) -> List[str]:
    """
    Produce simple, actionable recommendations based on the quality findings.
    These are heuristics, not magic, but they guide the next steps for cleanup.
    """
    recommendations: List[str] = []

    missing_ratio = summary.get("missing_ratio", 0.0)
    duplicate_rows = summary.get("duplicate_rows", 0)
    row_count = summary.get("row_count", 0)
    outlier_ratio = summary.get("overall_outlier_ratio", 0.0)
    has_drift = summary.get("has_drift", False)

    missing_by_column = basic_profile.get("missing_by_column", {})
    inferred_types = basic_profile.get("inferred_types", {})

    # 1) Missing values
    if missing_ratio > 0:
        # pick top 3 columns with missing values
        cols_sorted = sorted(
            missing_by_column.items(), key=lambda kv: kv[1], reverse=True
        )
        top_missing = [c for c, cnt in cols_sorted if cnt > 0][:3]
        if top_missing:
            recommendations.append(
                f"Handle missing values in columns: {', '.join(top_missing)} "
                "(e.g., impute with mean/median/mode or drop rows if appropriate)."
            )

    # 2) Duplicates
    if duplicate_rows > 0:
        recommendations.append(
            f"Remove {duplicate_rows} duplicate rows (e.g., using a primary key such as an ID column)."
        )

    # 3) Contract-related fixes
    if contract.get("contract_name") is not None:
        missing_required = contract.get("required_columns", {}).get("missing", [])
        if missing_required:
            recommendations.append(
                f"Add or derive the missing contract-required columns: {', '.join(missing_required)}."
            )

        for mismatch in contract.get("type_mismatches", []):
            col = mismatch["column"]
            expected = mismatch["expected"]
            actual = mismatch["actual"]
            recommendations.append(
                f"Cast column '{col}' from {actual} to {expected} "
                "(e.g., convert strings to datetime or numeric types)."
            )

        for uv in contract.get("unique_violations", []):
            col = uv["column"]
            recommendations.append(
                f"Deduplicate data based on unique key column '{col}' to satisfy contract constraints."
            )
    else:
        # No contract: suggest creating one
        if row_count > 0:
            recommendations.append(
                "Define a data contract (YAML) for this dataset to enforce schema, types, and key constraints."
            )

    # 4) PII handling
    if pii.get("has_pii"):
        pii_columns = [c["column"] for c in pii.get("pii_columns", [])]
        if pii_columns:
            recommendations.append(
                f"Mask or tokenize PII-like data in columns: {', '.join(pii_columns)} "
                "before sharing this dataset with downstream consumers."
            )
        else:
            recommendations.append(
                "Consider masking or tokenizing detected PII-like columns to comply with privacy policies."
            )

    # 5) Outliers
    if outlier_ratio > 0:
        outlier_cols = [
            col_info["column"]
            for col_info in outliers.get("columns", [])
            if col_info.get("outlier_count", 0) > 0
        ][:3]
        if outlier_cols:
            recommendations.append(
                f"Investigate outliers in numeric columns: {', '.join(outlier_cols)}. "
                "You may cap extreme values, apply winsorization, or handle them via robust statistics."
            )

    # 6) Drift
    if has_drift and not drift.get("baseline_created"):
        drift_cols = [
            c["column"] for c in drift.get("columns", []) if c.get("drift")
        ]
        if drift_cols:
            recommendations.append(
                f"Review feature distributions in drifted columns: {', '.join(drift_cols)}. "
                "Consider retraining downstream models or updating business rules if the new distribution is expected."
            )

    # 7) If nothing else: generic suggestion
    if not recommendations:
        recommendations.append(
            "Dataset looks reasonably clean. Consider adding stricter contracts or additional quality checks for production use."
        )

    return recommendations
