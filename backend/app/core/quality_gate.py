# app/core/quality_gate.py
from datetime import datetime
from typing import Any, Dict

import pandas as pd

from app.core.contracts import load_contract, validate_contract
from app.core.drift import analyze_drift
from app.core.outliers import detect_outliers
from app.core.pii import detect_pii
from app.core.scoring import compute_quality_score
from app.utils.io import load_csv


def run_quality_gate(dataset_name: str, csv_path) -> Dict[str, Any]:
    """
    High-level orchestrator: run all checks and produce a consolidated report dict.
    """
    if not isinstance(csv_path, str):
        path_str = str(csv_path)
    else:
        path_str = csv_path

    df: pd.DataFrame = load_csv(path_str)

    n_rows, n_cols = df.shape

    # Missing + duplicates
    total_cells = n_rows * n_cols if n_rows and n_cols else 1
    total_missing = int(df.isna().sum().sum())
    missing_ratio = total_missing / total_cells

    duplicate_rows = int(df.duplicated().sum())
    duplicate_ratio = duplicate_rows / n_rows if n_rows > 0 else 0.0

    # Column-level missing stats (for UI)
    missing_by_column = (
        df.isna().sum().astype(int).to_dict() if n_cols > 0 else {}
    )

    # Contract checks
    contract_obj = load_contract(dataset_name)
    if contract_obj is None:
        contract_result = {
            "contract_name": None,
            "required_columns": {"present": [], "missing": []},
            "type_mismatches": [],
            "unique_violations": [],
            "passed": False,
            "note": "No contract found for this dataset; treated as warning.",
        }
        contract_violations = 0  # we’ll penalize lightly via summary if needed
    else:
        contract_result = validate_contract(df, contract_obj)
        contract_violations = (
            len(contract_result["required_columns"]["missing"])
            + len(contract_result["type_mismatches"])
            + len(contract_result["unique_violations"])
        )

    # PII
    pii_result = detect_pii(df)
    pii_column_count = pii_result.get("pii_column_count", 0)

    # Outliers
    outliers_result = detect_outliers(df)
    overall_outlier_ratio = outliers_result.get("overall_outlier_ratio", 0.0)

    # Drift
    drift_result = analyze_drift(dataset_name, df)
    has_drift = bool(drift_result.get("has_drift", False))

    # Score
    score_obj = compute_quality_score(
        missing_ratio=missing_ratio,
        duplicate_ratio=duplicate_ratio,
        contract_violations=contract_violations,
        pii_column_count=pii_column_count,
        overall_outlier_ratio=overall_outlier_ratio,
        has_drift=has_drift,
    )

    summary = {
        "row_count": n_rows,
        "column_count": n_cols,
        "total_missing_cells": total_missing,
        "missing_ratio": missing_ratio,
        "duplicate_rows": duplicate_rows,
        "duplicate_ratio": duplicate_ratio,
        "pii_column_count": pii_column_count,
        "contract_violations": contract_violations,
        "overall_outlier_ratio": overall_outlier_ratio,
        "has_drift": has_drift,
    }

    report: Dict[str, Any] = {
        "dataset_name": dataset_name,
        "quality_score": score_obj["score"],
        "quality_label": score_obj["label"],
        "status": score_obj["label"],
        "summary": summary,
        "basic_profile": {
            "missing_by_column": missing_by_column,
        },
        "contract": contract_result,
        "pii": pii_result,
        "outliers": outliers_result,
        "drift": drift_result,
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }

    return report
