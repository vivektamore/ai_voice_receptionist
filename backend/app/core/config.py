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

    # AI services (optional)
    groq_api_key: Optional[str] = None
    sarvam_api_key: Optional[str] = None
    webhook_url: Optional[str] = None

    # Telephony for SMS
    telnyx_api_key: Optional[str] = None
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    # VoBiz (Plivo-compatible) for SMS
    vobiz_auth_id: Optional[str] = None
    vobiz_auth_token: Optional[str] = None
    vobiz_base_url: Optional[str] = "https://api.vobiz.ai/api/v1/Account/"
    sms_provider: str = "telnyx"  # Global default: telnyx | twilio | vobiz
    # Razorpay
    razorpay_key_id: Optional[str] = None
    razorpay_key_secret: Optional[str] = None
    razorpay_plan_id_usd: Optional[str] = None
    razorpay_plan_id_inr: Optional[str] = None
    razorpay_webhook_secret: Optional[str] = None

    # Stripe
    stripe_secret_key: Optional[str] = None
    stripe_webhook_secret: Optional[str] = None
    stripe_plan_id_usd: Optional[str] = None          # USD plan for global (non-India) customers
    stripe_success_url: Optional[str] = "https://clinicassistai.online/dashboard/billing?stripe=success"
    stripe_cancel_url: Optional[str] = "https://clinicassistai.online/dashboard/billing"

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",   # silently ignore any unknown .env keys
    )

settings = Settings()
