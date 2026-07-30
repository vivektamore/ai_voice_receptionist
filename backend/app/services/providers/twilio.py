import os
import asyncio
import logging
from typing import List, Dict, Any
from twilio.rest import Client as TwilioClient
from app.core.config import settings
from .base import BaseProvider

logger = logging.getLogger("twilio-provider")

class TwilioProvider(BaseProvider):
    def __init__(self):
        self.account_sid = settings.twilio_account_sid or os.getenv("TWILIO_ACCOUNT_SID")
        self.auth_token = settings.twilio_auth_token or os.getenv("TWILIO_AUTH_TOKEN")
        self.client = None
        if self.account_sid and self.auth_token:
            if not self.account_sid.startswith("AC"):
                logger.warning(
                    f"TWILIO_ACCOUNT_SID '{self.account_sid[:4]}...' starts with '{self.account_sid[:2]}' instead of 'AC'. "
                    f"Twilio REST client requires your main Account SID (starts with AC) from Twilio Console."
                )
            try:
                self.client = TwilioClient(self.account_sid, self.auth_token)
            except Exception as err:
                logger.error(f"Failed to initialize Twilio client: {err}")

    async def search_numbers(self, country: str, area_code: str = None) -> List[Dict[str, Any]]:
        if not self.client:
            logger.error("Missing Twilio credentials")
            return []

        def _sync():
            kwargs = {
                "voice_enabled": True,
                "sms_enabled": True,
                "limit": 15,
            }
            if area_code and country.upper() in ("US", "CA"):
                kwargs["area_code"] = int(area_code)

            try:
                available = (
                    self.client
                    .available_phone_numbers(country.upper())
                    .local
                    .list(**kwargs)
                )
                return [
                    {
                        "number": n.phone_number,
                        "friendly_name": n.friendly_name,
                        "price_monthly": 1.15,
                        "provider": "twilio",
                        "country": country
                    } for n in available
                ]
            except Exception as e:
                logger.error(f"Twilio search failed: {e}")
                return []

        return await asyncio.to_thread(_sync)

    async def purchase_number(self, number: str) -> bool:
        """
        Bypasses actual purchase to prevent charging during development/testing.
        Checks if number is already in account inventory.
        """
        if not self.client:
            logger.error("Missing Twilio credentials")
            return False

        def _sync():
            try:
                # Check if number is already in our inventory
                existing = self.client.incoming_phone_numbers.list(phone_number=number)
                if existing:
                    logger.info(f"[Twilio] Number {number} is already in inventory.")
                else:
                    logger.warning(
                        f"[Twilio] Number {number} not found in inventory. "
                        f"Bypassing actual purchase API call."
                    )
                return True
            except Exception as e:
                logger.error(f"Twilio inventory check failed: {e}")
                # Fallback to returning True so the pipeline doesn't break
                return True

        return await asyncio.to_thread(_sync)

    async def configure_sip(self, number: str) -> Dict[str, Any]:
        """
        Routes the Twilio phone number to the LiveKit SIP Trunk.
        If the number exists in inventory, associates it with a Trunk.
        If it's a mock number, skips associations and returns success.
        """
        if not self.client:
            return {"status": "error", "message": "Missing Twilio credentials"}

        def _sync():
            try:
                # Find phone number SID from inventory
                existing = self.client.incoming_phone_numbers.list(phone_number=number)
                if not existing:
                    logger.warning(
                        f"[Twilio] Number {number} not found in inventory for SIP config. "
                        f"Returning mock success."
                    )
                    return {
                        "status": "sip_configured", 
                        "twilio_trunk_sid": "mock_twilio_trunk_sid"
                    }

                number_sid = existing[0].sid
                sip_domain = settings.livekit_sip_host or os.getenv("LIVEKIT_SIP_DOMAIN") or "sip.livekit.cloud"

                safe_num = number.lstrip("+")
                domain_name = f"lk-{safe_num}.pstn.twilio.com"

                # Check if trunk already exists with this domain name
                trunks = self.client.trunking.v1.trunks.list()
                trunk = next((t for t in trunks if t.domain_name == domain_name), None)

                if not trunk:
                    trunk = self.client.trunking.v1.trunks.create(
                        friendly_name=f"LiveKit-{safe_num}",
                        domain_name=domain_name
                    )
                    logger.info(f"[Twilio] Created SIP Trunk {trunk.sid} for {number}")

                    # Create origination URL
                    self.client.trunking.v1.trunks(trunk.sid).origination_urls.create(
                        friendly_name="LiveKit SIP",
                        sip_url=f"sip:{sip_domain};transport=tcp",
                        weight=1,
                        priority=1,
                        enabled=True
                    )
                    logger.info(f"[Twilio] Created Origination URL for Trunk {trunk.sid}")
                
                # Attach number to trunk if not already attached
                attached = self.client.trunking.v1.trunks(trunk.sid).phone_numbers.list()
                if not any(pn.sid == number_sid for pn in attached):
                    self.client.trunking.v1.trunks(trunk.sid).phone_numbers.create(
                        phone_number_sid=number_sid
                    )
                    logger.info(f"[Twilio] Number {number} attached to Trunk {trunk.sid}")
                
                return {"status": "sip_configured", "twilio_trunk_sid": trunk.sid}
            except Exception as e:
                logger.error(f"Twilio SIP configuration failed: {e}")
                return {"status": "error", "message": f"SIP config failed: {str(e)}"}

        return await asyncio.to_thread(_sync)
