# app/core/autofix.py
from __future__ import annotations

from typing import Any, Dict, List


def _is_numeric_type(t: str) -> bool:
    return t in {"integer", "float", "number"}


def _is_date_type(t: str) -> bool:
    return t in {"date", "datetime", "timestamp"}


def build_recommendations(
    summary: Dict[str, Any],
    basic_profile: Dict[str, Any],
    contract: Dict[str, Any],
    pii: Dict[str, Any],
    outliers: Dict[str, Any],
    drift: Dict[str, Any],
) -> List[str]:
    """
    High-level natural-language recommendations based on the summary and
    other checks. This is what the UI shows in the 'What to fix next?'
    panel – more high-level than the concrete autofix script.
    """
    recs: List[str] = []

    row_count = summary.get("row_count", 0) or 0
    missing_ratio = summary.get("missing_ratio", 0.0)
    duplicate_ratio = summary.get("duplicate_ratio", 0.0)
    contract_violations = summary.get("contract_violations", 0)
    pii_column_count = summary.get("pii_column_count", 0)
    overall_outlier_ratio = summary.get("overall_outlier_ratio", 0.0)
    has_drift = summary.get("has_drift", False)

    # Missing data
    if missing_ratio > 0.2:
        recs.append(
            f"Missing values are high ({missing_ratio*100:.1f}%). Consider dropping or imputing columns with very high missingness."
        )
    elif missing_ratio > 0.0:
        recs.append(
            f"There are some missing values ({missing_ratio*100:.1f}%). Consider imputing numeric columns with median and categorical columns with mode."
        )

    # Duplicates
    if duplicate_ratio > 0.0 and row_count > 0:
        recs.append(
            f"Duplicate rows detected ({duplicate_ratio*100:.1f}%). Consider dropping exact duplicates before loading into the data lake."
        )

    # Contract violations
    if contract_violations > 0:
        missing_required = contract.get("required_columns", {}).get("missing", []) or []
        if missing_required:
            recs.append(
                f"Contract is missing required columns: {', '.join(missing_required)}. Align upstream schema with the contract."
            )
        type_mismatches = contract.get("type_mismatches", []) or []
        if type_mismatches:
            cols = ", ".join(m["column"] for m in type_mismatches)
            recs.append(
                f"Contract type mismatches found in columns: {cols}. Standardize types at ingestion (e.g., date parsing, numeric casting)."
            )

    # PII
    if pii_column_count > 0:
        pii_cols = [c["column"] for c in pii.get("pii_columns", [])]
        recs.append(
            f"PII detected in {pii_column_count} column(s): {', '.join(pii_cols)}. Mask, hash, or tokenize these before storing in non-secure environments."
        )

    # Outliers
    if overall_outlier_ratio > 0.05:
        recs.append(
            f"Outliers are present in numeric features (overall ratio {overall_outlier_ratio*100:.1f}%). Consider capping using quantiles or using robust models."
        )

    # Drift
    if has_drift and drift.get("columns"):
        drifting_cols = [
            c["column"] for c in drift.get("columns", []) if c.get("drift")
        ]
        if drifting_cols:
            recs.append(
                f"Drift detected in: {', '.join(drifting_cols)}. Investigate upstream changes or recalibrate models that consume this data."
            )

    if not recs:
        recs.append("No major issues detected. You can proceed, but keep monitoring over time.")

    return recs


def build_autofix(
    summary: Dict[str, Any],
    basic_profile: Dict[str, Any],
    contract: Dict[str, Any],
    pii: Dict[str, Any],
    outliers: Dict[str, Any],
    drift: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Build a set of concrete autofix steps and a Python script skeleton
    that users can plug into their pipeline.

    Returns:
      {
        "steps": [str, ...],
        "script": "python code..."
      }
    """
    steps: List[str] = []
    script_lines: List[str] = []

    row_count = summary.get("row_count", 0) or 0
    missing_ratio = summary.get("missing_ratio", 0.0)
    duplicate_ratio = summary.get("duplicate_ratio", 0.0)
    contract_violations = summary.get("contract_violations", 0)
    overall_outlier_ratio = summary.get("overall_outlier_ratio", 0.0)

    missing_by_column: Dict[str, int] = basic_profile.get("missing_by_column", {}) or {}
    inferred_types: Dict[str, str] = basic_profile.get("inferred_types", {}) or {}

    # ---- Script header ----
    script_lines.append("# Auto-generated data cleaning script by DataLakeQ")
    script_lines.append("# Adjust the file path, column names, and logic as needed for your pipeline.")
    script_lines.append("")
    script_lines.append("import pandas as pd")
    script_lines.append("")
    script_lines.append("# TODO: update this with your actual file path")
    script_lines.append('df = pd.read_csv("your_input_file.csv")')
    script_lines.append("")

    # ---- Missing values autofix ----
    if missing_ratio > 0.0 and row_count > 0:
        steps.append(
            f"Handle missing values (overall missing ratio {missing_ratio*100:.1f}%)."
        )
        script_lines.append("# --- Missing value handling ---")
        for col, miss_count in missing_by_column.items():
            if row_count <= 0:
                continue
            col_missing_ratio = miss_count / row_count
            if col_missing_ratio == 0:
                continue

            col_type = inferred_types.get(col, "string")
            # High missingness: warn about dropping or domain-specific handling
            if col_missing_ratio > 0.5:
                steps.append(
                    f"Column '{col}' has very high missingness ({col_missing_ratio*100:.1f}%). Consider dropping or using domain-specific imputation."
                )
                script_lines.append(
                    f"# Column '{col}' has very high missingness ({col_missing_ratio*100:.1f}%)."
                )
                script_lines.append(
                    f"# Option 1: drop the column entirely if it is not critical."
                )
                script_lines.append(f"# df = df.drop(columns=['{col}'])")
                script_lines.append(
                    "# Option 2: apply domain-specific imputation logic here."
                )
                script_lines.append("")
            else:
                # Moderate/low missingness → imputation
                if _is_numeric_type(col_type):
                    steps.append(
                        f"Impute numeric column '{col}' with its median (missing {col_missing_ratio*100:.1f}%)."
                    )
                    script_lines.append(
                        f"# Impute numeric column '{col}' with its median."
                    )
                    script_lines.append(
                        f"df['{col}'] = df['{col}'].fillna(df['{col}'].median())"
                    )
                    script_lines.append("")
                else:
                    steps.append(
                        f"Impute categorical/text column '{col}' with its most frequent value (missing {col_missing_ratio*100:.1f}%)."
                    )
                    script_lines.append(
                        f"# Impute categorical/text column '{col}' with its most frequent value."
                    )
                    script_lines.append(
                        f"mode_{col} = df['{col}'].mode(dropna=True)"
                    )
                    script_lines.append(
                        f"if not mode_{col}.empty:\n"
                        f"    df['{col}'] = df['{col}'].fillna(mode_{col}.iloc[0])"
                    )
                    script_lines.append("")
        script_lines.append("")

    # ---- Duplicates autofix ----
    if duplicate_ratio > 0.0:
        steps.append(
            f"Drop duplicate rows (duplicate ratio {duplicate_ratio*100:.1f}%)."
        )
        script_lines.append("# --- Duplicate handling ---")
        script_lines.append("# Drop exact duplicate rows.")
        script_lines.append("df = df.drop_duplicates()")
        script_lines.append("")

    # ---- Contract violations autofix ----
    if contract_violations > 0:
        script_lines.append("# --- Contract-related fixes (schema & types) ---")
        missing_required = contract.get("required_columns", {}).get("missing", []) or []
        type_mismatches = contract.get("type_mismatches", []) or []

        if missing_required:
            steps.append(
                f"Upstream schema is missing required contract columns: {', '.join(missing_required)}. Fix at the source."
            )
            script_lines.append(
                "# The following required columns are missing according to the contract:"
            )
            script_lines.append(f"#   {', '.join(missing_required)}")
            script_lines.append("# These must be added at the upstream source.")
            script_lines.append("")

        for tm in type_mismatches:
            col = tm.get("column")
            expected = tm.get("expected")
            actual = tm.get("actual")
            if not col:
                continue

            if _is_numeric_type(expected):
                steps.append(
                    f"Cast column '{col}' to numeric to satisfy contract (expected {expected}, actual {actual})."
                )
                script_lines.append(
                    f"# Cast '{col}' to numeric, coercing invalid values to NaN."
                )
                script_lines.append(
                    f"df['{col}'] = pd.to_numeric(df['{col}'], errors='coerce')"
                )
                script_lines.append("")
            elif _is_date_type(expected):
                steps.append(
                    f"Parse column '{col}' as datetime to satisfy contract (expected {expected}, actual {actual})."
                )
                script_lines.append(
                    f"# Parse '{col}' as datetime, invalid formats become NaT."
                )
                script_lines.append(
                    f"df['{col}'] = pd.to_datetime(df['{col}'], errors='coerce')"
                )
                script_lines.append("")
            else:
                steps.append(
                    f"Standardize column '{col}' to the expected type '{expected}' (actual '{actual}')."
                )
                script_lines.append(
                    f"# TODO: standardize '{col}' to expected type '{expected}'."
                )
                script_lines.append("")

    # ---- Outliers autofix ----
    outlier_cols = outliers.get("columns", []) or []
    severe_outlier_cols = [
        c for c in outlier_cols if str(c.get("severity", "")).lower() in {"high", "severe"}
    ]

    if overall_outlier_ratio > 0.0 and severe_outlier_cols:
        steps.append(
            f"Cap severe outliers in numeric columns using quantile-based clipping (overall outlier ratio {overall_outlier_ratio*100:.1f}%)."
        )
        script_lines.append("# --- Outlier handling ---")
        script_lines.append(
            "# Example: cap severe outliers using 1st and 99th percentiles."
        )
        for col_info in severe_outlier_cols:
            col = col_info.get("column")
            if not col:
                continue
            script_lines.append(f"# Cap outliers in '{col}' via quantiles.")
            script_lines.append(
                f"q_low_{col} = df['{col}'].quantile(0.01)\n"
                f"q_high_{col} = df['{col}'].quantile(0.99)\n"
                f"df['{col}'] = df['{col}'].clip(lower=q_low_{col}, upper=q_high_{col})"
            )
            script_lines.append("")
        script_lines.append("")

    # ---- PII autofix ----
    pii_cols = pii.get("pii_columns", []) or []
    if pii_cols:
        col_names = [c["column"] for c in pii_cols if c.get("column")]
        if col_names:
            steps.append(
                f"Mask or hash PII columns so that raw values are not stored in the data lake: {', '.join(col_names)}."
            )
            script_lines.append("# --- PII handling ---")
            script_lines.append("# Example: simple masking of PII columns.")
            for col in col_names:
                script_lines.append(
                    f"# Mask column '{col}' – replace values with '[REDACTED]' or a hash."
                )
                script_lines.append(
                    f"df['{col}'] = '[REDACTED]'  # or apply a hashing function"
                )
                script_lines.append("")
            script_lines.append("")

    # ---- Drift autofix (comments only) ----
    if summary.get("has_drift", False):
        drift_cols = [c for c in drift.get("columns", []) or [] if c.get("drift")]
        if drift_cols:
            names = ", ".join(c.get("column", "unknown") for c in drift_cols)
            steps.append(
                f"Investigate drift in upstream data for: {names}. Validate source systems or retrain models consuming this data."
            )
            script_lines.append("# --- Drift investigation (manual) ---")
            script_lines.append(
                f"# Drift detected in the following columns: {names}."
            )
            script_lines.append(
                "# Investigate upstream changes, feature engineering, or retrain downstream models."
            )
            script_lines.append("")

    # ---- Final save ----
    script_lines.append("# TODO: update output path")
    script_lines.append('df.to_csv("your_clean_output.csv", index=False)')
    script_lines.append("")

    if not steps:
        steps.append(
            "No strong autofix actions were generated; data quality looks acceptable. You can still use this script as a starting template."
        )

    script = "\n".join(script_lines)
    return {
        "steps": steps,
        "script": script,
    }
