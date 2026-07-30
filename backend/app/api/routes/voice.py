import logging
import re
from datetime import datetime
from typing import Any
from fastapi import APIRouter, HTTPException, BackgroundTasks, Body
from app.core.database import supabase
from app.core.config import settings
from app.models.lead import LeadCreate, LeadResponse
from app.services.sms import send_sms
from app.services.calendar import book_appointment
from app.services.storage import fetch_and_upload_recording
from livekit import api as livekit_api

router = APIRouter()

# Setup structred logging
logger = logging.getLogger("vapi_webhook")
logger.setLevel(logging.INFO)

# ─────────────────────────────────────────────────────────
# LiveKit Agent Webhook — receives appointment bookings
# from the Python LiveKit voice agent directly
# ─────────────────────────────────────────────────────────
@router.post("/webhook/livekit")
async def handle_livekit_webhook(payload: dict, background_tasks: BackgroundTasks) -> Any:
    """
    Receives appointment booking data from the LiveKit voice agent.
    The agent calls this endpoint via webhook_client.py when the
    patient has provided all required appointment details.
    """
    logger.info(f"LiveKit webhook received: {payload}")
    try:
        # Resolve clinic_id dynamically (payload > called_phone > room_name > default fallback)
        clinic_id = payload.get("clinic_id")
        called_phone = payload.get("called_phone") or payload.get("to_phone") or payload.get("phone_number")
        room_name = payload.get("external_call_id", "")  # LiveKit room name

        if not clinic_id and called_phone:
            phone_res = supabase.table("phone_numbers").select("clinic_id").eq("phone_number", called_phone).execute()
            if phone_res.data and phone_res.data[0].get("clinic_id"):
                clinic_id = phone_res.data[0]["clinic_id"]

        if not clinic_id and room_name:
            existing_lead = supabase.table("leads").select("clinic_id").eq("external_call_id", room_name).execute()
            if existing_lead.data and existing_lead.data[0].get("clinic_id"):
                clinic_id = existing_lead.data[0]["clinic_id"]

        if not clinic_id:
            clinic_query = supabase.table("clinics").select("id").limit(1).execute()
            if not clinic_query.data:
                raise HTTPException(status_code=500, detail="No clinics found in database")
            clinic_id = clinic_query.data[0]["id"]
            logger.warning(f"Could not route by phone ({called_phone}) or room ({room_name}). Using fallback clinic: {clinic_id}")

        patient_name   = payload.get("patient_name", "Unknown")
        caller_phone   = payload.get("caller_phone", "")
        preferred_date = payload.get("preferred_date", "")
        preferred_time = payload.get("preferred_time", "")
        appointment_type = payload.get("appointment_type", "")
        intent         = payload.get("intent", "AI Voice Appointment")
        summary        = payload.get("summary", "")
        room_name      = payload.get("external_call_id", "")  # LiveKit room name
        call_transcript = payload.get("call_transcript", "")
        call_duration  = payload.get("call_duration", 0)

        # Idempotency / Multi-step sync: 
        # If room already exists, UPDATE it with the new fields (e.g. transcript/duration)
        if room_name:
            existing = supabase.table("leads").select("id, clinic_id, call_duration").eq("external_call_id", room_name).execute()
            if existing.data:
                lead_id = existing.data[0]["id"]
                old_duration = existing.data[0].get("call_duration", 0)
                logger.info(f"Updating existing LiveKit room record: {room_name}")
                
                update_data = {}
                if call_transcript: update_data["call_transcript"] = call_transcript
                if call_duration: update_data["call_duration"] = call_duration
                if summary: update_data["summary"] = summary
                
                if update_data:
                    supabase.table("leads").update(update_data).eq("id", lead_id).execute()
                
                # --- BILLING DEDUCTION LOGIC ---
                # Only deduct if duration has increased (to avoid double charging on re-syncs)
                import math
                new_minutes = math.ceil((call_duration - old_duration) / 60)
                if new_minutes > 0:
                    try:
                        # Fetch clinic limits and usage
                        clinic = supabase.table("clinics").select("*").eq("id", clinic_id).single().execute()
                        c_data = clinic.data
                        
                        limit = c_data.get("monthly_minutes_limit", 500)
                        used = c_data.get("monthly_minutes_used", 0)
                        wallet = float(c_data.get("wallet_balance", 0))
                        currency = c_data.get("currency", "USD")
                        
                        overage_rate = 0.15 if currency == "USD" else 12.0 # $0.15 or ₹12 per min
                        
                        deduct_from_quota = min(new_minutes, max(0, limit - used))
                        deduct_from_wallet_mins = new_minutes - deduct_from_quota
                        
                        new_used = int(used + deduct_from_quota)
                        new_wallet = wallet - (deduct_from_wallet_mins * overage_rate)
                        
                        supabase.table("clinics").update({
                            "monthly_minutes_used": new_used,
                            "wallet_balance": max(0, new_wallet) # Don't go below 0 for now
                        }).eq("id", clinic_id).execute()
                        
                        logger.info(f"Billing: Deducted {deduct_from_quota}m from quota, {deduct_from_wallet_mins}m from wallet for clinic {clinic_id}")
                    except Exception as bill_err:
                        logger.error(f"Failed to process billing for call {room_name}: {bill_err}")

                return {"status": "success", "updated": True, "lead_id": lead_id}

        lead_in = LeadCreate(
            clinic_id=clinic_id,
            patient_name=patient_name,
            caller_phone=caller_phone,
            preferred_date=preferred_date,
            preferred_time=preferred_time,
            appointment_type=appointment_type,
            summary=summary,
            external_call_id=room_name,
            intent=intent,
            status="pending",
            call_transcript=call_transcript,
            call_duration=call_duration,
        )

        response = supabase.table("leads").insert(lead_in.model_dump(exclude_unset=True)).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to insert lead")

        inserted_lead = response.data[0]
        lead_id = inserted_lead["id"]
        logger.info(f"LiveKit lead saved: lead_id={lead_id}")

        # Fetch clinic details for SMS branding
        clinic_info = supabase.table("clinics").select("name, assigned_number").eq("id", clinic_id).execute()
        from_number = None
        clinic_name = "the clinic"
        
        if clinic_info.data:
            from_number = clinic_info.data[0].get("assigned_number")
            clinic_name = clinic_info.data[0].get("name", "the clinic")

        # Send confirmation SMS in background
        if caller_phone:
            sms_body = (
                f"Hi {patient_name}! Your appointment at {clinic_name} for {preferred_date} at {preferred_time} "
                f"has been received. We will confirm shortly."
            )
            # Use the clinic's assigned number as the sender if available
            success = await send_sms(caller_phone, sms_body, from_number=from_number)
            
            if success:
                try:
                    # Deduct SMS from quota or wallet
                    clinic = supabase.table("clinics").select("*").eq("id", clinic_id).single().execute()
                    c_data = clinic.data
                    
                    sms_limit = c_data.get("monthly_sms_limit", 500)
                    sms_used = c_data.get("monthly_sms_used", 0)
                    wallet = float(c_data.get("wallet_balance", 0))
                    currency = c_data.get("currency", "USD")
                    
                    sms_overage_rate = 0.02 if currency == "USD" else 1.5
                    
                    if sms_used < sms_limit:
                        supabase.table("clinics").update({"monthly_sms_used": sms_used + 1}).eq("id", clinic_id).execute()
                    else:
                        supabase.table("clinics").update({"wallet_balance": max(0, wallet - sms_overage_rate)}).eq("id", clinic_id).execute()
                    
                    logger.info(f"Billing: Deducted 1 SMS for clinic {clinic_id}")
                except Exception as sms_bill_err:
                    logger.error(f"Failed to process SMS billing for clinic {clinic_id}: {sms_bill_err}")

        return {"status": "success", "lead_id": lead_id}

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"LiveKit webhook error: {e}")
        raise HTTPException(status_code=500, detail=str(e))




@router.post("/outbound")
async def trigger_outbound_call(
    recipient_phone: str = Body(..., embed=True),
    clinic_id: str = Body(..., embed=True),
    call_context: dict = Body(default={}, embed=True),
    # call_context examples:
    # {"type": "confirmation", "patient_name": "John", "date": "Monday", "time": "10 AM", "clinic_name": "Smile Dental"}
    # {"type": "reminder", "patient_name": "Priya", "date": "Tomorrow", "time": "3 PM"}
    # {"type": "missed_call", "patient_name": "Ravi"}
    # {"type": "lead_followup", "service": "teeth cleaning"}
    # {"type": "general"}
) -> Any:
    """
    Triggers an outbound call to `recipient_phone` via LiveKit SIP trunk.
    Pass call_context to control the AI agent's behavior and prompt type.
    The agent will greet, ask permission, and follow the appropriate outbound script.
    """
    import json
    logger.info(f"Triggering outbound call to {recipient_phone} for clinic {clinic_id} | context={call_context}")
    
    # Pre-validation for E.164
    if not recipient_phone.startswith("+") or len(re.sub(r'\D', '', recipient_phone)) < 10:
        raise HTTPException(status_code=400, detail="Recipient phone must be in E.164 format (e.g., +15551234567)")

    if not settings.livekit_url or not settings.livekit_api_key or not settings.livekit_api_secret:
        logger.error("LiveKit credentials not configured")
        raise HTTPException(status_code=500, detail="LiveKit credentials missing in server config.")

    # Try to fetch sip_trunk_id from clinic row, fall back to settings (loaded from .env) if column missing
    trunk_id = settings.livekit_outbound_trunk_id  # Loaded by pydantic-settings from .env
    
    try:
        clinic_query = supabase.table("clinics").select("sip_trunk_id, name").eq("id", clinic_id).execute()
        if clinic_query.data:
            row = clinic_query.data[0]
            if row.get("sip_trunk_id"):
                trunk_id = row["sip_trunk_id"]
                logger.info(f"Using clinic-specific SIP trunk: {trunk_id}")
            # Inject clinic name into context if missing
            if not call_context.get("clinic_name") and row.get("name"):
                call_context["clinic_name"] = row["name"]
        else:
            logger.warning(f"No data found for clinic {clinic_id}, using env fallback: {trunk_id}")
    except Exception as db_err:
        logger.warning(f"Could not fetch clinic data ({db_err}), using env fallback: {trunk_id}")

    if not trunk_id:
        raise HTTPException(status_code=400, detail="No SIP trunk ID configured. Set LIVEKIT_OUTBOUND_TRUNK_ID in .env or add sip_trunk_id column to clinics table.")

    try:
        # Create a unique room name
        room_name = f"outbound-{clinic_id}-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Serialize call context so agent can read it from room metadata
        room_metadata = json.dumps(call_context)

        # Initialize the LiveKit API client
        lk_api = livekit_api.LiveKitAPI(
            settings.livekit_url, 
            settings.livekit_api_key, 
            settings.livekit_api_secret
        )

        # First create the room with metadata so the agent reads context on join
        await lk_api.room.create_room(
            livekit_api.CreateRoomRequest(
                name=room_name,
                metadata=room_metadata,
            )
        )

        # Dial the recipient via SIP
        await lk_api.sip.create_sip_participant(
            livekit_api.CreateSIPParticipantRequest(
                sip_trunk_id=trunk_id,
                sip_call_to=recipient_phone,
                room_name=room_name,
                participant_identity=f"phone-{recipient_phone}",
                participant_name=call_context.get("patient_name", "Patient")
            )
        )
        
        # Agent auto-joins via LiveKit Dispatch Rule (room prefix: "outbound-")
        
        await lk_api.aclose()

        return {
            "status": "success", 
            "message": "Outbound call dispatched",
            "room_name": room_name,
            "call_type": call_context.get("type", "general")
        }

    except Exception as e:
        logger.error(f"Failed to dispatch outbound call: {e}")

        raise HTTPException(status_code=500, detail=f"Outbound failure: {str(e)}")


@router.post("/webhook")
async def handle_vapi_webhook(payload: dict, background_tasks: BackgroundTasks) -> Any:
    """
    Handles Vapi webhook POST.
    Extracts the patient's incoming phone number and dynamically maps the lead to the correct clinic_id.
    """
    logger.info("Received raw Vapi webhook payload.")
    logger.info(f"FULL PAYLOAD DUMP: {payload}")
    try:
        # --- 1. Payload Extraction & Normalization ---
        # Note: Depending on your Vapi setup, your lead data may be nested deep inside toolCalls.
        # This example assumes standard Vapi webhook payload structure.
        call_msg = payload.get("message", {})
        message_type = call_msg.get("type", "")
        call_details = call_msg.get("call", {})
        
        raw_call_id = call_details.get("id")
        
        # The phone number the patient actually dialed (the Clinic's Twilio/Vapi number)
        dialed_number = call_details.get("phoneNumberId", None) 
        
        # NOTE: Vapi sometimes uses phone numbers differently depending on Inbound vs Outbound. 
        # For simplicity, we assume we extract the configured "to" number the user dialed:
        # dialed_number = '+15125551234' # <--- Standardize matching the US E.164 pattern in DB
        
        # We simulate extraction of the tool function arguments (where patient name, etc live)
        tool_args = {}
        tool_calls_list = payload.get("message", {}).get("toolCalls", [])
        if tool_calls_list and len(tool_calls_list) > 0:
            tool_args = tool_calls_list[0].get("function", {}).get("arguments", {})

        # --- 2. Dynamic Clinic Routing ---
        # NOTE: Since we are routing via Option A, we NEED the phone number the patient actually dialed.
        # Ensure your Vapi webhook is configured to pass `customer.number` or `message.call.phoneNumberId` as `to_number`.
        
        # Replace this placeholder logic with true payload extraction based on Vapi payload mapping:
        # Example extracting Vapi `phoneNumberId` assuming it is nested deeply 
        vapi_phone_number = payload.get("message", {}).get("call", {}).get("phoneNumberId", None) 
        
        # FALLBACK ONLY FOR TESTING if payload is simple flat schema structure:
        if not vapi_phone_number:
            vapi_phone_number = payload.get("to_number", None)
            
        # -- ADDED FALLBACK FOR WEB CALLS (Testing in browser) --
        if not vapi_phone_number:
            logger.warning("No dialed number found in payload! This looks like a Web Call from the Vapi Dashboard.")
            logger.warning("Applying fallback testing clinic ID because the Web Call has no phone number to map.")
            
            # Since web calls have no phone number, just grab the first clinic we have in the DB for testing purposes.
            clinic_fallback = supabase.table("clinics").select("id").limit(1).execute()
            if clinic_fallback.data:
                resolved_clinic_id = clinic_fallback.data[0]["id"]
            else:
                logger.error("Missing inbound phone number context, and no fallback clinics exist.")
                raise HTTPException(status_code=400, detail="Missing required dialed number for clinic mapping.")
        else:
            logger.info(f"Routing incoming call for Dialed Number: {vapi_phone_number}")
            
            # SQL Map Lookup:
            clinic_map = supabase.table("phone_number_map").select("clinic_id").eq("vapi_phone_number", vapi_phone_number).execute()
            
            if not clinic_map.data:
                logger.error(f"Routing Failed | Unknown number dialed: {vapi_phone_number}. Server rejected call injection.")
                raise HTTPException(status_code=400, detail="Unknown dialed number mapped to clinic.")
                
            resolved_clinic_id = clinic_map.data[0]["clinic_id"]

        logger.info(f"Routed Successfully! Assigning payload target Clinic: {resolved_clinic_id}")

        # --- Intercept End Of Call Report ---
        if message_type == "end-of-call-report":
            logger.info("Processing Vapi End-of-Call Report")
            transcript = call_msg.get("transcript", "")
            recording_url = call_msg.get("recordingUrl", "")
            duration = call_msg.get("duration", 0) # in seconds usually or milliseconds depending on Vapi version
            summary = call_msg.get("summary", "")
            ended_reason = call_msg.get("endedReason", "")
            
            # Use ended_reason or summary to determine a basic status
            status = "Resolved"
            if "transfer" in summary.lower() or "transfer" in ended_reason.lower():
                status = "Transferred"
            elif "book" in summary.lower() or "appoint" in summary.lower():
                status = "Booked"
            
            # --- Supabase Storage Async Sync ---
            sync_url = recording_url
            if recording_url:
                logger.info(f"Dispatching async task to fetch and save recording: {recording_url}")
                
                async def save_recording_locally(ext_url: str, ref_id: str, rec_duration: int, lang: str):
                    new_url = await fetch_and_upload_recording(ext_url, ref_id)
                    # Update Lead table with the long-term stable URL
                    supabase.table("leads").update({
                        "recording_url": new_url or ext_url, 
                        "call_duration": rec_duration,
                        "language": lang
                    }).eq("external_call_id", ref_id).execute()

                background_tasks.add_task(
                    save_recording_locally, 
                    recording_url, 
                    raw_call_id, 
                    duration, 
                    call_msg.get("language", "English")
                )
            
            call_record = {
                "clinic_id": resolved_clinic_id,
                "external_call_id": raw_call_id,
                "caller_phone": payload.get("message", {}).get("call", {}).get("customer", {}).get("number") or "Unknown",
                "call_duration": str(duration),
                "call_transcript": transcript,
                "recording_url": sync_url,
                "intent": "AI Conversation",
                "summary": summary,
                "status": status
            }
            
            logger.info(f"Inserting into calls table: {raw_call_id}")
            # Insert into the new Calls table
            call_res = supabase.table("calls").insert(call_record).execute()
            
            return {"status": "success", "message": "End-of-call report saved", "call_id": raw_call_id}


        # --- 3. Strict Backend Validation ---
        val_phone = tool_args.get("caller_phone") or payload.get("caller_phone")
        if val_phone and isinstance(val_phone, str) and val_phone.strip():
            # Allow optional leading '+' and strictly digits afterwards. (E.164 standard)
            clean_phone = val_phone.strip()
            digits = re.sub(r'\D', '', clean_phone)
            # US numbers are usually 10 digits. Country codes can add more.
            if len(digits) < 10:
                logger.error(f"Validation Reject: Phone number is incomplete: {val_phone}")
                # Raising 400 returns this exact string to the AI during the call!
                raise HTTPException(status_code=400, detail="The phone number provided is incomplete. Please ask the patient for a valid 10-digit phone number with country code.")

        val_date = tool_args.get("preferred_date") or payload.get("preferred_date")
        if getattr(val_date, "strip", lambda: "")():
            # If the AI provided a strict YYYY-MM-DD date, we will actually enforce time compliance!
            if re.match(r'^\d{4}-\d{2}-\d{2}$', str(val_date)):
                dt = datetime.strptime(str(val_date), "%Y-%m-%d")
                if dt.date() < datetime.now().date():
                    logger.error(f"Validation Reject: Appointment requested in the past: {val_date}")
                    raise HTTPException(status_code=400, detail=f"The requested date {val_date} has already passed. Please ask the patient for a future date.")

        # --- 4. Construct the Lead Definition ---
        try:
           lead_in = LeadCreate(
                clinic_id=resolved_clinic_id,
                external_call_id=raw_call_id,
                patient_name=tool_args.get("patient_name") or payload.get("patient_name"),
                caller_phone=val_phone,
                preferred_date=val_date,
                preferred_time=tool_args.get("preferred_time") or payload.get("preferred_time"),
                appointment_type=tool_args.get("appointment_type") or payload.get("appointment_type"),
                summary=tool_args.get("summary") or payload.get("summary"),
                intent=tool_args.get("intent") or payload.get("intent") or "AI Voice Appointment"
            )
        except Exception as e:
            logger.error(f"Failed to parse Lead Model schema: {e}")
            raise HTTPException(status_code=400, detail=str(e))

        # --- 4. Idempotency Check ---
        if lead_in.external_call_id:
            existing = supabase.table("leads").select("id").eq("external_call_id", lead_in.external_call_id).execute()
            if existing.data:
                logger.info(f"Duplicate call ignored | external_call_id={lead_in.external_call_id}")
                return {"status": "success", "duplicate_ignored": True, "lead_id": existing.data[0]["id"]}

        # --- 5. Insert Lead ---
        logger.info(f"Attempting DB insert | phone={lead_in.caller_phone} | external_call_id={lead_in.external_call_id}")
        response = supabase.table("leads").insert(lead_in.model_dump(exclude_unset=True)).execute()
        logger.debug(f"Supabase insert response: {len(response.data)} rows")
        
        if not response.data:
            logger.error("DB Insert Failed | Supabase returned empty data")
            raise HTTPException(status_code=500, detail="Failed to create lead")
            
        inserted_lead = response.data[0]
        phone_number = inserted_lead.get("caller_phone")
        lead_id = inserted_lead.get("id")
        
        logger.info(f"DB Insert Success | lead_id={lead_id}")
        
        # --- 6. Async Actions ---
        if phone_number:
            message = f"Hi {inserted_lead.get('patient_name', 'there')}! We have received your request for {inserted_lead.get('preferred_date', 'your appointment')}. Our front desk will confirm shortly."
            background_tasks.add_task(send_sms, phone_number, message)
            
        # Trigger Cal.com booking if intent is booking and date/time are present
        intent = (tool_args.get("intent") or payload.get("intent") or "").lower()
        cal_date_str = None
        
        if "book" in intent and inserted_lead.get('preferred_date') and inserted_lead.get('preferred_time'):
            # Fetch Cal.com settings from clinic
            clinic_settings = supabase.table("clinics").select("cal_api_key, cal_event_type_id").eq("id", resolved_clinic_id).execute()
            if clinic_settings.data and clinic_settings.data[0].get("cal_api_key") and clinic_settings.data[0].get("cal_event_type_id"):
                cal_key = clinic_settings.data[0]["cal_api_key"]
                event_id = clinic_settings.data[0]["cal_event_type_id"]
                
                # Heuristic: combine date and time to ISO. Since patient says "10 AM", parsing is complex.
                # Assuming the AI provides valid YYYY-MM-DD from previous step.
                raw_time = str(inserted_lead.get('preferred_time')).replace(".", "").strip().upper()
                hour = 10 # Default
                minute = 0
                match = re.search(r'(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?', raw_time)
                if match:
                    h = int(match.group(1))
                    m = int(match.group(2)) if match.group(2) else 0
                    meridiem = match.group(3)
                    if meridiem == "PM" and h < 12: h += 12
                    if meridiem == "AM" and h == 12: h = 0
                    hour = h
                    minute = m
                
                try:
                    dt = datetime.strptime(str(inserted_lead.get('preferred_date')), "%Y-%m-%d")
                    cal_date_str = dt.replace(hour=hour, minute=minute).strftime("%Y-%m-%dT%H:%M:%SZ")
                    
                    # Schedule Async Call
                    async def async_book():
                        res = await book_appointment(
                            name=inserted_lead.get('patient_name') or "Unknown Patient",
                            email="voicebot@example.com", # Needs patient email for perfect sync
                            start_time=cal_date_str,
                            event_type_id=int(event_id),
                            cal_api_key=cal_key
                        )
                        if res.get("success"):
                            logger.info("Cal.com booking successful")
                    
                    background_tasks.add_task(async_book)
                except ValueError:
                    logger.error("Failed to parse preferred_date for Cal.com sync")

        # Return immediate 200 response payload
        return {"status": "success", "lead_id": lead_id}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Webhook Failed | Error: {str(e)}")
        # We explicitly return 500 so VAPI knows the attempt failed and tries again later.
        raise HTTPException(status_code=500, detail="Webhook processing failed")
