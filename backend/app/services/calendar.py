import os
import httpx
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("calendar-service")

CAL_API_URL = "https://api.cal.com/v1"

async def book_appointment(
    name: str,
    email: str,
    start_time: str,  # Expected ISO format string, e.g., '2026-03-20T10:00:00Z'
    event_type_id: int,
    cal_api_key: str
) -> Dict[str, Any]:
    """
    Creates a booking on Cal.com asynchronously.
    """
    url = f"{CAL_API_URL}/bookings"
    
    payload = {
        "eventTypeId": event_type_id,
        "start": start_time,
        "responses": {
            "name": name,
            "email": email
        }
    }
    
    headers = {
        "Authorization": f"Bearer {cal_api_key}",
        "Content-Type": "application/json"
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            logger.info(f"Successfully booked appointment on Cal.com: {data.get('booking', {}).get('uid')}")
            return {"success": True, "booking": data.get("booking")}
            
    except httpx.HTTPStatusError as exc:
        logger.error(f"Cal.com API error: {exc.response.status_code} - {exc.response.text}")
        return {"success": False, "error": exc.response.text}
    except Exception as exc:
        logger.error(f"Failed to connect to Cal.com API: {exc}")
        return {"success": False, "error": str(exc)}
