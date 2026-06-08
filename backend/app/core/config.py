from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Database
    supabase_url: str
    supabase_service_role_key: str

    # LiveKit (optional — used by voice agent, not required by FastAPI itself)
    livekit_url: Optional[str] = None
    livekit_api_key: Optional[str] = None
    livekit_api_secret: Optional[str] = None
    livekit_outbound_trunk_id: Optional[str] = None
    livekit_inbound_trunk_vobiz: Optional[str] = None
    livekit_inbound_trunk_telnyx: Optional[str] = None
    livekit_inbound_trunk_custom: Optional[str] = None

    # AI services (optional)
    groq_api_key: Optional[str] = None
    sarvam_api_key: Optional[str] = None
    webhook_url: Optional[str] = None

    # Telephony for SMS & Call Provisioning
    telnyx_api_key: Optional[str] = None
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    # VoBiz (Plivo-compatible) for SMS & Calls
    vobiz_auth_id: Optional[str] = None
    vobiz_auth_token: Optional[str] = None
    vobiz_base_url: Optional[str] = "https://api.vobiz.ai/api/v1/Account/"
    sms_provider: str = "telnyx"  # Global default: telnyx | twilio | vobiz
    sms_from_number: Optional[str] = None  # Global fallback sender number (E.164) for platform-level SMS

    # SIP Trunking & LiveKit Provisioning Settings
    livekit_sip_host: Optional[str] = None
    twilio_sip_domain: str = "pstn.twilio.com"
    telnyx_sip_user: Optional[str] = None
    telnyx_sip_pass: Optional[str] = None
    telnyx_connection_id: Optional[str] = None
    voxbiz_api_key: Optional[str] = None
    voxbiz_api_base: str = "https://api.voxbiz.com/v1"
    voxbiz_sip_user: Optional[str] = None
    voxbiz_sip_pass: Optional[str] = None
    default_country_code: str = "US"

    # Razorpay
    razorpay_key_id: Optional[str] = None
    razorpay_key_secret: Optional[str] = None
    razorpay_plan_id_usd: Optional[str] = None
    razorpay_plan_id_inr: Optional[str] = None
    razorpay_webhook_secret: Optional[str] = None



    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",   # silently ignore any unknown .env keys
    )

settings = Settings()
# Force uvicorn reload trigger for .env changes: 3


