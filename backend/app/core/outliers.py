# app/core/outliers.py
from typing import Any, Dict, List

import numpy as np
import pandas as pd


def detect_outliers(df: pd.DataFrame, z_thresh: float = 3.0) -> Dict[str, Any]:
    """
    Simple z-score based outlier detection for numeric columns.
    """
    numeric_df = df.select_dtypes(include=["number"])
    results: List[Dict[str, Any]] = []
    total_outliers = 0
    total_values = 0

    for col in numeric_df.columns:
        col_data = numeric_df[col].dropna()
        if col_data.empty:
            continue

        mean = col_data.mean()
        std = col_data.std(ddof=0)

        if std == 0 or np.isnan(std):
            outlier_count = 0
        else:
            z_scores = (col_data - mean) / std
            outlier_count = int((np.abs(z_scores) > z_thresh).sum())

        value_count = int(col_data.shape[0])
        total_outliers += outlier_count
        total_values += value_count

        ratio = outlier_count / value_count if value_count > 0 else 0.0
        if ratio == 0:
            severity = "none"
        elif ratio < 0.01:
            severity = "low"
        elif ratio < 0.05:
            severity = "medium"
        else:
            severity = "high"

        results.append(
            {
                "column": col,
                "mean": float(mean),
                "std": float(std) if not np.isnan(std) else None,
                "outlier_count": outlier_count,
                "value_count": value_count,
                "outlier_ratio": ratio,
                "severity": severity,
            }
        )

    overall_ratio = total_outliers / total_values if total_values > 0 else 0.0

    return {
        "columns": results,
        "total_outliers": total_outliers,
        "total_numeric_values": total_values,
        "overall_outlier_ratio": overall_ratio,
    }
