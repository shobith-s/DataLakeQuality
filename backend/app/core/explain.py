# app/core/explain.py
from typing import Any, Dict, List


def build_explanations(
    summary: Dict[str, Any],
    contract: Dict[str, Any],
    pii: Dict[str, Any],
    outliers: Dict[str, Any],
    drift: Dict[str, Any],
) -> List[str]:
    """
    Turn raw metrics into human-readable explanations for why
    the quality score and label look the way they do.
    """
    explanations: List[str] = []

    row_count = summary.get("row_count", 0)
    col_count = summary.get("column_count", 0)
    missing_ratio = summary.get("missing_ratio", 0.0)
    duplicate_ratio = summary.get("duplicate_ratio", 0.0)
    pii_cols = summary.get("pii_column_count", 0)
    contract_violations = summary.get("contract_violations", 0)
    outlier_ratio = summary.get("overall_outlier_ratio", 0.0)
    has_drift = summary.get("has_drift", False)

    # Dataset shape
    explanations.append(
        f"Dataset has {row_count} rows and {col_count} columns."
    )

    # Missingness
    if missing_ratio == 0:
        explanations.append("No missing values detected in the dataset.")
    elif missing_ratio < 0.01:
        explanations.append(
            f"Missing values are low ({missing_ratio*100:.1f}% of all cells)."
        )
    elif missing_ratio < 0.05:
        explanations.append(
            f"Missing values are moderate ({missing_ratio*100:.1f}% of all cells). You may want to impute or drop them."
        )
    else:
        explanations.append(
            f"Missing values are high ({missing_ratio*100:.1f}% of all cells). This significantly reduces data quality."
        )

    # Duplicates
    if duplicate_ratio == 0:
        explanations.append("No duplicate rows detected.")
    elif duplicate_ratio < 0.01:
        explanations.append(
            f"A small fraction of rows are duplicates ({duplicate_ratio*100:.1f}%)."
        )
    else:
        explanations.append(
            f"A noticeable fraction of rows are duplicates ({duplicate_ratio*100:.1f}%). Consider deduplicating."
        )

    # Contract
    if contract.get("contract_name") is None:
        explanations.append(
            "No data contract found for this dataset. Schema is not enforced."
        )
    else:
        missing_required = contract.get("required_columns", {}).get("missing", [])
        type_mismatches = contract.get("type_mismatches", [])
        unique_violations = contract.get("unique_violations", [])

        if contract.get("passed"):
            explanations.append("Dataset satisfies the defined data contract.")
        else:
            if missing_required:
                explanations.append(
                    f"Data contract: missing required columns: {', '.join(missing_required)}."
                )
            if type_mismatches:
                mismatch_cols = [m["column"] for m in type_mismatches]
                explanations.append(
                    f"Data contract: type mismatches in columns: {', '.join(mismatch_cols)}."
                )
            if unique_violations:
                uv_cols = [u["column"] for u in unique_violations]
                explanations.append(
                    f"Data contract: uniqueness violations in key columns: {', '.join(uv_cols)}."
                )

    # PII
    if pii_cols == 0:
        explanations.append("No PII-like columns detected.")
    else:
        pii_columns = [c["column"] for c in pii.get("pii_columns", [])]
        if pii_columns:
            explanations.append(
                f"Detected PII-like patterns in columns: {', '.join(pii_columns)}."
            )
        else:
            explanations.append(
                f"Detected PII-like patterns in {pii_cols} columns."
            )

    # Outliers
    if outlier_ratio == 0:
        explanations.append("No numeric outliers detected using z-score heuristic.")
    elif outlier_ratio < 0.01:
        explanations.append(
            f"Only a small fraction of numeric values are outliers ({outlier_ratio*100:.2f}%)."
        )
    elif outlier_ratio < 0.05:
        explanations.append(
            f"A moderate fraction of numeric values are outliers ({outlier_ratio*100:.2f}%)."
        )
    else:
        explanations.append(
            f"A high fraction of numeric values are outliers ({outlier_ratio*100:.2f}%), which strongly affects data quality."
        )

    # Drift
    if drift.get("baseline_created"):
        explanations.append(
            "Baseline created for this dataset. Future uploads will be compared against it for drift."
        )
    else:
        if has_drift:
            drift_cols = [
                c["column"] for c in drift.get("columns", []) if c.get("drift")
            ]
            if drift_cols:
                explanations.append(
                    f"Detected significant distribution drift in numeric columns: {', '.join(drift_cols)}."
                )
            else:
                explanations.append(
                    "Some numeric columns show changes compared to baseline, but no column crossed the drift threshold."
                )
        else:
            explanations.append("No significant drift detected compared to baseline.")

    return explanations
