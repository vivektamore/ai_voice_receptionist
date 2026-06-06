from fastapi import APIRouter, HTTPException, Request, Header
from pydantic import BaseModel
from typing import Optional, Any
import logging
import json
import os
import razorpay
import hmac
import hashlib
from datetime import datetime, timedelta, timezone
from app.core.database import supabase
from app.core.config import settings

logger = logging.getLogger("billing")
router = APIRouter()

from app.services.telephony_client import telephony_client
from app.services.livekit_sip import livekit_sip_service
import asyncio

async def auto_provision_number(clinic_id: str, country_code: str):
    """
    Searches, purchases, and provisions a phone number based on clinic's country/region.
    Runs in the background to prevent webhook timeout.
    """
    try:
        # 1. Verify if clinic already has a number assigned
        clinic_chk = supabase.table("clinics").select("assigned_number").eq("id", clinic_id).single().execute()
        if clinic_chk.data and clinic_chk.data.get("assigned_number"):
            logger.info(f"[Auto-Provision] Clinic {clinic_id} already has a number assigned: {clinic_chk.data['assigned_number']}. Skipping.")
            return

        # 2. Select provider based on region
        provider = "vobiz" if country_code == "IN" else "telnyx"
        logger.info(f"[Auto-Provision] Selected provider {provider} for country {country_code}")

        # 3. Find an available number
        available = await telephony_client.search_numbers(provider=provider, country_code=country_code, limit=1)
        if not available:
            logger.error(f"[Auto-Provision] No available numbers found from {provider} for country {country_code}")
            return
        
        target_number = available[0]["number"]
        logger.info(f"[Auto-Provision] Auto-selected number: {target_number} for clinic {clinic_id}")

        # 4. Purchase number from provider
        purchased = await telephony_client.purchase_number(provider=provider, target_number=target_number)
        if not purchased:
            logger.error(f"[Auto-Provision] Failed to verify/purchase number {target_number} from {provider}")
            return

        # 5. Configure SIP Trunk route (DID -> LiveKit)
        await telephony_client.configure_sip_trunk(provider=provider, phone_number=target_number)

        # 6. Provision inside LiveKit trunks
        lk_result = await livekit_sip_service.provision_number(
            phone_number=target_number,
            provider=provider,
            clinic_id=clinic_id
        )
        inbound_ok = lk_result.get("inbound_ok", False) if lk_result else False

        # 7. Save to Database
        supabase.table("clinics").update({
            "assigned_number": target_number,
            "sms_provider": provider
        }).eq("id", clinic_id).execute()

        # Insert into phone_numbers table
        sip_domain = os.getenv("LIVEKIT_SIP_DOMAIN", "sip.livekit.cloud")
        existing_num = supabase.table("phone_numbers") \
            .select("id") \
            .eq("clinic_id", clinic_id) \
            .eq("phone_number", target_number) \
            .execute()

        if not existing_num.data:
            supabase.table("phone_numbers").insert({
                "clinic_id": clinic_id,
                "phone_number": target_number,
                "provider": provider,
                "country": country_code,
                "status": "Active",
                "sip_domain": sip_domain
            }).execute()
        else:
            supabase.table("phone_numbers").update({
                "status": "Active",
                "provider": provider,
                "sip_domain": sip_domain
            }).eq("clinic_id", clinic_id).eq("phone_number", target_number).execute()

        logger.info(f"[Auto-Provision] ✅ Successfully auto-provisioned and locked {target_number} for clinic {clinic_id} (LiveKit status: {inbound_ok})")
    except Exception as e:
        logger.error(f"[Auto-Provision] Failed during auto-provisioning background task: {e}", exc_info=True)


# ── Trial Plan Configuration ──────────────────────────────────────────────────
TRIAL_DAYS = 7
TRIAL_MINUTES_LIMIT = 100
TRIAL_SMS_LIMIT = 100

class StartTrialRequest(BaseModel):
    clinic_id: str

@router.post("/start-trial")
async def start_trial(req: StartTrialRequest):
    """
    Activates a 7-day free trial for a brand-new clinic.
    Blocked if the clinic has ever had a subscription or previous trial.
    """
    try:
        clinic_res = supabase.table("clinics").select(
            "subscription_status, razorpay_subscription_id, trial_ends_at"
        ).eq("id", req.clinic_id).single().execute()

        if not clinic_res.data:
            raise HTTPException(status_code=404, detail="Clinic not found")

        clinic = clinic_res.data

        # Block if they already had a trial or subscription
        if clinic.get("trial_ends_at"):
            raise HTTPException(status_code=409, detail="Trial already used for this account.")
        if clinic.get("razorpay_subscription_id"):
            raise HTTPException(status_code=409, detail="This account already has a subscription. Trials are for new accounts only.")

        trial_end = (datetime.now(timezone.utc) + timedelta(days=TRIAL_DAYS)).isoformat()

        supabase.table("clinics").update({
            "subscription_status": "trial",
            "trial_ends_at": trial_end,
            "monthly_minutes_limit": TRIAL_MINUTES_LIMIT,
            "monthly_sms_limit": TRIAL_SMS_LIMIT,
        }).eq("id", req.clinic_id).execute()

        logger.info(f"Trial activated for clinic {req.clinic_id} until {trial_end}")
        return {"status": "success", "trial_ends_at": trial_end, "minutes_limit": TRIAL_MINUTES_LIMIT}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start trial for {req.clinic_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to activate trial. Please try again.")

# ── Auto-Recharge Standard Topup Amounts ─────────────────────────────────────
# When auto_recharge fires, we top up by this fixed amount (not just the exact
# rental fee) so the wallet has a buffer and doesn't need recharging every month.
AUTO_RECHARGE_AMOUNT: dict = {"INR": 999.0, "USD": 20.0}

# Initialize Razorpay client
razorpay_client = None
print(f"DEBUG: RAZOR_KEY_ID={settings.razorpay_key_id}")
print(f"DEBUG: PLAN_USD={settings.razorpay_plan_id_usd}")

if settings.razorpay_key_id and settings.razorpay_key_secret:
    razorpay_client = razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))

class SubscriptionRequest(BaseModel):
    clinic_id: str
    currency: Optional[str] = None # 'USD' or 'INR'

class TopupRequest(BaseModel):
    clinic_id: str
    amount: float # In actual currency (e.g., 50.00)
    currency: str

@router.post("/resume-subscription")
async def resume_subscription(req: SubscriptionRequest):
    if not razorpay_client:
        raise HTTPException(status_code=500, detail="Razorpay not configured")
    
    # 1. Fetch clinic to get subscription ID
    clinic = supabase.table("clinics").select("razorpay_subscription_id").eq("id", req.clinic_id).single().execute()
    if not clinic.data or not clinic.data.get("razorpay_subscription_id"):
        raise HTTPException(status_code=400, detail="No active subscription found for this clinic.")
    
    sub_id = clinic.data["razorpay_subscription_id"]

    try:
        # 2. Update to NOT cancel at cycle end
        # In razorpay-python, the method is often .edit() instead of .update()
        razorpay_client.subscription.edit(sub_id, {"cancel_at_cycle_end": 0})
        
        # 3. Restore local status
        supabase.table("clinics").update({
            "subscription_status": "active"
        }).eq("id", req.clinic_id).execute()
        
        return {"status": "success", "message": "Subscription resumed successfully."}
    except Exception as e:
        error_msg = str(e).lower()
        if "upi" in error_msg:
            raise HTTPException(
                status_code=400, 
                detail="UPI Subscription mandates cannot be modified once scheduled for cancellation. You will need to re-subscribe after the current plan expires."
            )
        logger.error(f"Failed to resume subscription {sub_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-subscription")
async def create_subscription(req: SubscriptionRequest):
    if not razorpay_client:
        raise HTTPException(status_code=500, detail="Razorpay not configured")
    
    # NEW: Fetch clinic's country_code to force regional pricing
    clinic = supabase.table("clinics").select("country_code").eq("id", req.clinic_id).single().execute()
    country = clinic.data.get("country_code", "US") if clinic.data else "US"
    
    # Allow explicit override from the request (e.g. for testing USD vs INR)
    if req.currency == "USD":
        country = "US"
    elif req.currency == "INR":
        country = "IN"
    
    # Select Plan ID based on fixed Country -> Plan Mapping
    if country == "IN":
        plan_id = settings.razorpay_plan_id_inr
        currency = "INR"
    else:
        # Fallback to USD for Rest of World
        plan_id = settings.razorpay_plan_id_usd
        currency = "USD"
    
    if not plan_id:
        raise HTTPException(status_code=400, detail=f"No Plan ID configured for {country}")

    try:
        subscription_data = {
            "plan_id": plan_id,
            "total_count": 12, # 1 year for now
            "quantity": 1,
            "customer_notify": 1,
            "notes": {
                "clinic_id": req.clinic_id,
                "type": "subscription"
            }
        }
        
        subscription = razorpay_client.subscription.create(data=subscription_data)
        
        # Update clinic status
        supabase.table("clinics").update({
            "razorpay_subscription_id": subscription["id"],
            "subscription_status": "pending",
            "currency": currency,
            "country_code": country
        }).eq("id", req.clinic_id).execute()
        
        return {
            "status": "success",
            "subscription_id": subscription["id"],
            "key_id": settings.razorpay_key_id
        }
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"Failed to create subscription: {error_details}")
        raise HTTPException(
            status_code=500, 
            detail={
                "message": str(e),
                "traceback": error_details
            }
        )

@router.post("/create-topup-order")
async def create_topup_order(req: TopupRequest):
    if not razorpay_client:
        raise HTTPException(status_code=500, detail="Razorpay not configured")
    
    try:
        # Amount in paise (multiply by 100)
        amount_paise = int(req.amount * 100)
        
        order_data = {
            "amount": amount_paise,
            "currency": req.currency,
            "receipt": f"topup_{req.clinic_id[:8]}",
            "notes": {
                "clinic_id": req.clinic_id,
                "type": "wallet_topup",
                "amount": str(req.amount)
            }
        }
        
        order = razorpay_client.order.create(data=order_data)
        
        return {
            "status": "success",
            "order_id": order["id"],
            "amount": order["amount"],
            "currency": order["currency"],
            "key_id": settings.razorpay_key_id
        }
    except Exception as e:
        logger.error(f"Failed to create topup order: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhook")
async def handle_razorpay_webhook(request: Request, x_razorpay_signature: Optional[str] = Header(None)):
    body = await request.body()
    
    # Signature verification
    if settings.razorpay_webhook_secret and x_razorpay_signature:
        expected_signature = hmac.new(
            settings.razorpay_webhook_secret.encode(),
            body,
            hashlib.sha256
        ).hexdigest()
        
        if expected_signature != x_razorpay_signature:
            logger.error("Razorpay webhook signature mismatch")
            raise HTTPException(status_code=400, detail="Invalid signature")

    try:
        payload = json.loads(body)
        event = payload.get("event")
        data = payload.get("payload", {})
        
        logger.info(f"Received Razorpay Webhook: {event}")

        # ── Subscription Charged (Monthly Renewal) ──────────────────────────
        if event == "subscription.charged":
            sub_entity = data.get("subscription", {}).get("entity", {})
            payment_entity = data.get("payment", {}).get("entity", {})
            notes = sub_entity.get("notes", {})
            clinic_id = notes.get("clinic_id")
            
            if clinic_id:
                # Reset monthly quotas and set status to active
                # Also store the end of the current period for display
                current_end = sub_entity.get("current_end") # Unix timestamp from Razorpay
                end_date = None
                if current_end:
                    from datetime import timezone as tz
                    end_date = datetime.fromtimestamp(current_end, tz=tz.utc).isoformat()

                update_payload = {
                    "subscription_status": "active",
                    "monthly_minutes_used": 0,
                    "monthly_sms_used": 0
                }
                if end_date:
                    update_payload["subscription_end_date"] = end_date

                supabase.table("clinics").update(update_payload).eq("id", clinic_id).execute()
                
                # Log transaction
                supabase.table("transactions").insert({
                    "clinic_id": clinic_id,
                    "razorpay_payment_id": payment_entity.get("id"),
                    "amount": payment_entity.get("amount") / 100,
                    "currency": payment_entity.get("currency"),
                    "type": "subscription",
                    "description": "Growth Plan — Monthly Renewal",
                    "status": "success"
                }).execute()
                logger.info(f"Subscription renewed for clinic {clinic_id}")

                # Trigger background task for automatic phone number provisioning
                try:
                    clinic_res = supabase.table("clinics").select("country_code").eq("id", clinic_id).single().execute()
                    country_code = "US"
                    if clinic_res.data and clinic_res.data.get("country_code"):
                        country_code = clinic_res.data["country_code"]
                    else:
                        pay_currency = payment_entity.get("currency")
                        if pay_currency and "INR" in pay_currency.upper():
                            country_code = "IN"
                    
                    logger.info(f"[Webhook] Triggering auto-provisioning task for clinic {clinic_id} in country {country_code}")
                    asyncio.create_task(auto_provision_number(clinic_id, country_code))
                except Exception as ex:
                    logger.error(f"[Webhook] Failed to trigger auto-provisioning task: {ex}")

        # ── Subscription Cancelled at Cycle End (scheduled) ─────────────────
        elif event == "subscription.cancelled":
            # Razorpay fires this when the subscription is actually cancelled
            # (either immediately or when the billing cycle ends for cancel_at_cycle_end=1)
            sub_entity = data.get("subscription", {}).get("entity", {})
            notes = sub_entity.get("notes", {})
            clinic_id = notes.get("clinic_id")
            
            if clinic_id:
                # Store the end date so we can show the user when access ends
                current_end = sub_entity.get("current_end")
                end_date = None
                if current_end:
                    from datetime import timezone as tz
                    end_date = datetime.fromtimestamp(current_end, tz=tz.utc).isoformat()

                update_payload = {"subscription_status": "inactive"}
                if end_date:
                    update_payload["subscription_end_date"] = end_date

                supabase.table("clinics").update(update_payload).eq("id", clinic_id).execute()
                logger.info(f"Subscription CANCELLED → set inactive for clinic {clinic_id}")
        
        # ── Subscription Completed (all cycles exhausted) ────────────────────
        elif event == "subscription.completed":
            sub_entity = data.get("subscription", {}).get("entity", {})
            notes = sub_entity.get("notes", {})
            clinic_id = notes.get("clinic_id")
            
            if clinic_id:
                supabase.table("clinics").update({
                    "subscription_status": "inactive"
                }).eq("id", clinic_id).execute()
                logger.info(f"Subscription COMPLETED (all cycles done) → set inactive for clinic {clinic_id}")

        # ── Subscription Expired (e.g., failed payment deactivation) ─────────
        elif event == "subscription.expired":
            sub_entity = data.get("subscription", {}).get("entity", {})
            notes = sub_entity.get("notes", {})
            clinic_id = notes.get("clinic_id")
            
            if clinic_id:
                supabase.table("clinics").update({
                    "subscription_status": "inactive"
                }).eq("id", clinic_id).execute()
                logger.info(f"Subscription EXPIRED → set inactive for clinic {clinic_id}")

        # ── Payment Captured (Wallet Top-up OR Auto-Recharge) ────────────────
        elif event == "payment.captured":
            payment_entity = data.get("payment", {}).get("entity", {})
            notes = payment_entity.get("notes", {})
            payment_type = notes.get("type")

            if payment_type in ("wallet_topup", "auto_recharge"):
                clinic_id = notes.get("clinic_id")
                amount = float(notes.get("amount", 0))
                payment_id = payment_entity.get("id")
                currency = payment_entity.get("currency", notes.get("currency", "INR"))

                if clinic_id and amount > 0:
                    # Credit wallet
                    clinic = supabase.table("clinics").select("wallet_balance").eq("id", clinic_id).single().execute()
                    current_balance = float(clinic.data.get("wallet_balance", 0))
                    new_balance = current_balance + amount

                    supabase.table("clinics").update({
                        "wallet_balance": new_balance
                    }).eq("id", clinic_id).execute()

                    if payment_type == "auto_recharge":
                        # Update the pending auto-recharge transaction to success
                        supabase.table("transactions").update({
                            "razorpay_payment_id": payment_id,
                            "status": "success",
                            "description": f"Wallet Auto-Recharged: +{currency} {amount:.2f}"
                        }).eq("clinic_id", clinic_id).eq("type", "auto_recharge").eq("status", "pending").execute()
                        logger.info(f"[Webhook] Auto-recharge credited {currency} {amount} to clinic {clinic_id}. New balance: {new_balance}")
                    else:
                        # Manual top-up — always insert a fresh transaction
                        supabase.table("transactions").insert({
                            "clinic_id": clinic_id,
                            "razorpay_payment_id": payment_id,
                            "razorpay_order_id": payment_entity.get("order_id"),
                            "amount": amount,
                            "currency": currency,
                            "type": "wallet_topup",
                            "description": "Manual Wallet Top-up",
                            "status": "success"
                        }).execute()
                        logger.info(f"[Webhook] Manual topup credited {currency} {amount} to clinic {clinic_id}. New balance: {new_balance}")

        # ── Invoice Paid (Auto-Recharge via Subscription Mandate) ─────────────
        elif event == "invoice.paid":
            invoice_entity = data.get("invoice", {}).get("entity", {})
            notes = invoice_entity.get("notes", {})

            if notes.get("type") == "auto_recharge":
                clinic_id = notes.get("clinic_id")
                amount = float(notes.get("amount", 0))
                currency = notes.get("currency", "INR")
                invoice_id = invoice_entity.get("id", "unknown")

                if clinic_id and amount > 0:
                    # Credit wallet
                    clinic = supabase.table("clinics").select("wallet_balance").eq("id", clinic_id).single().execute()
                    current_balance = float(clinic.data.get("wallet_balance", 0))
                    new_balance = current_balance + amount

                    supabase.table("clinics").update({
                        "wallet_balance": new_balance
                    }).eq("id", clinic_id).execute()

                    # Update pending auto-recharge transaction
                    supabase.table("transactions").update({
                        "razorpay_payment_id": invoice_id,
                        "status": "success",
                        "description": f"Wallet Auto-Recharged: +{currency} {amount:.2f}"
                    }).eq("clinic_id", clinic_id).eq("type", "auto_recharge").eq("status", "pending").execute()

                    logger.info(f"[Webhook] invoice.paid — Auto-recharge credited {currency} {amount} to clinic {clinic_id}. New balance: {new_balance}")

        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook processing error: {e}")
        return {"status": "error", "message": str(e)}

@router.post("/cancel-subscription")
async def cancel_subscription(req: SubscriptionRequest):
    if not razorpay_client:
        raise HTTPException(status_code=500, detail="Razorpay not configured")
    
    # 1. Fetch clinic to get subscription ID
    clinic = supabase.table("clinics").select("razorpay_subscription_id").eq("id", req.clinic_id).single().execute()
    if not clinic.data or not clinic.data.get("razorpay_subscription_id"):
        raise HTTPException(status_code=400, detail="No active subscription found for this clinic.")
    
    sub_id = clinic.data["razorpay_subscription_id"]

    try:
        # 2. Cancel in Razorpay
        try:
            # First try canceling at the end of the current billing cycle
            razorpay_client.subscription.cancel(sub_id, {"cancel_at_cycle_end": 1})
            status_to_set = "cancelling"
            return_msg = "Subscription scheduled for cancellation at period end."
        except Exception as ra_e:
            error_msg = str(ra_e).lower()
            # If the subscription hasn't officially started a cycle (e.g. pending/created)
            # we cannot cancel at cycle end. We must cancel immediately.
            if "no billing cycle is going on" in error_msg:
                razorpay_client.subscription.cancel(sub_id, {"cancel_at_cycle_end": 0})
                status_to_set = "inactive"
                return_msg = "Subscription cancelled immediately as no active billing cycle was found."
            else:
                raise ra_e
        
        # 3. Update local status
        supabase.table("clinics").update({
            "subscription_status": status_to_set
        }).eq("id", req.clinic_id).execute()
        
        return {"status": "success", "message": return_msg}
    except Exception as e:
        logger.error(f"Failed to cancel subscription {sub_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class AutoRechargeRequest(BaseModel):
    clinic_id: str
    enabled: bool

@router.post("/toggle-auto-recharge")
async def toggle_auto_recharge(req: AutoRechargeRequest):
    try:
        supabase.table("clinics").update({
            "auto_recharge": req.enabled
        }).eq("id", req.clinic_id).execute()
        return {"status": "success", "auto_recharge": req.enabled}
    except Exception as e:
        logger.error(f"Failed to toggle auto-recharge: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/check-status/{clinic_id}")
async def check_subscription_status(clinic_id: str):
    if not razorpay_client:
        raise HTTPException(status_code=500, detail="Razorpay not configured")
    
    # 1. Fetch clinic to get subscription ID
    clinic = supabase.table("clinics").select("razorpay_subscription_id").eq("id", clinic_id).single().execute()
    if not clinic.data or not clinic.data.get("razorpay_subscription_id"):
        return {"status": "inactive"}
    
    sub_id = clinic.data["razorpay_subscription_id"]

    try:
        # 2. Fetch latest status from Razorpay
        subscription = razorpay_client.subscription.fetch(sub_id)
        rzp_status = subscription.get("status", "pending")
        
        # 3. Map Razorpay status to our local status
        # Razorpay: active, authenticated, pending, cancelled, etc.
        # We also need to reset quotas if it just became active
        if rzp_status == "active":
            supabase.table("clinics").update({
                "subscription_status": "active"
            }).eq("id", clinic_id).execute()
        
        return {"status": rzp_status}
    except Exception as e:
        logger.error(f"Failed to check subscription status {sub_id}: {e}")
        return {"status": "error", "message": str(e)}

@router.get("/history/{clinic_id}")
async def get_billing_history(clinic_id: str):
    try:
        res = supabase.table("transactions").select("*").eq("clinic_id", clinic_id).order("created_at", desc=True).execute()
        return res.data
    except Exception as e:
        logger.error(f"Failed to fetch billing history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Auto-Recharge Helper (called by cron when wallet is insufficient) ─────────
async def _trigger_auto_recharge(
    clinic_id: str,
    required_amount: float,
    currency: str,
    reason: str = "Wallet Auto-Recharge"
) -> bool:
    """
    Silently charges the clinic via their saved Razorpay subscription mandate
    by creating a Razorpay Invoice linked to the subscription.

    When Razorpay collects payment it fires `invoice.paid` / `payment.captured`
    — the webhook above then credits the wallet automatically.

    Returns True  → invoice created successfully (payment is in-flight).
    Returns False → no subscription / Razorpay error (caller should deactivate).
    """
    if not razorpay_client:
        logger.error(f"[Auto-Recharge] Razorpay not configured — cannot charge clinic {clinic_id}")
        return False

    try:
        # 1. Fetch subscription details
        clinic_res = supabase.table("clinics").select(
            "razorpay_subscription_id, subscription_status"
        ).eq("id", clinic_id).single().execute()

        if not clinic_res.data:
            logger.warning(f"[Auto-Recharge] Clinic {clinic_id} not found")
            return False

        sub_id = clinic_res.data.get("razorpay_subscription_id")
        sub_status = clinic_res.data.get("subscription_status")

        if not sub_id:
            logger.warning(f"[Auto-Recharge] No subscription ID for clinic {clinic_id}")
            return False

        if sub_status not in ("active", "cancelling"):
            logger.warning(
                f"[Auto-Recharge] Subscription not in chargeable state "
                f"({sub_status}) for clinic {clinic_id}"
            )
            return False

        # 2. Determine topup amount — use the standard recharge amount so the
        #    wallet has a buffer for future months, not just a one-off charge.
        topup_amount = AUTO_RECHARGE_AMOUNT.get(currency, AUTO_RECHARGE_AMOUNT["INR"])
        if topup_amount < required_amount:
            topup_amount = required_amount  # always cover at least what's needed

        amount_paise = int(topup_amount * 100)  # Razorpay wants smallest currency unit

        # 3. Create a Razorpay Invoice linked to the subscription.
        #    Razorpay auto-collects this via the saved card/UPI mandate.
        invoice = razorpay_client.invoice.create({
            "type": "invoice",
            "subscription_id": sub_id,
            "description": reason,
            "line_items": [{
                "name": reason,
                "amount": amount_paise,
                "currency": currency,
                "quantity": 1
            }],
            "notes": {
                "clinic_id": clinic_id,
                "type": "auto_recharge",
                "amount": str(topup_amount),
                "currency": currency,
                "reason": reason
            }
        })

        invoice_id = invoice.get("id", "unknown")
        logger.info(
            f"[Auto-Recharge] Invoice {invoice_id} created for clinic {clinic_id} "
            f"— {currency} {topup_amount:.2f}"
        )

        # 4. Insert a PENDING audit trail immediately; the webhook will flip it to success.
        supabase.table("transactions").insert({
            "clinic_id": clinic_id,
            "razorpay_payment_id": invoice_id,
            "amount": topup_amount,
            "currency": currency,
            "type": "auto_recharge",
            "description": f"Auto-Recharge Initiated — {reason}",
            "status": "pending"
        }).execute()

        return True

    except Exception as e:
        logger.error(f"[Auto-Recharge] Invoice creation failed for clinic {clinic_id}: {e}")
        return False
