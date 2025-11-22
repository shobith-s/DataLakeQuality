# backend/app/core/schema.py

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Mapping


def _backend_root() -> Path:
    """
    Resolve backend root, assuming this file is at:
      backend/app/core/schema.py
    """
    return Path(__file__).resolve().parents[3]


def _baselines_root() -> Path:
    root = _backend_root() / "baselines"
    root.mkdir(parents=True, exist_ok=True)
    return root


def _schema_path(dataset_name: str) -> Path:
    safe = dataset_name.replace("/", "_").replace("\\", "_")
    return _baselines_root() / f"schema_{safe}.json"


def _load_json(path: Path) -> Dict[str, Any]:
    try:
        text = path.read_text(encoding="utf-8")
        return json.loads(text)
    except Exception:
        return {}


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")


# ---------------------------------------------------------------------------
# Schema extraction from profile + PII result
# ---------------------------------------------------------------------------

def _extract_current_schema(profile: Mapping[str, Any], pii_result: Mapping[str, Any]) -> Dict[str, Any]:
    """
    Build a simple logical schema representation from the profiling + PII result.

    Shape:
      {
        "column_name": {
          "dtype": "integer" | "string" | ...,
          "has_pii": bool,
          "pii_types": ["email", "phone", ...]
        },
        ...
      }
    """
    basic = profile.get("basic_profile") or {}
    inferred_types = basic.get("inferred_types") or {}
    column_stats = basic.get("column_stats") or {}

    # base schema from profiling
    schema: Dict[str, Dict[str, Any]] = {}
    column_names = set(inferred_types.keys()) | set(column_stats.keys())

    for col in column_names:
        stats = column_stats.get(col) or {}
        dtype = inferred_types.get(col) or stats.get("inferred_type") or "unknown"
        schema[col] = {
            "dtype": str(dtype),
            "has_pii": False,
            "pii_types": [],
        }

    # enrich with PII detection
    pii_cols = pii_result.get("pii_columns") or []
    for item in pii_cols:
        col = item.get("column")
        if not col:
            continue
        detected = item.get("detected_types") or []
        if col not in schema:
            schema[col] = {
                "dtype": "unknown",
                "has_pii": True,
                "pii_types": list(detected),
            }
        else:
            schema[col]["has_pii"] = True
            schema[col]["pii_types"] = list(detected)

    return schema


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def load_schema_baseline(dataset_name: str) -> Dict[str, Any]:
    """
    Load schema baseline for a dataset. Returns {} if none exists.
    """
    path = _schema_path(dataset_name)
    if not path.exists():
        return {}
    return _load_json(path)


def save_schema_baseline(dataset_name: str, schema: Mapping[str, Any]) -> None:
    """
    Save schema baseline for a dataset.
    """
    path = _schema_path(dataset_name)
    _write_json(path, schema)


def detect_schema_changes(
    dataset_name: str,
    profile: Mapping[str, Any],
    pii_result: Mapping[str, Any],
) -> Dict[str, Any]:
    """
    Compare current logical schema to baseline and return a structured diff.

    Returns:
      {
        "status": "baseline_created" | "no_change" | "changed",
        "added_columns": [...],
        "removed_columns": [...],
        "type_changes": [
          {"column": "...", "before": "int", "after": "string"},
          ...
        ],
        "pii_changes": [
          {
            "column": "...",
            "before": {"has_pii": false, "pii_types": []},
            "after": {"has_pii": true, "pii_types": ["email"]}
          },
          ...
        ],
        "is_breaking": bool
      }
    """
    current_schema = _extract_current_schema(profile, pii_result)
    baseline = load_schema_baseline(dataset_name)

    # First run: create baseline and exit
    if not baseline:
        save_schema_baseline(dataset_name, current_schema)
        return {
            "status": "baseline_created",
            "added_columns": [],
            "removed_columns": [],
            "type_changes": [],
            "pii_changes": [],
            "is_breaking": False,
        }

    added: List[str] = sorted(set(current_schema.keys()) - set(baseline.keys()))
    removed: List[str] = sorted(set(baseline.keys()) - set(current_schema.keys()))

    type_changes: List[Dict[str, Any]] = []
    pii_changes: List[Dict[str, Any]] = []

    shared_cols = set(current_schema.keys()) & set(baseline.keys())
    for col in sorted(shared_cols):
        before = baseline.get(col) or {}
        after = current_schema.get(col) or {}

        before_dtype = before.get("dtype")
        after_dtype = after.get("dtype")

        if before_dtype != after_dtype:
            type_changes.append(
                {
                    "column": col,
                    "before": before_dtype,
                    "after": after_dtype,
                }
            )

        before_pii = {
            "has_pii": bool(before.get("has_pii")),
            "pii_types": sorted(set(before.get("pii_types") or [])),
        }
        after_pii = {
            "has_pii": bool(after.get("has_pii")),
            "pii_types": sorted(set(after.get("pii_types") or [])),
        }

        if (
            before_pii["has_pii"] != after_pii["has_pii"]
            or before_pii["pii_types"] != after_pii["pii_types"]
        ):
            pii_changes.append(
                {
                    "column": col,
                    "before": before_pii,
                    "after": after_pii,
                }
            )

    if not added and not removed and not type_changes and not pii_changes:
        return {
            "status": "no_change",
            "added_columns": [],
            "removed_columns": [],
            "type_changes": [],
            "pii_changes": [],
            "is_breaking": False,
        }

    # Breaking if: removed columns, type changes, or new PII
    is_breaking = bool(removed or type_changes)
    for change in pii_changes:
        b = change.get("before") or {}
        a = change.get("after") or {}
        if not b.get("has_pii") and a.get("has_pii"):
            is_breaking = True
            break

    return {
        "status": "changed",
        "added_columns": added,
        "removed_columns": removed,
        "type_changes": type_changes,
        "pii_changes": pii_changes,
        "is_breaking": is_breaking,
    }
