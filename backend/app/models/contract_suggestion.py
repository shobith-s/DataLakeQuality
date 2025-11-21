# app/models/contract_suggestion.py
from typing import Optional

from pydantic import BaseModel


class ContractSuggestion(BaseModel):
    dataset_name: str
    contract_yaml: str
    saved: bool
    note: Optional[str] = None
