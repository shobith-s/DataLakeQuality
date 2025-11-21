# app/main.py
from typing import List

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.core.quality_gate import run_quality_gate
from app.core.contracts import suggest_contract_from_df, persist_contract_suggestion
from app.models.report import QualityReport
from app.models.contract_suggestion import ContractSuggestion
from app.models.history import RunHistoryEntry
from app.utils.io import save_upload_to_disk, load_csv
from app.utils.history import list_history_runs


app = FastAPI(
    title="DataLakeQ – Quality Gate API",
    version="0.3.0",
    description="Lightweight data quality gate for CSV datasets.",
)

# CORS setup – allow local frontend by default
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for hackathon/local dev; tighten later for prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """
    Simple health check endpoint.
    """
    return {"status": "ok"}


@app.post("/analyze", response_model=QualityReport)
async def analyze_dataset(
    dataset_name: str = Form(...),
    file: UploadFile = File(...),
):
    """
    Main endpoint: run the quality gate on an uploaded CSV.
    """
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Save to disk so we can reuse IO utilities and support drift baselines
    saved_path = save_upload_to_disk(dataset_name, file.filename, file_bytes)

    try:
        report_dict = run_quality_gate(dataset_name, saved_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze dataset: {e}")

    return QualityReport(**report_dict)


@app.post("/suggest-contract", response_model=ContractSuggestion)
async def suggest_contract(
    dataset_name: str = Form(...),
    file: UploadFile = File(...),
):
    """
    Generate a suggested YAML contract for the uploaded CSV and
    persist it under contracts/<dataset_name>.yaml if it does not already exist.
    """
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Save to disk to reuse loader
    saved_path = save_upload_to_disk(dataset_name, file.filename, file_bytes)

    try:
        df = load_csv(saved_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read CSV: {e}")

    # Build suggested contract
    contract_dict = suggest_contract_from_df(dataset_name, df)

    # Try to persist without overwriting existing contracts
    persist_result = persist_contract_suggestion(contract_dict, overwrite=False)

    return ContractSuggestion(
        dataset_name=dataset_name,
        contract_yaml=persist_result["contract_yaml"],
        saved=persist_result["saved"],
        note=persist_result.get("note"),
    )


@app.get("/history/{dataset_name}", response_model=List[RunHistoryEntry])
async def get_history(dataset_name: str):
    """
    Return recent history (up to 20 runs) for a dataset, in chronological order.
    """
    entries = list_history_runs(dataset_name)
    return entries
