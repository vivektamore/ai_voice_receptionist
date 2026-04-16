import os
import httpx
import logging
from typing import List, Dict, Any
from .base import BaseProvider

logger = logging.getLogger("vobiz-provider")

class VobizProvider(BaseProvider):
    def __init__(self):
        self.auth_id = os.getenv("VOBIZ_AUTH_ID")
        self.auth_token = os.getenv("VOBIZ_AUTH_TOKEN")
        self.base_url = "https://api.vobiz.ai/api/v1"

    async def search_numbers(self, country: str, area_code: str = None) -> List[Dict[str, Any]]:
        if not self.auth_id or not self.auth_token:
            logger.error("Missing VOBIZ_AUTH_ID or VOBIZ_AUTH_TOKEN in environment")
            return []
            
        async with httpx.AsyncClient() as client:
            search_url = f"{self.base_url}/account/{self.auth_id}/inventory/numbers"
            headers = {
                "X-Auth-ID": self.auth_id,
                "X-Auth-Token": self.auth_token,
                "Content-Type": "application/json"
            }
            params = {
                "country": country.upper(),
                "page": 1,
                "per_page": 50
            }
            try:
                res = await client.get(search_url, headers=headers, params=params)
                if res.status_code == 200:
                    items = res.json().get("items", [])
                    return [
                        {
                            "number": n["e164"],
                            "friendly_name": n["e164"],
                            "price_monthly": float(n.get("monthly_fee", 12.0)),
                            "provider": "vobiz",
                            "country": country
                        } for n in items
                    ]
                else:
                    logger.error(f"Vobiz API rejected search: {res.status_code} {res.text}")
            except Exception as e:
                logger.error(f"Vobiz search crashed: {e}")
        return []

    async def purchase_number(self, number: str) -> bool:
        """
        Vobiz 'purchase' is just verification that it exists in the account inventory.
        Actual purchase happens in the Vobiz dashboard usually.
        """
        if not self.auth_id or not self.auth_token: return False
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                inventory_url = f"{self.base_url}/account/{self.auth_id}/inventory/numbers"
                headers = {"X-Auth-ID": self.auth_id, "X-Auth-Token": self.auth_token}
                country = "IN" if number.startswith("+91") else "US"
                params = {"country": country, "page": 1, "per_page": 50}
                res = await client.get(inventory_url, headers=headers, params=params)
                if res.status_code == 200:
                    owned = [n["e164"] for n in res.json().get("items", [])]
                    return number in owned
            except Exception as e:
                logger.error(f"Vobiz purchase verification failed: {e}")
        return False

    async def configure_sip(self, number: str) -> Dict[str, Any]:
        """
        Routes the Vobiz trunk to our LiveKit SIP domain.
        """
        if not self.auth_id or not self.auth_token:
            return {"status": "error", "message": "Missing Vobiz credentials"}

        number_clean = number.lstrip("+")
        sip_domain = os.getenv("LIVEKIT_SIP_DOMAIN", "sip.livekit.cloud")
        sip_uri = f"sip:{number}@{sip_domain}"

        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {"X-Auth-ID": self.auth_id, "X-Auth-Token": self.auth_token}
            try:
                url = f"{self.base_url}/account/{self.auth_id}/inventory/numbers/{number_clean}/sip"
                res = await client.put(url, json={"sip_uri": sip_uri}, headers=headers)
                if res.status_code in [200, 204]:
                    return {"status": "sip_configured", "sip_uri": sip_uri}
                elif res.status_code == 404:
                    logger.warning("Vobiz routing endpoint missing. Proceeding as non-fatal.")
                    return {"status": "sip_ready", "sip_uri": sip_uri}
            except Exception as e:
                logger.error(f"Vobiz SIP configuration crash: {e}")
        return {"status": "error", "message": "SIP config failed"}

