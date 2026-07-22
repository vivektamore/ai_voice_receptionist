from fastapi import APIRouter, HTTPException, BackgroundTasks, Header
from typing import Optional
import os
import logging
from datetime import datetime
from app.core.database import supabase
from app.api.routes.billing import _trigger_auto_recharge

logger = logging.getLogger("cron")
router = APIRouter()

# ── Cron Secret Auth ──────────────────────────────────────────────────────────
# All cron endpoints require the X-Cron-Secret header.
# Set CRON_SECRET in your backend .env and pass it from your cron scheduler.
CRON_SECRET = os.getenv("CRON_SECRET", "")

def _verify_cron_secret(x_cron_secret: Optional[str]):
    """Reject requests without a valid cron secret header."""
    if not CRON_SECRET:
        logger.error("CRON_SECRET is not set in environment. All cron calls will be blocked.")
        raise HTTPException(status_code=500, detail="CRON_SECRET not configured on server")
    if x_cron_secret != CRON_SECRET:
        logger.warning(f"Cron secret mismatch — blocked unauthorized cron call")
        raise HTTPException(status_code=403, detail="Forbidden: invalid or missing X-Cron-Secret header")


@router.post("/process-number-rentals")
async def process_number_rentals(
    background_tasks: BackgroundTasks,
    x_cron_secret: Optional[str] = Header(None)
):
    """
    Cron job triggered securely (e.g. daily) to process monthly phone number rentals.
    Requires X-Cron-Secret header matching CRON_SECRET env var.
    - Finds active numbers whose next_billing_date <= NOW().
    - Skips the 'first' oldest active number IF the clinic has an active subscription.
    - Deducts the rental_fee from the clinic's wallet for the remaining numbers.
    - Disables the number if the wallet is empty.
    """
    _verify_cron_secret(x_cron_secret)
    logger.info("Starting process-number-rentals cron job...")
    
    # Run the processing in the background so the HTTP request returns immediately
    background_tasks.add_task(_process_rentals_task)
    return {"status": "processing"}

async def _process_rentals_task():
    try:
        current_time = datetime.utcnow().isoformat()
        
        # 1. Fetch all phone numbers that are due for billing
        # Filter for status='Active' and next_billing_date <= now
        query = supabase.table("phone_numbers").select(
            "*, clinics(id, wallet_balance, subscription_status, auto_recharge, currency)"
        ).eq("status", "Active").lte("next_billing_date", current_time).execute()
        
        due_numbers = query.data
        if not due_numbers:
            logger.info("No numbers due for rental payment.")
            return

        # Group numbers by clinic_id to figure out which one is the "free first number"
        clinics_map = {}
        for num in due_numbers:
            cid = num.get("clinic_id")
            if cid not in clinics_map:
                clinics_map[cid] = []
            clinics_map[cid].append(num)
            
        for clinic_id, numbers in clinics_map.items():
            # Get clinic data from the joined query
            clinic_data = numbers[0].get("clinics")
            if not clinic_data:
                continue
                
            wallet_balance = float(clinic_data.get("wallet_balance", 0))
            sub_status = clinic_data.get("subscription_status")
            
            # Fetch ALL active numbers for this clinic, ordered by created_at, to determine if these ones are the "free" one
            all_active = supabase.table("phone_numbers").select("id").eq("clinic_id", clinic_id).eq("status", "Active").order("created_at").execute()
            
            free_number_id = None
            if sub_status == "active" and all_active.data:
                free_number_id = all_active.data[0]["id"]
            
            for num in numbers:
                num_id = num["id"]
                phone = num["number"]
                rental_fee = float(num.get("rental_fee", 10))
                
                # Check if this is the free number
                is_free = (num_id == free_number_id)
                
                if is_free:
                    # Update billing date without charging
                    _update_next_billing(num_id)
                    logger.info(f"Skipped rental for {phone} (Free First Number)")
                    continue
                
                # Requires payment
                if wallet_balance >= rental_fee:
                    # Deduct from wallet
                    wallet_balance -= rental_fee
                    
                    # Update clinic wallet
                    supabase.table("clinics").update({"wallet_balance": wallet_balance}).eq("id", clinic_id).execute()
                    
                    # Log transaction
                    supabase.table("transactions").insert({
                        "clinic_id": clinic_id,
                        "amount": rental_fee,
                        "currency": "USD" if rental_fee < 50 else "INR", # rough inference based on user decision, default $10
                        "type": "wallet_deduction",
                        "description": f"Monthly Rental: {phone}",
                        "status": "success"
                    }).execute()
                    
                    # Update next_billing_date
                    _update_next_billing(num_id)
                    logger.info(f"Charged {rental_fee} for {phone}")
                else:
                    # INSUFFICIENT FUNDS — check if auto-recharge is enabled first
                    auto_recharge_enabled = clinic_data.get("auto_recharge", False)
                    currency = clinic_data.get("currency") or "INR"

                    if auto_recharge_enabled:
                        logger.info(
                            f"[Cron] Wallet insufficient for {phone} "
                            f"(need {rental_fee}, have {wallet_balance}). "
                            f"Triggering auto-recharge for clinic {clinic_id}..."
                        )
                        recharged = await _trigger_auto_recharge(
                            clinic_id=clinic_id,
                            required_amount=rental_fee,
                            currency=currency,
                            reason=f"Auto-Recharge: Monthly Rental for {phone}"
                        )
                        if recharged:
                            # Invoice is in-flight; keep the number Active.
                            # The wallet will be credited by the Razorpay webhook and
                            # the next cron run will deduct the rental fee normally.
                            logger.info(f"[Cron] Auto-recharge invoice created. {phone} stays Active pending payment.")
                        else:
                            # Invoice creation failed (no subscription / API error) — deactivate now.
                            supabase.table("phone_numbers").update({"status": "Inactive"}).eq("id", num_id).execute()
                            logger.warning(
                                f"[Cron] Deactivated {phone}: auto-recharge was attempted but failed "
                                f"(clinic {clinic_id})"
                            )
                    else:
                        # Auto-recharge disabled — deactivate immediately
                        supabase.table("phone_numbers").update({"status": "Inactive"}).eq("id", num_id).execute()
                        logger.warning(
                            f"[Cron] Deactivated {phone}: insufficient funds "
                            f"(need {rental_fee}, have {wallet_balance}) and auto-recharge is OFF."
                        )
                    
    except Exception as e:
        logger.error(f"Error in _process_rentals_task: {e}")

def _update_next_billing(number_id: str):
    # Using SQL interval via rpc is easiest, but since we are purely API, we just let Postgres handle it via a string query or we fetch now + timedelta in python.
    from datetime import timedelta
    next_date = (datetime.utcnow() + timedelta(days=30)).isoformat()
    supabase.table("phone_numbers").update({
        "next_billing_date": next_date
    }).eq("id", number_id).execute()
