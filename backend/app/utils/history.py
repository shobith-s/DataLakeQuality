# app/utils/history.py
from pathlib import Path
from typing import Any, Dict, List
import json
from datetime import datetime

from app.utils.io import get_baselines_dir


def get_history_root() -> Path:
    """
    History root directory. We base it next to baselines/, e.g.:

      data/
        baselines/
        history/

    so we reuse the same root as your drift baselines.
    """
    base_dir = get_baselines_dir().parent
    history_dir = base_dir / "history"
    history_dir.mkdir(parents=True, exist_ok=True)
    return history_dir


def save_history_run(dataset_name: str, report: Dict[str, Any]) -> Path:
    """
    Persist a full quality report for a dataset under:

      history/<dataset_name>/run-<timestamp>.json
    """
    root = get_history_root()
    ds_dir = root / dataset_name
    ds_dir.mkdir(parents=True, exist_ok=True)

    ts = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    path = ds_dir / f"run-{ts}.json"

    path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return path


def list_history_runs(dataset_name: str, limit: int = 20) -> List[Dict[str, Any]]:
    """
    Return up to `limit` recent runs for a dataset, as lightweight
    summary dicts suitable for charts:

      [
        {
          "dataset_name": str,
          "generated_at": str | None,
          "quality_score": float,
          "missing_ratio": float,
          "duplicate_ratio": float,
          "overall_outlier_ratio": float,
          "has_drift": bool,
        },
        ...
      ]

    Oldest runs are returned first in the list (chronological).
    """
    root = get_history_root()
    ds_dir = root / dataset_name
    if not ds_dir.exists():
        return []

    # Sort newest first by filename (run-YYYYMMDDT...Z.json)
    files = sorted(ds_dir.glob("run-*.json"), key=lambda p: p.name, reverse=True)

    entries: List[Dict[str, Any]] = []
    for path in files[:limit]:
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            # Skip corrupted entries
            continue

        summary = raw.get("summary", {}) or {}
        entries.append(
            {
                "dataset_name": raw.get("dataset_name", dataset_name),
                "generated_at": raw.get("generated_at"),
                "quality_score": float(raw.get("quality_score", 0.0)),
                "missing_ratio": float(summary.get("missing_ratio", 0.0)),
                "duplicate_ratio": float(summary.get("duplicate_ratio", 0.0)),
                "overall_outlier_ratio": float(
                    summary.get("overall_outlier_ratio", 0.0)
                ),
                "has_drift": bool(summary.get("has_drift", False)),
            }
        )

    # Return in chronological order (oldest first)
    return list(reversed(entries))
