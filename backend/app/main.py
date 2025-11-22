# backend/app/main.py

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, Tuple

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.core import profiling, outliers, pii, drift, contracts, autofix
from app.core.alerts import build_alerts
from app.utils import io as io_utils, history as history_utils


app = FastAPI(
    title="DataLakeQ – Data Quality Firewall",
    version="0.1.0",
    description="Data observability engine: profiling, drift, PII, policy, AutoFix, alerts.",
)

# Adjust origins as needed for your frontend
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
# Helpers
# ---------------------------------------------------------------------------

def _load_dataframe(file: UploadFile) -> Tuple[Any, str]:
    """
    Centralized CSV loading.

    Uses app.utils.io to keep behavior consistent with the rest of the project.
    Returns a tuple of (df, dataset_name).
    """
    try:
        # If you already have a helper like io.read_csv_upload, adapt this call:
        df = io_utils.read_csv_upload(file)
    except AttributeError:
        # Fallback: some projects have `read_upload_to_dataframe`
        df = io_utils.read_upload_to_dataframe(file)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse CSV: {exc}",
        ) from exc

    # Derive dataset name from filename (without extension)
    raw_name = file.filename or "dataset"
    dataset_name = raw_name.rsplit(".", 1)[0]
    return df, dataset_name


def _build_full_report(df: Any, dataset_name: str) -> Dict[str, Any]:
    """
    Orchestrates all core engines (profiling, PII, drift, contracts, etc.)
    into a single report dict.

    NOTE:
    - This uses *generic* function names based on your handover.
    - If your actual core functions differ, just adapt these calls.
    """

    run_id = str(uuid.uuid4())
    timestamp = datetime.utcnow().isoformat() + "Z"

    # -------------------------
    # 1) Core profiling
    # -------------------------
    # Expected to return dict with keys like:
    #   overall_score, missing_ratio, outlier_ratio, columns, etc.
    profile = profiling.profile_dataframe(df, dataset_name=dataset_name)

    # -------------------------
    # 2) PII
    # -------------------------
    # Expected to enrich column metadata and/or return separate pii_result dict.
    try:
        pii_result = pii.detect_pii(df=df, profile=profile)
    except TypeError:
        # If your implementation only needs df:
        pii_result = pii.detect_pii(df)

    # -------------------------
    # 3) Outliers
    # -------------------------
    try:
        outlier_result = outliers.detect_outliers(df=df, profile=profile)
    except TypeError:
        outlier_result = outliers.detect_outliers(df)

    # -------------------------
    # 4) Drift / PSI
    # -------------------------
    # Should handle baseline storage internally (baselines/<dataset>.json, etc.)
    drift_result = drift.compute_drift(df=df, dataset_name=dataset_name)

    # -------------------------
    # 5) Contracts: suggestion + policy evaluation
    # -------------------------
    contract_suggestion = contracts.generate_contract_suggestion(
        df=df,
        dataset_name=dataset_name,
    )

    policy_result = contracts.evaluate_policy(
        profile=profile,
        drift_result=drift_result,
        pii_result=pii_result,
        outlier_result=outlier_result,
        contract_suggestion=contract_suggestion,
    )
    # Expected keys: policy_passed, policy_failures, maybe quality_threshold, etc.

    # -------------------------
    # 6) AutoFix (plan + script)
    # -------------------------
    autofix_plan, autofix_script = autofix.build_autofix(
        df=df,
        dataset_name=dataset_name,
        profile=profile,
        pii_result=pii_result,
        outlier_result=outlier_result,
    )

    # -------------------------
    # 7) History snapshot
    # -------------------------
    # Save this run and get a small trend summary for charts.
    report_base: Dict[str, Any] = {
        "dataset_name": dataset_name,
        "run_id": run_id,
        "timestamp": timestamp,
        # Merge core pieces. Later keys override earlier on conflicts.
        **profile,
        **pii_result,
        **outlier_result,
        **drift_result,
        "contract_suggestion": contract_suggestion,
        **policy_result,
        "autofix_plan": autofix_plan,
        "autofix_script": autofix_script,
    }

    history_snapshot = history_utils.save_and_summarize_run(
        dataset_name=dataset_name,
        report=report_base,
    )
    report_base["history_snapshot"] = history_snapshot

    # -------------------------
    # 8) Alerts (NEW)
    # -------------------------
    # This is the important line for the Alerts feature:
    report_base["alerts"] = build_alerts(report_base)

    return report_base


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
def health_check() -> Dict[str, str]:
    """
    Simple health endpoint for debugging and uptime checks.
    """
    return {"status": "ok", "service": "DataLakeQ"}


@app.post("/analyze")
async def analyze_dataset(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Main entry point: upload a CSV, get a full Data Quality report.

    Response includes:
    - Profiling summary
    - PII detection
    - Outliers
    - Drift / PSI
    - Contract suggestion & policy verdict
    - AutoFix plan & script preview
    - History snapshot
    - Alerts[]  <-- NEW
    """
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are supported.")

    df, dataset_name = _load_dataframe(file)
    report = _build_full_report(df=df, dataset_name=dataset_name)
    return report


@app.get("/history/{dataset_name}")
def get_history(dataset_name: str) -> Dict[str, Any]:
    """
    Returns the full history for a dataset (if you need a separate endpoint
    besides the small `history_snapshot` included in /analyze).
    """
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
    """
    Optional: if you store AutoFix scripts per run and want to download them
    independently of /analyze. If you already have a working endpoint for this,
    you can ignore or adapt this one.

    NOTE: In your earlier discussion, we agreed on Option A:
          normal 'Save As' download with .py extension.
    """
    from fastapi.responses import Response

    try:
        script_text = autofix.load_autofix_script(dataset_name, run_id)
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
