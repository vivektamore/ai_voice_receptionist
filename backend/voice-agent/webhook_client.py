"""
Webhook client for the LiveKit voice agent.
Sends appointment booking data to the FastAPI backend when the agent
collects all patient details during the conversation.
"""
import asyncio
import logging
import aiohttp
from config import WEBHOOK_URL, BOOKING_URL

logger = logging.getLogger("voice-agent")


async def send_report_to_backend(
    patient_name: str = "",
    caller_phone: str = "",
    preferred_date: str = "",
    preferred_time: str = "",
    appointment_type: str = "",
    intent: str = "Inquiry",
    summary: str = "",
    room_name: str = "",
    # New fields for Phase 4
    call_transcript: str = "",
    call_duration: int = 0,
) -> dict:
    """
    POST call data to the FastAPI /api/voice/webhook/livekit endpoint.
    """
    payload = {
        "patient_name": patient_name,
        "caller_phone": caller_phone,
        "preferred_date": preferred_date,
        "preferred_time": preferred_time,
        "appointment_type": appointment_type,
        "intent": intent,
        "summary": summary,
        "external_call_id": room_name,
        "call_transcript": call_transcript,
        "call_duration": call_duration,
    }

    logger.info(f"Posting report to webhook: {WEBHOOK_URL} | intent={intent} | room={room_name}")

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                WEBHOOK_URL,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=10),
            ) as response:
                result = await response.json()
                if response.status == 200:
                    logger.info(f"Report synced successfully: lead_id={result.get('lead_id')}")
                    return {"success": True, "lead_id": result.get("lead_id")}
                else:
                    logger.error(f"Webhook returned {response.status}: {result}")
                    return {"success": False, "error": result.get("detail", "Unknown error")}

    except Exception as e:
        logger.error(f"Failed to post report to webhook: {e}")
        return {"success": False, "error": str(e)}


async def book_appointment_via_backend(
    name: str,
    phone: str,
    service: str,
    date: str,
    time: str,
    notes: str = "",
    room_name: str = "",
) -> dict:
    """
    POST a structured booking request to /api/v1/bookings/create.
    Returns { "success": bool, "appointment_id": str, "error": str }
    """
    payload = {
        "action": "book_appointment",
        "data": {
            "name": name,
            "phone": phone,
            "service": service,
            "date": date,
            "time": time,
            "notes": notes,
        },
        "room_name": room_name,
    }

    logger.info(f"Posting booking to {BOOKING_URL} | name={name} | date={date} {time}")

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                BOOKING_URL,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=15),
            ) as response:
                result = await response.json()
                if response.status == 200 and result.get("success"):
                    appt_id = result.get("appointment_id", "")
                    logger.info(f"Booking confirmed: appointment_id={appt_id}")
                    return {"success": True, "appointment_id": appt_id}
                else:
                    error_msg = result.get("detail") or result.get("error", "Unknown error")
                    logger.error(f"Booking failed ({response.status}): {error_msg}")
                    return {"success": False, "error": error_msg}

    except Exception as e:
        logger.error(f"Failed to reach booking endpoint: {e}")
        return {"success": False, "error": str(e)}
