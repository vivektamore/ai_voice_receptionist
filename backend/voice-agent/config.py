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

# Webhook configuration
WEBHOOK_URL = os.getenv("WEBHOOK_URL", "http://localhost:8000/api/leads/webhook")
