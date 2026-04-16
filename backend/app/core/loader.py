import logging
from app.core.config import settings
from app.core.database import supabase

logger = logging.getLogger(__name__)

async def load_settings_from_db():
    """
    Fetches global API settings from the public.system_settings table in Supabase
    and injects them into the global FastAPI `settings` object.
    Falls back to .env values if DB fetching fails or the table is empty.
    """
    try:
        # Supabase Python client is synchronous for `execute()` right now, 
        # but we wrap it in a try-except to not crash server on boot if table is missing.
        response = supabase.table("system_settings").select("*").execute()
        
        if hasattr(response, 'data') and response.data:
            logger.info(f"Loaded {len(response.data)} settings from database.")
            for row in response.data:
                key = row.get("setting_key")
                value = row.get("setting_value")
                
                if key and hasattr(settings, key):
                    # Only inject if there's actually a value. Otherwise leave the .env default
                    if value is not None and str(value).strip() != "":
                        setattr(settings, key, value)
        else:
            logger.info("system_settings table query succeeded but returned no entries. Using .env defaults.")

    except Exception as e:
        logger.error(f"Failed to load settings from database (Table might not exist yet): {e}")
        logger.warning("Falling back to standard .env configuration.")
