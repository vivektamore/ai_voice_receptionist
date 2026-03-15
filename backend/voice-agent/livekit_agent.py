import os
import asyncio
import logging
from dotenv import load_dotenv

from livekit.agents import AutoSubscribe, JobContext, JobProcess, WorkerOptions, WorkerType, cli
from livekit.agents.voice import Agent, AgentSession
from livekit.agents.llm import function_tool
from livekit.plugins import silero

from llm_groq import get_groq_llm
from tts_sarvam import SarvamTTS
from stt_sarvam import SarvamSTT
from webhook_client import post_appointment_to_backend

load_dotenv()
logger = logging.getLogger("voice-agent")
logger.setLevel(logging.INFO)


def prewarm(proc: JobProcess):
    """Pre-warm the VAD model so it's ready before the first call."""
    proc.userdata["vad"] = silero.VAD.load()


async def entrypoint(ctx: JobContext):
    """Main function that runs for EVERY new call (Room)."""
    room_name = ctx.room.name
    logger.info(f"Connecting to room: {room_name}")

    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # ── Agent instructions ──────────────────────────────────────────────────
    instructions = (
        "You are a friendly, helpful AI receptionist for a dental clinic. "
        "Your job is to help patients book appointments. "
        "Follow this flow:\n"
        "1. Greet the patient warmly.\n"
        "2. Ask for their full name.\n"
        "3. Ask for their phone number.\n"
        "4. Ask what date they prefer (e.g. March 15).\n"
        "5. Ask what time they prefer (e.g. 10 AM).\n"
        "6. Read all details back and confirm with the patient.\n"
        "7. Once confirmed, say: 'Let me book that for you now.' "
        "Then call the book_appointment function with all the collected details.\n"
        "8. After booking succeeds, say: 'Your appointment is booked! "
        "You will receive a confirmation message shortly. Have a great day!'\n\n"
        "Keep responses short and conversational. "
        "Never use emojis or unpronounceable punctuation since you are speaking aloud."
    )

    # ── Build the book_appointment tool with room_name captured in closure ──
    @function_tool(
        name="book_appointment",
        description=(
            "Book a patient appointment. Call this ONLY after you have confirmed "
            "the patient's full name, phone number, preferred date, and preferred time."
        ),
    )
    async def book_appointment(
        patient_name: str,
        caller_phone: str,
        preferred_date: str,
        preferred_time: str,
    ) -> str:
        """
        patient_name: Full name of the patient
        caller_phone: Patient phone number
        preferred_date: Preferred appointment date, e.g. March 15 or 2024-03-15
        preferred_time: Preferred appointment time, e.g. 10 AM
        """
        summary = (
            f"Patient {patient_name} requested an appointment on "
            f"{preferred_date} at {preferred_time}. Phone: {caller_phone}."
        )
        result = await post_appointment_to_backend(
            patient_name=patient_name,
            caller_phone=caller_phone,
            preferred_date=preferred_date,
            preferred_time=preferred_time,
            summary=summary,
            room_name=room_name,
        )
        if result.get("success"):
            logger.info(f"Appointment booked: lead_id={result.get('lead_id')}")
            return f"Appointment booked successfully. Lead ID: {result.get('lead_id')}"
        else:
            logger.error(f"Booking failed: {result.get('error')}")
            return f"Booking failed: {result.get('error', 'unknown error')}"

    # ── Components ──────────────────────────────────────────────────────────
    stt = SarvamSTT(model="saaras:v1")
    tts = SarvamTTS(voice="priya", model="bulbul:v3")
    llm = get_groq_llm()

    # ── Session ─────────────────────────────────────────────────────────────
    agent_session = AgentSession(
        stt=stt,
        llm=llm,
        tts=tts,
        vad=ctx.proc.userdata["vad"],
        tools=[book_appointment],   # Pass tool list directly — v1.4 API
    )

    agent = Agent(instructions=instructions)
    await agent_session.start(agent, room=ctx.room)

    # Speak greeting after WebRTC connects
    await asyncio.sleep(1)
    await agent_session.say(
        "Hello, thank you for calling the dental clinic. How may I help you today?"
    )
    logger.info("Agent joined room and spoke greeting.")


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
            worker_type=WorkerType.ROOM,
            agent_name="dental_agent",
        )
    )
