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

    Contract structure (example):

    dataset_name: customers
    required_columns:
      - customer_id
      - email
      - signup_date
    column_types:
      customer_id: integer
      email: string
      signup_date: date
    unique_keys:
      - customer_id
    """
    required_columns: List[str] = contract.get("required_columns", [])
    column_types: Dict[str, str] = contract.get("column_types", {})
    unique_keys: List[str] = contract.get("unique_keys", [])

    existing_cols = set(df.columns)

    # Required columns
    missing_required = [c for c in required_columns if c not in existing_cols]
    present_required = [c for c in required_columns if c in existing_cols]

    # Type checks (simple, based on infer_simple_type)
    type_mismatches: List[Dict[str, Any]] = []
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
    unique_violations: List[Dict[str, Any]] = []
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


# -----------------------------
# Auto-contract generation
# -----------------------------


def suggest_contract_from_df(dataset_name: str, df: pd.DataFrame) -> Dict[str, Any]:
    """
    Suggest a simple contract based on the given dataframe.
    - required_columns: columns with less than 50% missing values
    - column_types: inferred using infer_simple_type
    - unique_keys: columns that appear to be unique identifiers (at most 2)
    """
    n_rows = len(df)

    # Required columns: columns with < 50% missing values
    required_columns: List[str] = []
    for col in df.columns:
        series = df[col]
        missing_ratio = series.isna().mean() if n_rows > 0 else 0.0
        if missing_ratio < 0.5:
            required_columns.append(col)

    # Column types
    column_types: Dict[str, str] = {
        col: infer_simple_type(df[col]) for col in df.columns
    }

    # Unique keys: columns where all non-null values are unique
    unique_keys: List[str] = []
    for col in df.columns:
        series = df[col].dropna()
        if n_rows == 0 or series.empty:
            continue
        if series.nunique(dropna=True) == n_rows:
            unique_keys.append(col)
            if len(unique_keys) >= 2:
                # Don't overdo it; at most two candidate keys
                break

    contract = {
        "dataset_name": dataset_name,
        "required_columns": required_columns,
        "column_types": column_types,
        "unique_keys": unique_keys,
    }
    return contract


def persist_contract_suggestion(
    contract: Dict[str, Any], overwrite: bool = False
) -> Dict[str, Any]:
    """
    Save the suggested contract into contracts/<dataset>.yaml.

    Returns:
      {
        "saved": bool,
        "path": str,
        "contract_yaml": str,
        "note": str,
      }
    """
    dataset_name = contract.get("dataset_name", "dataset")
    contracts_dir = get_contracts_dir()
    path: Path = contracts_dir / f"{dataset_name}.yaml"

    # Make sure directory exists
    contracts_dir.mkdir(parents=True, exist_ok=True)

    if path.exists() and not overwrite:
        existing_yaml = path.read_text(encoding="utf-8")
        return {
            "saved": False,
            "path": str(path),
            "contract_yaml": existing_yaml,
            "note": "Contract file already exists; returning existing contract without overwriting.",
        }

    yaml_str = yaml.safe_dump(contract, sort_keys=False)
    path.write_text(yaml_str, encoding="utf-8")

    return {
        "saved": True,
        "path": str(path),
        "contract_yaml": yaml_str,
        "note": "Contract file created/overwritten on disk.",
    }
