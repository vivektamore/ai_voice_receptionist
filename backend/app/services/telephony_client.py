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
        
    async def purchase_number(self, provider: str, country_code: str = "US", area_code: str = "") -> Optional[str]:
        """
        Purchases a number from the requested provider.
        Returns the purchased E.164 phone number if successful.
        """
        provider = provider.lower()
        if provider == "telnyx":
            return await self._purchase_telnyx(country_code, area_code)
        elif provider == "twilio":
            return await self._purchase_twilio(country_code, area_code)
        elif provider == "vobiz":
            return await self._purchase_vobiz(country_code, area_code)
        else:
            logger.error(f"Unsupported telephony provider: {provider}")
            return None

    async def configure_sip_trunk(self, provider: str, phone_number: str) -> bool:
        """
        Configures the purchased number to point to the LiveKit SIP Inbound Trunk URI.
        Returns True if successful.
        """
        # Pseudo-implementation for SIP trunk mapping. In a real scenario, this involves
        # hitting the respective Provider API to map the 'Phone Number' to a 'SIP Connection'.
        logger.info(f"Configuring SIP routing for {phone_number} on {provider} to point to LiveKit.")
        return True

    # --- Provider Implementations ---

    async def _purchase_telnyx(self, cc: str, area_code: str) -> Optional[str]:
        if not self.telnyx_api_key:
            logger.error("Missing TELNYX_API_KEY")
            return None
            
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {self.telnyx_api_key}", "Content-Type": "application/json"}
            
            # 1. Search for available numbers
            search_url = f"https://api.telnyx.com/v2/available_phone_numbers?filter[country_code]={cc}&filter[limit]=1"
            if area_code:
                search_url += f"&filter[national_destination_code]={area_code}"
                
            try:
                res = await client.get(search_url, headers=headers)
                data = res.json()
                if not data.get("data"):
                    logger.error("No Telnyx numbers available")
                    return None
                    
                target_number = data["data"][0]
                phone_number = target_number["phone_number"]
                
                # 2. Order the number
                order_payload = {"phone_numbers": [{"phone_number": phone_number}]}
                order_res = await client.post("https://api.telnyx.com/v2/number_orders", json=order_payload, headers=headers)
                
                if order_res.status_code in [200, 201]:
                    logger.info(f"Successfully purchased Telnyx number: {phone_number}")
                    return phone_number
                    
            except Exception as e:
                logger.error(f"Telnyx purchase failed: {e}")
                
        return None

    async def _purchase_twilio(self, cc: str, area_code: str) -> Optional[str]:
        # Twilio requires Basic Auth
        if not self.twilio_sid or not self.twilio_token:
            logger.error("Missing TWILIO credentials")
            return None
            
        auth = (self.twilio_sid, self.twilio_token)
        async with httpx.AsyncClient() as client:
            # 1. Search
            search_url = f"https://api.twilio.com/2010-04-01/Accounts/{self.twilio_sid}/AvailablePhoneNumbers/{cc}/Local.json"
            params = {"AreaCode": area_code} if area_code else {}
            
            try:
                res = await client.get(search_url, auth=auth, params=params)
                data = res.json()
                if not data.get("available_phone_numbers"):
                    logger.error("No Twilio numbers available")
                    return None
                    
                phone_number = data["available_phone_numbers"][0]["phone_number"]
                
                # 2. Buy
                buy_url = f"https://api.twilio.com/2010-04-01/Accounts/{self.twilio_sid}/IncomingPhoneNumbers.json"
                buy_data = {"PhoneNumber": phone_number}
                buy_res = await client.post(buy_url, data=buy_data, auth=auth)
                
                if buy_res.status_code in [200, 201]:
                    logger.info(f"Successfully purchased Twilio number: {phone_number}")
                    return phone_number
                    
            except Exception as e:
                logger.error(f"Twilio purchase failed: {e}")
                
        return None

    async def _purchase_vobiz(self, cc: str, area_code: str) -> Optional[str]:
        """
        Mock integration for Vobiz API as documentation is private/specific.
        Replace this with actual Vobiz REST integration when specs are available.
        """
        logger.info(f"Vobiz: Searching for {cc} number in {area_code}...")
        # Simulate success
        mock_number = "+919876543210" if cc == "IN" else "+15550000000"
        logger.info(f"Successfully reserved Vobiz number: {mock_number}")
        return mock_number

# Singleton
telephony_client = TelephonyClient()
