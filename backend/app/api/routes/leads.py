from typing import Annotated, Any, List
from fastapi import APIRouter, HTTPException, Query, Path
from app.core.database import supabase
from app.models.lead import LeadResponse, LeadUpdateStatus

router = APIRouter()

@router.get("/", response_model=List[LeadResponse])
def get_leads(clinic_id: Annotated[str | None, Query(description="Filter leads by clinic ID")] = None) -> Any:
    query = supabase.table("leads").select("*")
    if clinic_id:
        query = query.eq("clinic_id", clinic_id)
        
    try:
        response = query.order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{lead_id}/status", response_model=LeadResponse)
def update_lead_status(
    lead_id: Annotated[str, Path(description="The ID of the lead to update")],
    update_data: LeadUpdateStatus
) -> Any:
    try:
        response = supabase.table("leads").update({"status": update_data.status}).eq("id", lead_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
