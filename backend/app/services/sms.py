import logging
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

async def send_sms(to_number: str, message: str, from_number: str = None, provider: str = None) -> bool:
    """
    Sends an SMS using Telnyx or Twilio.
    If provider is not specified, it uses the global settings.sms_provider.
    """
    if not provider:
        provider = settings.sms_provider or "telnyx"
        
    provider = provider.lower()
    
    # Standardize the 'from' number
    # If a specific from_number isn't provided, we can't send unless we have a default.
    if not from_number:
        logger.warning("No from_number provided for SMS. Cannot send.")
        return False

    if provider == "telnyx":
        return await _send_telnyx_sms(to_number, from_number, message)
    elif provider == "twilio":
        return await _send_twilio_sms(to_number, from_number, message)
    else:
        logger.error(f"Unsupported SMS provider: {provider}")
        return False

async def _send_telnyx_sms(to: str, sender: str, text: str) -> bool:
    if not settings.telnyx_api_key:
        logger.error("Telnyx API key not configured for SMS")
        return False
        
    url = "https://api.telnyx.com/v2/messages"
    headers = {
        "Authorization": f"Bearer {settings.telnyx_api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "from": sender,
        "to": to,
        "text": text
    }
    
    async with httpx.AsyncClient() as client:
        try:
            res = await client.post(url, json=payload, headers=headers)
            if res.status_code in [200, 201]:
                logger.info(f"Telnyx SMS success | to={to} | from={sender}")
                return True
            else:
                logger.error(f"Telnyx SMS failed ({res.status_code}): {res.text}")
                return False
        except Exception as e:
            logger.error(f"Telnyx SMS exception: {e}")
            return False

async def _send_twilio_sms(to: str, sender: str, text: str) -> bool:
    if not settings.twilio_account_sid or not settings.twilio_auth_token:
        logger.error("Twilio credentials not configured for SMS")
        return False
        
    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.twilio_account_sid}/Messages.json"
    data = {
        "From": sender,
        "To": to,
        "Body": text
    }
    auth = (settings.twilio_account_sid, settings.twilio_auth_token)
    
    async with httpx.AsyncClient() as client:
        try:
            res = await client.post(url, data=data, auth=auth)
            if res.status_code in [200, 201]:
                logger.info(f"Twilio SMS success | to={to} | from={sender}")
                return True
            else:
                logger.error(f"Twilio SMS failed ({res.status_code}): {res.text}")
                return False
        except Exception as e:
            logger.error(f"Twilio SMS exception: {e}")
            return False
