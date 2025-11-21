# app/core/profiling.py
from typing import Any, Dict

import pandas as pd

from app.utils.io import infer_simple_type


def profile_dataset(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Compute basic dataset-level and column-level profiling.

    Returns a dict with:
      - summary: high-level dataset stats
      - basic_profile: column-level info (missing, types, stats)
    """
    n_rows, n_cols = df.shape

    # Dataset-level missing / duplicate stats
    total_cells = max(n_rows * n_cols, 1)
    total_missing = int(df.isna().sum().sum())
    missing_ratio = total_missing / total_cells

    duplicate_rows = int(df.duplicated().sum())
    duplicate_ratio = duplicate_rows / n_rows if n_rows > 0 else 0.0

    # Column-level missing
    missing_by_column = (
        df.isna().sum().astype(int).to_dict() if n_cols > 0 else {}
    )

    # Inferred types + basic column stats
    inferred_types: Dict[str, str] = {}
    column_stats: Dict[str, Dict[str, Any]] = {}

    for col in df.columns:
        series = df[col]
        inferred = infer_simple_type(series)
        inferred_types[col] = inferred

        stats: Dict[str, Any] = {
            "inferred_type": inferred,
            "missing_count": int(series.isna().sum()),
            "unique_count": int(series.nunique(dropna=True)),
        }

        # Numeric stats
        if pd.api.types.is_numeric_dtype(series):
            col_non_na = series.dropna()
            if not col_non_na.empty:
                stats["min"] = float(col_non_na.min())
                stats["max"] = float(col_non_na.max())
                stats["mean"] = float(col_non_na.mean())
                stats["std"] = float(col_non_na.std(ddof=0))
        # You can add datetime / categorical specific stats later

        column_stats[col] = stats

    summary = {
        "row_count": n_rows,
        "column_count": n_cols,
        "total_missing_cells": total_missing,
        "missing_ratio": missing_ratio,
        "duplicate_rows": duplicate_rows,
        "duplicate_ratio": duplicate_ratio,
    }

    basic_profile = {
        "missing_by_column": missing_by_column,
        "inferred_types": inferred_types,
        "column_stats": column_stats,
    }

    return {
        "summary": summary,
        "basic_profile": basic_profile,
    }
