import os
import re
import httpx
import logging
from typing import List, Dict, Any
from .base import BaseProvider

logger = logging.getLogger("telnyx-provider")

class TelnyxProvider(BaseProvider):
    def __init__(self):
        self.api_key = os.getenv("TELNYX_API_KEY")
        self.base_url = "https://api.telnyx.com/v2"

    async def search_numbers(self, country: str, area_code: str = None) -> List[Dict[str, Any]]:
        if not self.api_key:
            logger.error("Missing TELNYX_API_KEY in environment")
            return []
            
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
            search_url = f"{self.base_url}/available_phone_numbers?filter[country_code]={country.upper()}&filter[limit]=15"
            if area_code:
                search_url += f"&filter[national_destination_code]={area_code}"
                
            try:
                res = await client.get(search_url, headers=headers)
                if res.status_code == 200:
                    data = res.json().get("data", [])
                    return [
                        {
                            "number": re.sub(r'[\s\-\(\)\.]+', '', n["phone_number"]),
                            "friendly_name": n["phone_number"],
                            "price_monthly": 2.0,
                            "provider": "telnyx",
                            "country": country
                        } for n in data
                    ]
            except Exception as e:
                logger.error(f"Telnyx search failed: {e}")
        return []

    async def purchase_number(self, number: str) -> bool:
        if not self.api_key: return False
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
            try:
                # 1. Check if already in inventory
                inv_url = f"{self.base_url}/phone_numbers?filter[phone_number]={number}"
                inv_res = await client.get(inv_url, headers=headers)
                if inv_res.status_code == 200 and inv_res.json().get("data"):
                    return True

                # 2. Otherwise order it
                conn_id = os.getenv("TELNYX_CONNECTION_ID")
                payload = {"phone_numbers": [{"phone_number": number}]}
                if conn_id: payload["connection_id"] = conn_id
                
                res = await client.post(f"{self.base_url}/number_orders", json=payload, headers=headers)
                return res.status_code in [200, 201, 202]
            except Exception as e:
                logger.error(f"Telnyx purchase failed: {e}")
        return False

    async def configure_sip(self, number: str) -> Dict[str, Any]:
        if not self.api_key: return {"status": "error", "message": "Missing Telnyx API Key"}
        
        conn_id = os.getenv("TELNYX_CONNECTION_ID")
        if not conn_id:
            return {"status": "error", "message": "Missing TELNYX_CONNECTION_ID for SIP routing"}

        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
            try:
                # Find the number ID
                res = await client.get(f"{self.base_url}/phone_numbers?filter[phone_number]={number}", headers=headers)
                if res.status_code == 200 and res.json().get("data"):
                    num_id = res.json()["data"][0]["id"]
                    # Patch the connection_id
                    patch_res = await client.patch(f"{self.base_url}/phone_numbers/{num_id}", json={"connection_id": conn_id}, headers=headers)
                    if patch_res.status_code == 200:
                        return {"status": "sip_configured", "connection_id": conn_id}
            except Exception as e:
                logger.error(f"Telnyx SIP config failed: {e}")
        return {"status": "error", "message": "SIP patch failed"}

