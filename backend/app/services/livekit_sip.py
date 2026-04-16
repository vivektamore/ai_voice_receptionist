import os
import logging
from livekit.api import LiveKitAPI
from livekit.protocol import sip

logger = logging.getLogger("livekit_sip")

# ── Per-provider inbound trunk IDs (set these in your backend .env) ──────────
# These are your EXISTING trunks in LiveKit — we add numbers to them, not create new ones.
# LIVEKIT_INBOUND_TRUNK_VOBIZ   = "ST_jE9hkZHYptQB"   (Vobiz_Provider)
# LIVEKIT_INBOUND_TRUNK_TELNYX  = "ST_JTLRcbXDtqoj"   (Twillo_Saas_1 / Telnyx)
# LIVEKIT_OUTBOUND_TRUNK_ID     = "ST_G46PYjHb6nPM"   (Vobiz_Outbound)
# Dispatch rule does NOT need updating — it already covers all trunks.

class LiveKitSipService:
    def __init__(self):
        self.url = os.getenv("LIVEKIT_URL")
        self.api_key = os.getenv("LIVEKIT_API_KEY")
        self.api_secret = os.getenv("LIVEKIT_API_SECRET")

        # Map provider name → existing LiveKit inbound trunk ID
        self.inbound_trunk_map = {
            "vobiz":   os.getenv("LIVEKIT_INBOUND_TRUNK_VOBIZ"),   # ST_jE9hkZHYptQB
            "telnyx":  os.getenv("LIVEKIT_INBOUND_TRUNK_TELNYX"),  # ST_JTLRcbXDtqoj
            "twilio":  os.getenv("LIVEKIT_INBOUND_TRUNK_TELNYX"),  # shared with telnyx trunk
            # BYO numbers: use a dedicated trunk, or fall back to Vobiz trunk
            "custom":  os.getenv("LIVEKIT_INBOUND_TRUNK_CUSTOM") or os.getenv("LIVEKIT_INBOUND_TRUNK_VOBIZ"),
        }
        # Single outbound trunk — numbers from all providers are added here
        self.outbound_trunk_id = os.getenv("LIVEKIT_OUTBOUND_TRUNK_ID")  # ST_G46PYjHb6nPM

    def _get_api_url(self) -> str:
        return self.url.replace("wss://", "https://").replace("ws://", "http://")

    async def provision_number(self, phone_number: str, provider: str, clinic_id: str) -> dict | None:
        """
        Provisions a newly purchased phone number in LiveKit.
        Adds the number to the existing per-provider inbound trunk and outbound trunk.
        No new trunks or dispatch rules are created.
        """
        if not all([self.url, self.api_key, self.api_secret]):
            logger.error("[LiveKit SIP] Missing LiveKit credentials")
            return None

        provider_key = provider.lower().strip()
        inbound_trunk_id = self.inbound_trunk_map.get(provider_key)

        if not inbound_trunk_id:
            logger.warning(
                f"[LiveKit SIP] No inbound trunk configured for provider '{provider_key}'. "
                f"Set LIVEKIT_INBOUND_TRUNK_{provider_key.upper()} in your .env — skipping LiveKit config."
            )
            return {"inbound_trunk_id": None, "inbound_ok": False, "outbound_ok": False}

        api_url = self._get_api_url()
        lkapi = LiveKitAPI(api_url, self.api_key, self.api_secret)
        inbound_ok = False
        outbound_ok = False

        try:
            sip_client = lkapi.sip

            # ── Step 1: Add number to existing INBOUND trunk ──────────────────
            logger.info(f"[LiveKit SIP] Adding {phone_number} to inbound trunk {inbound_trunk_id} ({provider_key})...")
            inbound_ok = await self._add_number_to_inbound_trunk(sip_client, inbound_trunk_id, phone_number)

            # ── Step 2: Add number to existing OUTBOUND trunk ─────────────────
            if self.outbound_trunk_id:
                logger.info(f"[LiveKit SIP] Adding {phone_number} to outbound trunk {self.outbound_trunk_id}...")
                outbound_ok = await self._add_number_to_outbound_trunk(sip_client, self.outbound_trunk_id, phone_number)
            else:
                logger.warning("[LiveKit SIP] LIVEKIT_OUTBOUND_TRUNK_ID not set — skipping outbound trunk.")

            logger.info(f"[LiveKit SIP] ✅ Done for {phone_number}: inbound={inbound_ok}, outbound={outbound_ok}")
            return {
                "inbound_trunk_id": inbound_trunk_id,
                "outbound_trunk_id": self.outbound_trunk_id,
                "inbound_ok": inbound_ok,
                "outbound_ok": outbound_ok,
            }

        except Exception as e:
            logger.error(f"[LiveKit SIP] ❌ Provisioning failed for {phone_number}: {e}")
            return None
        finally:
            # Correct async close — works across all livekit-api versions
            try:
                await lkapi.aclose()
            except AttributeError:
                pass  # older SDK versions may not have aclose()

    async def _add_number_to_inbound_trunk(self, sip_client, trunk_id: str, phone_number: str) -> bool:
        """
        Fetches the existing inbound trunk via list (SDK has no get-by-ID),
        then updates it with the new number appended.
        """
        try:
            # SDK uses list_sip_inbound_trunk (no get-by-id method)
            list_resp = await sip_client.list_sip_inbound_trunk(
                sip.ListSIPInboundTrunkRequest()
            )
            # Find our trunk by ID
            trunk = next(
                (t for t in (list_resp.items or []) if t.sip_trunk_id == trunk_id),
                None
            )
            if not trunk:
                logger.error(f"[LiveKit SIP] Inbound trunk {trunk_id} not found in LiveKit")
                return False

            numbers = list(trunk.numbers or [])
            if phone_number in numbers:
                logger.info(f"[LiveKit SIP] {phone_number} already in inbound trunk {trunk_id}")
                return True

            numbers.append(phone_number)
            trunk.numbers[:] = numbers
            await sip_client.update_inbound_trunk(trunk_id, trunk)
            logger.info(f"[LiveKit SIP] ✅ Added {phone_number} to inbound trunk {trunk_id}")
            return True
        except Exception as e:
            logger.error(f"[LiveKit SIP] ⚠️ Could not update inbound trunk {trunk_id}: {e}")
            return False

    async def _add_number_to_outbound_trunk(self, sip_client, trunk_id: str, phone_number: str) -> bool:
        """
        Fetches the existing outbound trunk via list, then appends the new number.
        """
        try:
            list_resp = await sip_client.list_sip_outbound_trunk(
                sip.ListSIPOutboundTrunkRequest()
            )
            trunk = next(
                (t for t in (list_resp.items or []) if t.sip_trunk_id == trunk_id),
                None
            )
            if not trunk:
                logger.error(f"[LiveKit SIP] Outbound trunk {trunk_id} not found in LiveKit")
                return False

            numbers = list(trunk.numbers or [])
            if phone_number in numbers:
                logger.info(f"[LiveKit SIP] {phone_number} already in outbound trunk {trunk_id}")
                return True

            numbers.append(phone_number)
            trunk.numbers[:] = numbers
            await sip_client.update_outbound_trunk(trunk_id, trunk)
            logger.info(f"[LiveKit SIP] ✅ Added {phone_number} to outbound trunk {trunk_id}")
            return True
        except Exception as e:
            logger.error(f"[LiveKit SIP] ⚠️ Could not update outbound trunk {trunk_id}: {e}")
            return False

    async def release_number(self, phone_number: str, provider: str) -> dict | None:
        """
        Removes a phone number from both inbound and outbound trunks in LiveKit.
        """
        if not all([self.url, self.api_key, self.api_secret]):
            logger.error("[LiveKit SIP] Missing LiveKit credentials")
            return None

        provider_key = provider.lower().strip()
        inbound_trunk_id = self.inbound_trunk_map.get(provider_key)

        api_url = self._get_api_url()
        lkapi = LiveKitAPI(api_url, self.api_key, self.api_secret)
        inbound_ok = False
        outbound_ok = False

        try:
            sip_client = lkapi.sip

            # ── Step 1: Remove from INBOUND trunk ──────────────────
            if inbound_trunk_id:
                logger.info(f"[LiveKit SIP] Removing {phone_number} from inbound trunk {inbound_trunk_id}...")
                inbound_ok = await self._remove_number_from_inbound_trunk(sip_client, inbound_trunk_id, phone_number)

            # ── Step 2: Remove from OUTBOUND trunk ─────────────────
            if self.outbound_trunk_id:
                logger.info(f"[LiveKit SIP] Removing {phone_number} from outbound trunk {self.outbound_trunk_id}...")
                outbound_ok = await self._remove_number_from_outbound_trunk(sip_client, self.outbound_trunk_id, phone_number)

            return {
                "inbound_ok": inbound_ok,
                "outbound_ok": outbound_ok,
            }
        except Exception as e:
            logger.error(f"[LiveKit SIP] ❌ Release failed for {phone_number}: {e}")
            return None
        finally:
            try:
                await lkapi.aclose()
            except AttributeError:
                pass 

    async def _remove_number_from_inbound_trunk(self, sip_client, trunk_id: str, phone_number: str) -> bool:
        try:
            list_resp = await sip_client.list_sip_inbound_trunk(sip.ListSIPInboundTrunkRequest())
            trunk = next((t for t in (list_resp.items or []) if t.sip_trunk_id == trunk_id), None)
            if not trunk:
                return False

            numbers = list(trunk.numbers or [])
            if phone_number not in numbers:
                return True

            numbers.remove(phone_number)
            trunk.numbers[:] = numbers
            
            # Use appropriate update method per SDK version
            try:
                await sip_client.update_sip_inbound_trunk(trunk_id, trunk)
            except AttributeError:
                try:
                    await sip_client.update_inbound_trunk(trunk_id, trunk)
                except Exception as ex:
                    logger.error(f"[LiveKit SIP] Could not call update_inbound_trunk on {trunk_id}: {ex}")
                    return False
                    
            logger.info(f"[LiveKit SIP] ✅ Removed {phone_number} from inbound trunk {trunk_id}")
            return True
        except Exception as e:
            logger.error(f"[LiveKit SIP] ⚠️ Error updating inbound trunk {trunk_id}: {e}")
            return False

    async def _remove_number_from_outbound_trunk(self, sip_client, trunk_id: str, phone_number: str) -> bool:
        try:
            list_resp = await sip_client.list_sip_outbound_trunk(sip.ListSIPOutboundTrunkRequest())
            trunk = next((t for t in (list_resp.items or []) if t.sip_trunk_id == trunk_id), None)
            if not trunk:
                return False

            numbers = list(trunk.numbers or [])
            if phone_number not in numbers:
                return True

            numbers.remove(phone_number)
            trunk.numbers[:] = numbers
            
            try:
                await sip_client.update_sip_outbound_trunk(trunk_id, trunk)
            except AttributeError:
                try:
                    await sip_client.update_outbound_trunk(trunk_id, trunk)
                except Exception as ex:
                    logger.error(f"[LiveKit SIP] Could not call update_outbound_trunk on {trunk_id}: {ex}")
                    return False
                    
            logger.info(f"[LiveKit SIP] ✅ Removed {phone_number} from outbound trunk {trunk_id}")
            return True
        except Exception as e:
            logger.error(f"[LiveKit SIP] ⚠️ Error updating outbound trunk {trunk_id}: {e}")
            return False


    # Backward compat alias
    async def create_inbound_trunk(self, phone_number: str, clinic_id: str, provider: str = "vobiz") -> dict | None:
        return await self.provision_number(phone_number, provider, clinic_id)


# Singleton
livekit_sip_service = LiveKitSipService()
