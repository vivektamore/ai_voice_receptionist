from fastapi import APIRouter, HTTPException, Request
from typing import Any
import os
import logging
import json
from app.core.database import supabase
from app.services.telephony_client import telephony_client

logger = logging.getLogger("payments")
router = APIRouter()

RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET")

@router.post("/webhook/razorpay")
async def handle_razorpay_webhook(request: Request) -> Any:
    """
    Handles Razorpay Webhooks (e.g., payment.captured).
    Upon successful payment for a subscription plan, it automatically purchases
    a phone number via the requested provider and assigns it to the clinic.
    """
    body = await request.body()
    # In production, verify the Razorpay signature here using RAZORPAY_WEBHOOK_SECRET
    # signature = request.headers.get("x-razorpay-signature")
    
    try:
        payload = json.loads(body)
        event_type = payload.get("event")
        
        logger.info(f"Razorpay Webhook received: {event_type}")

        if event_type == "payment.captured" or event_type == "order.paid":
            payment_data = payload.get("payload", {}).get("payment", {}).get("entity", {})
            notes = payment_data.get("notes", {})
            
            # We expect the frontend to pass clinic_id and preferred_provider in the notes 
            # when creating the Razorpay order
            clinic_id = notes.get("clinic_id")
            provider = notes.get("provider", "telnyx").lower() 
            country_code = notes.get("country_code", "US")
            area_code = notes.get("area_code", "512")
            
            if not clinic_id:
                logger.error("No clinic_id found in Razorpay payment notes. Cannot assign number.")
                return {"status": "ignored", "reason": "missing clinic_id"}
                
            logger.info(f"Payment successful for clinic {clinic_id}. Purchasing via {provider}...")
            
            # --- 1. Purchase the number ---
            purchased_number = await telephony_client.purchase_number(
                provider=provider, 
                country_code=country_code, 
                area_code=area_code
            )
            
            if not purchased_number:
                logger.error(f"Failed to purchase number via {provider} for clinic {clinic_id}")
                return {"status": "error", "message": "Telephony provision failed"}

            # --- 2. Configure SIP Trunk ---
            sip_success = await telephony_client.configure_sip_trunk(provider, purchased_number)
            if not sip_success:
                logger.warning(f"SIP Trunk configuration might have failed for {purchased_number}")
                
            # --- 3. Save to phone_number_map ---
            map_data = {
                "clinic_id": clinic_id,
                "vapi_phone_number": purchased_number,  # Or provider_phone_number depending on naming
                "provider": provider
            }
            res = supabase.table("phone_number_map").insert(map_data).execute()
            
            if not res.data:
                logger.error("Failed to map the new phone number in the database.")
            else:
                logger.info(f"Successfully assigned {purchased_number} to clinic {clinic_id}")

            # Optionally, update the clinic's main phone number
            supabase.table("clinics").update({"assigned_number": purchased_number}).eq("id", clinic_id).execute()

        return {"status": "ok"}

    except Exception as e:
        logger.error(f"Razorpay webhook parsing failed: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")
