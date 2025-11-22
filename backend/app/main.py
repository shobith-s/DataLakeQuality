from __future__ import annotations

import io
import json
from datetime import datetime
from typing import Any, Dict, Tuple
from uuid import uuid4

import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from app.core import (
    profiling,
    outliers,
    pii,
    drift,
    autofix,
    alerts,
    history as history_core,
)
from app.core import insights as insights_core
from app.models.report import (
    DataQualityReport,
    Summary,
    BasicProfile,
    HistorySnapshot,
)
from app.utils import io as io_utils


app = FastAPI(title="DataLakeQ – Data Quality Firewall")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # adjust in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helper models
# ---------------------------------------------------------------------------


class AutofixCleanOptions(BaseModel):
    """
    Options for one-click cleaning. For hackathon purposes we use a small,
    opinionated set of defaults but expose the hook for future extension.
    """

    fill_numeric_missing: bool = True
    fill_categorical_missing: bool = True
    clip_outliers: bool = True
    parse_dates: bool = True
    mask_pii: bool = True


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------


def _load_dataframe(upload: UploadFile) -> Tuple[pd.DataFrame, str]:
    """
    Centralised CSV loader.

    Tries to use app.utils.io.read_upload_to_dataframe if present,
    otherwise falls back to a simple pandas.read_csv using UTF-8.
    """
    try:
        # Preferred path: your dedicated utility
        df = io_utils.read_upload_to_dataframe(upload)  # type: ignore[attr-defined]
    except AttributeError:
        # Fallback if the utility name differs or does not exist
        contents = upload.file.read()
        upload.file.seek(0)
        df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
    dataset_name = upload.filename.rsplit(".", 1)[0] if upload.filename else "dataset"
    return df, dataset_name


def _build_contract_yaml(
    df: pd.DataFrame,
    profile: BasicProfile,
    pii_result: Dict[str, Any],
    dataset_name: str,
) -> str:
    """
    Generate a minimal data contract YAML based on current dataset profile.
    Dependency-free (no pyyaml), so we just construct the text manually.
    """
    inferred_types = profile.inferred_types or {}
    missing_by_col = profile.missing_by_column or {}
    pii_cols = pii_result.get("pii_columns") or []

    lines: list[str] = []
    lines.append(f"dataset: {dataset_name}")
    lines.append("schema:")
    for col in df.columns:
        col_type = inferred_types.get(col, "string")
        missing = int(missing_by_col.get(col, 0))
        nullable = "true" if missing > 0 else "false"
        lines.append(f"  - name: {col}")
        lines.append(f"    type: {col_type}")
        lines.append(f"    nullable: {nullable}")

    if pii_cols:
        lines.append("pii:")
        for item in pii_cols:
            col = item.get("column")
            detected_types = item.get("detected_types") or []
            if detected_types:
                # Basic inline array representation
                types_text = "[" + ", ".join(detected_types) + "]"
            else:
                types_text = "[]"
            lines.append(f"  - column: {col}")
            lines.append(f"    types: {types_text}")

    # Basic quality expectations (can be tuned later)
    lines.append("expectations:")
    lines.append("  max_missing_ratio: 0.2")
    lines.append("  max_outlier_ratio: 0.2")

    return "\n".join(lines)


def _apply_autofix_clean(
    df: pd.DataFrame,
    options: AutofixCleanOptions,
) -> pd.DataFrame:
    """
    Simple AutoFix 3.0 implementation:

    - fill numeric NaNs with median
    - fill categorical NaNs with mode
    - clip numeric values to 1.5 * IQR
    - parse ISO-like date columns (columns containing 'date' in name)
    - basic PII masking (emails/phones) based on column name heuristics
    """
    result = df.copy()

    # Numeric handling
    numeric_cols = result.select_dtypes(include=["number"]).columns
    if options.fill_numeric_missing:
        for col in numeric_cols:
            median = result[col].median()
            result[col] = result[col].fillna(median)

    if options.clip_outliers:
        for col in numeric_cols:
            series = result[col].astype(float)
            q1 = series.quantile(0.25)
            q3 = series.quantile(0.75)
            iqr = q3 - q1
            if iqr == 0:
                continue
            lower = q1 - 1.5 * iqr
            upper = q3 + 1.5 * iqr
            result[col] = series.clip(lower=lower, upper=upper)

    # Categorical handling
    if options.fill_categorical_missing:
        cat_cols = result.select_dtypes(include=["object"]).columns
        for col in cat_cols:
            mode_val = result[col].mode(dropna=True)
            if not mode_val.empty:
                result[col] = result[col].fillna(mode_val.iloc[0])

    # Date parsing (simple heuristic on column name)
    if options.parse_dates:
        for col in result.columns:
            if "date" in col.lower():
                try:
                    result[col] = pd.to_datetime(result[col]).dt.strftime("%Y-%m-%d")
                except Exception:
                    # best-effort only
                    continue

    # PII masking (name-based heuristic)
    if options.mask_pii:
        object_cols = result.select_dtypes(include=["object"]).columns
        for col in object_cols:
            lower_name = col.lower()
            if "email" in lower_name:
                # mask local part of emails
                result[col] = result[col].astype(str).str.replace(
                    r"(^[^@]+)@",
                    "***@",
                    regex=True,
                )
            if "phone" in lower_name or "mobile" in lower_name:
                # mask all but last 4 digits
                result[col] = (
                    result[col]
                    .astype(str)
                    .str.replace(r"[0-9](?=[0-9]{4})", "*", regex=True)
                )

    return result


def _build_full_report(df: pd.DataFrame, dataset_name: str) -> DataQualityReport:
    """
    Orchestrates profiling, outliers, PII, drift, policy, history, insights
    and returns a fully-populated DataQualityReport.
    """
    # 1. Profiling
    profile_dict = profiling.profile_dataset(df)
    profile = BasicProfile(**profile_dict["basic_profile"])
    summary = Summary(**profile_dict["summary"])

    # 2. PII detection
    pii_result: Dict[str, Any] = pii.detect_pii(df)

    # 3. Outliers
    outlier_result: Dict[str, Any] = outliers.profile_outliers(df)

    # 4. Drift + history snapshot
    drift_result: Dict[str, Any] = drift.compute_drift(df=df, dataset_name=dataset_name)
    history_snapshot_dict: Dict[str, Any] = history_core.get_history_snapshot(
        dataset_name
    )
    history_snapshot = HistorySnapshot(**history_snapshot_dict)

    # 5. AutoFix plan & script (existing functionality)
    autofix_plan, autofix_script = autofix.build_autofix(df, profile_dict, pii_result)

    # 6. Policy + alerts
    policy_result: Dict[str, Any] = alerts.evaluate_policy_and_alerts(
        summary=summary,
        outlier_result=outlier_result,
        pii_result=pii_result,
        drift_result=drift_result,
        autofix_plan=autofix_plan,
    )
    pipeline_passed: bool = policy_result["pipeline_passed"]
    policy_failures = policy_result["policy_failures"]
    alert_items = policy_result["alerts"]

    # Derived metrics
    missing_ratio = float(summary.missing_ratio)
    outlier_ratio = float(outlier_result.get("overall_outlier_ratio", 0.0))
    overall_score = float(policy_result.get("overall_score", 0.0))

    # 7. Contract YAML (inline preview)
    contract_yaml = _build_contract_yaml(df, profile, pii_result, dataset_name)

    # 8. "AI-style" heuristic insights
    insight_payload: Dict[str, Any] = {
        "missing_ratio": missing_ratio,
        "outlier_ratio": outlier_ratio,
        "has_pii": bool(pii_result.get("has_pii")),
        "pii_columns": pii_result.get("pii_columns") or [],
        "drift_severity": drift_result.get("severity"),
        "schema_change_status": drift_result.get("schema_change_status"),
        "overall_score": overall_score,
        "policy_passed": pipeline_passed,
    }
    insights = insights_core.generate_insights(insight_payload)

    # 9. Persist history for this run
    run_id = str(uuid4())
    timestamp = datetime.utcnow()
    history_core.append_run(
        dataset_name=dataset_name,
        run_id=run_id,
        timestamp=timestamp,
        score=overall_score,
        missing_ratio=missing_ratio,
        outlier_ratio=outlier_ratio,
    )

    # 10. Construct the final DataQualityReport
    report = DataQualityReport(
        dataset_name=dataset_name,
        run_id=run_id,
        timestamp=timestamp,
        summary=summary,
        basic_profile=profile,
        pii_columns=[
            {
                "column": c["column"],
                "detected_types": c.get("detected_types", []),
            }
            for c in pii_result.get("pii_columns", [])
        ],
        pii_column_count=int(pii_result.get("pii_column_count", 0)),
        has_pii=bool(pii_result.get("has_pii", False)),
        columns=[
            {
                "column": c["column"],
                "mean": c.get("mean"),
                "std": c.get("std"),
                "outlier_count": c.get("outlier_count", 0),
                "value_count": c.get("value_count", 0),
                "outlier_ratio": c.get("outlier_ratio", 0.0),
                "severity": c.get("severity", "none"),
            }
            for c in outlier_result.get("columns", [])
        ],
        total_outliers=int(outlier_result.get("total_outliers", 0)),
        total_numeric_values=int(outlier_result.get("total_numeric_values", 0)),
        overall_outlier_ratio=float(
            outlier_result.get("overall_outlier_ratio", 0.0)
        ),
        contract_suggestion={},  # kept for backward compatibility if frontend still reads it
        policy_passed=pipeline_passed,
        policy_failures=policy_failures,
        autofix_plan=autofix_plan,
        autofix_script=autofix_script,
        missing_ratio=missing_ratio,
        outlier_ratio=outlier_ratio,
        overall_score=overall_score,
        history_snapshot=history_snapshot,
        alerts=alert_items,
        insights=insights,
        contract_yaml=contract_yaml,
    )
    return report


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/health")
def health() -> Dict[str, str]:
    """
    Simple liveness probe.
    """
    return {"status": "ok"}


@app.post("/analyze")
async def analyze_dataset(file: UploadFile = File(...)) -> JSONResponse:
    """
    Main DataLakeQ entrypoint.

    Accepts a CSV file, runs profiling, outlier detection, PII scan,
    drift comparison, policy evaluation, history logging, insight generation,
    and returns a DataQualityReport JSON object.
    """
    if not file:
        raise HTTPException(status_code=400, detail="File is required")

    df, dataset_name = _load_dataframe(file)
    report = _build_full_report(df=df, dataset_name=dataset_name)
    # Use Pydantic's JSON serialisation, then re-load to ensure it's plain dict
    return JSONResponse(json.loads(report.json()))


@app.post("/autofix/clean")
async def download_cleaned_dataset(
    file: UploadFile = File(...),
    options_json: str = Form("{}"),
) -> StreamingResponse:
    """
    AutoFix 3.0: one-click cleaning.

    Accepts the original CSV plus optional options JSON and returns a cleaned CSV.

    Example form data:
      - file: <csv file>
      - options_json: '{"fill_numeric_missing": true, "mask_pii": true}'
    """
    if not file:
        raise HTTPException(status_code=400, detail="File is required")

    try:
        options_data = json.loads(options_json or "{}")
    except json.JSONDecodeError:
        options_data = {}

    options = AutofixCleanOptions(**options_data)

    df, dataset_name = _load_dataframe(file)
    cleaned = _apply_autofix_clean(df, options)

    csv_bytes = cleaned.to_csv(index=False).encode("utf-8")
    buf = io.BytesIO(csv_bytes)
    filename = f"autofixed_{dataset_name}.csv"

    return StreamingResponse(
        buf,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
