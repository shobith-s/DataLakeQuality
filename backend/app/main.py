# app/main.py
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.core.quality_gate import run_quality_gate
from app.models.report import QualityReport
from app.utils.io import save_upload_to_disk

app = FastAPI(title="DataLakeQ Quality Gate API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # loosened for hackathon
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok", "message": "DataLakeQ API running"}


@app.post("/analyze", response_model=QualityReport)
async def analyze_dataset(
    dataset_name: str = Form(...),
    file: UploadFile = File(...),
):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    saved_path = save_upload_to_disk(dataset_name, file.filename, file_bytes)

    try:
        report_dict = run_quality_gate(dataset_name, saved_path)
    except Exception as e:
        # don't crash the demo; give a useful error
        raise HTTPException(status_code=500, detail=f"Failed to analyze dataset: {e}")

    # FastAPI + Pydantic will validate/serialize
    return QualityReport(**report_dict)
