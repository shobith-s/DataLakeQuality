# app/core/quality_gate.py
from datetime import datetime
from typing import Any, Dict
from app.core.explain import build_explanations
from app.core.autofix import build_recommendations

import pandas as pd

from app.core.contracts import load_contract, validate_contract
from app.core.drift import analyze_drift
from app.core.outliers import detect_outliers
from app.core.pii import detect_pii
from app.core.profiling import profile_dataset
from app.core.scoring import compute_quality_score
from app.utils.io import load_csv


def run_quality_gate(dataset_name: str, csv_path) -> Dict[str, Any]:
    """
    High-level orchestrator: run all checks and produce a consolidated report dict.
    """
    # Normalize path to str for loader
    if not isinstance(csv_path, str):
        path_str = str(csv_path)
    else:
        path_str = csv_path

    df: pd.DataFrame = load_csv(path_str)

    # 1) Profiling: central place for basic stats
    profile = profile_dataset(df)
    summary = profile["summary"]
    basic_profile = profile["basic_profile"]

    # Extract key values used by other checks / scoring
    n_rows = summary["row_count"]
    n_cols = summary["column_count"]
    missing_ratio = summary["missing_ratio"]
    duplicate_ratio = summary["duplicate_ratio"]
    # Frontend already expects this field inside basic_profile
    missing_by_column = basic_profile["missing_by_column"]

    # 2) Contract checks
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
        contract_violations = 0
    else:
        contract_result = validate_contract(df, contract_obj)
        contract_violations = (
            len(contract_result["required_columns"]["missing"])
            + len(contract_result["type_mismatches"])
            + len(contract_result["unique_violations"])
        )

    # 3) PII
    pii_result = detect_pii(df)
    pii_column_count = pii_result.get("pii_column_count", 0)

    # 4) Outliers
    outliers_result = detect_outliers(df)
    overall_outlier_ratio = outliers_result.get("overall_outlier_ratio", 0.0)

    # 5) Drift
    drift_result = analyze_drift(dataset_name, df)
    has_drift = bool(drift_result.get("has_drift", False))

    # 6) Score
    score_obj = compute_quality_score(
        missing_ratio=missing_ratio,
        duplicate_ratio=duplicate_ratio,
        contract_violations=contract_violations,
        pii_column_count=pii_column_count,
        overall_outlier_ratio=overall_outlier_ratio,
        has_drift=has_drift,
    )

    # Merge profiling summary with quality-specific extra fields
    # (so frontend summary remains compatible)
    summary_extended = {
        **summary,
        "pii_column_count": pii_column_count,
        "contract_violations": contract_violations,
        "overall_outlier_ratio": overall_outlier_ratio,
        "has_drift": has_drift,
    }
        # 7) Explanations & recommendations
    explanations = build_explanations(
        summary_extended,
        contract_result,
        pii_result,
        outliers_result,
        drift_result,
    )

    recommendations = build_recommendations(
        summary_extended,
        basic_profile,
        contract_result,
        pii_result,
        outliers_result,
        drift_result,
    )


    report: Dict[str, Any] = {
        "dataset_name": dataset_name,
        "quality_score": score_obj["score"],
        "quality_label": score_obj["label"],
        "status": score_obj["label"],
        "summary": summary_extended,
        "basic_profile": basic_profile,
        "contract": contract_result,
        "pii": pii_result,
        "outliers": outliers_result,
        "drift": drift_result,
        "explanations": explanations,          # NEW
        "recommendations": recommendations,    # NEW
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }


    return report
