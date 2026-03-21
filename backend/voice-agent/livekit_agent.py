import os
import re
import json
import asyncio
import logging
from dotenv import load_dotenv

from livekit import rtc
from livekit.agents import AutoSubscribe, JobContext, JobProcess, WorkerOptions, WorkerType, cli
from livekit.agents.voice import Agent, AgentSession
from livekit.agents.llm import function_tool, ChatMessage
from livekit.plugins import silero

from llm_groq import get_groq_llm
from tts_sarvam import SarvamTTS
from stt_sarvam import SarvamSTT
from webhook_client import post_appointment_to_backend

load_dotenv()

# ── Standalone Supabase client ───────────────────────────────────────────────
try:
    from supabase import create_client
    _supabase_url = os.getenv("SUPABASE_URL")
    _supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
    supabase = create_client(_supabase_url, _supabase_key) if _supabase_url and _supabase_key else None
except Exception as _e:
    supabase = None
    print(f"Warning: Supabase not available in voice agent: {_e}")

logger = logging.getLogger("voice-agent")
logger.setLevel(logging.INFO)


# ═══════════════════════════════════════════════════════════════════════════════
# PROMPTS
# ═══════════════════════════════════════════════════════════════════════════════

INBOUND_PROMPT = """\
You are a professional dental clinic receptionist handling an incoming call.

LANGUAGE:
- Detect user language automatically.
- Support English, Hindi, and Hinglish.
- Always reply in the SAME language style as the user.

BEHAVIOR:
- Be polite, clear, and human-like.
- Keep responses short (1–2 sentences).
- Ask one question at a time.
- If someone says their name, gently confirm the spelling.

FLOW:
1. Greet the caller warmly
2. Identify intent (booking / inquiry / emergency)
3. Collect details one by one: Name → Phone → Date → Time → Service type
4. If emergency → prioritize immediately
5. Confirm all details before booking
6. Call create_booking tool after confirmation

RULES:
- NEVER say internal variable names like "appointment_type"
- Do NOT ask all questions at once
- Handle mixed language naturally
- Do NOT sound like a bot

EXAMPLES:
User: "kal appointment chahiye"
AI: "ठीक है, किस time पर आना चाहेंगे?"

User: "I need a cleaning"
AI: "Sure! What day works best for you?"
"""

def build_outbound_prompt(call_type: str, context: dict) -> str:
    """
    Builds a context-aware outbound prompt based on the call type and patient context.
    call_type options: confirmation | reminder | missed_call | lead_followup | general
    """
    patient_name = context.get("patient_name", "")
    date = context.get("date", "")
    time = context.get("time", "")
    service = context.get("service", "")
    clinic_name = context.get("clinic_name", "Smile Dental Clinic")

    name_ref = f" with {patient_name}" if patient_name else ""
    appt_ref = f"on {date} at {time}" if date and time else ""
    service_ref = f"for {service}" if service else ""

    # ── Use-case specific opening lines ─────────────────────────────────────
    if call_type == "confirmation":
        scenario = (
            f"STEP 2 — CONTEXT (after permission):\n"
            f"Say: \"We're calling to confirm your appointment{appt_ref} {service_ref}.\"\n"
            f"Hindi: \"आपका अपॉइंटमेंट {appt_ref} के लिए कन्फर्म करना था।\"\n\n"
            f"STEP 3 — ACTION:\n"
            f"Ask: \"Does that timing still work for you?\"\n"
            f"Hindi: \"क्या आप उस समय पर आ पाएंगे?\"\n"
        )
    elif call_type == "reminder":
        scenario = (
            f"STEP 2 — CONTEXT:\n"
            f"Say: \"This is a friendly reminder about your appointment {appt_ref}.\"\n"
            f"Hindi: \"आपका कल {time} बजे अपॉइंटमेंट है, बस याद दिलाना था।\"\n\n"
            f"STEP 3 — ACTION:\n"
            f"Ask: \"Will you be able to make it?\"\n"
        )
    elif call_type == "missed_call":
        scenario = (
            f"STEP 2 — CONTEXT:\n"
            f"Say: \"We noticed a missed call from your number and wanted to follow up.\"\n"
            f"Hindi: \"आपका missed call आया था, इसलिए callback किया।\"\n\n"
            f"STEP 3 — ACTION:\n"
            f"Ask: \"Is there something I can help you with?\"\n"
        )
    elif call_type == "lead_followup":
        scenario = (
            f"STEP 2 — CONTEXT:\n"
            f"Say: \"You showed interest in {service or 'our dental services'} and we wanted to reach out.\"\n"
            f"Hindi: \"आपने dental services में interest दिखाया था।\"\n\n"
            f"STEP 3 — ACTION:\n"
            f"Ask: \"Would you like to book an appointment this week?\"\n"
        )
    else:  # general
        scenario = (
            f"STEP 2 — CONTEXT:\n"
            f"Say: \"We wanted to reach out regarding your dental care at {clinic_name}.\"\n\n"
            f"STEP 3 — ACTION:\n"
            f"Ask: \"Is there anything I can help you with today?\"\n"
        )

    return f"""\
You are a professional assistant from {clinic_name} making an outbound call.

CRITICAL: This user did NOT call you. You called THEM.
- Always ask permission before continuing
- Keep responses very short (1–2 sentences max)
- If user says "busy" or "not now" → say "No problem, I won't take long" and keep it brief
- If user is clearly uninterested → politely end the call

LANGUAGE:
- Detect user language automatically
- Support English, Hindi, and Hinglish
- Reply in the SAME language style as the user

---

OUTBOUND CALL FLOW:

STEP 1 — GREETING + PERMISSION (Always start here):
"Hi, this is {clinic_name} calling. Is this a good time to talk?"
Hindi: "Hello, main {clinic_name} se bol raha hoon. Kya abhi baat karna theek hai?"

If user says busy:
"No problem, I'll keep it very quick — just 30 seconds."

{scenario}

STEP 4 — HANDLE RESPONSES:
- If YES → confirm details, call create_booking if needed
- If NO → offer an alternative time
- If confused → explain briefly and simply

STEP 5 — CLOSE:
"Great, you're all set! See you then. Have a wonderful day."
Hindi: "Bilkul, aapka time note kar liya. Dhanyavaad!"

---

RULES:
- NEVER ask multiple questions at once
- NEVER sound scripted or robotic
- Do NOT push if user is clearly uninterested — end gracefully
- Call create_booking ONLY after user explicitly confirms

INTERRUPT HANDLING:
User: "I'm busy" → "No problem, I'll keep it quick — just confirming one thing."
User: "Who is this?" → Introduce clinic name clearly, then ask permission again
User: "Not interested" → "Absolutely fine, sorry to bother you. Have a great day!"
"""


# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def resolve_agent_settings(room: str, base_instructions: str):
    """Fetches dynamic voice/language/prompt overrides from Supabase agent_settings."""
    sel_voice = "priya"
    sel_model = "bulbul:v3"
    final_inst = base_instructions
    c_id = None

    if not supabase:
        return c_id, sel_voice, sel_model, final_inst

    try:
        # Extract clinic_id from outbound room name: "outbound-{clinic_id}-{timestamp}"
        if "outbound-" in room:
            parts = room.split("-")
            if len(parts) >= 6: # outbound + 5 UUID parts + timestamp
                c_id = "-".join(parts[1:6])

        # For inbound, look up by external_call_id
        if not c_id:
            lead_chk = supabase.table("leads").select("clinic_id").eq("external_call_id", room).limit(1).execute()
            if lead_chk.data:
                c_id = lead_chk.data[0]["clinic_id"]

        if c_id:
            opts = supabase.table("agent_settings").select("*").eq("clinic_id", c_id).execute()
            if opts.data:
                cnf = opts.data[0]
                if cnf.get("prompt"):
                    final_inst = cnf["prompt"]
                gender = "female"
                if cnf.get("voice"):
                    v = cnf["voice"].lower()
                    if v in ["tarun", "arjun", "male"]:
                        gender = "male"
                        sel_voice = "tarun" if v == "male" else v
                    else:
                        gender = "female"
                        sel_voice = "priya" if v == "female" else v
                final_inst = f"CRITICAL IDENTITY: You are a {gender} dental receptionist.\n\n" + final_inst
                if cnf.get("language"):
                    lang = cnf["language"]
                    final_inst = f"CRITICAL RULE: Converse strictly in {lang}.\n\n" + final_inst

    except Exception as e:
        logger.error(f"Failed to fetch dynamic settings for room {room}: {e}")

    return c_id, sel_voice, sel_model, final_inst


def prewarm(proc: JobProcess):
    """Pre-warm the VAD model with aggressive endpointing to reduce response latency."""
    proc.userdata["vad"] = silero.VAD.load(
        min_silence_duration=0.15,   # Stop listening after 150ms of silence (vs default ~500ms)
        min_speech_duration=0.05,    # Detect speech after just 50ms
        activation_threshold=0.55,   # Slightly more sensitive to speech
        prefix_padding_duration=0.1, # Very short padding before speech
    )


# ═══════════════════════════════════════════════════════════════════════════════
# ENTRYPOINT
# ═══════════════════════════════════════════════════════════════════════════════

async def entrypoint(ctx: JobContext):
    """Main function that runs for EVERY new call (Room)."""
    room_name = ctx.room.name
    logger.info(f"Connecting to room: {room_name}")

    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    @ctx.room.on("participant_disconnected")
    def on_participant_disconnected(participant: rtc.RemoteParticipant):
        """When the SIP user hangs up, the AI should also leave to close the room."""
        logger.info(f"Participant {participant.identity} disconnected. Hanging up.")
        asyncio.create_task(ctx.room.disconnect())

    # ── Detect call direction ─────────────────────────────────────────────────
    is_outbound = room_name.startswith("outbound-")

    # ── Read call context from room metadata (injected by outbound API) ───────
    call_context = {}
    call_type = "general"
    try:
        metadata_raw = ctx.room.metadata or "{}"
        call_context = json.loads(metadata_raw)
        call_type = call_context.get("type", "general")
    except Exception:
        pass

    # ── Choose base prompt ────────────────────────────────────────────────────
    if is_outbound:
        base_instructions = build_outbound_prompt(call_type, call_context)
        logger.info(f"Outbound call — type={call_type} context={call_context}")
    else:
        base_instructions = INBOUND_PROMPT
        logger.info("Inbound call — using inbound prompt")

    # ── Override with Supabase dynamic settings (voice, language, prompt) ─────
    clinic_id, selected_voice, tts_model, final_instructions = resolve_agent_settings(
        room_name, base_instructions
    )

    # ── Build the create_booking tool ─────────────────────────────────────────
    @function_tool(
        name="create_booking",
        description=(
            "Book a patient appointment. Call this ONLY after you have confirmed "
            "the patient's full name, phone number, preferred date, preferred time, and appointment type."
        ),
    )
    async def create_booking(
        patient_name: str,
        caller_phone: str,
        preferred_date: str,
        preferred_time: str,
        appointment_type: str,
        intent: str,
    ) -> str:
        """
        patient_name: Full name of the patient
        caller_phone: Patient phone number
        preferred_date: Preferred appointment date, e.g. March 15 or 2024-03-15
        preferred_time: Preferred appointment time, e.g. 10 AM
        appointment_type: Type of appointment, e.g. cleaning, consultation, extraction
        intent: The caller's intent (booking / inquiry / emergency / confirmation)
        """
        summary = (
            f"{'Outbound' if is_outbound else 'Inbound'} call — "
            f"Patient {patient_name} ({appointment_type}) on {preferred_date} at {preferred_time}. "
            f"Phone: {caller_phone}. Intent: {intent}."
        )
        result = await post_appointment_to_backend(
            patient_name=patient_name,
            caller_phone=caller_phone,
            preferred_date=preferred_date,
            preferred_time=preferred_time,
            appointment_type=appointment_type,
            intent=intent,
            summary=summary,
            room_name=room_name,
        )
        if result.get("success"):
            logger.info(f"Booking saved: lead_id={result.get('lead_id')}")
            return f"Appointment booked successfully. Lead ID: {result.get('lead_id')}"
        else:
            logger.error(f"Booking failed: {result.get('error')}")
            return f"Booking failed: {result.get('error', 'unknown error')}"

    @function_tool(
        name="set_reminder",
        description="Set a diary reminder when the user asks to be called/reminded tomorrow or later.",
    )
    async def set_reminder(patient_name: str, caller_phone: str, date: str, time: str, context: str) -> str:
        """
        patient_name: Name of caller. caller_phone: Phone number.
        date and time: When to remind. context: Why they want the reminder.
        """
        summary = f"Reminder requested on {date} at {time} for {patient_name} ({caller_phone}): {context}"
        await post_appointment_to_backend(
            patient_name=patient_name, caller_phone=caller_phone,
            preferred_date=date, preferred_time=time, appointment_type="reminder",
            intent="reminder", summary=summary, room_name=room_name
        )
        return "Reminder has been logged successfully."

    @function_tool(
        name="update_patient_details",
        description="Update a user's name, email, physical address, or phone number in the system.",
    )
    async def update_patient_details(field_to_update: str, new_value: str, caller_phone: str) -> str:
        """
        field_to_update: e.g. email, address, name. new_value: The new value. caller_phone: Their identifying phone.
        """
        summary = f"User {caller_phone} requested to update their {field_to_update} to {new_value}."
        await post_appointment_to_backend(
            patient_name="", caller_phone=caller_phone,
            preferred_date="", preferred_time="", appointment_type="update_profile",
            intent="update_profile", summary=summary, room_name=room_name
        )
        return f"{field_to_update} has been updated to {new_value}."

    @function_tool(
        name="end_call",
        description="End the phone call gracefully. Call this if the user wants to hang up, isn't interested, or after everything is finished.",
    )
    async def end_call(reason: str) -> str:
        """
        reason: A short note on why the call is being ended.
        """
        logger.info(f"Agent executing end_call for room {room_name}. Reason: {reason}")
        asyncio.create_task(ctx.room.disconnect())
        return "Ending the call now."


    # ── Components ────────────────────────────────────────────────────────────
    stt = SarvamSTT(model="saaras:v1")
    tts = SarvamTTS(voice=selected_voice, model=tts_model)
    llm = get_groq_llm()

    # ── Session with interruptions + fast turn detection ──────────────────────
    agent_session = AgentSession(
        stt=stt,
        llm=llm,
        tts=tts,
        vad=ctx.proc.userdata["vad"],
        tools=[create_booking, set_reminder, update_patient_details, end_call],
        allow_interruptions=True,         # AI stops talking the moment user speaks
        min_interruption_duration=0.05,   # Only 50ms of speech to trigger interrupt
    )

    # ── Per-turn language detection + dynamic prompt injection ────────────────
    def detect_language(text: str) -> str:
        """Detect if user spoke Hindi/Devanagari, English, or Hinglish."""
        devanagari = re.findall(r'[\u0900-\u097F]', text)
        english_words = re.findall(r'[a-zA-Z]{2,}', text)
        if devanagari and not english_words:
            return "hindi"
        elif devanagari and english_words:
            return "hinglish"
        return "english"

    current_language = {"lang": "english"}  # mutable ref for closure

    @agent_session.on("user_speech_committed")
    def on_user_speech(event):
        """Detect language on every user turn and inject dynamic language hint."""
        try:
            user_text = event.alternatives[0].text if hasattr(event, 'alternatives') else str(event)
            detected = detect_language(user_text)
            if detected != current_language["lang"]:
                current_language["lang"] = detected
                lang_map = {"hindi": "Hindi", "hinglish": "Hinglish (Hindi+English mix)", "english": "English"}
                lang_label = lang_map.get(detected, "English")
                # Inject language override directly into the active LLM context for zero-delay
                try:
                    new_sys_msg = ChatMessage(
                        role="system",
                        content=f"CRITICAL OVERRIDE: User just switched to {lang_label}. "
                                f"Reply ONLY in {lang_label} for your next turn and onwards."
                    )
                    agent_session.chat_ctx.messages.append(new_sys_msg)
                except Exception:
                    pass
        except Exception as e:
            logger.debug(f"Language detection error: {e}")


    agent = Agent(instructions=final_instructions)
    await agent_session.start(agent, room=ctx.room)

    # ── Opening greeting ──────────────────────────────────────────────────────
    # Outbound: wait 3s for callee to pick up before AI speaks
    # Inbound: only 1s needed since caller is already connected
    await asyncio.sleep(3 if is_outbound else 1)

    if is_outbound:
        clinic_name = call_context.get("clinic_name", "Smile Dental Clinic")
        patient_name = call_context.get("patient_name", "")
        name_part = f", is this {patient_name}?" if patient_name else "."

        greeting = f"Hi, this is {clinic_name} calling{name_part} Is this a good time to talk?"
    else:
        greeting = "Hello, thank you for calling the dental clinic. How may I help you today?"

    await agent_session.say(greeting)
    logger.info(f"Agent greeted | is_outbound={is_outbound} | room={room_name}")


# ═══════════════════════════════════════════════════════════════════════════════
# WORKER ENTRY
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
            worker_type=WorkerType.ROOM,
            # No agent_name — worker auto-dispatches to any room assigned via dispatch rule
        )
    )
