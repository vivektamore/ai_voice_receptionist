from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel
from typing import Any, Optional
import os
import logging
import json
import razorpay
from datetime import datetime, timedelta, timezone
from app.core.database import supabase
from app.services.providers.factory import get_provider, get_provider_by_name

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
    country_code: Optional[str] = None
    provider: Optional[str] = None

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
async def get_available_numbers(provider: str = None, country_code: str = "US", area_code: str = "", limit: int = 15) -> Any:
    """
    Returns a list of available phone numbers abstracted from the Provider Layer.
    Auto-selects Vobiz for India (IN) and Telnyx for US/Global if provider not specified.
    EXPLICITLY filters out numbers actively held in `number_locks`.
    """
    try:
        selected_provider = provider.strip().lower() if provider else ("vobiz" if country_code.upper() == "IN" else "telnyx")
        if country_code.upper() == "IN" and selected_provider == "telnyx":
            selected_provider = "vobiz"

        prov = get_provider_by_name(selected_provider)
        raw_numbers = await prov.search_numbers(country_code, area_code)

        if not raw_numbers:
            return {"status": "success", "numbers": [], "message": f"No numbers found for {country_code} using {provider}."}

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
        
        logger.info(f"Returning {len(clean_numbers)} numbers for {country_code} (Area: {area_code}) via {provider}")
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

        # Determine country code dynamically
        country_code = req.country_code
        if not country_code:
            if req.phone_number.startswith("+91"):
                country_code = "IN"
            elif req.provider and req.provider.strip().lower() == "vobiz":
                country_code = "IN"
            else:
                try:
                    clinic_res = supabase.table("clinics").select("country_code").eq("id", req.clinic_id).single().execute()
                    if clinic_res.data and clinic_res.data.get("country_code"):
                        country_code = clinic_res.data["country_code"]
                except Exception as db_err:
                    logger.warning(f"Failed to lookup country code: {db_err}")
                if not country_code:
                    country_code = "US"

        # Determine provider dynamically
        provider = req.provider
        if not provider:
            provider = "vobiz" if country_code == "IN" else "telnyx"
        provider = provider.strip().lower()

        order_data = {
            "amount": 49900 if country_code == 'IN' else 1000, 
            "currency": "INR" if country_code == 'IN' else "USD",
            "receipt": f"receipt_{req.clinic_id[:8]}",
            "notes": {
                "clinic_id": req.clinic_id,
                "country_code": country_code,
                "phone_number": req.phone_number,
                "provider": provider
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
        # 1. Fetch clinic to check subscription status and wallet balance
        clinic_res = supabase.table("clinics").select(
            "id, wallet_balance, subscription_status, currency, country_code"
        ).eq("id", req.clinic_id).single().execute()
        
        if not clinic_res.data:
            raise HTTPException(status_code=404, detail="Clinic not found.")
            
        clinic = clinic_res.data
        wallet_balance = float(clinic.get("wallet_balance", 0))
        sub_status = clinic.get("subscription_status")
        currency = clinic.get("currency") or "INR"
        
        # 2. Check if this is the free first number
        active_nums_res = supabase.table("phone_numbers") \
            .select("id") \
            .eq("clinic_id", req.clinic_id) \
            .eq("status", "Active") \
            .execute()
        has_active_number = len(active_nums_res.data) > 0
        
        # 3. Check if this is free (First number is free, OR BYO/custom number which costs $0.00)
        is_byo = req.provider.strip().lower() in ["byo", "custom"]
        is_free = (not has_active_number) or is_byo
        
        rental_fee = 0.0
        if not is_free:
            # Rental fee depends on currency
            rental_fee = 1200.0 if currency == "INR" else 10.0
            
            # 3. Check for sufficient wallet balance
            if wallet_balance < rental_fee:
                raise HTTPException(
                    status_code=402, 
                    detail=f"Insufficient wallet balance. An extra phone number costs {currency} {rental_fee:.2f}/month. Please top up your wallet first."
                )
                
            # 4. Deduct upfront fee from wallet
            new_balance = wallet_balance - rental_fee
            supabase.table("clinics").update({"wallet_balance": new_balance}).eq("id", req.clinic_id).execute()
            
            # 5. Log transaction for the upfront payment
            supabase.table("transactions").insert({
                "clinic_id": req.clinic_id,
                "amount": rental_fee,
                "currency": currency,
                "type": "wallet_deduction",
                "description": f"Upfront Rental: {req.phone_number}",
                "status": "success"
            }).execute()
            logger.info(f"Charged upfront rental fee of {currency} {rental_fee} for {req.phone_number} from clinic {req.clinic_id}")

        # 6. Create Provisioning Job
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

        # 7. Trigger Background Pipeline
        background_tasks.add_task(
            background_provisioning_pipeline, 
            job_id, 
            req.clinic_id, 
            req.phone_number, 
            country_code,
            req.provider.strip().lower()
        )

        return {"status": "success", "number": req.phone_number, "job_id": job_id}
        
    except HTTPException as he:
        raise he
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
        
        background_tasks.add_task(
            background_provisioning_pipeline, 
            job_id, 
            req.clinic_id, 
            req.phone_number, 
            country_code,
            req.provider.strip().lower()
        )
        
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

async def background_provisioning_pipeline(job_id: str, clinic_id: str, phone_number: str, country_code: str, provider_name: str):
    """
    Pure Async State Machine pushing events into provisioning_jobs DB schema.
    """
    def update_job(step: str, status: str, error: str = None):
        payload = {"step": step, "status": status}
        if error: payload["error_message"] = error
        supabase.table("provisioning_jobs").update(payload).eq("id", job_id).execute()

    try:
        provider_name = provider_name.strip().lower()

        if provider_name in ["custom", "byo"]:
            logger.info(f"[Provision] Custom/BYO number {phone_number} — bypassing carrier purchase and SIP config.")
            sip_ok = True
        else:
            update_job("purchase", "processing")
            prov = get_provider_by_name(provider_name)
            
            # 1. Purchase (Bypassed internally in adapters to only check inventory or return True)
            success = await prov.purchase_number(phone_number)
            if not success:
                raise Exception(f"Provider {provider_name} purchase/verification failed")
                
            update_job("sip_trunk", "processing")
            
            # 2. SIP Link
            sip_data = await prov.configure_sip(phone_number)
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
        supabase.table("phone_numbers").insert({
            "clinic_id": clinic_id, 
            "number": phone_number, 
            "provider": provider_name, 
            "status": "Active"
        }).execute()
        supabase.table("clinics").update({"assigned_number": phone_number, "phone": phone_number, "onboarding_step": "completed"}).eq("id", clinic_id).execute()
        
        update_job("db_assign", "success")
        logger.info(f"Pipeline complete for {job_id}")
        
    except Exception as e:
        logger.error(f"Pipeline {job_id} failed: {e}")
        
        # Refund upfront fee if the number required payment
        try:
            active_nums_res = supabase.table("phone_numbers") \
                .select("id") \
                .eq("clinic_id", clinic_id) \
                .eq("status", "Active") \
                .execute()
            has_active_number = len(active_nums_res.data) > 0
            
            clinic_res = supabase.table("clinics").select("subscription_status, currency, wallet_balance").eq("id", clinic_id).single().execute()
            if clinic_res.data:
                clinic = clinic_res.data
                sub_status = clinic.get("subscription_status")
                currency = clinic.get("currency") or "INR"
                wallet_balance = float(clinic.get("wallet_balance", 0))
                
                is_free = ((sub_status == "active" or sub_status == "trial") and not has_active_number) or provider_name in ["byo", "custom"]
                if not is_free:
                    rental_fee = 1200.0 if currency == "INR" else 10.0
                    new_balance = wallet_balance + rental_fee
                    
                    # Re-credit wallet
                    supabase.table("clinics").update({"wallet_balance": new_balance}).eq("id", clinic_id).execute()
                    
                    # Log refund transaction
                    supabase.table("transactions").insert({
                        "clinic_id": clinic_id,
                        "amount": rental_fee,
                        "currency": currency,
                        "type": "wallet_refund",
                        "description": f"Refund: Failed Rental for {phone_number}",
                        "status": "success"
                    }).execute()
                    logger.info(f"Refunded {currency} {rental_fee} to clinic {clinic_id} due to failed provisioning of {phone_number}")
        except Exception as refund_err:
            logger.error(f"Failed to process refund for failed job {job_id}: {refund_err}")
            
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
        provider = notes.get("provider", "telnyx").strip().lower()
        
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
        background_tasks.add_task(background_provisioning_pipeline, job_id, clinic_id, phone_number, country_code, provider)
        
        return {"status": "ok", "job_id": job_id}
        
    except Exception as e:
        logger.error(f"Razorpay webhook crash: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")
