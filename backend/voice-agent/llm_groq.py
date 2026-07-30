import os
from livekit.plugins import openai
from config import GROQ_API_KEY

# openai/gpt-oss-120b: Primary model for clinical reasoning & fast tool calling.
# Replaces deprecated llama-3.3-70b-versatile & llama-3.1-8b-instant (deprecated by Groq).
# Override via GROQ_MODEL env var e.g. GROQ_MODEL=openai/gpt-oss-20b for fast burst traffic.
_DEFAULT_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

def get_groq_llm(model: str = None):
    """
    Returns an LLM instance connected to Groq.
    Uses openai/gpt-oss-120b by default for high quality + low latency tool calling.
    Groq is completely OpenAI API compatible.
    Override model via GROQ_MODEL environment variable or model argument.
    """
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not set in environment or config.")

    selected_model = model or _DEFAULT_MODEL
    return openai.LLM(
        base_url="https://api.groq.com/openai/v1",
        api_key=GROQ_API_KEY,
        model=selected_model,
        temperature=0.3,  # Lower = faster, more predictable tool calls
    )
