# app/core/drift.py
from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

import json
import math

import numpy as np
import pandas as pd

from app.utils.io import get_baselines_dir


def _get_baseline_path(dataset_name: str) -> Path:
    """
    Return the path to the baseline file for a given dataset.
    """
    baselines_dir = get_baselines_dir()
    baselines_dir.mkdir(parents=True, exist_ok=True)
    return baselines_dir / f"{dataset_name}.json"


def _is_numeric_series(series: pd.Series) -> bool:
    return pd.api.types.is_numeric_dtype(series)


def _build_numeric_baseline(df: pd.DataFrame, n_bins: int = 5) -> Dict[str, Any]:
    """
    Build a baseline profile for numeric columns:
      - mean, std
      - histogram bin edges
      - baseline bin percentages (for PSI computation later)
    """
    numeric_cols = [c for c in df.columns if _is_numeric_series(df[c])]
    columns_profile: Dict[str, Any] = {}

    for col in numeric_cols:
        series = df[col].dropna()
        if series.empty:
            continue

        values = series.to_numpy(dtype=float)
        col_mean = float(values.mean())
        col_std = float(values.std(ddof=0)) if values.size > 1 else 0.0

        # If all values are identical, create a tiny range for bins
        v_min = float(values.min())
        v_max = float(values.max())
        if v_min == v_max:
            v_min -= 0.5
            v_max += 0.5

        # Equal-width bins
        bin_edges = np.linspace(v_min, v_max, n_bins + 1)
        hist_counts, _ = np.histogram(values, bins=bin_edges)
        total = hist_counts.sum()
        if total == 0:
            percents = [0.0] * n_bins
        else:
            percents = [float(c) / float(total) for c in hist_counts]

        columns_profile[col] = {
            "mean": col_mean,
            "std": col_std,
            "value_count": int(values.size),
            "bins": [float(x) for x in bin_edges.tolist()],
            "percents": [float(p) for p in percents],
        }

    return columns_profile


def _compute_psi(
    baseline_percents: List[float],
    current_percents: List[float],
    eps: float = 1e-6,
) -> float:
    """
    Compute Population Stability Index (PSI) between two distributions
    represented as bin percentages.

    PSI = sum( (p - q) * ln(p / q) ), over bins
    where p = current, q = baseline.

    We smooth zeros with eps to avoid log(0).
    """
    psi = 0.0
    for p, q in zip(current_percents, baseline_percents):
        # Smooth values to avoid division by zero or log(0)
        p_s = max(p, eps)
        q_s = max(q, eps)
        psi += (p_s - q_s) * math.log(p_s / q_s)
    return float(psi)


def _psi_severity(psi: float) -> str:
    """
    Simple rule-of-thumb severity categorization:
      - < 0.10 → 'none'
      - 0.10–0.25 → 'moderate'
      - > 0.25 → 'severe'
    """
    if psi < 0.10:
        return "none"
    elif psi < 0.25:
        return "moderate"
    else:
        return "severe"


def _load_baseline(dataset_name: str) -> Dict[str, Any] | None:
    """
    Load existing baseline JSON for a dataset, if present.
    """
    path = _get_baseline_path(dataset_name)
    if not path.exists():
        return None
    try:
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        # If baseline is corrupted, ignore it and recreate
        return None


def _save_baseline(dataset_name: str, baseline: Dict[str, Any]) -> None:
    """
    Persist baseline JSON to disk.
    """
    path = _get_baseline_path(dataset_name)
    path.write_text(json.dumps(baseline, ensure_ascii=False, indent=2), encoding="utf-8")


def analyze_drift(dataset_name: str, df: pd.DataFrame) -> Dict[str, Any]:
    """
    Analyze drift for numeric columns using a PSI-lite approach.

    First run:
      - Create a baseline file under baselines/<dataset_name>.json
      - Return { baseline_created: True, has_drift: False, columns: [] }

    Subsequent runs:
      - Load baseline
      - For overlapping numeric columns:
          - Compare mean
          - Compute PSI using baseline bins vs current distribution
          - Mark drift if PSI > 0.25
      - Return:
          {
            baseline_created: False,
            has_drift: bool,
            columns: [
              {
                column: str,
                baseline_mean: float,
                current_mean: float,
                relative_change: float | None,
                psi: float,
                psi_severity: 'none'|'moderate'|'severe',
                drift: bool
              },
              ...
            ]
          }
    """
    # Try to load existing baseline
    baseline = _load_baseline(dataset_name)

    # If no baseline → create one and return marker
    if baseline is None:
        baseline_columns = _build_numeric_baseline(df)
        baseline = {
            "dataset_name": dataset_name,
            "created_at": datetime.utcnow().isoformat() + "Z",
            "columns": baseline_columns,
        }
        _save_baseline(dataset_name, baseline)
        return {
            "baseline_created": True,
            "has_drift": False,
            "columns": [],
        }

    # Otherwise, compute drift vs baseline
    baseline_cols: Dict[str, Any] = baseline.get("columns", {})
    numeric_cols = [c for c in df.columns if _is_numeric_series(df[c])]

    drift_columns: List[Dict[str, Any]] = []

    for col in numeric_cols:
        if col not in baseline_cols:
            # No baseline for this column → cannot compute PSI, treat as no drift
            series = df[col].dropna()
            current_mean = float(series.mean()) if not series.empty else 0.0
            drift_columns.append(
                {
                    "column": col,
                    "baseline_mean": None,
                    "current_mean": current_mean,
                    "relative_change": None,
                    "psi": None,
                    "psi_severity": "none",
                    "drift": False,
                }
            )
            continue

        base_info = baseline_cols[col]
        base_mean = float(base_info.get("mean", 0.0))
        base_bins = base_info.get("bins", [])
        base_percents = base_info.get("percents", [])

        series = df[col].dropna()
        if series.empty or not base_bins or not base_percents:
            drift_columns.append(
                {
                    "column": col,
                    "baseline_mean": base_mean,
                    "current_mean": None,
                    "relative_change": None,
                    "psi": None,
                    "psi_severity": "none",
                    "drift": False,
                }
            )
            continue

        values = series.to_numpy(dtype=float)
        current_mean = float(values.mean())

        # Use the same bin edges as baseline
        bin_edges = np.array(base_bins, dtype=float)
        hist_counts, _ = np.histogram(values, bins=bin_edges)
        total = hist_counts.sum()
        if total == 0:
            current_percents = [0.0] * (len(bin_edges) - 1)
        else:
            current_percents = [float(c) / float(total) for c in hist_counts]

        # Ensure same length as baseline percents
        if len(current_percents) != len(base_percents):
            # Fallback: no PSI if shape mismatch
            psi_value = None
            psi_sev = "none"
            drift_flag = False
        else:
            psi_value = _compute_psi(base_percents, current_percents)
            psi_sev = _psi_severity(psi_value)
            drift_flag = psi_value > 0.25

        if base_mean != 0:
            rel_change = (current_mean - base_mean) / base_mean
        else:
            rel_change = None

        drift_columns.append(
            {
                "column": col,
                "baseline_mean": base_mean,
                "current_mean": current_mean,
                "relative_change": rel_change,
                "psi": psi_value,
                "psi_severity": psi_sev,
                "drift": drift_flag,
            }
        )

    has_drift = any(col_info.get("drift") for col_info in drift_columns)

    return {
        "baseline_created": False,
        "has_drift": has_drift,
        "columns": drift_columns,
    }
