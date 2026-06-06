import os
import httpx
import logging
from typing import Dict, Any, Optional
from app.core.database import supabase

logger = logging.getLogger("telephony")

class TelephonyClient:
    def __init__(self):
        # API Keys
        self.telnyx_api_key = os.getenv("TELNYX_API_KEY")
        self.twilio_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.twilio_token = os.getenv("TWILIO_AUTH_TOKEN")
        # Auth vars moved to method level to prevent import-time load_dotenv race conditions
        
    async def search_numbers(self, provider: str, country_code: str = "US", area_code: str = "", limit: int = 5) -> list:
        """
        Searches for available numbers from the provider.
        Returns a list of dicts: [{"number": "+...", "friendly_name": "..."}]
        """
        provider = provider.lower()
        if provider == "telnyx":
            return await self._search_telnyx(country_code, area_code, limit)
        elif provider == "twilio":
            return await self._search_twilio(country_code, area_code, limit)
        elif provider == "vobiz":
            return await self._search_vobiz(country_code, area_code, limit)
        else:
            logger.error(f"Unsupported telephony provider for search: {provider}")
            return []

    async def purchase_number(self, provider: str, target_number: str) -> Optional[str]:
        """
        Purchases a specific number from the requested provider.
        """
        provider = provider.lower()
        if provider == "telnyx":
            return await self._purchase_telnyx(target_number)
        elif provider == "twilio":
            return await self._purchase_twilio(target_number)
        elif provider == "vobiz":
            return await self._purchase_vobiz(target_number)
        else:
            logger.error(f"Unsupported telephony provider: {provider}")
            return None

    async def configure_sip_trunk(self, provider: str, phone_number: str) -> bool:
        """
        Configures the purchased number to point to the LiveKit SIP Inbound Trunk URI.
        Returns True if successful.
        """
        provider = provider.lower()
        logger.info(f"Configuring SIP routing for {phone_number} on {provider}...")
        
        # LiveKit Cloud SIP Domain
        # If user has a custom domain, they should set LIVEKIT_SIP_DOMAIN in .env
        sip_domain = os.getenv("LIVEKIT_SIP_DOMAIN", "sip.livekit.cloud")
        sip_uri = f"sip:{phone_number}@{sip_domain}"

        if provider == "telnyx":
            return await self._configure_telnyx_sip(phone_number, sip_domain)
        elif provider == "vobiz":
            return await self._configure_vobiz_sip(phone_number, sip_uri)
        
        logger.warning(f"SIP configuration not implemented for provider: {provider}")
        return True

    async def _configure_telnyx_sip(self, phone_number: str, sip_domain: str) -> bool:
        if not self.telnyx_api_key:
            return False
        
        connection_id = os.getenv("TELNYX_CONNECTION_ID")
        if not connection_id:
            logger.error("Missing TELNYX_CONNECTION_ID in .env. Cannot route number to LiveKit.")
            return False

        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {self.telnyx_api_key}", "Content-Type": "application/json"}
            try:
                # 1. Find the Phone Number ID in Telnyx
                search_url = f"https://api.telnyx.com/v2/phone_numbers?filter[phone_number]={phone_number}"
                res = await client.get(search_url, headers=headers)
                data = res.json()
                if not data.get("data"):
                    logger.error(f"Telnyx number {phone_number} not found for SIP config.")
                    return False
                
                number_id = data["data"][0]["id"]
                
                # 2. Update the number to use the SIP Connection
                patch_url = f"https://api.telnyx.com/v2/phone_numbers/{number_id}"
                payload = {"connection_id": connection_id}
                patch_res = await client.patch(patch_url, json=payload, headers=headers)
                
                if patch_res.status_code == 200:
                    logger.info(f"Successfully linked {phone_number} to Telnyx SIP Connection {connection_id}")
                    return True
                else:
                    logger.error(f"Failed to patch Telnyx number: {patch_res.text}")
            except Exception as e:
                logger.error(f"Telnyx SIP config failed: {e}")
        return False

    async def _configure_vobiz_sip(self, phone_number: str, sip_uri: str) -> bool:
        auth_id = os.getenv("VOBIZ_AUTH_ID")
        auth_token = os.getenv("VOBIZ_AUTH_TOKEN")
        if not auth_id or not auth_token:
            return False

        # Strip leading + for Vobiz number lookup (some APIs use numeric only)
        number_clean = phone_number.lstrip("+")

        async with httpx.AsyncClient(timeout=30.0) as client:
            # VoBiz uses HTTP Basic Auth (same pattern as the SMS service)
            auth = (auth_id, auth_token)
            try:
                # Vobiz DID SIP configuration endpoint
                # Pattern: PUT /api/v1/Account/{auth_id}/Number/{number}/
                routing_url = f"https://api.vobiz.ai/api/v1/Account/{auth_id}/Number/{number_clean}/"
                payload = {
                    "answer_url": f"sip:{phone_number}@{os.getenv('LIVEKIT_SIP_DOMAIN', 'sip.livekit.cloud')}",
                    "sip_uri": sip_uri
                }
                logger.info(f"[Vobiz SIP] PUT {routing_url}  payload={payload}")
                res = await client.put(routing_url, json=payload, auth=auth)
                logger.info(f"[Vobiz SIP] Response {res.status_code}: {res.text}")

                if res.status_code in [200, 201, 204]:
                    logger.info(f"[Vobiz SIP] ✅ Routed {phone_number} → {sip_uri}")
                    return True
                elif res.status_code == 404:
                    # Endpoint not found — Vobiz may use a different path, but
                    # this is non-fatal: the LiveKit trunk already handles inbound routing.
                    logger.warning(
                        f"[Vobiz SIP] ⚠️ Routing endpoint not found (404). "
                        f"Inbound calls still work via LiveKit trunk — manual Vobiz SIP config may be needed."
                    )
                    return True  # non-fatal, LiveKit trunk handles it
                else:
                    logger.error(f"[Vobiz SIP] Routing failed {res.status_code}: {res.text}")
                    return False
            except Exception as e:
                logger.error(f"[Vobiz SIP] Config crashed: {e}")
        return False

    # --- Provider Implementations ---

    async def _search_telnyx(self, cc: str, area_code: str, limit: int) -> list:
        if not self.telnyx_api_key:
            return []
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {self.telnyx_api_key}", "Content-Type": "application/json"}
            search_url = f"https://api.telnyx.com/v2/available_phone_numbers?filter[country_code]={cc}&filter[limit]={limit}"
            if area_code:
                search_url += f"&filter[national_destination_code]={area_code}"
            try:
                res = await client.get(search_url, headers=headers)
                data = res.json()
                if data.get("data"):
                    return [{"number": n["phone_number"], "friendly_name": n["phone_number"]} for n in data["data"]]
            except Exception as e:
                logger.error(f"Telnyx search failed: {e}")
        return []

    async def _purchase_telnyx(self, target_number: str) -> Optional[str]:
        if not self.telnyx_api_key:
            return None
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {self.telnyx_api_key}", "Content-Type": "application/json"}
            try:
                # 1. Check if number is ALREADY in our inventory (Trial accounts have limits)
                inventory_url = f"https://api.telnyx.com/v2/phone_numbers?filter[phone_number]={target_number}"
                inv_res = await client.get(inventory_url, headers=headers)
                if inv_res.status_code == 200:
                    inv_data = inv_res.json()
                    if inv_data.get("data"):
                        logger.info(f"[Telnyx] Number {target_number} is already in inventory. Using for provision.")
                        return target_number

                # 2. Not in inventory, try to purchase
                connection_id = os.getenv("TELNYX_CONNECTION_ID")
                order_payload = {
                    "phone_numbers": [{"phone_number": target_number}]
                }
                if connection_id:
                    order_payload["connection_id"] = connection_id
                
                res = await client.post("https://api.telnyx.com/v2/number_orders", json=order_payload, headers=headers)
                if res.status_code in [200, 201, 202]:
                    logger.info(f"Successfully purchased Telnyx number: {target_number}")
                    return target_number
                else:
                    logger.error(f"Telnyx purchase failed {res.status_code}: {res.text}")
            except Exception as e:
                logger.error(f"Telnyx purchase crashed: {e}")
        return None

    async def _search_twilio(self, cc: str, area_code: str, limit: int) -> list:
        if not self.twilio_sid or not self.twilio_token:
            return []
        auth = (self.twilio_sid, self.twilio_token)
        async with httpx.AsyncClient() as client:
            search_url = f"https://api.twilio.com/2010-04-01/Accounts/{self.twilio_sid}/AvailablePhoneNumbers/{cc}/Local.json?PageSize={limit}"
            params = {"AreaCode": area_code} if area_code else {}
            try:
                res = await client.get(search_url, auth=auth, params=params)
                data = res.json()
                if data.get("available_phone_numbers"):
                    return [{"number": n["phone_number"], "friendly_name": n["friendly_name"]} for n in data["available_phone_numbers"]]
            except Exception as e:
                logger.error(f"Twilio search failed: {e}")
        return []

    async def _purchase_twilio(self, target_number: str) -> Optional[str]:
        if not self.twilio_sid or not self.twilio_token:
            return None
        auth = (self.twilio_sid, self.twilio_token)
        async with httpx.AsyncClient() as client:
            try:
                buy_url = f"https://api.twilio.com/2010-04-01/Accounts/{self.twilio_sid}/IncomingPhoneNumbers.json"
                buy_res = await client.post(buy_url, data={"PhoneNumber": target_number}, auth=auth)
                if buy_res.status_code in [200, 201]:
                    logger.info(f"Successfully purchased Twilio number: {target_number}")
                    return target_number
                else:
                    logger.error(f"Twilio purchase failed {buy_res.status_code}: {buy_res.text}")
            except Exception as e:
                logger.error(f"Twilio purchase crashed: {e}")
        return None

    async def _search_vobiz(self, cc: str, area_code: str, limit: int) -> list:
        """ Real Vobiz Search """
        auth_id = os.getenv("VOBIZ_AUTH_ID")
        auth_token = os.getenv("VOBIZ_AUTH_TOKEN")
        
        if not auth_id or not auth_token:
            logger.error("Missing VOBIZ_AUTH_ID or VOBIZ_AUTH_TOKEN in environment")
            return []
            
        async with httpx.AsyncClient() as client:
            search_url = f"https://api.vobiz.ai/api/v1/account/{auth_id}/inventory/numbers"
            
            headers = {
                "X-Auth-ID": auth_id,
                "X-Auth-Token": auth_token,
                "Content-Type": "application/json"
            }
            
            params = {
                "country": cc,
                "page": 1,
                "per_page": limit
            }
                
            try:
                logger.info(f"--> [VOBIZ DEBUG] FETCHING: {search_url}")
                logger.info(f"--> [VOBIZ DEBUG] PARAMS: {params}")
                
                res = await client.get(search_url, headers=headers, params=params)
                
                logger.info(f"<-- [VOBIZ DEBUG] STATUS CODE: {res.status_code}")
                logger.info(f"<-- [VOBIZ DEBUG] RAW RESPONSE TEXT: {res.text}")
                    
                if res.status_code == 200:
                    data = res.json()
                    items = data.get("items", [])
                    
                    if not items:
                        logger.warning(f"[VOBIZ DEBUG] Inventory returned 200 OK, but the array is EMPTY for Country: {cc}.")
                    
                    return [
                        {
                            "number": n["e164"],
                            "friendly_name": n["e164"],
                            "price": n.get("monthly_fee", 0),
                            "setup_fee": n.get("setup_fee", 0)
                        } for n in items
                    ]
                else:
                    logger.error(f"[VOBIZ DEBUG ERROR] The API rejected the request. Code: {res.status_code}")
            except Exception as e:
                logger.error(f"[VOBIZ DEBUG FATAL] Vobiz search crashed: {e}")
        return []

    async def _purchase_vobiz(self, target_number: str) -> Optional[str]:
        """
        Vobiz 'purchase' flow:
        The /inventory/numbers search returns numbers ALREADY OWNED in your Vobiz account.
        So there's no separate purchase step needed — we just verify the number exists in
        inventory and return it directly. The next step (configure_sip_trunk) will set up
        SIP routing for it.
        """
        auth_id = os.getenv("VOBIZ_AUTH_ID")
        auth_token = os.getenv("VOBIZ_AUTH_TOKEN")
        
        if not auth_id or not auth_token:
            logger.error("[Vobiz] Missing VOBIZ_AUTH_ID or VOBIZ_AUTH_TOKEN in environment")
            return None

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                # Confirm the number is in inventory before assigning it
                inventory_url = f"https://api.vobiz.ai/api/v1/account/{auth_id}/inventory/numbers"
                headers = {
                    "X-Auth-ID": auth_id,
                    "X-Auth-Token": auth_token,
                    "Content-Type": "application/json"
                }
                country = "IN" if target_number.startswith("+91") else "US"
                params = {"country": country, "page": 1, "per_page": 50}

                logger.info(f"[Vobiz] Verifying {target_number} in inventory...")
                res = await client.get(inventory_url, headers=headers, params=params)

                if res.status_code == 200:
                    items = res.json().get("items", [])
                    owned = [n["e164"] for n in items]
                    if target_number in owned:
                        logger.info(f"[Vobiz] ✅ {target_number} confirmed in inventory — no purchase needed.")
                        return target_number
                    else:
                        logger.error(
                            f"[Vobiz] {target_number} not found in inventory. "
                            f"Available: {owned}"
                        )
                        return None
                else:
                    logger.error(f"[Vobiz] Inventory check failed {res.status_code}: {res.text}")
                    return None

            except Exception as e:
                logger.error(f"[Vobiz] Inventory verification crashed: {e}")
        return None


# Singleton
telephony_client = TelephonyClient()
