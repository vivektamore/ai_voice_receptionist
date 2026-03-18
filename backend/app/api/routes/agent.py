from fastapi import APIRouter, HTTPException, Body
from typing import Any, Optional
from pydantic import BaseModel
from app.core.database import supabase
import logging

logger = logging.getLogger("agent-api")
router = APIRouter()

class AgentSettingsUpdate(BaseModel):
    voice: Optional[str] = None
    language: Optional[str] = None
    prompt: Optional[str] = None

@router.get("/{clinic_id}")
async def get_agent_settings(clinic_id: str) -> Any:
    """
    Fetch the AI Agent settings (voice, language, prompt) for a specific clinic.
    Used by the user dashboard.
    """
    try:
        response = supabase.table("agent_settings").select("*").eq("clinic_id", clinic_id).execute()
        
        if not response.data:
            # If no settings exist yet, return defaults
            logger.info(f"No agent_settings found for clinic {clinic_id}, returning defaults.")
            return {
                "clinic_id": clinic_id,
                "voice": "priya",        # Default Sarvam Voice
                "language": "Hinglish",
                "prompt": "You are a professional dental clinic receptionist..."
            }
            
        return response.data[0]
        
    except Exception as e:
        logger.error(f"Failed to fetch agent settings for {clinic_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve agent settings")

@router.put("/{clinic_id}")
async def update_agent_settings(clinic_id: str, settings: AgentSettingsUpdate) -> Any:
    """
    Update the AI Agent settings (voice, language, prompt) for a specific clinic.
    Used by the user dashboard when they save changes.
    """
    try:
        # Check if exists first
        existing = supabase.table("agent_settings").select("id").eq("clinic_id", clinic_id).execute()
        
        payload = settings.dict(exclude_unset=True)
        payload["clinic_id"] = clinic_id
        
        if existing.data:
            # Update
            response = supabase.table("agent_settings").update(payload).eq("clinic_id", clinic_id).execute()
            logger.info(f"Updated agent_settings for clinic {clinic_id}")
        else:
            # Insert
            response = supabase.table("agent_settings").insert(payload).execute()
            logger.info(f"Created new agent_settings for clinic {clinic_id}")
            
        if not response.data:
            raise HTTPException(status_code=500, detail="Database update failed")
            
        return {"status": "success", "settings": response.data[0]}
        
    except Exception as e:
        logger.error(f"Failed to update agent settings for {clinic_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update agent settings")
