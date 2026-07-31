import os
from dotenv import load_dotenv

# Load environment variables from a .env file
load_dotenv()

# LiveKit connection details
LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")

# AI Service keys
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
CARTESIA_API_KEY = os.getenv("CARTESIA_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")

# Webhook & Booking configuration
# Automatically resolve localhost URLs to production domain if running on production server
def _resolve_url(env_val: str, default_path: str) -> str:
    base = os.getenv("NEXT_PUBLIC_BACKEND_URL") or os.getenv("BACKEND_URL") or "https://api.clinicassistai.online"
    base = base.rstrip("/")
    if not env_val or "localhost:8000" in env_val or "127.0.0.1:8000" in env_val:
        return f"{base}{default_path}"
    return env_val

WEBHOOK_URL = _resolve_url(os.getenv("WEBHOOK_URL"), "/api/v1/voice/webhook/livekit")
BOOKING_URL = _resolve_url(os.getenv("BOOKING_URL"), "/api/v1/bookings/create")
