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

    # AI services (optional)
    groq_api_key: Optional[str] = None
    sarvam_api_key: Optional[str] = None
    webhook_url: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",   # silently ignore any unknown .env keys
    )

settings = Settings()
