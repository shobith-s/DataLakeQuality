# app/utils/io.py
from pathlib import Path
from typing import Tuple

import pandas as pd


def get_root_dir() -> Path:
    """
    Returns the project root (folder that contains backend/, frontend/, contracts/, etc.).
    Assumes this file is at: <root>/backend/app/utils/io.py
    """
    here = Path(__file__).resolve()
    # parents: utils -> app -> backend -> root
    return here.parents[3]


def get_contracts_dir() -> Path:
    return get_root_dir() / "contracts"


def get_baselines_dir() -> Path:
    d = get_root_dir() / "baselines"
    d.mkdir(parents=True, exist_ok=True)
    return d


def get_uploads_dir() -> Path:
    d = get_root_dir() / "data" / "uploads"
    d.mkdir(parents=True, exist_ok=True)
    return d


def save_upload_to_disk(dataset_name: str, filename: str, file_bytes: bytes) -> Path:
    """
    Save uploaded file into data/uploads and return the path.
    """
    uploads_dir = get_uploads_dir()
    # keep it simple: datasetname_originalname
    safe_name = filename.replace(" ", "_")
    path = uploads_dir / f"{dataset_name}_{safe_name}"
    path.write_bytes(file_bytes)
    return path


def load_csv(path: Path) -> pd.DataFrame:
    """
    Load a CSV file into a pandas DataFrame.
    """
    return pd.read_csv(path)


def infer_simple_type(series: pd.Series) -> str:
    """
    Map pandas dtype to a simple logical type: integer, number, string, date.
    """
    if pd.api.types.is_integer_dtype(series):
        return "integer"
    if pd.api.types.is_float_dtype(series):
        return "number"
    if pd.api.types.is_datetime64_any_dtype(series):
        return "date"
    # we won't overcomplicate for hackathon
    return "string"
