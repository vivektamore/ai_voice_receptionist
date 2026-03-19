from livekit.plugins import openai
from config import GROQ_API_KEY

def get_groq_llm(model="llama-3.3-70b-versatile"):
    """
    Returns an LLM instance connected to Groq.
    Uses llama-3.3-70b for best quality/speed ratio on Groq's infrastructure.
    Groq is completely OpenAI API compatible.
    """
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not set in environment or config.")

    return openai.LLM(
        base_url="https://api.groq.com/openai/v1",
        api_key=GROQ_API_KEY,
        model=model,
        temperature=0.3,  # Lower = faster, more predictable
    )
