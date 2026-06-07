"""
Webhook client for the LiveKit voice agent.
Sends appointment booking data to the FastAPI backend when the agent
collects all patient details during the conversation.
"""
import asyncio
import logging
import aiohttp
from config import WEBHOOK_URL, BOOKING_URL
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

logger = logging.getLogger("voice-agent")


# ── Retry Helpers ────────────────────────────────────────────────────────────

@retry(
    stop=stop_after_attempt(2),
    wait=wait_exponential(multiplier=1, max=3),
    retry=retry_if_exception_type((aiohttp.ClientError, asyncio.TimeoutError)),
    reraise=True,
)
async def _post_report(payload: dict) -> dict:
    async with aiohttp.ClientSession() as session:
        async with session.post(
            WEBHOOK_URL,
            json=payload,
            timeout=aiohttp.ClientTimeout(total=10),
        ) as response:
            if response.status >= 500:
                response.raise_for_status()
            return await response.json()


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=0.5, min=0.5, max=4),
    retry=retry_if_exception_type((aiohttp.ClientError, asyncio.TimeoutError)),
    reraise=True,
)
async def _post_booking(payload: dict) -> dict:
    async with aiohttp.ClientSession() as session:
        async with session.post(
            BOOKING_URL,
            json=payload,
            timeout=aiohttp.ClientTimeout(total=15),
        ) as response:
            if response.status >= 500:
                response.raise_for_status()
            return await response.json()


# ── Public Endpoints ──────────────────────────────────────────────────────────

async def send_report_to_backend(
    patient_name: str = "",
    caller_phone: str = "",
    preferred_date: str = "",
    preferred_time: str = "",
    appointment_type: str = "",
    intent: str = "Inquiry",
    summary: str = "",
    room_name: str = "",
    call_transcript: str = "",
    call_duration: int = 0,
) -> dict:
    """
    POST call data to the FastAPI /api/voice/webhook/livekit endpoint.
    Retries on connection and server-side errors.
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
        result = await _post_report(payload)
        logger.info(f"Report synced successfully: lead_id={result.get('lead_id')}")
        return {"success": True, "lead_id": result.get("lead_id")}
    except Exception as e:
        logger.error(f"Failed to post report to webhook after attempts: {e}")
        return {"success": False, "error": str(e)}


async def book_appointment_via_backend(
    name: str,
    phone: str,
    service: str,
    date: str,
    time: str,
    notes: str = "",
    room_name: str = "",
    timezone: str = "Asia/Kolkata",
) -> dict:
    """
    POST a structured booking request to /api/v1/bookings/create.
    Returns { "success": bool, "appointment_id": str, "error": str }
    Retries on connection and server-side errors.
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
            "timezone": timezone,
        },
        "room_name": room_name,
    }

    logger.info(f"Posting booking to {BOOKING_URL} | name={name} | date={date} {time} | timezone={timezone}")

    try:
        result = await _post_booking(payload)
        if result.get("success"):
            appt_id = result.get("appointment_id", "")
            logger.info(f"Booking confirmed: appointment_id={appt_id}")
            return {"success": True, "appointment_id": appt_id}
        else:
            error_msg = result.get("detail") or result.get("error", "Unknown error")
            logger.error(f"Booking failed: {error_msg}")
            return {"success": False, "error": error_msg}
    except Exception as e:
        logger.error(f"Failed to reach booking endpoint after attempts: {e}")
        return {"success": False, "error": str(e)}
