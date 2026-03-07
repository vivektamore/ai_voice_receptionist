import logging
import re
from datetime import datetime
from typing import Any
from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.core.database import supabase
from app.models.lead import LeadCreate, LeadResponse
from app.services.sms import send_sms

router = APIRouter()

# Setup structred logging
logger = logging.getLogger("vapi_webhook")
logger.setLevel(logging.INFO)

@router.post("/webhook/test")
async def temporary_test_webhook(payload: dict, background_tasks: BackgroundTasks) -> Any:
    """
    TEMPORARY BYPASS ROUTE: Skips the phone mapping and forces an insert.
    Useful for testing Vapi connectivity before Supabase is fully populated.
    """
    logger.info("TEMPORARY TEST WEBHOOK HIT")
    try:
        # Fallback to querying ANY clinic just to get a valid UUID for insertion
        clinic_query = supabase.table("clinics").select("id").limit(1).execute()
        if not clinic_query.data:
            raise HTTPException(status_code=500, detail="No clinics exist in database at all!")
            
        test_clinic_id = clinic_query.data[0]["id"]
        
        # Manually build a random lead
        lead_in = LeadCreate(
            clinic_id=test_clinic_id,
            patient_name=payload.get("patient_name", "Test User"),
            caller_phone=payload.get("caller_phone", "+15551239999"),
            preferred_date="Test Date",
            preferred_time="Test Time",
            summary="This is a bypass test payload"
        )
        
        # Insert Lead safely
        response = supabase.table("leads").insert(lead_in.model_dump(exclude_unset=True)).execute()
        
        # Return 200 OK 
        return {"status": "success", "lead_id": response.data[0]["id"], "message": "Bypass test successful!"}
        
    except Exception as e:
        logger.error(f"Test Webhook Failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
            
            call_record = {
                "clinic_id": resolved_clinic_id,
                "external_call_id": raw_call_id,
                "caller_phone": payload.get("message", {}).get("call", {}).get("customer", {}).get("number") or "Unknown",
                "call_duration": str(duration),
                "call_transcript": transcript,
                "recording_url": recording_url,
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
        if getattr(val_phone, "strip", lambda: "")():
            digits = re.sub(r'\D', '', val_phone)
            if len(digits) < 10:
                logger.error(f"Validation Reject: Phone number is incomplete: {val_phone}")
                # Raising 400 returns this exact string to the AI during the call!
                raise HTTPException(status_code=400, detail="The phone number provided is incomplete. Please ask the patient for a valid 10-digit phone number.")

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
                summary=tool_args.get("summary") or payload.get("summary")
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
        print("Supabase response:", response)
        
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
            
        # Return immediate 200 response payload
        return {"status": "success", "lead_id": lead_id}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Webhook Failed | Error: {str(e)}")
        # We explicitly return 500 so VAPI knows the attempt failed and tries again later.
        raise HTTPException(status_code=500, detail="Webhook processing failed")
