from livekit.agents.pipeline import VoicePipelineAgent
from livekit.plugins import silero, core
from livekit.agents import llm
from livekit.agents import JobContext, JobProcess, AutoSubscribe, WorkerOptions, cli
import asyncio
import logging

from llm_groq import get_groq_llm
from tts_sarvam import SarvamTTS
from stt_sarvam import SarvamSTT
from config import LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET

# Set up simple logging to see what the agent is doing
logger = logging.getLogger("voice-agent")
logger.setLevel(logging.INFO)

def prewarm(proc: JobProcess):
    """
    Pre-warm state like VAD (Voice Activity Detection) models.
    This runs when the worker starts, before any call comes in.
    """
    proc.userdata["vad"] = silero.VAD.load()

async def entrypoint(ctx: JobContext):
    """
    This is the main function that runs for EVERY new call (Room).
    """
    logger.info(f"Connecting to room: {ctx.room.name}")
    
    # Only subscribe to audio, we don't need video for a phone receptionist
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # 1. Define how the AI should behave (System Prompt)
    initial_ctx = llm.ChatContext().append(
        role="system",
        text=(
            "You are a friendly, helpful AI receptionist for a medical clinic. "
            "You must respond with short and concise answers. "
            "Never use emojis or unpronounceable punctuation, as you are speaking."
        ),
    )
    
    # 2. Connect the pieces
    stt = SarvamSTT(model="saaras:v1")
    tts = SarvamTTS(voice="priya", model="bulbul:v3")
    llm_plugin = get_groq_llm()
    
    # 3. Create the Voice Agent
    agent = VoicePipelineAgent(
        vad=ctx.proc.userdata["vad"],
        stt=stt,
        llm=llm_plugin,
        tts=tts,
        chat_ctx=initial_ctx,
    )

    # 4. Start the agent in the room
    agent.start(ctx.room, ctx.participant)

    # 5. Make the agent speak first!
    await asyncio.sleep(1) # Small delay to ensure audio is connected
    await agent.say("Hello! Thanks for calling. How can I help you today?", allow_interruptions=True)

if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
        )
    )
