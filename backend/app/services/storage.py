import os
import io
import uuid
import logging
import httpx
from typing import Optional
from app.core.database import supabase
from app.core.config import settings

logger = logging.getLogger("storage-service")

async def upload_recording_to_supabase(audio_data: bytes, room_name: str) -> Optional[str]:
    """
    Uploads raw audio bytes to the Supabase Storage bucket named 'recordings'.
    Returns the public URL of the uploaded recording.
    """
    try:
        bucket_name = "recordings"
        file_name = f"{room_name}_{uuid.uuid4().hex[:8]}.wav"

        # Note: Depending on the python supabase client version, this syntax can vary.
        # This uses the stable standard storage upload.
        res = supabase.storage.from_(bucket_name).upload(
            file_name, 
            audio_data, 
            {"content-type": "audio/wav"}
        )
        
        # Get public URL
        public_url = supabase.storage.from_(bucket_name).get_public_url(file_name)
        logger.info(f"Successfully uploaded recording: {public_url}")
        
        return public_url
    except Exception as e:
        logger.error(f"Failed to upload recording to Supabase: {e}")
        return None

async def fetch_and_upload_recording(external_url: str, room_name: str) -> Optional[str]:
    """
    Fetches an audio file from an external URL (e.g., Vapi/Twilio holding URL)
    and uploads it to Supabase Storage.
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(external_url)
            response.raise_for_status()
            
            audio_bytes = response.content
            return await upload_recording_to_supabase(audio_bytes, room_name)
    except Exception as e:
        logger.error(f"Failed to fetch external recording {external_url}: {e}")
        return None
