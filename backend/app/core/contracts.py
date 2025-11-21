# app/core/contracts.py
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd
import yaml

from app.utils.io import get_contracts_dir, infer_simple_type


def load_contract(dataset_name: str) -> Optional[Dict[str, Any]]:
    """
    Load YAML contract for a dataset, e.g. contracts/customers.yaml.
    Returns None if not found.
    """
    contracts_dir = get_contracts_dir()
    path = contracts_dir / f"{dataset_name}.yaml"
    if not path.exists():
        return None

    with path.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def validate_contract(df: pd.DataFrame, contract: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate dataframe against a simple contract schema.
    """
    required_columns: List[str] = contract.get("required_columns", [])
    column_types: Dict[str, str] = contract.get("column_types", {})
    unique_keys: List[str] = contract.get("unique_keys", [])

    existing_cols = set(df.columns)

    # Required columns
    missing_required = [c for c in required_columns if c not in existing_cols]
    present_required = [c for c in required_columns if c in existing_cols]

    # Type checks (very loose)
    type_mismatches = []
    for col, expected_type in column_types.items():
        if col not in df.columns:
            continue
        actual_type = infer_simple_type(df[col])
        if expected_type != actual_type:
            type_mismatches.append(
                {
                    "column": col,
                    "expected": expected_type,
                    "actual": actual_type,
                }
            )

    # Uniqueness checks
    unique_violations = []
    for col in unique_keys:
        if col not in df.columns:
            continue
        dup_count = df[col].duplicated().sum()
        if dup_count > 0:
            unique_violations.append(
                {
                    "column": col,
                    "duplicate_count": int(dup_count),
                }
            )

    passed = (
        len(missing_required) == 0
        and len(type_mismatches) == 0
        and len(unique_violations) == 0
    )

    return {
        "contract_name": contract.get("dataset_name"),
        "required_columns": {
            "present": present_required,
            "missing": missing_required,
        },
        "type_mismatches": type_mismatches,
        "unique_violations": unique_violations,
        "passed": passed,
    }
