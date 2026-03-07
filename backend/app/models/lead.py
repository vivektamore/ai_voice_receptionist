from typing import Optional
from pydantic import BaseModel, Field

class LeadCreate(BaseModel):
    clinic_id: str
    patient_name: Optional[str] = None
    caller_phone: Optional[str] = None
    intent: Optional[str] = None
    preferred_date: Optional[str] = None
    preferred_time: Optional[str] = None
    summary: Optional[str] = None
    call_transcript: Optional[str] = None
    external_call_id: Optional[str] = None
    status: Optional[str] = "pending"

class LeadUpdateStatus(BaseModel):
    status: str

class LeadResponse(LeadCreate):
    id: str
    created_at: str
