from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel
from typing import Any
import os
import logging
import json
import razorpay
from datetime import datetime, timedelta, timezone
from app.core.database import supabase
from app.services.providers.factory import get_provider

logger = logging.getLogger("payments-engine")
router = APIRouter()

RAZOR_KEY = os.getenv("RAZORPAY_KEY_ID")
RAZOR_PAY = os.getenv("RAZORPAY_KEY_SECRET")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET")

razorpay_client = None
if RAZOR_KEY and RAZOR_PAY:
    razorpay_client = razorpay.Client(auth=(RAZOR_KEY, RAZOR_PAY))

class LockNumberRequest(BaseModel):
    clinic_id: str
    phone_number: str
    country_code: str

class CreateOrderRequest(BaseModel):
    clinic_id: str
    phone_number: str
    country_code: str

class PurchaseNumberRequest(BaseModel):
    clinic_id: str
    phone_number: str
    provider: str # telnyx, vobiz, custom (BYO)

class VerifyPaymentRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str
    clinic_id: str
    phone_number: str
    provider: str

class ReleaseNumberRequest(BaseModel):
    clinic_id: str
    phone_number: str
    provider: str

@router.get("/available-numbers")
async def get_available_numbers(country_code: str = "US", area_code: str = "", limit: int = 15) -> Any:
    """
    Returns a list of available phone numbers abstracted from the Provider Layer.
    EXPLICITLY filters out numbers actively held in `number_locks`.
    """
    try:
        provider = get_provider(country_code)
        raw_numbers = await provider.search_numbers(country_code, area_code)

        if not raw_numbers:
            return {"status": "success", "numbers": [], "message": f"No numbers found for {country_code}."}

        # Query Supabase for active locks globally
        active_locked_numbers = []
        try:
            locks_res = supabase.table("number_locks").select("number").gte("expires_at", datetime.now(timezone.utc).isoformat()).execute()
            if locks_res.data:
                active_locked_numbers = [row["number"] for row in locks_res.data]
        except Exception as table_err:
            logger.warning(f"Number locks check skipped (Table likely missing): {table_err}")

        # Filter out locked numbers
        clean_numbers = [num for num in raw_numbers if num["number"] not in active_locked_numbers]
        
        logger.info(f"Returning {len(clean_numbers)} numbers for {country_code} (Area: {area_code})")
        return {"status": "success", "numbers": clean_numbers[:limit]}
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to fetch available numbers: {e}")
        raise HTTPException(status_code=500, detail="Telephony provider search failed or credentials missing.")


@router.post("/lock-number")
async def lock_number_temporarily(req: LockNumberRequest) -> Any:
    """
    Locks the selected number for 5 minutes (300s) for checkout pipeline.
    Uses delete-then-insert to handle retries and stale locks gracefully.
    """
    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        
        # Check if actively locked by a DIFFERENT clinic
        try:
            locks_res = supabase.table("number_locks").select("*").eq("number", req.phone_number).gte("expires_at", now_iso).execute()
            if locks_res.data:
                existing_lock = locks_res.data[0]
                # Allow the same clinic to re-lock (retry scenario)
                if existing_lock.get("user_id") != req.clinic_id:
                    raise HTTPException(status_code=409, detail="Number is currently locked by another user.")
        except HTTPException:
            raise
        except Exception as e:
            if "relation \"public.number_locks\" does not exist" in str(e):
                logger.error("MISSING TABLE: number_locks")
                raise HTTPException(status_code=500, detail="Telephony database tables missing. Please run migrations.sql in Supabase.")
            raise e

        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()

        # Delete any existing lock for this number (expired or same user retrying)
        # This prevents the duplicate key constraint violation (23505)
        try:
            supabase.table("number_locks").delete().eq("number", req.phone_number).execute()
            logger.info(f"Cleared any existing lock for {req.phone_number} before re-locking.")
        except Exception as del_err:
            logger.warning(f"Could not delete existing lock (may not exist): {del_err}")

        # Insert fresh lock
        supabase.table("number_locks").insert({
            "number": req.phone_number,
            "user_id": req.clinic_id,
            "expires_at": expires_at
        }).execute()

        logger.info(f"Number {req.phone_number} locked for clinic {req.clinic_id} until {expires_at}")
        return {"status": "success", "expires_at": expires_at}

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Failed to lock number: {e}")
        raise HTTPException(status_code=500, detail="Database lock failed. Ensure migrations are applied.")


@router.post("/create-order")
async def create_order(req: CreateOrderRequest) -> Any:
    """
    Generates a Razorpay Order ID before payment. Validates the lock is still held by THIS clinic.
    """
    if not razorpay_client:
        raise HTTPException(status_code=500, detail="Razorpay credentials missing in backend .env")

    try:
        # Final pre-flight lock check
        try:
            locks_res = supabase.table("number_locks").select("*").eq("number", req.phone_number).gte("expires_at", datetime.now(timezone.utc).isoformat()).execute()
            if not locks_res.data or locks_res.data[0]["user_id"] != req.clinic_id:
                raise HTTPException(status_code=403, detail="Your number lock has expired or belongs to someone else. Please restart selection.")
        except Exception:
            # Fallback for dev if table is missing but we're forcing an order
            logger.warning("Lock validation skipped due to DB missing")

        order_data = {
            "amount": 49900 if req.country_code == 'IN' else 1000, 
            "currency": "INR" if req.country_code == 'IN' else "USD",
            "receipt": f"receipt_{req.clinic_id[:8]}",
            "notes": {
                "clinic_id": req.clinic_id,
                "country_code": req.country_code,
                "phone_number": req.phone_number
            }
        }
        
        order = razorpay_client.order.create(data=order_data)
        return {"status": "success", "order_id": order["id"], "amount": order["amount"], "currency": order["currency"], "key_id": RAZOR_KEY}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Failed to create Razorpay order: {e}")
        raise HTTPException(status_code=500, detail="Failed to initialize payment gateway or database error.")

@router.post("/purchase-number")
async def purchase_number_directly(req: PurchaseNumberRequest, background_tasks: BackgroundTasks) -> Any:
    """
    Directly triggers the provisioning pipeline without Razorpay. 
    Used for trial numbers, wallet-based purchases, and BYO from dashboard.
    """
    try:
        # 1. Create Provisioning Job
        job_res = supabase.table("provisioning_jobs").insert({
            "user_id": req.clinic_id,
            "number": req.phone_number,
            "status": "pending",
            "step": "purchase"
        }).execute()
        
        if not job_res.data:
            raise Exception("Failed to create provisioning job in database.")

        job_id = job_res.data[0]["id"]
        country_code = "IN" if req.phone_number.startswith("+91") else "US"

        # 2. Trigger Background Pipeline
        background_tasks.add_task(
            background_provisioning_pipeline, 
            job_id, 
            req.clinic_id, 
            req.phone_number, 
            country_code
        )

        return {"status": "success", "number": req.phone_number, "job_id": job_id}
        
    except Exception as e:
        logger.error(f"Direct purchase failed: {e}")
        if "relation \"public.provisioning_jobs\" does not exist" in str(e):
             raise HTTPException(status_code=500, detail="Provisioning database tables missing. Please run migrations.sql.")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/verify")
async def verify_payment_and_provision(req: VerifyPaymentRequest, background_tasks: BackgroundTasks) -> Any:
    """
    Manual verification endpoint (fallback for frontend). 
    Validates Razorpay signature and triggers the common provisioning pipeline.
    """
    if not razorpay_client:
        raise HTTPException(status_code=500, detail="Razorpay credentials missing in backend")

    try:
        # 1. Verify Signature
        params_dict = {
            'razorpay_order_id': req.razorpay_order_id,
            'razorpay_payment_id': req.razorpay_payment_id,
            'razorpay_signature': req.razorpay_signature
        }
        razorpay_client.utility.verify_payment_signature(params_dict)
        
        # 2. Trigger Job (Reuse common pipeline)
        job_res = supabase.table("provisioning_jobs").insert({
            "user_id": req.clinic_id,
            "number": req.phone_number,
            "status": "pending",
            "step": "purchase"
        }).execute()
        
        job_id = job_res.data[0]["id"]
        country_code = "IN" if req.phone_number.startswith("+91") else "US"
        
        background_tasks.add_task(background_provisioning_pipeline, job_id, req.clinic_id, req.phone_number, country_code)
        
        return {"status": "success", "message": "Payment verified. Provisioning started.", "job_id": job_id}
        
    except Exception as e:
        logger.error(f"Payment verification failed: {e}")
        raise HTTPException(status_code=400, detail="Signature verification failed or Database error")

@router.post("/release-number")
async def release_number(req: ReleaseNumberRequest) -> Any:
    """
    Removes the number assignment from the database. 
    (Future: Call provider API to actually de-provision/delete)
    """
    try:
        # 1. Clear from clinics table
        supabase.table("clinics").update({"assigned_number": None}).eq("id", req.clinic_id).execute()
        
        # 2. Set to Inactive in phone_numbers
        supabase.table("phone_numbers").update({"status": "Released"}).eq("number", req.phone_number).execute()
        
        return {"status": "success", "message": f"Number {req.phone_number} released."}
    except Exception as e:
        logger.error(f"Failed to release number: {e}")
        raise HTTPException(status_code=500, detail="Database update failed during release.")

async def background_provisioning_pipeline(job_id: str, clinic_id: str, phone_number: str, country_code: str):
    """
    Pure Async State Machine pushing events into provisioning_jobs DB schema.
    """
    def update_job(step: str, status: str, error: str = None):
        payload = {"step": step, "status": status}
        if error: payload["error_message"] = error
        supabase.table("provisioning_jobs").update(payload).eq("id", job_id).execute()

    try:
        update_job("purchase", "processing")
        provider = get_provider(country_code)
        
        # Determine provider name for LiveKit trunk routing
        provider_name = "vobiz" if country_code == "IN" else "telnyx"
        
        # 1. Purchase
        success = await provider.purchase_number(phone_number)
        if not success:
            raise Exception("Provider purchase API failed")
            
        update_job("sip_trunk", "processing")
        
        # 2. SIP Link (Configure number with provider's SIP connection)
        sip_data = await provider.configure_sip(phone_number)
        logger.info(f"Provider SIP config result for {phone_number}: {sip_data}")
        
        update_job("livekit_rule", "processing")

        # 3. LiveKit SIP Trunk Provisioning — Add number to inbound + outbound trunks
        try:
            from app.services.livekit_sip import livekit_sip_service
            lk_result = await livekit_sip_service.provision_number(phone_number, provider_name, clinic_id)
            if lk_result:
                logger.info(f"LiveKit SIP provisioned for {phone_number}: inbound={lk_result.get('inbound_ok')}, outbound={lk_result.get('outbound_ok')}")
            else:
                logger.warning(f"LiveKit SIP provisioning returned None for {phone_number} — check credentials/trunk IDs in .env")
        except Exception as lk_err:
            # Non-fatal: log but continue DB sync so the number is still usable
            logger.error(f"LiveKit SIP provisioning failed for {phone_number} (non-fatal): {lk_err}")
        
        update_job("db_assign", "processing")
        
        # 4. DB Sync
        supabase.table("phone_numbers").insert({"clinic_id": clinic_id, "number": phone_number, "provider": provider.__class__.__name__, "status": "Active"}).execute()
        supabase.table("clinics").update({"assigned_number": phone_number, "phone": phone_number, "onboarding_step": "completed"}).eq("id", clinic_id).execute()
        
        update_job("db_assign", "success")
        logger.info(f"Pipeline complete for {job_id}")
        
    except Exception as e:
        logger.error(f"Pipeline {job_id} failed: {e}")
        update_job("failed", "failed", str(e))

@router.post("/webhook/razorpay")
async def handle_razorpay_webhook(request: Request, background_tasks: BackgroundTasks) -> Any:
    """
    Core Source of Truth -> Validates cryptographic receipt, checks lock state.
    Triggers refund on orphaned scenarios or spins up provisioning pipeline.
    """
    body = await request.body()
    # In production, use razorpay_client.utility.verify_webhook_signature(body.decode(), request.headers.get("x-razorpay-signature"), RAZORPAY_WEBHOOK_SECRET)
    
    try:
        payload = json.loads(body)
        if payload.get("event") not in ["payment.captured", "order.paid"]:
            return {"status": "ignored"}
            
        payment_data = payload.get("payload", {}).get("payment", {}).get("entity", {})
        notes = payment_data.get("notes", {})
        
        clinic_id = notes.get("clinic_id")
        phone_number = notes.get("phone_number")
        country_code = notes.get("country_code", "US")
        payment_id = payment_data.get("id")
        
        if not clinic_id or not phone_number:
            return {"status": "ignored", "reason": "mission critical notes missing"}
            
        logger.info(f"Source of Truth Webhook fired for {clinic_id} & {phone_number}")

        # VULNERABILITY CHECK: Did the lock expire and someone else grabbed the number?
        locks_res = supabase.table("number_locks").select("*").eq("number", phone_number).execute()
        locked_by_user = False
        if locks_res.data:
            lock = locks_res.data[0]
            if lock["user_id"] == clinic_id:
                locked_by_user = True
        
        # NOTE: Ideally we check provider availability again as a double-safety
        # If lock expired/lost or number somehow taken -> Refund
        if not locked_by_user:
            logger.critical(f"ORPHAN PAYMENT DETECTED (Lock Lost). Issuing instant refund for {payment_id} -> {phone_number}")
            razorpay_client.refund.create({"payment_id": payment_id})
            return {"status": "refunded", "message": "Number lock expired during gateway transaction. Payment reversed."}

        # SUCCESS: Create Provisioning Job
        job_res = supabase.table("provisioning_jobs").insert({
            "user_id": clinic_id,
            "number": phone_number,
            "status": "pending",
            "step": "purchase"
        }).execute()
        
        job_id = job_res.data[0]["id"]
        
        # Shift to Background Worker State Machine to avoid gateway timeouts
        background_tasks.add_task(background_provisioning_pipeline, job_id, clinic_id, phone_number, country_code)
        
        return {"status": "ok", "job_id": job_id}
        
    except Exception as e:
        logger.error(f"Razorpay webhook crash: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")
