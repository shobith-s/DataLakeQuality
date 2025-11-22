# backend/app/main.py

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, Tuple, List

import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.core import profiling, outliers, pii, drift, contracts, autofix
from app.core.alerts import build_alerts
from app.utils import history as history_utils


app = FastAPI(
    title="DataLakeQ – Data Quality Firewall",
    version="0.1.0",
    description="Data observability engine: profiling, drift, PII, policy, AutoFix, alerts.",
)

# CORS – adjust origins to match your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helpers – IO
# ---------------------------------------------------------------------------

def _load_dataframe(file: UploadFile) -> Tuple[pd.DataFrame, str]:
    """
    Centralized CSV loading.
    """
    try:
        df = pd.read_csv(file.file)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse CSV: {exc}",
        ) from exc

    raw_name = file.filename or "dataset"
    dataset_name = raw_name.rsplit(".", 1)[0]
    return df, dataset_name


# ---------------------------------------------------------------------------
# Helpers – Adapters for core modules
# ---------------------------------------------------------------------------

def _run_profiling(df: Any, dataset_name: str) -> Dict[str, Any]:
    """
    Adapter for profiling module.
    """
    if hasattr(profiling, "profile_dataframe"):
        try:
            return profiling.profile_dataframe(df, dataset_name=dataset_name)  # type: ignore[no-any-return]
        except TypeError:
            return profiling.profile_dataframe(df)  # type: ignore[no-any-return]

    if hasattr(profiling, "profile_dataset"):
        return profiling.profile_dataset(df)  # type: ignore[no-any-return]

    raise HTTPException(
        status_code=500,
        detail=(
            "Profiling module misconfigured: expected a function "
            "`profile_dataframe` or `profile_dataset` in app.core.profiling."
        ),
    )


def _run_pii(df: Any, profile: Dict[str, Any]) -> Dict[str, Any]:
    if not hasattr(pii, "detect_pii"):
        return {}

    fn = pii.detect_pii  # type: ignore[attr-defined]

    for kwargs in (
        {"df": df, "profile": profile},
        {"df": df},
    ):
        try:
            return fn(**kwargs)  # type: ignore[no-any-return]
        except TypeError:
            continue

    try:
        return fn(df)  # type: ignore[no-any-return]
    except TypeError:
        return {}


def _run_outliers(df: Any, profile: Dict[str, Any]) -> Dict[str, Any]:
    if not hasattr(outliers, "detect_outliers"):
        return {}

    fn = outliers.detect_outliers  # type: ignore[attr-defined]

    for kwargs in (
        {"df": df, "profile": profile},
        {"df": df},
    ):
        try:
            return fn(**kwargs)  # type: ignore[no-any-return]
        except TypeError:
            continue

    try:
        return fn(df)  # type: ignore[no-any-return]
    except TypeError:
        return {}


def _run_drift(df: Any, dataset_name: str) -> Dict[str, Any]:
    candidates = ["compute_drift", "detect_drift", "compute_psi", "calculate_drift"]

    for name in candidates:
        if not hasattr(drift, name):
            continue

        fn = getattr(drift, name)

        for kwargs in (
            {"df": df, "dataset_name": dataset_name},
            {"df": df},
        ):
            try:
                return fn(**kwargs)  # type: ignore[no-any-return]
            except TypeError:
                continue

        try:
            return fn(df)  # type: ignore[no-any-return]
        except TypeError:
            continue

    return {}


def _run_contract_suggestion(df: Any, dataset_name: str) -> Dict[str, Any]:
    candidates = [
        "generate_contract_suggestion",
        "suggest_contracts",
        "suggest_contract",
    ]

    for name in candidates:
        if not hasattr(contracts, name):
            continue

        fn = getattr(contracts, name)

        for kwargs in (
            {"df": df, "dataset_name": dataset_name},
            {"df": df},
        ):
            try:
                return fn(**kwargs)  # type: ignore[no-any-return]
            except TypeError:
                continue

        try:
            return fn(df)  # type: ignore[no-any-return]
        except TypeError:
            continue

    return {}


def _run_policy_engine(
    profile: Dict[str, Any],
    drift_result: Dict[str, Any],
    pii_result: Dict[str, Any],
    outlier_result: Dict[str, Any],
    contract_suggestion: Dict[str, Any],
) -> Dict[str, Any]:
    candidates = ["evaluate_policy", "run_policy_engine"]

    for name in candidates:
        if not hasattr(contracts, name):
            continue

        fn = getattr(contracts, name)

        try:
            return fn(
                profile=profile,
                drift_result=drift_result,
                pii_result=pii_result,
                outlier_result=outlier_result,
                contract_suggestion=contract_suggestion,
            )  # type: ignore[no-any-return]
        except TypeError:
            try:
                return fn(
                    {
                        "profile": profile,
                        "drift_result": drift_result,
                        "pii_result": pii_result,
                        "outlier_result": outlier_result,
                        "contract_suggestion": contract_suggestion,
                    }
                )  # type: ignore[no-any-return]
            except TypeError:
                continue

    return {
        "policy_passed": True,
        "policy_failures": [],
    }


def _run_autofix(
    df: Any,
    dataset_name: str,
    profile: Dict[str, Any],
    pii_result: Dict[str, Any],
    outlier_result: Dict[str, Any],
) -> Tuple[Any, str]:
    candidates = ["build_autofix", "generate_autofix"]

    for name in candidates:
        if not hasattr(autofix, name):
            continue

        fn = getattr(autofix, name)

        try:
            return fn(
                df=df,
                dataset_name=dataset_name,
                profile=profile,
                pii_result=pii_result,
                outlier_result=outlier_result,
            )  # type: ignore[no-any-return]
        except TypeError:
            try:
                return fn(df=df, dataset_name=dataset_name)  # type: ignore[no-any-return]
            except TypeError:
                try:
                    return fn(df)  # type: ignore[no-any-return]
                except TypeError:
                    continue

    empty_plan: List[Any] = []
    return empty_plan, ""


def _run_history_snapshot(dataset_name: str, report: Dict[str, Any]) -> Dict[str, Any]:
    if hasattr(history_utils, "save_and_summarize_run"):
        try:
            snapshot = history_utils.save_and_summarize_run(
                dataset_name=dataset_name,
                report=report,
            )
            if isinstance(snapshot, dict):
                snapshot.setdefault("points", [])
                return snapshot
        except TypeError:
            pass

    if hasattr(history_utils, "save_run_and_summarize"):
        try:
            snapshot = history_utils.save_run_and_summarize(
                dataset_name=dataset_name,
                report=report,
            )
            if isinstance(snapshot, dict):
                snapshot.setdefault("points", [])
                return snapshot
        except TypeError:
            pass

    if hasattr(history_utils, "save_run"):
        try:
            history_utils.save_run(dataset_name, report)  # type: ignore[arg-type]
        except TypeError:
            try:
                history_utils.save_run(dataset_name=dataset_name, report=report)  # type: ignore[arg-type]
            except TypeError:
                pass

    return {"points": []}


# ---------------------------------------------------------------------------
# Metric normalization & score
# ---------------------------------------------------------------------------

def _normalize_metrics(report: Dict[str, Any]) -> None:
    """
    Ensure the report has standard keys:
    - missing_ratio
    - outlier_ratio
    - duplicate_ratio
    - overall_score
    """
    summary = report.get("summary") or {}

    def _safe_float(x: Any, default: float = 0.0) -> float:
        try:
            if x is None:
                return default
            return float(x)
        except Exception:
            return default

    # ----- missing_ratio -----
    missing_ratio = report.get("missing_ratio")
    if missing_ratio is None:
        missing_ratio = summary.get("missing_ratio")

    if missing_ratio is None:
        total_missing = summary.get("total_missing_cells")
        row_count = summary.get("row_count")
        col_count = summary.get("column_count")
        if total_missing is not None and row_count and col_count:
            try:
                missing_ratio = float(total_missing) / float(row_count * col_count)
            except Exception:
                missing_ratio = 0.0

    missing_ratio = _safe_float(missing_ratio, 0.0)
    report["missing_ratio"] = missing_ratio

    # ----- outlier_ratio -----
    outlier_ratio = report.get("outlier_ratio")
    if outlier_ratio is None:
        outlier_ratio = report.get("overall_outlier_ratio")

    if outlier_ratio is None:
        total_outliers = report.get("total_outliers")
        total_numeric_values = report.get("total_numeric_values")
        if total_outliers is not None and total_numeric_values:
            try:
                outlier_ratio = float(total_outliers) / float(total_numeric_values)
            except Exception:
                outlier_ratio = 0.0

    outlier_ratio = _safe_float(outlier_ratio, 0.0)
    report["outlier_ratio"] = outlier_ratio

    # ----- duplicate_ratio -----
    duplicate_ratio = report.get("duplicate_ratio")
    if duplicate_ratio is None:
        duplicate_ratio = summary.get("duplicate_ratio")

    if duplicate_ratio is None:
        duplicate_rows = summary.get("duplicate_rows")
        row_count = summary.get("row_count")
        if duplicate_rows is not None and row_count:
            try:
                duplicate_ratio = float(duplicate_rows) / float(row_count)
            except Exception:
                duplicate_ratio = 0.0

    duplicate_ratio = _safe_float(duplicate_ratio, 0.0)
    report["duplicate_ratio"] = duplicate_ratio

    # ----- overall_score -----
    score = report.get("overall_score")
    if score is None:
        # heuristic: missing + outliers heavier than duplicates
        penalty = (
            0.4 * missing_ratio +
            0.4 * outlier_ratio +
            0.2 * duplicate_ratio
        )
        raw_score = 100.0 * (1.0 - penalty)
        if raw_score < 0.0:
            raw_score = 0.0
        if raw_score > 100.0:
            raw_score = 100.0
        score = raw_score

    try:
        score = float(score)
    except Exception:
        score = 0.0

    report["overall_score"] = score


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------

def _build_full_report(df: Any, dataset_name: str) -> Dict[str, Any]:
    """
    Orchestrates all core engines (profiling, PII, drift, contracts, etc.)
    into a single report dict.
    """

    run_id = str(uuid.uuid4())
    timestamp = datetime.utcnow().isoformat() + "Z"

    # 1) Core profiling
    profile = _run_profiling(df, dataset_name=dataset_name)

    # 2) PII
    pii_result = _run_pii(df=df, profile=profile)

    # 3) Outliers
    outlier_result = _run_outliers(df=df, profile=profile)

    # 4) Drift / PSI
    drift_result = _run_drift(df=df, dataset_name=dataset_name)

    # 5) Contracts: suggestion + policy evaluation
    contract_suggestion = _run_contract_suggestion(df=df, dataset_name=dataset_name)
    policy_result = _run_policy_engine(
        profile=profile,
        drift_result=drift_result,
        pii_result=pii_result,
        outlier_result=outlier_result,
        contract_suggestion=contract_suggestion,
    )

    # 6) AutoFix (plan + script)
    autofix_plan, autofix_script = _run_autofix(
        df=df,
        dataset_name=dataset_name,
        profile=profile,
        pii_result=pii_result,
        outlier_result=outlier_result,
    )

    # 7) Assemble base report dict
    report_base: Dict[str, Any] = {
        "dataset_name": dataset_name,
        "run_id": run_id,
        "timestamp": timestamp,
        **profile,
        **pii_result,
        **outlier_result,
        **drift_result,
        "contract_suggestion": contract_suggestion,
        **policy_result,
        "autofix_plan": autofix_plan,
        "autofix_script": autofix_script,
    }

    # 8) Normalize key metrics + compute score
    _normalize_metrics(report_base)

    # 9) History snapshot
    history_snapshot = _run_history_snapshot(
        dataset_name=dataset_name,
        report=report_base,
    )
    report_base["history_snapshot"] = history_snapshot

    # 10) Alerts
    report_base["alerts"] = build_alerts(report_base)

    return report_base


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
def health_check() -> Dict[str, str]:
    return {"status": "ok", "service": "DataLakeQ"}


@app.post("/analyze")
async def analyze_dataset(file: UploadFile = File(...)) -> Dict[str, Any]:
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are supported.")

    df, dataset_name = _load_dataframe(file)
    report = _build_full_report(df=df, dataset_name=dataset_name)
    return report


@app.get("/history/{dataset_name}")
def get_history(dataset_name: str) -> Dict[str, Any]:
    try:
        history = history_utils.load_history(dataset_name)
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail=f"No history found for dataset '{dataset_name}'.",
        )

    return {"dataset_name": dataset_name, "history": history}


@app.get("/autofix/{dataset_name}/{run_id}")
def download_autofix_script(dataset_name: str, run_id: str):
    from fastapi.responses import Response

    if not hasattr(autofix, "load_autofix_script"):
        raise HTTPException(
            status_code=404,
            detail="AutoFix script loader not configured.",
        )

    try:
        script_text = autofix.load_autofix_script(dataset_name, run_id)  # type: ignore[attr-defined]
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="AutoFix script not found for this dataset/run.",
        )

    return Response(
        content=script_text,
        media_type="text/x-python",
        headers={
            "Content-Disposition": f'attachment; filename="autofix_{dataset_name}_{run_id}.py"'
        },
    )
