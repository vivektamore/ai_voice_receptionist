import logging
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

# ─── Supported SMS providers ────────────────────────────────────────────────
# telnyx  → Telnyx REST API  (uses TELNYX_API_KEY)
# twilio  → Twilio REST API  (uses TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN)
# vobiz   → VoBiz API        (uses VOBIZ_AUTH_ID + VOBIZ_AUTH_TOKEN)
# ────────────────────────────────────────────────────────────────────────────

async def send_sms(
    to_number: str,
    message: str,
    from_number: str = None,
    provider: str = None
) -> bool:
    """
    Sends an SMS via the specified provider.
    Provider is resolved in this order:
      1. Explicit `provider` argument (set per-clinic from Supabase)
      2. Global `settings.sms_provider` (.env fallback)
      3. Default: "telnyx"

    Supported providers: telnyx | twilio | vobiz
    """
    if not provider:
        provider = settings.sms_provider or "telnyx"

    provider = provider.strip().lower()

    if not from_number:
        logger.warning("No from_number provided for SMS. Cannot send.")
        return False

    if not to_number:
        logger.warning("No to_number provided for SMS. Cannot send.")
        return False

    logger.info(f"SMS dispatch | provider={provider} | to={to_number} | from={from_number}")

    if provider == "telnyx":
        return await _send_telnyx_sms(to_number, from_number, message)
    elif provider == "twilio":
        return await _send_twilio_sms(to_number, from_number, message)
    elif provider == "vobiz":
        return await _send_vobiz_sms(to_number, from_number, message)
    else:
        logger.error(f"Unsupported SMS provider: '{provider}'. Use telnyx | twilio | vobiz")
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
    data = {"From": sender, "To": to, "Body": text}
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


async def _send_vobiz_sms(to: str, sender: str, text: str) -> bool:
    """
    Sends SMS via VoBiz (Plivo-compatible REST API).
    Uses VOBIZ_AUTH_ID + VOBIZ_AUTH_TOKEN from settings.
    API:  POST {VOBIZ_BASE_URL}{auth_id}/Message/
    Body: { "src": sender, "dst": to, "text": text }
    """
    auth_id    = settings.vobiz_auth_id
    auth_token = settings.vobiz_auth_token
    base_url   = settings.vobiz_base_url or "https://api.vobiz.ai/api/v1/Account/"

    if not auth_id or not auth_token:
        logger.error("VoBiz credentials (VOBIZ_AUTH_ID / VOBIZ_AUTH_TOKEN) not configured")
        return False

    # Ensure base_url ends with /
    if not base_url.endswith("/"):
        base_url += "/"

    url = f"{base_url}{auth_id}/Message/"

    # VoBiz / Plivo uses '+' stripped for dst if sending to Indian numbers
    # but keep E.164 format — let the API handle normalisation
    payload = {
        "src": sender,
        "dst": to,
        "text": text,
        "type": "sms",
    }

    async with httpx.AsyncClient() as client:
        try:
            res = await client.post(
                url,
                json=payload,
                auth=(auth_id, auth_token),
                timeout=15,
            )
            if res.status_code in [200, 201, 202]:
                logger.info(f"VoBiz SMS success | to={to} | from={sender}")
                return True
            else:
                logger.error(f"VoBiz SMS failed ({res.status_code}): {res.text}")
                return False
        except Exception as e:
            logger.error(f"VoBiz SMS exception: {e}")
            return False
