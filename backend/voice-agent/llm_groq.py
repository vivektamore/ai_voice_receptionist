import os
from livekit.plugins import openai
from config import GROQ_API_KEY

# llama-3.3-70b-versatile: best quality for medical/dental conversations.
# On Groq Dev tier (paid), TPM limits are 10x higher — no more 429 errors.
# Override via GROQ_MODEL env var e.g. GROQ_MODEL=llama-3.1-8b-instant for free tier.
_DEFAULT_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

def get_groq_llm(model: str = _DEFAULT_MODEL):
    """
    Returns an LLM instance connected to Groq.
    Uses llama-3.1-8b-instant by default for best latency + TPM headroom.
    Groq is completely OpenAI API compatible.
    Override model via GROQ_MODEL environment variable.
    """
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not set in environment or config.")

    return openai.LLM(
        base_url="https://api.groq.com/openai/v1",
        api_key=GROQ_API_KEY,
        model=model,
        temperature=0.3,  # Lower = faster, more predictable
    )
