from livekit.plugins import openai
from config import GROQ_API_KEY

def get_groq_llm(model="llama-3.1-8b-instant"):
    """
    Returns an LLM instance connected to Groq.
    Since Groq is completely OpenAI API compatible, we leverage
    LiveKit's built-in OpenAI plugin but point it to Groq's super-fast infrastructure.
    """
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not set in environment or config.")

    return openai.LLM(
        base_url="https://api.groq.com/openai/v1",
        api_key=GROQ_API_KEY,
        model=model
    )
