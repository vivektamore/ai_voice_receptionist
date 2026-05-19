"""
stripe_billing.py — Production Stripe Subscription Billing

Routes:
  API (mounted at /api/v1/stripe):
    POST /create-checkout         — creates Stripe Checkout session → returns {url}
    POST /create-portal           — creates Stripe Customer Portal session → returns {url}
    POST /cancel-subscription     — cancels at period end
    GET  /subscription-status     — live status from Stripe

  Webhook (mounted at /api/webhooks):
    POST /stripe                  — raw body, signature-verified webhook handler

Webhook events handled:
  checkout.session.completed      → link customer/subscription, set active
  customer.subscription.updated   → sync status (active/past_due/cancelling)
  customer.subscription.deleted   → set inactive
  invoice.payment_succeeded       → reset monthly quotas, log transaction
  invoice.payment_failed          → set past_due
"""

import logging
import stripe
from datetime import datetime
from typing import Optional, Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.core.config import settings
from app.core.database import supabase

logger = logging.getLogger("stripe_billing")
logger.setLevel(logging.INFO)

# ─── Routers ──────────────────────────────────────────────────────────────────
router = APIRouter()           # UI-facing API  → /api/v1/stripe/...
webhook_router = APIRouter()   # Webhook        → /api/webhooks/stripe


# ─── Request Models ───────────────────────────────────────────────────────────
class ClinicRequest(BaseModel):
    clinic_id: str


# ─── Stripe Client Helper ─────────────────────────────────────────────────────
def _get_stripe():
    """Return configured stripe module or raise 503."""
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Stripe is not configured on this server.")
    stripe.api_key = settings.stripe_secret_key
    return stripe


# ─── API Endpoints ────────────────────────────────────────────────────────────

@router.post("/create-checkout")
async def create_checkout_session(req: ClinicRequest) -> Any:
    """
    Creates a Stripe Checkout session for a new subscription.
    Returns the hosted checkout URL to redirect the user to.
    """
    s = _get_stripe()

    # 1. Fetch clinic
    clinic_res = supabase.table("clinics") \
        .select("id, email, stripe_customer_id, subscription_status") \
        .eq("id", req.clinic_id).single().execute()

    if not clinic_res.data:
        raise HTTPException(status_code=404, detail="Clinic not found.")

    clinic = clinic_res.data

    # 2. Prevent double-subscription
    if clinic.get("subscription_status") == "active":
        raise HTTPException(status_code=400, detail="This clinic already has an active subscription.")

    if not settings.stripe_plan_id_usd:
        raise HTTPException(status_code=503, detail="Stripe Price ID not configured.")

    # 3. Use USD plan — INR customers use Razorpay (not Stripe)
    price_id = settings.stripe_plan_id_usd

    # 4. Create or reuse Stripe Customer
    customer_id = clinic.get("stripe_customer_id")
    if not customer_id:
        customer = s.Customer.create(
            email=clinic.get("email") or "",
            metadata={"clinic_id": req.clinic_id}
        )
        customer_id = customer.id
        supabase.table("clinics").update({
            "stripe_customer_id": customer_id
        }).eq("id", req.clinic_id).execute()
        logger.info(f"[Stripe] Created new customer {customer_id} for clinic {req.clinic_id}")

    # 5. Create Checkout Session
    session = s.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{
            "price": price_id,
            "quantity": 1,
        }],
        success_url=settings.stripe_success_url,
        cancel_url=settings.stripe_cancel_url,
        metadata={"clinic_id": req.clinic_id},
        subscription_data={
            "metadata": {"clinic_id": req.clinic_id}
        },
        allow_promotion_codes=True,
        billing_address_collection="auto",
    )

    logger.info(f"[Stripe] Checkout session created: {session.id} | price: {price_id}")
    return {"status": "success", "url": session.url, "session_id": session.id}



@router.post("/create-portal")
async def create_customer_portal(req: ClinicRequest) -> Any:
    """
    Creates a Stripe Customer Portal session.
    Allows users to manage/cancel/update their subscription directly on Stripe.
    """
    s = _get_stripe()

    clinic_res = supabase.table("clinics") \
        .select("stripe_customer_id") \
        .eq("id", req.clinic_id).single().execute()

    if not clinic_res.data:
        raise HTTPException(status_code=404, detail="Clinic not found.")

    customer_id = clinic_res.data.get("stripe_customer_id")
    if not customer_id:
        raise HTTPException(
            status_code=400,
            detail="No Stripe customer found. Please subscribe first."
        )

    portal = s.billing_portal.Session.create(
        customer=customer_id,
        return_url=settings.stripe_cancel_url,
    )

    logger.info(f"[Stripe] Portal session created for customer {customer_id}")
    return {"status": "success", "url": portal.url}


@router.post("/cancel-subscription")
async def cancel_stripe_subscription(req: ClinicRequest) -> Any:
    """
    Cancels the Stripe subscription at the end of the current billing period.
    Access via Stripe Customer Portal is preferred — this is a direct API fallback.
    """
    s = _get_stripe()

    clinic_res = supabase.table("clinics") \
        .select("stripe_subscription_id, subscription_status") \
        .eq("id", req.clinic_id).single().execute()

    if not clinic_res.data:
        raise HTTPException(status_code=404, detail="Clinic not found.")

    sub_id = clinic_res.data.get("stripe_subscription_id")
    if not sub_id:
        raise HTTPException(status_code=400, detail="No active Stripe subscription found.")

    # Cancel at period end (not immediately)
    s.Subscription.modify(sub_id, cancel_at_period_end=True)

    supabase.table("clinics").update({
        "subscription_status": "cancelling"
    }).eq("id", req.clinic_id).execute()

    logger.info(f"[Stripe] Subscription {sub_id} set to cancel at period end for clinic {req.clinic_id}")
    return {
        "status": "success",
        "message": "Subscription will be cancelled at the end of the current billing period."
    }


@router.get("/subscription-status")
async def get_subscription_status(clinic_id: str) -> Any:
    """Fetch live subscription status directly from Stripe API."""
    s = _get_stripe()

    clinic_res = supabase.table("clinics") \
        .select("stripe_subscription_id, subscription_status, billing_provider") \
        .eq("id", clinic_id).single().execute()

    if not clinic_res.data:
        raise HTTPException(status_code=404, detail="Clinic not found.")

    sub_id = clinic_res.data.get("stripe_subscription_id")
    if not sub_id:
        return {"status": clinic_res.data.get("subscription_status", "inactive"), "source": "db"}

    try:
        sub = s.Subscription.retrieve(sub_id)
        stripe_status = sub.get("status", "unknown")
        cancel_at_period_end = sub.get("cancel_at_period_end", False)

        if cancel_at_period_end and stripe_status == "active":
            our_status = "cancelling"
        else:
            our_status = _map_stripe_status(stripe_status)

        # Sync to DB
        supabase.table("clinics").update({
            "subscription_status": our_status
        }).eq("id", clinic_id).execute()

        return {"status": our_status, "stripe_status": stripe_status, "source": "stripe"}
    except Exception as e:
        logger.error(f"[Stripe] Failed to retrieve subscription {sub_id}: {e}")
        return {"status": clinic_res.data.get("subscription_status", "unknown"), "source": "db"}


# ─── Webhook Handler ──────────────────────────────────────────────────────────

@webhook_router.post("/stripe")
async def handle_stripe_webhook(request: Request) -> Any:
    """
    Stripe webhook handler.

    IMPORTANT: Must read raw body bytes BEFORE any JSON parsing
    to preserve the exact payload for signature verification.
    Always returns 200 OK to Stripe — errors are only logged.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    if not settings.stripe_webhook_secret:
        logger.critical("STRIPE_WEBHOOK_SECRET is not set — all webhooks will be rejected!")
        raise HTTPException(status_code=500, detail="Webhook secret not configured.")

    # ── Verify Stripe signature ───────────────────────────────────────────────
    try:
        stripe.api_key = settings.stripe_secret_key
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"[Stripe Webhook] Signature verification FAILED: {e}")
        raise HTTPException(status_code=400, detail="Invalid Stripe signature.")
    except Exception as e:
        logger.error(f"[Stripe Webhook] Payload parse error: {e}")
        raise HTTPException(status_code=400, detail="Invalid webhook payload.")

    event_type = event["type"]
    data_obj = event["data"]["object"]
    logger.info(f"[Stripe Webhook] Received: {event_type} | id={event['id']}")

    # ── Dispatch to event handlers ────────────────────────────────────────────
    try:
        if event_type == "checkout.session.completed":
            _on_checkout_completed(data_obj)
        elif event_type == "customer.subscription.updated":
            _on_subscription_updated(data_obj)
        elif event_type == "customer.subscription.deleted":
            _on_subscription_deleted(data_obj)
        elif event_type == "invoice.payment_succeeded":
            _on_invoice_paid(data_obj)
        elif event_type == "invoice.payment_failed":
            _on_invoice_failed(data_obj)
        else:
            logger.info(f"[Stripe Webhook] Unhandled event type: {event_type} — ignoring.")
    except Exception as e:
        # Never raise here — always return 200 so Stripe doesn't retry unnecessarily
        logger.error(f"[Stripe Webhook] Handler crashed for {event_type}: {e}", exc_info=True)

    return {"status": "ok"}


# ─── Webhook Event Handlers ───────────────────────────────────────────────────

def _get_clinic_id(obj: dict) -> Optional[str]:
    """Safely extract clinic_id from Stripe object metadata."""
    return (obj.get("metadata") or {}).get("clinic_id")


def _map_stripe_status(stripe_status: str) -> str:
    """Map Stripe subscription status strings to our internal status values."""
    return {
        "active":             "active",
        "past_due":           "past_due",
        "canceled":           "inactive",
        "incomplete":         "pending",
        "incomplete_expired": "inactive",
        "trialing":           "trial",
        "unpaid":             "past_due",
        "paused":             "inactive",
    }.get(stripe_status, stripe_status)


def _on_checkout_completed(session: dict):
    """checkout.session.completed — link customer & subscription, activate clinic."""
    clinic_id = _get_clinic_id(session)
    if not clinic_id:
        logger.error("[Stripe] checkout.session.completed: missing clinic_id in metadata")
        return

    sub_id      = session.get("subscription")
    customer_id = session.get("customer")
    amount_cents = session.get("amount_total") or 0
    currency     = (session.get("currency") or "usd").upper()

    supabase.table("clinics").update({
        "stripe_subscription_id": sub_id,
        "stripe_customer_id":     customer_id,
        "subscription_status":    "active",
        "billing_provider":       "stripe",
    }).eq("id", clinic_id).execute()

    # Log to transactions table
    supabase.table("transactions").insert({
        "clinic_id":           clinic_id,
        "amount":              amount_cents / 100,
        "currency":            currency,
        "type":                "subscription",
        "description":         "Stripe Subscription — First Payment",
        "status":              "success",
        "razorpay_payment_id": session.get("payment_intent") or sub_id,
    }).execute()

    logger.info(f"[Stripe] ✅ Checkout completed — clinic {clinic_id} | sub {sub_id} | {currency} {amount_cents/100}")


def _on_subscription_updated(subscription: dict):
    """customer.subscription.updated — sync status changes."""
    sub_id  = subscription.get("id")
    status  = subscription.get("status", "unknown")
    cancel_at_period_end = subscription.get("cancel_at_period_end", False)

    our_status = _map_stripe_status(status)
    if cancel_at_period_end and status == "active":
        our_status = "cancelling"

    # Extract period end date
    period_end_ts = subscription.get("current_period_end")
    update_data: dict = {"subscription_status": our_status}
    if period_end_ts:
        update_data["subscription_end_date"] = datetime.utcfromtimestamp(period_end_ts).isoformat()

    supabase.table("clinics").update(update_data) \
        .eq("stripe_subscription_id", sub_id).execute()

    logger.info(f"[Stripe] Subscription {sub_id} updated → {our_status} (cancel_at_end={cancel_at_period_end})")


def _on_subscription_deleted(subscription: dict):
    """customer.subscription.deleted — deactivate clinic."""
    sub_id = subscription.get("id")

    supabase.table("clinics").update({
        "subscription_status":    "inactive",
        "stripe_subscription_id": None,
    }).eq("stripe_subscription_id", sub_id).execute()

    logger.info(f"[Stripe] Subscription {sub_id} deleted → clinic set to inactive")


def _on_invoice_paid(invoice: dict):
    """invoice.payment_succeeded — reset monthly quotas, log renewal transaction."""
    sub_id = invoice.get("subscription")
    if not sub_id:
        return

    amount_cents = invoice.get("amount_paid") or 0
    currency     = (invoice.get("currency") or "usd").upper()
    payment_id   = invoice.get("payment_intent") or invoice.get("id") or "unknown"

    # Find clinic via subscription ID
    clinic_res = supabase.table("clinics") \
        .select("id") \
        .eq("stripe_subscription_id", sub_id) \
        .single().execute()

    if not clinic_res.data:
        logger.warning(f"[Stripe] invoice.payment_succeeded: no clinic found for sub {sub_id}")
        return

    clinic_id = clinic_res.data["id"]

    # Reset monthly quotas + ensure active status
    supabase.table("clinics").update({
        "subscription_status":  "active",
        "monthly_minutes_used": 0,
        "monthly_sms_used":     0,
    }).eq("id", clinic_id).execute()

    # Log renewal transaction
    supabase.table("transactions").insert({
        "clinic_id":           clinic_id,
        "amount":              amount_cents / 100,
        "currency":            currency,
        "type":                "subscription",
        "description":         "Stripe Monthly Renewal",
        "status":              "success",
        "razorpay_payment_id": payment_id,
    }).execute()

    logger.info(f"[Stripe] ✅ Invoice paid — clinic {clinic_id} | {currency} {amount_cents/100} | quotas reset")


def _on_invoice_failed(invoice: dict):
    """invoice.payment_failed — mark clinic as past_due."""
    sub_id = invoice.get("subscription")
    if not sub_id:
        return

    clinic_res = supabase.table("clinics") \
        .select("id") \
        .eq("stripe_subscription_id", sub_id) \
        .single().execute()

    if not clinic_res.data:
        return

    clinic_id = clinic_res.data["id"]
    supabase.table("clinics").update({
        "subscription_status": "past_due"
    }).eq("id", clinic_id).execute()

    logger.warning(f"[Stripe] ⚠️ Invoice payment FAILED — clinic {clinic_id} set to past_due")
