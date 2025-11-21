# app/core/pii.py
import re
from typing import Any, Dict, List

import pandas as pd

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"\b(\+?\d[\d\s\-]{7,}\d)\b")
ID_RE = re.compile(r"\b\d{10,16}\b")  # crude long-number ID pattern


def detect_pii(df: pd.DataFrame, sample_size: int = 200) -> Dict[str, Any]:
    """
    Scan object-like columns for simple PII patterns.
    """
    pii_columns: List[Dict[str, Any]] = []

    for col in df.columns:
        if not pd.api.types.is_object_dtype(df[col]):
            continue

        series = df[col].dropna().astype(str)
        if series.empty:
            continue

        # sample to stay fast
        sample = series.sample(min(sample_size, len(series)), random_state=42)

        has_email = False
        has_phone = False
        has_id = False

        for value in sample:
            if EMAIL_RE.search(value):
                has_email = True
            if PHONE_RE.search(value):
                has_phone = True
            if ID_RE.search(value):
                has_id = True

            if has_email and has_phone and has_id:
                break

        detected_types = []
        if has_email:
            detected_types.append("email")
        if has_phone:
            detected_types.append("phone")
        if has_id:
            detected_types.append("id_number")

        if detected_types:
            pii_columns.append(
                {
                    "column": col,
                    "detected_types": detected_types,
                }
            )

    return {
        "pii_columns": pii_columns,
        "pii_column_count": len(pii_columns),
        "has_pii": len(pii_columns) > 0,
    }
