"""
Webhook client for the LiveKit voice agent.
Sends appointment booking data to the FastAPI backend when the agent
collects all patient details during the conversation.
"""
import asyncio
import logging
import aiohttp
from config import WEBHOOK_URL

logger = logging.getLogger("voice-agent")


async def post_appointment_to_backend(
    patient_name: str,
    caller_phone: str,
    preferred_date: str,
    preferred_time: str,
    appointment_type: str,
    intent: str,
    summary: str,
    room_name: str = "",
) -> dict:
    """
    POST appointment data to the FastAPI /api/leads/webhook endpoint.
    Returns the response dict from the backend, or an error dict.
    """
    payload = {
        "patient_name": patient_name,
        "caller_phone": caller_phone,
        "preferred_date": preferred_date,
        "preferred_time": preferred_time,
        "appointment_type": appointment_type,
        "intent": intent,
        "summary": summary,
        # LiveKit room name acts as our external call ID
        "external_call_id": room_name,
    }

    logger.info(f"Posting appointment to webhook: {WEBHOOK_URL} | patient={patient_name} | intent={intent}")

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                WEBHOOK_URL,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=10),
            ) as response:
                result = await response.json()
                if response.status == 200:
                    logger.info(f"Appointment booked successfully: lead_id={result.get('lead_id')}")
                    return {"success": True, "lead_id": result.get("lead_id")}
                else:
                    logger.error(f"Webhook returned {response.status}: {result}")
                    return {"success": False, "error": result.get("detail", "Unknown error")}

    except Exception as e:
        logger.error(f"Failed to post appointment to webhook: {e}")
        return {"success": False, "error": str(e)}
