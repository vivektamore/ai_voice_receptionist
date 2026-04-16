from fastapi import APIRouter, HTTPException
import logging
from app.core.loader import load_settings_from_db

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/reload-settings")
async def reload_settings():
    """
    Called by the Admin Dashboard when global settings are updated in the database.
    This triggers a reload of the API keys into memory without restarting the server.
    """
    try:
        await load_settings_from_db()
        return {"status": "ok", "message": "Settings reloaded successfully"}
    except Exception as e:
        logger.error(f"Error reloading settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to reload settings")
