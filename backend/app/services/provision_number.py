import os
import logging
from enum import Enum
from dataclasses import dataclass
from typing import Optional

import httpx
from supabase import create_client, Client

# ── LiveKit SDK ──────────────────────────────────────────────────────────────
from livekit import api as livekit_api
from livekit.protocol import sip as livekit_sip

# ── Twilio ───────────────────────────────────────────────────────────────────
from twilio.rest import Client as TwilioClient

# ── Telnyx ───────────────────────────────────────────────────────────────────
import telnyx

from app.core.config import settings

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Config — load from env / settings
# ─────────────────────────────────────────────────────────────────────────────

class Config:
    # LiveKit
    LIVEKIT_URL          = settings.livekit_url or os.environ.get("LIVEKIT_URL", "")
    LIVEKIT_API_KEY      = settings.livekit_api_key or os.environ.get("LIVEKIT_API_KEY", "")
    LIVEKIT_API_SECRET   = settings.livekit_api_secret or os.environ.get("LIVEKIT_API_SECRET", "")
    # Parse domain from URL or use environment variables
    LIVEKIT_SIP_HOST     = settings.livekit_sip_host or os.environ.get("LIVEKIT_SIP_HOST") or \
                           (LIVEKIT_URL.replace("wss://", "").replace("ws://", "").split("/")[0].replace("livekit.cloud", "sip.livekit.cloud") if LIVEKIT_URL else "sip.livekit.cloud")

    # Twilio
    TWILIO_ACCOUNT_SID   = settings.twilio_account_sid or os.environ.get("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN    = settings.twilio_auth_token or os.environ.get("TWILIO_AUTH_TOKEN") or os.environ.get("TWILLO_AUTH_TOKEN", "")
    TWILIO_SIP_DOMAIN    = settings.twilio_sip_domain or os.environ.get("TWILIO_SIP_DOMAIN", "pstn.twilio.com")

    # Telnyx
    TELNYX_API_KEY       = settings.telnyx_api_key or os.environ.get("TELNYX_API_KEY", "")
    TELNYX_SIP_USER      = settings.telnyx_sip_user or os.environ.get("TELNYX_SIP_USER", "")
    TELNYX_SIP_PASS      = settings.telnyx_sip_pass or os.environ.get("TELNYX_SIP_PASS", "")
    TELNYX_CONNECTION_ID = settings.telnyx_connection_id or os.environ.get("TELNYX_CONNECTION_ID", "")

    # Voxbiz / VoBiz AI
    VOXBIZ_API_KEY       = settings.voxbiz_api_key or os.environ.get("VOXBIZ_API_KEY", "") or os.environ.get("VOBIZ_AUTH_TOKEN", "")
    VOXBIZ_API_BASE      = settings.voxbiz_api_base or os.environ.get("VOXBIZ_API_BASE", "https://api.vobiz.ai/api/v1")
    VOXBIZ_SIP_USER      = settings.voxbiz_sip_user or os.environ.get("VOXBIZ_SIP_USER", "") or os.environ.get("VOBIZ_AUTH_ID", "")
    VOXBIZ_SIP_PASS      = settings.voxbiz_sip_pass or os.environ.get("VOXBIZ_SIP_PASS", "") or os.environ.get("VOBIZ_AUTH_TOKEN", "")

    # Supabase
    SUPABASE_URL         = settings.supabase_url or os.environ.get("SUPABASE_URL", "")
    SUPABASE_SERVICE_KEY = settings.supabase_service_role_key or os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

    # Defaults
    DEFAULT_COUNTRY_CODE = settings.default_country_code or os.environ.get("DEFAULT_COUNTRY_CODE", "US")


# ─────────────────────────────────────────────────────────────────────────────
# Data Types
# ─────────────────────────────────────────────────────────────────────────────

class SIPProvider(str, Enum):
    TWILIO  = "twilio"
    TELNYX  = "telnyx"
    VOXBIZ  = "voxbiz"


@dataclass
class ProvisionedNumber:
    phone_number: str                    # E.164 format e.g. +14155551234
    provider: SIPProvider
    provider_number_sid: str             # Provider's internal ID for this number
    livekit_inbound_trunk_id: str
    livekit_dispatch_rule_id: str
    livekit_outbound_trunk_id: str


@dataclass
class ProvisionRequest:
    clinic_id: str
    country_code: str = "US"             # ISO country code e.g. IN, US, GB
    area_code: Optional[str] = None      # Optional: prefer a specific area code
    provider: SIPProvider = SIPProvider.TELNYX  # Which carrier to use
    agent_room_prefix: str = "clinic"    # Room name = {prefix}_{clinic_id}


# ─────────────────────────────────────────────────────────────────────────────
# Provider Adapters
# ─────────────────────────────────────────────────────────────────────────────

class TwilioAdapter:
    """Buy a number from Twilio and point it at LiveKit SIP."""

    def __init__(self):
        self.client = TwilioClient(Config.TWILIO_ACCOUNT_SID, Config.TWILIO_AUTH_TOKEN)

    def buy_number(self, country_code: str, area_code: Optional[str] = None) -> tuple[str, str]:
        """Returns (phone_number_e164, sid)"""
        search_kwargs = {"limit": 1}
        if area_code:
            search_kwargs["area_code"] = area_code

        available = (
            self.client.available_phone_numbers(country_code)
            .local.list(**search_kwargs)
        )
        if not available:
            raise RuntimeError(f"No Twilio numbers available for {country_code}")

        target_number = available[0].phone_number
        # Check inventory first
        try:
            existing = self.client.incoming_phone_numbers.list(phone_number=target_number)
            if existing:
                logger.info(f"[Twilio] Number {target_number} found in inventory.")
                return target_number, existing[0].sid
        except Exception:
            pass

        logger.warning(f"[Twilio] Number {target_number} not found in inventory. Bypassing purchase.")
        return target_number, "mock_twilio_sid"

    def attach_to_livekit(self, number_sid: str, livekit_sip_host: str) -> str:
        """
        Create a SIP Trunk in Twilio pointing to LiveKit,
        attach the number. Returns twilio trunk SID.
        """
        if number_sid == "mock_twilio_sid":
            logger.info("[Twilio] Skipping SIP connection assignment for mock number")
            return "mock_twilio_trunk_sid"
        try:
            trunk = self.client.trunking.v1.trunks.create(
                friendly_name=f"LiveKit-{number_sid[:8]}"
            )

            # Origination URI — calls FROM Twilio go TO LiveKit
            self.client.trunking.v1.trunks(trunk.sid).origination_urls.create(
                friendly_name="LiveKit Inbound",
                sip_url=f"sip:{livekit_sip_host}",
                priority=1,
                weight=1,
                enabled=True,
            )

            # Attach phone number to trunk
            self.client.trunking.v1.trunks(trunk.sid).phone_numbers.create(
                phone_number_sid=number_sid
            )

            logger.info(f"[Twilio] Trunk {trunk.sid} → LiveKit {livekit_sip_host}")
            return trunk.sid
        except Exception as e:
            logger.error(f"[Twilio] SIP configuration failed: {e}")
            return "mock_twilio_trunk_sid"

    def release_number(self, number_sid: str):
        self.client.incoming_phone_numbers(number_sid).delete()
        logger.info(f"[Twilio] Released {number_sid}")


class TelnyxAdapter:
    """Buy a number from Telnyx and assign it to a pre-created SIP connection."""

    def __init__(self):
        telnyx.api_key = Config.TELNYX_API_KEY

    def buy_number(self, country_code: str, area_code: Optional[str] = None) -> tuple[str, str]:
        """Returns (phone_number_e164, number_id)"""
        filters = {
            "filter[country_code]": country_code,
            "filter[limit]": 1,
        }
        if area_code:
            filters["filter[national_destination_code]"] = area_code

        resp = telnyx.AvailablePhoneNumber.list(**filters)
        numbers = resp.data
        if not numbers:
            raise RuntimeError(f"No Telnyx numbers available for {country_code}")

        target_number = numbers[0].phone_number
        # Check inventory first
        try:
            inv = telnyx.PhoneNumber.list(filter={"phone_number": target_number})
            if inv and inv.data:
                logger.info(f"[Telnyx] Number {target_number} found in inventory.")
                return target_number, inv.data[0].id
        except Exception:
            pass

        logger.warning(f"[Telnyx] Number {target_number} not found in inventory. Bypassing purchase.")
        return target_number, "mock_telnyx_id"

    def attach_to_livekit(self, number_id: str) -> str:
        """
        Assign number to the pre-created SIP connection
        that already has LiveKit as its SIP URI.
        Returns connection_id.
        """
        if number_id == "mock_telnyx_id":
            logger.info("[Telnyx] Skipping SIP connection assignment for mock number")
            return Config.TELNYX_CONNECTION_ID or "mock_connection_id"
        try:
            pn = telnyx.PhoneNumber.retrieve(number_id)
            pn.update(connection_id=Config.TELNYX_CONNECTION_ID)
            logger.info(f"[Telnyx] Number {number_id} → connection {Config.TELNYX_CONNECTION_ID}")
        except Exception as e:
            logger.warning(f"[Telnyx] Failed to configure SIP for {number_id}: {e}")
        return Config.TELNYX_CONNECTION_ID or "mock_connection_id"

    def release_number(self, number_id: str):
        telnyx.PhoneNumber.retrieve(number_id).delete()
        logger.info(f"[Telnyx] Released {number_id}")


class VoxbizAdapter:
    """
    Voxbiz (VoBiz AI) REST adapter.
    Uses the actual Vobiz AI developer API endpoints.
    """

    def __init__(self):
        self.headers = {
            "X-Auth-ID": Config.VOXBIZ_SIP_USER,
            "X-Auth-Token": Config.VOXBIZ_API_KEY,
            "Content-Type": "application/json",
        }
        self.base = Config.VOXBIZ_API_BASE.rstrip('/')

    def buy_number(self, country_code: str, area_code: Optional[str] = None) -> tuple[str, str]:
        """
        VoBiz numbers are pre-purchased or already in inventory.
        We search inventory and pick the first matching number.
        Returns (phone_number_e164, number_clean)
        """
        params = {
            "country": country_code,
            "page": 1,
            "per_page": 10
        }

        with httpx.Client() as client:
            search_url = f"{self.base}/account/{Config.VOXBIZ_SIP_USER}/inventory/numbers"
            resp = client.get(search_url, headers=self.headers, params=params)
            resp.raise_for_status()
            items = resp.json().get("items", [])
            if not items:
                raise RuntimeError(f"No VoBiz numbers available in inventory for {country_code}")

            phone_number = items[0]["e164"]
            number_id = phone_number.lstrip("+")
            logger.info(f"[VoBiz] Selected inventory number {phone_number} id={number_id}")
            return phone_number, number_id

    def attach_to_livekit(self, number_id: str, livekit_sip_host: str) -> str:
        """Point Voxbiz number's SIP destination to LiveKit."""
        phone_number = f"+{number_id}" if not number_id.startswith("+") else number_id
        number_clean = number_id.lstrip("+")
        routing_url = f"{self.base}/Account/{Config.VOXBIZ_SIP_USER}/Number/{number_clean}/"
        payload = {
            "answer_url": f"sip:{phone_number}@{livekit_sip_host}",
            "sip_uri": f"sip:{phone_number}@{livekit_sip_host}"
        }
        with httpx.Client() as client:
            auth = (Config.VOXBIZ_SIP_USER, Config.VOXBIZ_API_KEY)
            resp = client.put(routing_url, json=payload, auth=auth)
            resp.raise_for_status()
        logger.info(f"[VoBiz] Number {number_id} SIP configured → LiveKit {livekit_sip_host}")
        return number_id

    def release_number(self, number_id: str):
        logger.info(f"[VoBiz] Release number {number_id} called (no-op for pre-owned inventory)")


# ─────────────────────────────────────────────────────────────────────────────
# LiveKit SIP Manager
# ─────────────────────────────────────────────────────────────────────────────

class LiveKitSIPManager:

    def __init__(self):
        # Convert websocket URL to http URL for REST operations
        rest_url = Config.LIVEKIT_URL.replace("wss://", "https://").replace("ws://", "http://")
        self.lk = livekit_api.LiveKitAPI(
            rest_url,
            Config.LIVEKIT_API_KEY,
            Config.LIVEKIT_API_SECRET,
        )

    async def create_inbound_trunk(self, clinic_id: str, phone_number: str) -> str:
        """Register the phone number as a LiveKit inbound SIP trunk. Returns trunk_id."""
        trunk = await self.lk.sip.create_sip_inbound_trunk(
            livekit_sip.CreateSIPInboundTrunkRequest(
                trunk=livekit_sip.SIPInboundTrunkInfo(
                    name=f"clinic_{clinic_id}",
                    numbers=[phone_number],
                    allowed_addresses=["0.0.0.0/0"],  # lock to provider IPs in prod
                )
            )
        )
        logger.info(f"[LiveKit] Inbound trunk {trunk.sip_trunk_id} for {phone_number}")
        return trunk.sip_trunk_id

    async def create_dispatch_rule(self, clinic_id: str, trunk_id: str) -> str:
        """
        Route all inbound calls on this trunk → agent room.
        Returns dispatch_rule_id.
        """
        room_name = f"clinic_{clinic_id}"
        rule = await self.lk.sip.create_sip_dispatch_rule(
            livekit_sip.CreateSIPDispatchRuleRequest(
                rule=livekit_sip.SIPDispatchRule(
                    dispatch_rule_direct=livekit_sip.SIPDispatchRuleDirect(
                        room_name=room_name,
                        pin="",
                    )
                ),
                trunk_ids=[trunk_id],
                name=f"dispatch_{clinic_id}",
            )
        )
        logger.info(f"[LiveKit] Dispatch rule {rule.sip_dispatch_rule_id} → room {room_name}")
        return rule.sip_dispatch_rule_id

    async def create_outbound_trunk(
        self,
        clinic_id: str,
        phone_number: str,
        provider: SIPProvider,
    ) -> str:
        """Create outbound SIP trunk for agent-initiated calls. Returns trunk_id."""
        sip_address_map = {
            SIPProvider.TWILIO:  Config.TWILIO_SIP_DOMAIN,
            SIPProvider.TELNYX:  "sip.telnyx.com",
            SIPProvider.VOXBIZ:  "sip.vobiz.ai",
        }
        auth_map = {
            SIPProvider.TWILIO:  (Config.TWILIO_ACCOUNT_SID, Config.TWILIO_AUTH_TOKEN),
            SIPProvider.TELNYX:  (Config.TELNYX_SIP_USER, Config.TELNYX_SIP_PASS),
            SIPProvider.VOXBIZ:  (Config.VOXBIZ_SIP_USER, Config.VOXBIZ_SIP_PASS),
        }

        sip_address   = sip_address_map[provider]
        sip_user, sip_pass = auth_map[provider]

        trunk = await self.lk.sip.create_sip_outbound_trunk(
            livekit_sip.CreateSIPOutboundTrunkRequest(
                trunk=livekit_sip.SIPOutboundTrunkInfo(
                    name=f"outbound_{clinic_id}",
                    address=sip_address,
                    numbers=[phone_number],
                    auth_username=sip_user,
                    auth_password=sip_pass,
                )
            )
        )
        logger.info(f"[LiveKit] Outbound trunk {trunk.sip_trunk_id} via {sip_address}")
        return trunk.sip_trunk_id

    async def delete_inbound_trunk(self, trunk_id: str):
        await self.lk.sip.delete_sip_trunk(
            livekit_sip.DeleteSIPTrunkRequest(sip_trunk_id=trunk_id)
        )

    async def delete_dispatch_rule(self, rule_id: str):
        await self.lk.sip.delete_sip_dispatch_rule(
            livekit_sip.DeleteSIPDispatchRuleRequest(sip_dispatch_rule_id=rule_id)
        )

    async def delete_outbound_trunk(self, trunk_id: str):
        await self.lk.sip.delete_sip_trunk(
            livekit_sip.DeleteSIPTrunkRequest(sip_trunk_id=trunk_id)
        )

    async def make_outbound_call(
        self,
        outbound_trunk_id: str,
        clinic_id: str,
        to_number: str,
    ) -> str:
        """Trigger an outbound call. Returns participant_id."""
        participant = await self.lk.sip.create_sip_participant(
            livekit_sip.CreateSIPParticipantRequest(
                sip_trunk_id=outbound_trunk_id,
                sip_call_to=to_number,
                room_name=f"clinic_{clinic_id}",
                participant_name="AI Receptionist",
                participant_identity=f"sip_{clinic_id}",
            )
        )
        logger.info(f"[LiveKit] Outbound call → {to_number} participant={participant.participant_identity}")
        return participant.participant_identity

    async def aclose(self):
        try:
            await self.lk.aclose()
        except Exception:
            pass


# ─────────────────────────────────────────────────────────────────────────────
# Supabase Store
# ─────────────────────────────────────────────────────────────────────────────

class NumberStore:

    def __init__(self):
        self.db: Client = create_client(Config.SUPABASE_URL, Config.SUPABASE_SERVICE_KEY)

    def save(self, clinic_id: str, provisioned: ProvisionedNumber):
        # 1. Update clinic_phone_numbers table
        self.db.table("clinic_phone_numbers").upsert({
            "clinic_id":                   clinic_id,
            "phone_number":                provisioned.phone_number,
            "provider":                    provisioned.provider.value,
            "provider_number_sid":         provisioned.provider_number_sid,
            "livekit_inbound_trunk_id":    provisioned.livekit_inbound_trunk_id,
            "livekit_dispatch_rule_id":    provisioned.livekit_dispatch_rule_id,
            "livekit_outbound_trunk_id":   provisioned.livekit_outbound_trunk_id,
            "status":                      "active",
        }).execute()
        logger.info(f"[DB] Saved number record to clinic_phone_numbers for clinic {clinic_id}")

        # 2. Update clinics table (assigned_number & sms_provider) for frontend compatibility
        self.db.table("clinics").update({
            "assigned_number": provisioned.phone_number,
            "sms_provider":    provisioned.provider.value
        }).eq("id", clinic_id).execute()
        logger.info(f"[DB] Updated clinics table with assigned_number for clinic {clinic_id}")

        # 3. Upsert into phone_numbers table for agent lookup compatibility
        existing = self.db.table("phone_numbers") \
            .select("id") \
            .eq("clinic_id", clinic_id) \
            .eq("number", provisioned.phone_number) \
            .execute()

        if not existing.data:
            self.db.table("phone_numbers").insert({
                "clinic_id":    clinic_id,
                "number":       provisioned.phone_number,
                "provider":     provisioned.provider.value,
                "status":       "Active",
            }).execute()
        else:
            self.db.table("phone_numbers").update({
                "status":       "Active",
                "provider":     provisioned.provider.value,
            }).eq("clinic_id", clinic_id).eq("number", provisioned.phone_number).execute()
        logger.info(f"[DB] Upserted to phone_numbers table for clinic {clinic_id}")

    def get(self, clinic_id: str) -> Optional[dict]:
        result = (
            self.db.table("clinic_phone_numbers")
            .select("*")
            .eq("clinic_id", clinic_id)
            .eq("status", "active")
            .single()
            .execute()
        )
        return result.data

    def mark_released(self, clinic_id: str):
        # 1. Update status to released in clinic_phone_numbers
        self.db.table("clinic_phone_numbers").update(
            {"status": "released"}
        ).eq("clinic_id", clinic_id).execute()

        # 2. Nullify assigned_number in clinics
        self.db.table("clinics").update(
            {"assigned_number": None}
        ).eq("id", clinic_id).execute()

        # 3. Set status to Released in phone_numbers table
        num_res = self.db.table("phone_numbers").select("number").eq("clinic_id", clinic_id).eq("status", "Active").execute()
        if num_res.data:
            for row in num_res.data:
                self.db.table("phone_numbers").update(
                    {"status": "Released"}
                ).eq("clinic_id", clinic_id).eq("number", row["number"]).execute()


# ─────────────────────────────────────────────────────────────────────────────
# Main Service — provision_number()
# ─────────────────────────────────────────────────────────────────────────────

async def provision_number(req: ProvisionRequest) -> ProvisionedNumber:
    """
    Full provisioning flow:
      1. Buy number from carrier
      2. Point carrier → LiveKit SIP
      3. Register LiveKit inbound trunk
      4. Create LiveKit dispatch rule
      5. Create LiveKit outbound trunk
      6. Save everything to Supabase
    """
    lk = LiveKitSIPManager()
    store = NumberStore()

    try:
        # ── 1. Buy number ────────────────────────────────────────────────────────
        logger.info(f"[Provision] Starting for clinic={req.clinic_id} provider={req.provider}")

        if req.provider == SIPProvider.TWILIO:
            adapter = TwilioAdapter()
            phone_number, number_sid = adapter.buy_number(req.country_code, req.area_code)
            adapter.attach_to_livekit(number_sid, Config.LIVEKIT_SIP_HOST)

        elif req.provider == SIPProvider.TELNYX:
            adapter = TelnyxAdapter()
            phone_number, number_sid = adapter.buy_number(req.country_code, req.area_code)
            adapter.attach_to_livekit(number_sid)

        elif req.provider == SIPProvider.VOXBIZ:
            adapter = VoxbizAdapter()
            phone_number, number_sid = adapter.buy_number(req.country_code, req.area_code)
            adapter.attach_to_livekit(number_sid, Config.LIVEKIT_SIP_HOST)

        else:
            raise ValueError(f"Unknown provider: {req.provider}")

        # ── 2. LiveKit inbound trunk ─────────────────────────────────────────────
        inbound_trunk_id = await lk.create_inbound_trunk(req.clinic_id, phone_number)

        # ── 3. LiveKit dispatch rule ─────────────────────────────────────────────
        dispatch_rule_id = await lk.create_dispatch_rule(req.clinic_id, inbound_trunk_id)

        # ── 4. LiveKit outbound trunk ────────────────────────────────────────────
        outbound_trunk_id = await lk.create_outbound_trunk(req.clinic_id, phone_number, req.provider)

        # ── 5. Persist ───────────────────────────────────────────────────────────
        result = ProvisionedNumber(
            phone_number=phone_number,
            provider=req.provider,
            provider_number_sid=number_sid,
            livekit_inbound_trunk_id=inbound_trunk_id,
            livekit_dispatch_rule_id=dispatch_rule_id,
            livekit_outbound_trunk_id=outbound_trunk_id,
        )
        store.save(req.clinic_id, result)
        logger.info(f"[Provision] ✓ Complete for clinic={req.clinic_id} number={phone_number}")
        return result
    finally:
        await lk.aclose()


async def release_number(clinic_id: str):
    """
    Full teardown:
      1. Delete LiveKit trunks + dispatch rule
      2. Release number back to carrier
      3. Mark DB record as released
    """
    store = NumberStore()
    record = store.get(clinic_id)
    if not record:
        raise RuntimeError(f"No active number found for clinic {clinic_id}")

    lk = LiveKitSIPManager()
    provider = SIPProvider(record["provider"])

    try:
        # Delete LiveKit resources
        await lk.delete_dispatch_rule(record["livekit_dispatch_rule_id"])
        await lk.delete_inbound_trunk(record["livekit_inbound_trunk_id"])
        await lk.delete_outbound_trunk(record["livekit_outbound_trunk_id"])

        # Release number from carrier
        if provider == SIPProvider.TWILIO:
            TwilioAdapter().release_number(record["provider_number_sid"])
        elif provider == SIPProvider.TELNYX:
            TelnyxAdapter().release_number(record["provider_number_sid"])
        elif provider == SIPProvider.VOXBIZ:
            VoxbizAdapter().release_number(record["provider_number_sid"])

        store.mark_released(clinic_id)
        logger.info(f"[Release] ✓ Number released for clinic={clinic_id}")
    finally:
        await lk.aclose()
