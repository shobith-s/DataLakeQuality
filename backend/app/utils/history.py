# backend/app/utils/history.py

from __future__ import annotations

import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping


# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

def _history_root() -> Path:
    """
    Resolve the root folder for history files.

    Layout (from backend/):
      backend/
        app/
          utils/history.py  <-- this file
        history/            <-- we store runs here
    """
    # .../backend/app/utils/history.py -> .../backend
    backend_root = Path(__file__).resolve().parents[3]
    history_dir = backend_root / "history"
    history_dir.mkdir(parents=True, exist_ok=True)
    return history_dir


def _dataset_dir(dataset_name: str) -> Path:
    safe = dataset_name.replace("/", "_").replace("\\", "_")
    root = _history_root()
    d = root / safe
    d.mkdir(parents=True, exist_ok=True)
    return d


# ---------------------------------------------------------------------------
# Low-level helpers
# ---------------------------------------------------------------------------

def _ensure_timestamp(run: Mapping[str, Any]) -> str:
    ts = run.get("timestamp")
    if isinstance(ts, str) and ts:
        return ts
    return datetime.utcnow().isoformat() + "Z"


def _ensure_run_id(run: Mapping[str, Any]) -> str:
    rid = run.get("run_id")
    if isinstance(rid, str) and rid:
        return rid
    return str(uuid.uuid4())


def _run_filename(timestamp: str, run_id: str) -> str:
    # make filename filesystem-safe
    safe_ts = (
        timestamp.replace(":", "")
        .replace(".", "-")
        .replace("Z", "")
        .replace("+", "")
    )
    safe_id = run_id.replace("/", "_").replace("\\", "_")
    return f"run-{safe_ts}-{safe_id}.json"


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")


def _load_json(path: Path) -> Dict[str, Any]:
    try:
        text = path.read_text(encoding="utf-8")
        return json.loads(text)
    except Exception:
        # Corrupt / unreadable file – skip it
        return {}


def _load_all_runs(dataset_name: str) -> List[Dict[str, Any]]:
    d = _dataset_dir(dataset_name)
    runs: List[Dict[str, Any]] = []
    for p in sorted(d.glob("run-*.json")):
        data = _load_json(p)
        if data:
            runs.append(data)
    return runs


def _make_points(runs: Iterable[Mapping[str, Any]]) -> List[Dict[str, Any]]:
    points: List[Dict[str, Any]] = []
    for r in runs:
        ts = _ensure_timestamp(r)
        point = {
            "timestamp": ts,
            "overall_score": r.get("overall_score"),
            "missing_ratio": r.get("missing_ratio"),
            "outlier_ratio": r.get("outlier_ratio"),
        }
        points.append(point)

    # sort by timestamp string for stable display
    points.sort(key=lambda x: x["timestamp"])
    return points


# ---------------------------------------------------------------------------
# Public API used by main.py
# ---------------------------------------------------------------------------

def save_run(dataset_name: str, report: Mapping[str, Any]) -> None:
    """
    Save a single run as JSON. Does NOT return a summary.
    """
    d = _dataset_dir(dataset_name)
    ts = _ensure_timestamp(report)
    rid = _ensure_run_id(report)

    payload = dict(report)
    payload["timestamp"] = ts
    payload["run_id"] = rid

    filename = _run_filename(ts, rid)
    _write_json(d / filename, payload)


def save_and_summarize_run(dataset_name: str, report: Mapping[str, Any]) -> Dict[str, Any]:
    """
    Save the current run and return a snapshot summary:

        {
          "points": [
            {
              "timestamp": "...",
              "overall_score": 95.3,
              "missing_ratio": 0.02,
              "outlier_ratio": 0.01
            },
            ...
          ]
        }
    """
    # Persist current run
    save_run(dataset_name, report)

    # Load all runs and build points
    runs = _load_all_runs(dataset_name)
    points = _make_points(runs)
    return {"points": points}


def save_run_and_summarize(dataset_name: str, report: Mapping[str, Any]) -> Dict[str, Any]:
    """
    Compatibility alias – some versions might expect this name.
    """
    return save_and_summarize_run(dataset_name, report)


def load_history(dataset_name: str) -> List[Dict[str, Any]]:
    """
    Return the full list of stored runs for a dataset.
    """
    return _load_all_runs(dataset_name)
