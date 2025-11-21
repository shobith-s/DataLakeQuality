# app/core/drift.py
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

import pandas as pd

from app.utils.io import get_baselines_dir


def _baseline_path(dataset_name: str) -> Path:
    return get_baselines_dir() / f"{dataset_name}.json"


def build_numeric_baseline(df: pd.DataFrame) -> Dict[str, Any]:
    numeric_df = df.select_dtypes(include=["number"])
    numeric_baseline: Dict[str, Dict[str, float]] = {}

    for col in numeric_df.columns:
        col_data = numeric_df[col].dropna()
        if col_data.empty:
            continue
        numeric_baseline[col] = {
            "mean": float(col_data.mean()),
            "std": float(col_data.std(ddof=0)),
        }

    return {
        "numeric": numeric_baseline,
        "created_at": datetime.utcnow().isoformat() + "Z",
    }


def analyze_drift(dataset_name: str, df: pd.DataFrame) -> Dict[str, Any]:
    """
    If baseline doesn't exist: create it, mark baseline_created=True.
    If baseline exists: compare means and flag drift if deviation > threshold.
    """
    path = _baseline_path(dataset_name)
    numeric_df = df.select_dtypes(include=["number"])

    if not path.exists():
        baseline = build_numeric_baseline(df)
        path.write_text(json.dumps(baseline, indent=2), encoding="utf-8")
        return {
            "baseline_created": True,
            "has_drift": False,
            "columns": [],
            "note": "Baseline created for this dataset; drift will be evaluated on subsequent runs.",
        }

    baseline = json.loads(path.read_text(encoding="utf-8"))
    baseline_numeric = baseline.get("numeric", {})

    drift_columns: List[Dict[str, Any]] = []
    has_drift = False

    for col in numeric_df.columns:
        col_data = numeric_df[col].dropna()
        if col_data.empty:
            continue

        curr_mean = float(col_data.mean())
        base = baseline_numeric.get(col)
        if not base:
            # new column: treat as potential drift but not severe
            drift_columns.append(
                {
                    "column": col,
                    "baseline_mean": None,
                    "current_mean": curr_mean,
                    "relative_change": None,
                    "drift": True,
                    "reason": "New numeric column not present in baseline",
                }
            )
            has_drift = True
            continue

        base_mean = base.get("mean", 0.0)
        if base_mean == 0:
            rel_change = None
            drift_flag = abs(curr_mean - base_mean) > 1e-6
        else:
            rel_change = abs(curr_mean - base_mean) / abs(base_mean)
            drift_flag = rel_change > 0.3  # 30% change threshold

        if drift_flag:
            has_drift = True

        drift_columns.append(
            {
                "column": col,
                "baseline_mean": base_mean,
                "current_mean": curr_mean,
                "relative_change": rel_change,
                "drift": drift_flag,
            }
        )

    return {
        "baseline_created": False,
        "has_drift": has_drift,
        "columns": drift_columns,
    }
