import logging
import re
from datetime import datetime, date, time as time_type
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.database import supabase
from app.services.sms import send_sms

router = APIRouter()
logger = logging.getLogger("bookings")
logger.setLevel(logging.INFO)


# ─────────────────────────────────────────────────────────────────────────────
# Request / Response Models
# ─────────────────────────────────────────────────────────────────────────────

class BookingData(BaseModel):
    name: str
    phone: str
    service: str
    date: str          # YYYY-MM-DD
    time: str          # HH:MM (24-hour)
    notes: Optional[str] = ""

class BookingRequest(BaseModel):
    action: str = "book_appointment"
    data: BookingData
    room_name: Optional[str] = ""   # LiveKit room name — used to resolve clinic_id


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _resolve_clinic_id(room_name: str) -> Optional[str]:
    """
    Resolve clinic_id from a LiveKit room name.

    Priority:
      1. Outbound rooms: 'outbound-{clinic_id}-{timestamp}'
      2. Inbound rooms: look up via leads.external_call_id = room_name
      3. Fallback: first clinic in DB (for testing/web calls)
    """
    if not room_name:
        return _fallback_clinic()

    # Outbound pattern
    if room_name.startswith("outbound-"):
        parts = room_name.split("-")
        if len(parts) >= 6:
            clinic_id = "-".join(parts[1:6])
            logger.info(f"Resolved clinic_id={clinic_id} from outbound room name")
            return clinic_id

    # Inbound: check leads table
    try:
        result = supabase.table("leads") \
            .select("clinic_id") \
            .eq("external_call_id", room_name) \
            .limit(1).execute()
        if result.data:
            cid = result.data[0]["clinic_id"]
            logger.info(f"Resolved clinic_id={cid} from leads table (room={room_name})")
            return cid
    except Exception as e:
        logger.warning(f"Leads lookup failed for room={room_name}: {e}")

    return _fallback_clinic()


def _fallback_clinic() -> Optional[str]:
    """Return first clinic as fallback (safe for web/test calls)."""
    try:
        result = supabase.table("clinics").select("id").limit(1).execute()
        if result.data:
            cid = result.data[0]["id"]
            logger.warning(f"Using fallback clinic_id={cid}")
            return cid
    except Exception as e:
        logger.error(f"Fallback clinic lookup failed: {e}")
    return None


def _validate_date(date_str: str) -> date:
    """Parse and validate YYYY-MM-DD date — must not be in the past."""
    try:
        parsed = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid date format: '{date_str}'. Use YYYY-MM-DD.")
    if parsed < datetime.now().date():
        raise HTTPException(status_code=422, detail=f"Date '{date_str}' is in the past. Please provide a future date.")
    return parsed


def _validate_time(time_str: str) -> str:
    """Parse HH:MM and return normalized HH:MM string."""
    # Accept HH:MM or H:MM
    match = re.match(r'^(\d{1,2}):(\d{2})$', time_str.strip())
    if not match:
        raise HTTPException(status_code=422, detail=f"Invalid time format: '{time_str}'. Use HH:MM (24-hour).")
    h, m = int(match.group(1)), int(match.group(2))
    if not (0 <= h <= 23 and 0 <= m <= 59):
        raise HTTPException(status_code=422, detail=f"Time '{time_str}' is out of range.")
    return f"{h:02d}:{m:02d}"


def _validate_phone(phone: str) -> str:
    """Ensure phone has at least 10 digits."""
    digits = re.sub(r'\D', '', phone)
    if len(digits) < 10:
        raise HTTPException(
            status_code=422,
            detail=f"Phone number '{phone}' is too short. Provide a number with country code."
        )
    return phone.strip()


# ─────────────────────────────────────────────────────────────────────────────
# Endpoint
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/create")
async def create_booking(req: BookingRequest):
    """
    Creates a confirmed appointment in Supabase and sends an SMS confirmation
    from the clinic's registered Telnyx number.

    Called by the voice agent after collecting and confirming all 5 required fields.
    """
    data = req.data
    logger.info(f"Booking request: name={data.name}, phone={data.phone}, "
                f"service={data.service}, date={data.date}, time={data.time}")

    # ── 1. Validate all fields ────────────────────────────────────────────────
    validated_phone = _validate_phone(data.phone)
    validated_date  = _validate_date(data.date)       # Returns date object
    validated_time  = _validate_time(data.time)        # Returns "HH:MM" string

    if not data.name.strip():
        raise HTTPException(status_code=422, detail="Patient name is required.")
    if not data.service.strip():
        raise HTTPException(status_code=422, detail="Service type is required.")

    # ── 2. Resolve clinic_id ──────────────────────────────────────────────────
    clinic_id = _resolve_clinic_id(req.room_name or "")
    if not clinic_id:
        raise HTTPException(status_code=500, detail="Could not resolve clinic. No clinics found in database.")

    # ── 3. Conflict check (same clinic + date + time) ─────────────────────────
    try:
        conflict = supabase.table("appointments") \
            .select("id") \
            .eq("clinic_id", clinic_id) \
            .eq("date", str(validated_date)) \
            .eq("time", validated_time) \
            .eq("status", "confirmed") \
            .limit(1).execute()

        if conflict.data:
            logger.warning(f"Time slot conflict: clinic={clinic_id}, date={validated_date}, time={validated_time}")
            raise HTTPException(
                status_code=409,
                detail=f"The {validated_time} slot on {data.date} is already booked. Please choose a different time."
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Conflict check failed (non-fatal): {e}")

    # ── 4. Insert appointment into Supabase ───────────────────────────────────
    appointment_row = {
        "clinic_id":    clinic_id,
        "patient_name": data.name.strip(),
        "phone":        validated_phone,
        "service":      data.service.strip(),
        "date":         str(validated_date),
        "time":         validated_time,
        "notes":        data.notes.strip() if data.notes else None,
        "status":       "confirmed",
        "source":       "voice_bot",
    }

    try:
        insert_res = supabase.table("appointments").insert(appointment_row).execute()
        if not insert_res.data:
            logger.error("Supabase insert returned empty data")
            raise HTTPException(status_code=500, detail="Failed to save appointment to database.")
        appointment_id = insert_res.data[0]["id"]
        logger.info(f"Appointment saved: id={appointment_id}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Supabase insert error: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    # ── 5. Fetch clinic's registered number + SMS provider ──────────────────
    clinic_name   = "our clinic"
    from_number   = None
    sms_provider  = None  # Will fall back to global settings.sms_provider if None

    try:
        clinic_res = supabase.table("clinics") \
            .select("name, assigned_number, sms_provider") \
            .eq("id", clinic_id) \
            .limit(1).execute()
        if clinic_res.data:
            row = clinic_res.data[0]
            clinic_name  = row.get("name") or "our clinic"
            from_number  = row.get("assigned_number")
            sms_provider = row.get("sms_provider")  # e.g. "vobiz", "telnyx", "twilio"
            logger.info(
                f"Clinic SMS config | name={clinic_name} | "
                f"from={from_number} | provider={sms_provider or 'global default'}"
            )
        if not from_number:
            logger.warning(f"clinic_id={clinic_id} has no assigned_number — SMS skipped")
    except Exception as e:
        logger.warning(f"Clinic fetch for SMS failed (non-fatal): {e}")

    # ── 6. Send SMS confirmation ──────────────────────────────────────────────
    sms_sent = False
    if from_number and validated_phone:
        # Format: Tuesday, 25 April 2026
        try:
            friendly_date = validated_date.strftime("%A, %d %B %Y")
        except Exception:
            friendly_date = data.date

        # Format time to 12-hour clock for readability
        try:
            h, m = int(validated_time.split(":")[0]), int(validated_time.split(":")[1])
            period = "AM" if h < 12 else "PM"
            h12 = h % 12 or 12
            friendly_time = f"{h12}:{m:02d} {period}"
        except Exception:
            friendly_time = validated_time

        sms_body = (
            f"Hi {data.name.strip()}! "
            f"Your {data.service} appointment at {clinic_name} is confirmed for "
            f"{friendly_date} at {friendly_time}. "
            f"See you then! \u2013 {clinic_name}"
        )

        try:
            sms_sent = await send_sms(
                to_number=validated_phone,
                message=sms_body,
                from_number=from_number,
                provider=sms_provider,   # Per-clinic provider (vobiz/telnyx/twilio)
            )
            if sms_sent:
                logger.info(f"SMS sent to {validated_phone} via {sms_provider or 'default provider'}")
            else:
                logger.warning(f"SMS failed to {validated_phone} via {sms_provider or 'default provider'}")
        except Exception as e:
            logger.error(f"SMS exception (non-fatal): {e}")

    # ── 7. Return result ──────────────────────────────────────────────────────
    return {
        "success":        True,
        "appointment_id": appointment_id,
        "sms_sent":       sms_sent,
        "clinic_id":      clinic_id,
        "message":        f"Appointment confirmed for {data.name} on {data.date} at {validated_time}."
    }
