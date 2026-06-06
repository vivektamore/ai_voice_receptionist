"""
numbers.py — Phone Number Lifecycle API

Routes (mounted at /api/v1/numbers):
  GET  /search           — Search available numbers by provider + country
  POST /purchase         — Buy + register a number end-to-end:
                            1. Purchase from provider (Telnyx order / VoBiz verify)
                            2. Configure SIP routing at provider level
                            3. Add to LiveKit inbound + outbound trunks
                            4. Save assigned_number to clinics + phone_numbers table
  GET  /list/{clinic_id} — List all numbers assigned to a clinic
"""

import logging
from typing import Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.database import supabase
from app.services.telephony_client import telephony_client
from app.services.livekit_sip import livekit_sip_service
from app.services.providers.factory import get_provider

router = APIRouter()
logger = logging.getLogger("numbers")


# ─── Request Models ───────────────────────────────────────────────────────────

class PurchaseRequest(BaseModel):
    clinic_id: str
    number: str        # E.164 e.g. "+919876543210" or "+14155551234"
    provider: str      # "vobiz" | "telnyx" | "twilio"
    country: str       # "IN" | "US" | "GB" etc.


# ─── Search Available Numbers ─────────────────────────────────────────────────

@router.get("/search")
async def search_numbers(
    country: str = "IN",
    provider: str = "vobiz",
    area_code: str = "",
    limit: int = 10,
) -> Any:
    """
    Search available phone numbers from the given provider.

    - VoBiz (India): returns numbers already owned in your VoBiz account inventory.
    - Telnyx (US/global): returns numbers available to purchase from Telnyx.
    """
    logger.info(f"[Numbers] Search | provider={provider} | country={country} | area_code={area_code}")

    try:
        results = await telephony_client.search_numbers(
            provider=provider,
            country_code=country,
            area_code=area_code,
            limit=limit,
        )
        return {"status": "success", "numbers": results, "count": len(results)}
    except Exception as e:
        logger.error(f"[Numbers] Search failed: {e}")
        raise HTTPException(status_code=500, detail=f"Number search failed: {str(e)}")


# ─── Purchase & Register a Number ─────────────────────────────────────────────

@router.post("/purchase")
async def purchase_number(req: PurchaseRequest) -> Any:
    """
    Full end-to-end phone number provisioning flow:

    1. Verify / purchase the number from the provider
    2. Configure SIP routing at the provider (point DID → LiveKit SIP domain)
    3. Register the number in LiveKit (add to inbound + outbound trunks)
    4. Save the number to the clinics table (assigned_number, sms_provider)
    5. Insert a record into phone_numbers table with status='Active'

    All steps are attempted; partial failures are logged but the number
    is still saved so the operator can manually fix the provider config.
    """
    clinic_id = req.clinic_id
    number    = req.number.strip()
    provider  = req.provider.strip().lower()
    country   = req.country.strip().upper()

    logger.info(f"[Numbers] Purchase | clinic={clinic_id} | number={number} | provider={provider}")

    # ── 0. Validate clinic exists ────────────────────────────────────────────
    clinic_res = supabase.table("clinics") \
        .select("id, name, assigned_number") \
        .eq("id", clinic_id).single().execute()

    if not clinic_res.data:
        raise HTTPException(status_code=404, detail="Clinic not found.")

    existing = clinic_res.data.get("assigned_number")
    if existing and existing != number:
        raise HTTPException(
            status_code=409,
            detail=f"This clinic already has number {existing} assigned. "
                   f"Release it first before assigning a new one."
        )

    # ── 1. Purchase / verify with provider ───────────────────────────────────
    logger.info(f"[Numbers] Step 1: Purchase from provider '{provider}'")
    purchased = await telephony_client.purchase_number(provider=provider, target_number=number)

    if not purchased:
        raise HTTPException(
            status_code=422,
            detail=f"Could not verify/purchase {number} from {provider}. "
                   f"Check that the number exists in your {provider} account and credentials are correct."
        )
    logger.info(f"[Numbers] ✅ Step 1 done — {number} verified/purchased from {provider}")

    # ── 2. Configure SIP at provider level (route DID → LiveKit) ─────────────
    logger.info(f"[Numbers] Step 2: Configure SIP at {provider}")
    sip_domain = __import__("os").getenv("LIVEKIT_SIP_DOMAIN", "sip.livekit.cloud")
    sip_uri    = f"sip:{number}@{sip_domain}"
    sip_ok     = await telephony_client.configure_sip_trunk(provider=provider, phone_number=number)

    if not sip_ok:
        logger.warning(
            f"[Numbers] ⚠️ Step 2 partial: SIP config at {provider} failed for {number}. "
            f"LiveKit trunk still handles inbound routing — continuing."
        )
    else:
        logger.info(f"[Numbers] ✅ Step 2 done — {number} SIP routed to {sip_uri}")

    # ── 3. Register with LiveKit trunks ───────────────────────────────────────
    logger.info(f"[Numbers] Step 3: Provision in LiveKit")
    lk_result = await livekit_sip_service.provision_number(
        phone_number=number,
        provider=provider,
        clinic_id=clinic_id,
    )

    inbound_ok  = lk_result.get("inbound_ok", False)  if lk_result else False
    outbound_ok = lk_result.get("outbound_ok", False) if lk_result else False

    if not inbound_ok:
        logger.warning(
            f"[Numbers] ⚠️ Step 3: Could not add {number} to LiveKit inbound trunk. "
            f"Check LIVEKIT_INBOUND_TRUNK_{provider.upper()} in .env"
        )
    else:
        logger.info(f"[Numbers] ✅ Step 3 done — {number} added to LiveKit trunks")

    # ── 4. Save to Supabase: clinics table ───────────────────────────────────
    logger.info(f"[Numbers] Step 4: Save to DB")
    supabase.table("clinics").update({
        "assigned_number": number,
        "sms_provider":    provider,         # tells SMS service which API to use
    }).eq("id", clinic_id).execute()

    # ── 5. Upsert into phone_numbers table ───────────────────────────────────
    # Check if a record already exists for this clinic
    existing_num = supabase.table("phone_numbers") \
        .select("id") \
        .eq("clinic_id", clinic_id) \
        .eq("phone_number", number) \
        .execute()

    if not existing_num.data:
        supabase.table("phone_numbers").insert({
            "clinic_id":    clinic_id,
            "phone_number": number,
            "provider":     provider,
            "country":      country,
            "status":       "Active",
            "sip_domain":   sip_domain,
        }).execute()
    else:
        supabase.table("phone_numbers").update({
            "status":     "Active",
            "provider":   provider,
            "sip_domain": sip_domain,
        }).eq("clinic_id", clinic_id).eq("phone_number", number).execute()

    logger.info(f"[Numbers] ✅ Step 4 done — {number} saved to DB for clinic {clinic_id}")

    # ── Return full result ────────────────────────────────────────────────────
    return {
        "status":        "success",
        "number":        number,
        "provider":      provider,
        "clinic_id":     clinic_id,
        "sip_configured": sip_ok,
        "livekit": {
            "inbound_ok":  inbound_ok,
            "outbound_ok": outbound_ok,
        },
        "message": (
            f"✅ {number} is now active. "
            f"Inbound calls will route to your AI agent, and SMS can be sent from this number."
            if inbound_ok else
            f"⚠️ {number} was saved but LiveKit inbound trunk registration failed. "
            f"Inbound calls may not route correctly. Check LIVEKIT_INBOUND_TRUNK_{provider.upper()} in .env."
        )
    }


# ─── List Numbers for a Clinic ────────────────────────────────────────────────

@router.get("/list/{clinic_id}")
async def list_numbers(clinic_id: str) -> Any:
    """
    Lists all phone numbers assigned to a clinic.
    Pulls from the phone_numbers table plus the assigned_number on the clinic row.
    """
    try:
        # Primary source: phone_numbers table
        res = supabase.table("phone_numbers") \
            .select("*") \
            .eq("clinic_id", clinic_id) \
            .order("created_at", desc=True) \
            .execute()

        numbers = res.data or []

        # Fallback: if phone_numbers table is empty, read from clinics row
        if not numbers:
            clinic_res = supabase.table("clinics") \
                .select("assigned_number, sms_provider") \
                .eq("id", clinic_id).single().execute()

            if clinic_res.data and clinic_res.data.get("assigned_number"):
                numbers = [{
                    "phone_number": clinic_res.data["assigned_number"],
                    "provider":     clinic_res.data.get("sms_provider", "unknown"),
                    "status":       "Active",
                    "source":       "clinics_table",
                }]

        return {"status": "success", "numbers": numbers}
    except Exception as e:
        logger.error(f"[Numbers] List failed for clinic {clinic_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Release a Number ─────────────────────────────────────────────────────────

@router.delete("/release/{clinic_id}")
async def release_number(clinic_id: str) -> Any:
    """
    Removes the clinic's assigned number from LiveKit trunks
    and clears it from the database.
    Does NOT cancel the number at the provider level (do that in the provider dashboard).
    """
    clinic_res = supabase.table("clinics") \
        .select("assigned_number, sms_provider") \
        .eq("id", clinic_id).single().execute()

    if not clinic_res.data or not clinic_res.data.get("assigned_number"):
        raise HTTPException(status_code=404, detail="No assigned number found for this clinic.")

    number   = clinic_res.data["assigned_number"]
    provider = clinic_res.data.get("sms_provider", "vobiz")

    logger.info(f"[Numbers] Releasing {number} from clinic {clinic_id}")

    # Remove from LiveKit trunks
    lk_result = await livekit_sip_service.release_number(number, provider)

    # Clear from DB
    supabase.table("clinics").update({
        "assigned_number": None,
    }).eq("id", clinic_id).execute()

    supabase.table("phone_numbers").update({
        "status": "Released",
    }).eq("clinic_id", clinic_id).eq("phone_number", number).execute()

    return {
        "status":  "success",
        "number":  number,
        "message": f"{number} released from LiveKit and cleared from clinic record. "
                   f"Cancel it in your {provider} dashboard to stop billing."
    }
