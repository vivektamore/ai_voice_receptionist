import os
import re
import json
import asyncio
import logging
from dotenv import load_dotenv

from livekit import rtc
from livekit.agents import AutoSubscribe, JobContext, JobProcess, WorkerOptions, WorkerType, cli, JobExecutorType
from livekit.agents.voice import Agent, AgentSession
from livekit.agents.llm import function_tool
from livekit.plugins import silero, openai, deepgram, elevenlabs, cartesia, sarvam

from llm_groq import get_groq_llm
from webhook_client import send_report_to_backend, book_appointment_via_backend
from datetime import datetime

import phonenumbers
from lingua import Language, LanguageDetectorBuilder
from pytz import timezone as pytz_timezone
import structlog

load_dotenv()

# Setup structlog for structured logging (WARN-07)
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
)
log_main = structlog.get_logger()

# ── Standalone Supabase client ───────────────────────────────────────────────
try:
    from supabase import create_client
    _supabase_url = os.getenv("SUPABASE_URL")
    # CRIT-04: Use restricted SUPABASE_AGENT_KEY first, fallback to service role key
    _supabase_key = os.getenv("SUPABASE_AGENT_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
    supabase = create_client(_supabase_url, _supabase_key) if _supabase_url and _supabase_key else None
except Exception as _e:
    supabase = None
    print(f"Warning: Supabase not available in voice agent: {_e}")

logger = logging.getLogger("voice-agent")
logger.setLevel(logging.INFO)


# ── Phone Number Normalization (CRIT-01) ─────────────────────────────────────
def normalize_number(raw: str, default_region="IN") -> str:
    """Normalize phone numbers aggressively to E.164 format using phonenumbers."""
    if not raw:
        return ""
    n = raw.replace("sip:", "").split("@")[0].strip()
    try:
        parsed = phonenumbers.parse(n, default_region)
        if phonenumbers.is_valid_number(parsed):
            return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    except Exception:
        pass
    return n


# ── Global Language Detection (CRIT-06) ──────────────────────────────────────
SUPPORTED_LANGS = {
    Language.HINDI:   "hindi",
    Language.ENGLISH: "english",
    Language.ARABIC:  "arabic",
    Language.SPANISH: "spanish",
    Language.FRENCH:  "french",
}

# Initialize Lingua detector for global language fallback (preloading only supported languages to save RAM)
_detector = LanguageDetectorBuilder.from_languages(*SUPPORTED_LANGS.keys()).with_preloaded_language_models().build()

def detect_language(text: str) -> str:
    """Detect language of user turn using regex for Hinglish fallback and lingua for global languages."""
    devanagari = re.findall(r'[\u0900-\u097F]', text)
    english_words = re.findall(r'[a-zA-Z]{2,}', text)
    if devanagari and not english_words:
        return "hindi"
    elif devanagari and english_words:
        return "hinglish"
    try:
        detected = _detector.detect_language_of(text)
        return SUPPORTED_LANGS.get(detected, "english")
    except Exception:
        return "english"


# ═══════════════════════════════════════════════════════════════════════════════
# PROMPTS
# ═══════════════════════════════════════════════════════════════════════════════

from prompts_global import INBOUND_PROMPT, build_outbound_prompt



# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

async def resolve_agent_settings(room: str, base_instructions: str, called_number: str = None):
    """
    Fetches dynamic clinic-specific rules from Supabase `agent_settings` table
    and APPENDS them to the hardcoded base prompt.
    """
    sel_voice = "priya"  # Default: Aria
    sel_model = "bulbul:v3"
    sel_language = "hinglish" # Default
    sel_tts_provider = "sarvam"
    sel_stt_provider = "sarvam"
    sel_llm_provider = "groq"
    clinic_tz_name = "Asia/Kolkata"  # Default
    final_inst = base_instructions
    c_id = None

    # WARN-04: Environment-based demo numbers config
    demo_env = os.getenv("DEMO_LINE_NUMBERS", "")
    demo_numbers = set(
        normalize_number(n.strip()) for n in demo_env.split(",") if n.strip()
    )
    is_demo_call = False
    if called_number:
        is_demo_call = normalize_number(called_number) in demo_numbers

    if not supabase:
        if is_demo_call:
            sel_voice = "priya"
            sel_language = "hinglish"
            final_inst = (
                base_instructions
                + "\n\n── CLINIC-SPECIFIC RULES ──────────────────────────\n"
                + "IDENTITY: You are Priya, a friendly female clinical receptionist.\n"
                + "GREETING RULE: Always begin the call exactly with: \"Hello! Thanks for calling the clinic. How can I help you today?\"\n"
                + "TONE: Warm, bubbly, and extremely approachable. Use conversational empathy.\n"
                + "FLOW RULE: Answer general FAQ and clinic inquiries helpfully before offering to book an appointment.\n"
                + "EMERGENCY RULE: If the patient mentions severe pain, bleeding, or a life-threatening emergency, immediately prioritize connecting them to a human or advising them to call emergency services.\n"
                + "DATA COLLECTION RULE: You must collect the following details from the patient before booking: Full Name, Phone, Date/Time, Service Type.\n"
                + "LANGUAGE RULE: Auto-detect the caller's language. Primary: Hinglish. Respond in the same language the caller uses.\n"
                + "───────────────────────────────────────────────────"
            )
        return c_id, sel_voice, sel_model, final_inst, sel_language, sel_tts_provider, sel_stt_provider, sel_llm_provider, clinic_tz_name

    try:
        # Extract clinic_id from outbound room name: "outbound-{clinic_id}-{timestamp}"
        if "outbound-" in room:
            parts = room.split("-")
            if len(parts) >= 6:
                c_id = "-".join(parts[1:6])

        # CRIT-05: Concurrently execute non-dependent database queries
        def get_lead():
            return supabase.table("leads").select("clinic_id").eq("external_call_id", room).limit(1).execute()

        def get_phone():
            if not called_number:
                return None
            clean_number = normalize_number(called_number)
            # Try exact match, with and without + prefix
            phone_chk = supabase.table("phone_numbers").select("clinic_id").eq("number", clean_number).limit(1).execute()
            if not phone_chk.data and not clean_number.startswith("+"):
                phone_chk = supabase.table("phone_numbers").select("clinic_id").eq("number", "+" + clean_number).limit(1).execute()
            if not phone_chk.data and clean_number.startswith("+"):
                phone_chk = supabase.table("phone_numbers").select("clinic_id").eq("number", clean_number[1:]).limit(1).execute()
            return phone_chk

        lead_task = asyncio.create_task(asyncio.to_thread(get_lead))
        phone_task = asyncio.create_task(asyncio.to_thread(get_phone))

        lead_res, phone_res = await asyncio.gather(lead_task, phone_task, return_exceptions=True)

        if not c_id and not isinstance(lead_res, Exception) and lead_res and lead_res.data:
            c_id = lead_res.data[0]["clinic_id"]

        if not c_id and not isinstance(phone_res, Exception) and phone_res and phone_res.data:
            c_id = phone_res.data[0]["clinic_id"]

        db_loaded = False
        if c_id:
            def get_agent_settings():
                return supabase.table("agent_settings").select("*").eq("clinic_id", c_id).execute()

            opts = await asyncio.to_thread(get_agent_settings)
            if opts.data:
                db_loaded = True
                cnf = opts.data[0]
                
                # WARN-05: Timezone handling logic
                clinic_tz_name = cnf.get("timezone") or "Asia/Kolkata"
                try:
                    tz = pytz_timezone(clinic_tz_name)
                    local_now = datetime.now(tz)
                    time_context = f"TIMEZONE: Clinic local time is {local_now.strftime('%A, %d %B %Y %H:%M')} ({clinic_tz_name})."
                except Exception as tz_err:
                    time_context = ""
                    log_main.warning("timezone_resolution_failed", error=str(tz_err), clinic_tz=clinic_tz_name)
                
                if cnf.get("prompt"):
                    final_inst = (
                        base_instructions
                        + "\n\n── CLINIC-SPECIFIC RULES ──────────────────────────\n"
                        + cnf["prompt"]
                        + (f"\n{time_context}" if time_context else "")
                        + "\n───────────────────────────────────────────────────"
                    )
                    log_main.info("applied_clinic_settings_prompt", clinic_id=c_id)

                if cnf.get("voice"):
                    v = cnf["voice"].lower()
                    voice_map = {
                        "tarun": "tarun",  "marcus": "tarun",
                        "meera": "meera",  "elena":  "meera",
                        "arjun": "arjun",  "julian": "arjun",
                        "priya": "priya",  "aria":   "priya",
                    }
                    sel_voice = voice_map.get(v, "priya")

                if cnf.get("language"):
                    sel_language = cnf["language"].lower()

                if cnf.get("tts_provider"):
                    sel_tts_provider = cnf["tts_provider"].lower()
                if cnf.get("stt_provider"):
                    sel_stt_provider = cnf["stt_provider"].lower()
                if cnf.get("llm_provider"):
                    sel_llm_provider = cnf["llm_provider"].lower()
            else:
                log_main.info("no_agent_settings_found_using_defaults", clinic_id=c_id)
        else:
            log_main.warning("could_not_resolve_clinic_id", room=room, called_number=called_number)

        # Fallback for official demo line
        if not db_loaded and is_demo_call:
            sel_voice = "priya"
            sel_language = "hinglish"
            final_inst = (
                base_instructions
                + "\n\n── CLINIC-SPECIFIC RULES ──────────────────────────\n"
                + "IDENTITY: You are Priya, a friendly female clinical receptionist.\n"
                + "GREETING RULE: Always begin the call exactly with: \"Hello! Thanks for calling the clinic. How can I help you today?\"\n"
                + "TONE: Warm, bubbly, and extremely approachable. Use conversational empathy.\n"
                + "FLOW RULE: Answer general FAQ and clinic inquiries helpfully before offering to book an appointment.\n"
                + "EMERGENCY RULE: If the patient mentions severe pain, bleeding, or a life-threatening emergency, immediately prioritize connecting them to a human or advising them to call emergency services.\n"
                + "DATA COLLECTION RULE: You must collect the following details from the patient before booking: Full Name, Phone, Date/Time, Service Type.\n"
                + "LANGUAGE RULE: Auto-detect the caller's language. Primary: Hinglish. Respond in the same language the caller uses.\n"
                + "───────────────────────────────────────────────────"
            )

    except Exception as e:
        log_main.error("failed_resolving_agent_settings", room=room, error=str(e))

    return c_id, sel_voice, sel_model, final_inst, sel_language, sel_tts_provider, sel_stt_provider, sel_llm_provider, clinic_tz_name


def prewarm(proc: JobProcess):
    """Pre-warm both noisy and clean VAD profiles by region (WARN-06)."""
    proc.userdata["vad_noisy"] = silero.VAD.load(
        min_silence_duration=0.4,
        min_speech_duration=0.1,
        activation_threshold=0.4,
        prefix_padding_duration=0.2,
    )
    proc.userdata["vad_clean"] = silero.VAD.load(
        min_silence_duration=0.5,
        min_speech_duration=0.15,
        activation_threshold=0.6,
        prefix_padding_duration=0.3,
    )


# ═══════════════════════════════════════════════════════════════════════════════
async def entrypoint(ctx: JobContext):
    """Main function that runs for EVERY new call (Room)."""
    # Hoist agent_session = None to prevent race condition on disconnect (CRIT-02)
    agent_session = None

    room_name = ctx.room.name
    # Setup structured context logger (WARN-07)
    log = log_main.bind(room=room_name)
    log.info("room_connection_started")

    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # ── Wait briefly for the SIP participant to appear in the room ────────────
    # For inbound calls, the SIP participant joins immediately or is already there.
    # WARN-01: Added asyncio.timeout to prevent infinite hang/wait
    sip_participant = None
    try:
        async with asyncio.timeout(3.0):
            while not sip_participant:
                for p in ctx.room.remote_participants.values():
                    if p.kind == rtc.ParticipantKind.PARTICIPANT_KIND_SIP:
                        sip_participant = p
                        break
                if sip_participant:
                    break
                await asyncio.sleep(0.1)
    except asyncio.TimeoutError:
        log.warning("sip_participant_wait_timeout", message="No SIP participant joined room within 3s")

    # ── Fetch AI Bypass Settings from database ────────────────────────────────
    if sip_participant and supabase:
        called_number = sip_participant.attributes.get("sip.called") or sip_participant.attributes.get("sip.calledNumber")
        if called_number:
            try:
                # CRIT-01: Parse and normalize to E.164
                norm_called = normalize_number(called_number)
                
                # Fetch settings asynchronously via thread pool
                def get_bypass_settings():
                    return supabase.table("phone_numbers").select("ai_answering, clinic_direct_line, clinic_id").eq("number", norm_called).execute()
                
                phone_chk = await asyncio.to_thread(get_bypass_settings)
                if phone_chk.data:
                    p_data = phone_chk.data[0]
                    # If AI Answering is explicitly disabled
                    if p_data.get("ai_answering") is False:
                        direct_line = p_data.get("clinic_direct_line")
                        if direct_line:
                            log.info("ai_bypass_active", called_number=norm_called, direct_line=direct_line)
                            await ctx.room.perform_sip_transfer(sip_participant.identity, direct_line)
                            # Wait a moment for transfer to initiate then drop out
                            await asyncio.sleep(2)
                            await ctx.room.disconnect()
                            return
                        else:
                            log.warning("ai_answering_disabled_but_no_direct_line", called_number=norm_called)
            except Exception as e:
                log.error("ai_bypass_check_failed", error=str(e))

    start_time = datetime.now()
    report_sent = {"done": False}

    async def send_final_report():
        """Helper to sync final transcript and duration to backend once."""
        if report_sent["done"]:
            return
        report_sent["done"] = True
        
        duration = int((datetime.now() - start_time).total_seconds())
        transcript_data = []
        
        # CRIT-02: Safely check agent_session and agent before accessing messages.
        # In livekit-agents v1.4+, chat_ctx lives on Agent, not AgentSession.
        # chat_ctx.messages() is a METHOD (returns a list copy), not a property.
        # msg.content is a list[ChatContent | str] — join for display.
        try:
            _ctx = agent.chat_ctx if agent is not None else None
            if _ctx is not None:
                for msg in _ctx.messages():
                    if msg.role in ["assistant", "user"]:
                        raw = msg.content or []
                        content = " ".join(str(c) for c in raw) if isinstance(raw, list) else str(raw)
                        # Hide language overrides from the saved transcript (WARN-02)
                        if "[__LANG_OVERRIDE__]" not in content:
                            transcript_data.append({"role": msg.role, "content": content})
        except Exception as _ex:
            log.warning("transcript_read_failed", error=str(_ex))
        
        log.info("call_ended", duration_seconds=duration, transcript_len=len(transcript_data))
        await send_report_to_backend(
            room_name=room_name,
            call_transcript=json.dumps(transcript_data),
            call_duration=duration,
            intent="Session End Sync"
        )

    @ctx.room.on("participant_disconnected")
    def on_participant_disconnected(participant: rtc.RemoteParticipant):
        """When the SIP user hangs up, the AI should also leave to close the room."""
        log.info("participant_disconnected", participant_identity=participant.identity)
        async def _cleanup():
            await send_final_report()
            # Allow final messages/transcripts to flush
            await asyncio.sleep(0.5)
            try:
                await ctx.room.disconnect()
            except Exception as _ex:
                log.debug("error_during_disconnect", error=str(_ex))
        asyncio.create_task(_cleanup())

    # ── Detect call direction ─────────────────────────────────────────────────
    is_outbound = room_name.startswith("outbound-")

    # ── Resolve patient's phone number from SIP participant ──────────────────
    patient_phone_number = ""
    if sip_participant:
        if is_outbound:
            patient_phone_number = (
                sip_participant.attributes.get("sip.called") 
                or sip_participant.attributes.get("sip.calledNumber") 
                or ""
            )
        else:
            patient_phone_number = (
                sip_participant.attributes.get("sip.calling") 
                or sip_participant.attributes.get("sip.callingNumber") 
                or ""
            )
        
        # Fallback to parsing participant identity
        if not patient_phone_number:
            identity = sip_participant.identity or ""
            cleaned_ident = identity.replace("sip_", "").replace("phone-", "").strip()
            if cleaned_ident:
                patient_phone_number = cleaned_ident
                
        # Normalize it
        if patient_phone_number:
            patient_phone_number = normalize_number(patient_phone_number)

    # ── Read call context from room metadata (injected by outbound API) ───────
    call_context = {}
    call_type = "general"
    try:
        metadata_raw = ctx.room.metadata or "{}"
        call_context = json.loads(metadata_raw)
        call_type = call_context.get("type", "general")
    except Exception:
        pass

    # ── Override with Supabase dynamic settings (voice, language, prompt) ─────
    # Extract called number from SIP participant for clinic lookup on fresh inbound calls
    inbound_called_number = None
    if not is_outbound and sip_participant:
        raw_called = sip_participant.attributes.get("sip.called") or sip_participant.attributes.get("sip.calledNumber")
        if raw_called:
            inbound_called_number = raw_called

    # CRIT-05: Await async settings resolution (pass empty base_instructions to get clinic specific rules only)
    clinic_id, selected_voice, tts_model, clinic_rules, selected_language, tts_provider, stt_provider, llm_provider, clinic_tz = await resolve_agent_settings(
        room_name, "", called_number=inbound_called_number
    )

    # ── Fetch Clinic Details dynamically (name, region, subscription tier) ───
    clinic_name = "the clinic"
    clinic_region = "US"
    is_premium = False

    if clinic_id and supabase:
        try:
            def get_clinic_info():
                return supabase.table("clinics").select("name, country_code, subscription_tier").eq("id", clinic_id).single().execute()
            clinic_res = await asyncio.to_thread(get_clinic_info)
            if clinic_res.data:
                db_name = clinic_res.data.get("name")
                if db_name:
                    clinic_name = db_name
                clinic_region = clinic_res.data.get("country_code", "US").upper()
                tier = clinic_res.data.get("subscription_tier") or ""
                is_premium = tier.lower() in ["premium", "gold", "enterprise"]
        except Exception as ex:
            log.error("failed_to_fetch_clinic_info", error=str(ex))

    # [CRIT-03] Fallback based on called number prefix if DB records are missing or default
    if clinic_region == "US" and inbound_called_number:
        try:
            parsed_num = phonenumbers.parse(inbound_called_number, "US")
            if parsed_num.country_code == 91:
                clinic_region = "IN"
        except Exception:
            if inbound_called_number.startswith("+91"):
                clinic_region = "IN"

    # Resolve demo line clinic name fallback if no DB loaded
    demo_env = os.getenv("DEMO_LINE_NUMBERS", "")
    demo_numbers = set(
        normalize_number(n.strip()) for n in demo_env.split(",") if n.strip()
    )
    is_demo_call = False
    called_number_for_demo = inbound_called_number
    if is_outbound and sip_participant:
        called_number_for_demo = sip_participant.attributes.get("sip.called") or sip_participant.attributes.get("sip.calledNumber")
    if called_number_for_demo:
        is_demo_call = normalize_number(called_number_for_demo) in demo_numbers

    if is_demo_call and clinic_name == "the clinic":
        clinic_name = "ClinicAssistAI"

    # ── Choose base prompt ────────────────────────────────────────────────────
    if is_outbound:
        if "clinic_name" not in call_context or not call_context["clinic_name"]:
            call_context["clinic_name"] = clinic_name
        if "clinic_region" not in call_context or not call_context["clinic_region"]:
            call_context["clinic_region"] = clinic_region

        base_instructions = build_outbound_prompt(call_type, call_context)
        log.info("outbound_call_initiated", type=call_type, context=call_context)
    else:
        base_instructions = INBOUND_PROMPT
        log.info("inbound_call_received")

    # Resolve the timezone name dynamically and inject time context
    tz_name = clinic_tz or "Asia/Kolkata"
    try:
        tz = pytz_timezone(tz_name)
        local_now = datetime.now(tz)
        current_time_str = local_now.strftime('%A, %d %B %Y %H:%M')
    except Exception:
        current_time_str = datetime.now().strftime('%A, %d %B %Y %H:%M')
        tz_name = "UTC"
        
    time_instructions = (
        f"\n\n── SYSTEM DATE & TIME CONTEXT ──────────────────────\n"
        f"CURRENT DATE & TIME: {current_time_str} (Timezone: {tz_name})\n"
        f"CRITICAL: Always use this current year and date as the reference. "
        f"If the user says 'tomorrow', 'next week', 'April 16th', or any relative/partial date, "
        f"resolve it relative to this date: {current_time_str}.\n"
        f"───────────────────────────────────────────────────"
    )
    final_instructions = base_instructions + (clinic_rules or "") + time_instructions




    # ── Build the tools ───────────────────────────────────────────────────────
    @function_tool(
        name="create_booking",
        description=(
            "Book a confirmed patient appointment. Call this ONLY after you have collected "
            "AND the patient has explicitly confirmed: full name, phone number, service type, "
            "date (YYYY-MM-DD), and time (HH:MM 24-hour). All 5 fields are mandatory."
        ),
    )
    async def create_booking(
        name: str,
        phone: str,
        service: str,
        date: str,
        time: str,
        notes: str = "",
    ) -> str:
        """
        name: Patient's full name (e.g. "Rahul Sharma")
        phone: Patient's phone number with country code (e.g. "+919876543210")
        service: Type of service or reason for visit (e.g. "Consultation", "Follow-up", "Check-up")
        date: Appointment date in YYYY-MM-DD format (e.g. "2026-04-25")
        time: Appointment time in HH:MM 24-hour format (e.g. "10:30")
        notes: Any additional patient notes (optional, e.g. "Has tooth pain")
        """
        booking_phone = phone.strip() if phone else ""
        if not booking_phone or booking_phone.lower() in ["unknown", "undefined", "none", "null"]:
            if patient_phone_number:
                log.info("create_booking_phone_fallback", resolved_phone=patient_phone_number)
                booking_phone = patient_phone_number

        log.info(
            "create_booking_called",
            name=name,
            phone=booking_phone,
            service=service,
            date=date,
            time=time,
            notes=notes
        )

        # Call dedicated booking endpoint with resolved clinic timezone
        result = await book_appointment_via_backend(
            name=name,
            phone=booking_phone,
            service=service,
            date=date,
            time=time,
            notes=notes,
            room_name=room_name,
            timezone=clinic_tz,
        )

        if result.get("success"):
            log.info("booking_confirmed", appointment_id=result.get("appointment_id"))
            # Also sync to leads table for call record
            await send_report_to_backend(
                patient_name=name,
                caller_phone=booking_phone,
                preferred_date=date,
                preferred_time=time,
                appointment_type=service,
                intent="booking",
                summary=f"Confirmed {service} on {date} at {time}. Notes: {notes}",
                room_name=room_name,
            )
            return "BOOKING_SUCCESS"
        else:
            log.error("booking_failed", error=result.get("error"))
            return "BOOKING_FAILED"

    @function_tool(
        name="set_reminder",
        description="Set a diary reminder when the user asks to be called/reminded tomorrow or later.",
    )
    async def set_reminder(patient_name: str, caller_phone: str, date: str, time: str, context: str) -> str:
        """
        patient_name: Name of caller. caller_phone: Phone number.
        date and time: When to remind. context: Why they want the reminder.
        """
        booking_phone = caller_phone.strip() if caller_phone else ""
        if not booking_phone or booking_phone.lower() in ["unknown", "undefined", "none", "null"]:
            if patient_phone_number:
                booking_phone = patient_phone_number
        log.info("set_reminder_called", patient_name=patient_name, caller_phone=booking_phone, date=date, time=time, context=context)
        summary = f"Reminder requested on {date} at {time} for {patient_name} ({booking_phone}): {context}"
        await send_report_to_backend(
            patient_name=patient_name, caller_phone=booking_phone,
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
        booking_phone = caller_phone.strip() if caller_phone else ""
        if not booking_phone or booking_phone.lower() in ["unknown", "undefined", "none", "null"]:
            if patient_phone_number:
                booking_phone = patient_phone_number
        log.info("update_patient_details_called", field_to_update=field_to_update, new_value=new_value, caller_phone=booking_phone)
        summary = f"User {booking_phone} requested to update their {field_to_update} to {new_value}."
        await send_report_to_backend(
            patient_name="", caller_phone=booking_phone,
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
        log.info("agent_executing_end_call", reason=reason)
        # Trigger report explicitly before disconnect to be safe, although 
        # participant_disconnected event should also catch it.
        await send_final_report()
        # Allow final messages/transcripts to flush
        await asyncio.sleep(0.5)
        try:
            await ctx.delete_room()
        except Exception as _ex:
            log.warning("error_during_room_deletion", error=str(_ex))
            try:
                await ctx.room.disconnect()
            except Exception:
                pass
        return "Ending the call now."

    # ── Choose STT and TTS Engines dynamically based on User Rules ───────────
    log = log.bind(
        clinic_id=clinic_id,
        region=clinic_region,
        tts_provider=tts_provider,
        stt_provider=stt_provider,
        llm_provider=llm_provider
    )

    log.info("resolving_engines", selected_voice=selected_voice, selected_language=selected_language)

    # Helper: returns True only if OPENAI_API_KEY is set AND is not the placeholder
    def _openai_key_valid() -> bool:
        k = os.getenv("OPENAI_API_KEY", "")
        return bool(k) and "your_openai_api_key_here" not in k and not k.startswith("your_ope")

    # Helper: Cartesia Ink-Whisper STT — sub-100ms, pairs natively with Cartesia TTS
    # ink-whisper: multilingual (Hinglish, 100+ languages)
    # ink-2: English-optimized, even faster, with native turn detection
    def _cartesia_stt(multilingual: bool = True):
        model = "ink-whisper" if multilingual else "ink-2"
        return cartesia.STT(
            model=model,
            language="en",  # ink-whisper auto-detects, ink-2 is English-only
        )

    # Helper: Groq-backed Whisper STT (fallback, uses existing GROQ_API_KEY)
    def _groq_whisper_stt(multilingual: bool = True):
        model = "whisper-large-v3-turbo" if multilingual else "whisper-large-v3"
        return openai.STT(
            base_url="https://api.groq.com/openai/v1",
            api_key=os.getenv("GROQ_API_KEY"),
            model=model,
            detect_language=True,
        )

    # Helper: Cartesia Sonic TTS — 40ms TTFA, industry-leading quality, 20k credits/month FREE
    def _cartesia_tts():
        voice_id = "248be419-caca-407b-b531-e160cdcd3135"  # Sonic female (Priya/Meera)
        if selected_voice in ["tarun", "arjun"]:
            voice_id = "8a04e3a0-798e-4a67-b769-e77a56c7028b"  # Sonic male
        return cartesia.TTS(voice=voice_id)

    # ─────────────────────────────────────────────────────────────────────────
    # 1. SELECT STT ENGINE
    #
    # Priority (sub-100ms class, best multilingual accuracy first):
    #   Cartesia Ink-Whisper → Deepgram Nova-3 → Groq Whisper → Sarvam → OpenAI
    #
    # Cartesia Ink-Whisper: cheapest + fastest streaming STT, pairs with Cartesia TTS.
    # Uses the same CARTESIA_API_KEY already required for TTS — no extra signup.
    # ─────────────────────────────────────────────────────────────────────────
    is_multilingual = clinic_region == "IN" or selected_language in ["hinglish", "hindi", "arabic", "spanish", "french"]
    
    # ── 1. SELECT STT ENGINE ──────────────────────────────────────────────────
    stt = None
    
    # Check preferred STT provider first if valid API key is present
    if stt_provider == "sarvam" and os.getenv("SARVAM_API_KEY"):
        log.info("using_preferred_stt_provider", provider="sarvam_streaming")
        sarvam_lang = "hi-IN" if selected_language in ["hindi", "hinglish"] else "en-IN"
        sarvam_mode = "codemix" if selected_language == "hinglish" else "transcribe"
        stt = sarvam.STT(
            model="saaras:v3",
            language=sarvam_lang,
            mode=sarvam_mode,
            api_key=os.getenv("SARVAM_API_KEY")
        )
    elif stt_provider == "groq" and os.getenv("GROQ_API_KEY"):
        log.info("using_preferred_stt_provider", provider="groq_whisper")
        stt = _groq_whisper_stt(multilingual=is_multilingual)
    elif stt_provider == "cartesia" and os.getenv("CARTESIA_API_KEY"):
        log.info("using_preferred_stt_provider", provider="cartesia_ink_whisper")
        stt = _cartesia_stt(multilingual=is_multilingual)
    elif stt_provider == "deepgram" and os.getenv("DEEPGRAM_API_KEY"):
        log.info("using_preferred_stt_provider", provider="deepgram_nova3")
        model_name = "nova-3-general" if not is_multilingual else "nova-3"
        stt = deepgram.STT(model=model_name)
    elif stt_provider == "openai" and _openai_key_valid():
        log.info("using_preferred_stt_provider", provider="openai_whisper")
        stt = openai.STT(model="whisper-1")

    # STT Fallbacks if preferred provider not selected/instantiated
    if not stt:
        if os.getenv("CARTESIA_API_KEY"):
            log.info("using_stt_provider_fallback", provider="cartesia_ink_whisper")
            stt = _cartesia_stt(multilingual=is_multilingual)
        elif os.getenv("DEEPGRAM_API_KEY"):
            log.info("using_stt_provider_fallback", provider="deepgram_nova3")
            model_name = "nova-3-general" if not is_multilingual else "nova-3"
            stt = deepgram.STT(model=model_name)
        elif os.getenv("SARVAM_API_KEY"):
            log.info("using_stt_provider_fallback", provider="sarvam_streaming")
            sarvam_lang = "hi-IN" if selected_language in ["hindi", "hinglish"] else "en-IN"
            sarvam_mode = "codemix" if selected_language == "hinglish" else "transcribe"
            stt = sarvam.STT(
                model="saaras:v3",
                language=sarvam_lang,
                mode=sarvam_mode,
                api_key=os.getenv("SARVAM_API_KEY")
            )
        elif os.getenv("GROQ_API_KEY"):
            log.info("using_stt_provider_fallback", provider="groq_whisper")
            stt = _groq_whisper_stt(multilingual=is_multilingual)
        elif _openai_key_valid():
            log.info("using_stt_provider_fallback", provider="openai_whisper")
            stt = openai.STT(model="whisper-1")
        else:
            log.error("no_valid_stt_provider", message="No STT key found. Fallback to sarvam streaming.")
            stt = sarvam.STT(model="saaras:v3")

    # ── 2. SELECT TTS ENGINE ──────────────────────────────────────────────────
    tts = None
    
    # Map database voices to valid bulbul:v3 speaker names
    sarvam_speaker_map = {
        "tarun": "aditya",
        "meera": "ritu",
        "arjun": "rahul",
        "priya": "priya"
    }
    sarvam_speaker = sarvam_speaker_map.get(selected_voice, "priya")

    # Check preferred TTS provider first if valid API key is present
    if tts_provider == "sarvam" and os.getenv("SARVAM_API_KEY"):
        log.info("using_preferred_tts_provider", provider="sarvam_streaming")
        sarvam_lang = "hi-IN" if selected_language in ["hindi", "hinglish"] else "en-IN"
        tts = sarvam.TTS(
            model=tts_model or "bulbul:v3",
            speaker=sarvam_speaker,
            target_language_code=sarvam_lang,
            api_key=os.getenv("SARVAM_API_KEY")
        )
    elif tts_provider == "elevenlabs" and os.getenv("ELEVENLABS_API_KEY"):
        log.info("using_preferred_tts_provider", provider="elevenlabs_flash")
        el_voice = "EXAVITQu4vr4xnSDxMaL"
        if selected_voice in ["tarun", "arjun"]:
            el_voice = "nPczCjzI2devNBz1zQrb"
        tts = elevenlabs.TTS(voice_id=el_voice, model="eleven_flash_v2_5")
    elif tts_provider == "cartesia" and os.getenv("CARTESIA_API_KEY"):
        log.info("using_preferred_tts_provider", provider="cartesia_sonic")
        tts = _cartesia_tts()
    elif tts_provider == "openai" and _openai_key_valid():
        log.info("using_preferred_tts_provider", provider="openai")
        openai_voice = "nova"
        if selected_voice in ["tarun", "arjun"]:
            openai_voice = "onyx"
        elif selected_voice == "meera":
            openai_voice = "shimmer"
        tts = openai.TTS(voice=openai_voice)

    # TTS Fallbacks if preferred provider not selected/instantiated
    if not tts:
        if os.getenv("ELEVENLABS_API_KEY"):
            log.info("using_tts_provider_fallback", provider="elevenlabs_flash")
            el_voice = "EXAVITQu4vr4xnSDxMaL"
            if selected_voice in ["tarun", "arjun"]:
                el_voice = "nPczCjzI2devNBz1zQrb"
            tts = elevenlabs.TTS(voice_id=el_voice, model="eleven_flash_v2_5")
        elif os.getenv("CARTESIA_API_KEY"):
            log.info("using_tts_provider_fallback", provider="cartesia_sonic")
            tts = _cartesia_tts()
        elif os.getenv("SARVAM_API_KEY"):
            log.info("using_tts_provider_fallback", provider="sarvam_streaming")
            sarvam_lang = "hi-IN" if selected_language in ["hindi", "hinglish"] else "en-IN"
            tts = sarvam.TTS(
                model=tts_model or "bulbul:v3",
                speaker=sarvam_speaker,
                target_language_code=sarvam_lang,
                api_key=os.getenv("SARVAM_API_KEY")
            )
        elif _openai_key_valid():
            log.warning("using_tts_provider_fallback", provider="openai")
            openai_voice = "nova"
            if selected_voice in ["tarun", "arjun"]:
                openai_voice = "onyx"
            elif selected_voice == "meera":
                openai_voice = "shimmer"
            tts = openai.TTS(voice=openai_voice)
        else:
            log.error("no_valid_tts_provider", message="No TTS key found. Fallback to OpenAI (will fail but logs clearly)")
            tts = openai.TTS(voice="nova")

    # 3. Configure LLM
    active_llm_provider = llm_provider if llm_provider else "groq"
    log.info("using_llm_provider", provider=active_llm_provider)
    if active_llm_provider == "openai":
        llm = openai.LLM(model="gpt-4o-mini")
    else:
        llm = get_groq_llm()

    # ── Resolve VAD dynamically (WARN-06) ────────────────────────────────────
    active_vad = ctx.proc.userdata["vad_noisy"] if clinic_region == "IN" else ctx.proc.userdata["vad_clean"]

    # ── Session with interruptions + fast turn detection ──────────────────────
    agent_session = AgentSession(
        stt=stt,
        llm=llm,
        tts=tts,
        vad=active_vad,
        tools=[create_booking, set_reminder, update_patient_details, end_call],
        allow_interruptions=True,         # AI stops talking the moment user speaks
        min_interruption_duration=0.05,   # Only 50ms of speech to trigger interrupt
    )

    current_language = {"lang": "english"}  # mutable ref for closure

    # Hoist 'agent' here so send_final_report and on_user_speech closures can reference it.
    agent = Agent(instructions=final_instructions)

    @agent_session.on("user_speech_committed")
    def on_user_speech(event):
        """Detect language on every user turn and inject dynamic language hint."""
        try:
            user_text = event.alternatives[0].text if hasattr(event, 'alternatives') else str(event)
            detected = detect_language(user_text)
            if detected != current_language["lang"]:
                current_language["lang"] = detected
                lang_map = {
                    "hindi": "Hindi",
                    "hinglish": "Hinglish (Hindi+English mix)",
                    "english": "English",
                    "arabic": "Arabic",
                    "spanish": "Spanish",
                    "french": "French"
                }
                lang_label = lang_map.get(detected, "English")
                # Inject language override directly into the active LLM context for zero-delay (WARN-02)
                # In livekit-agents v1.4+, chat_ctx lives on Agent, not AgentSession.
                # chat_ctx.messages() returns a list COPY — use update_chat_ctx() to mutate.
                # update_chat_ctx is NOT async — call it directly (no asyncio.create_task).
                try:
                    current_msgs = agent.chat_ctx.messages()
                    filtered = [
                        msg for msg in current_msgs
                        if not (msg.role == "system" and "[__LANG_OVERRIDE__]" in " ".join(str(c) for c in (msg.content or [])))
                    ]
                    from livekit.agents.llm import ChatContext
                    new_ctx = ChatContext()
                    for m in filtered:
                        raw = m.content or []
                        text = " ".join(str(c) for c in raw) if isinstance(raw, list) else str(raw)
                        new_ctx.add_message(role=m.role, content=text)
                    new_ctx.add_message(
                        role="system",
                        content=(
                            f"[__LANG_OVERRIDE__] CRITICAL OVERRIDE: User just switched to {lang_label}. "
                            f"Reply ONLY in {lang_label} for your next turn and onwards."
                        ),
                    )
                    # update_chat_ctx IS async — on_user_speech is a sync callback,
                    # so schedule the coroutine as a fire-and-forget task.
                    async def _apply_ctx_update(ctx=new_ctx):
                        try:
                            await agent.update_chat_ctx(ctx)
                        except Exception as _ex:
                            log.warning("failed_to_apply_language_override", error=str(_ex))
                    asyncio.create_task(_apply_ctx_update())
                except Exception as ex:
                    log.warning("failed_to_append_language_override", error=str(ex))
        except Exception as e:
            log.debug("language_detection_error", error=str(e))

    await agent_session.start(agent, room=ctx.room)

    # ── Opening greeting ──────────────────────────────────────────────────────
    # Outbound: wait 3s for callee to pick up before AI speaks
    # Inbound: only 1s needed since caller is already connected
    await asyncio.sleep(3 if is_outbound else 1)

    if is_outbound:
        c_name = call_context.get("clinic_name") or clinic_name
        region = call_context.get("clinic_region", clinic_region).upper()
        patient_name = call_context.get("patient_name", "")
        
        # Region-aware permission phrasing matching prompts_global.py
        if region in ["GB", "IE", "FR", "DE", "NL", "SE", "DK", "NO", "FI", "BE", "AT", "CH"]:
            name_part = f" for {patient_name}" if patient_name else ""
            greeting = f"Hello, I'm calling from {c_name}{name_part}. I hope I'm not disturbing you — do you have a moment to speak?"
        elif region in ["AE", "SA", "QA", "KW", "BH", "OM"]:
            name_part = f" for {patient_name}" if patient_name else ""
            greeting = f"As-salamu alaykum, I'm calling from {c_name}{name_part}. I hope you are well. Do you have a moment to speak?"
        elif region in ["US", "CA", "AU", "NZ", "SG"]:
            name_part = f", is this {patient_name}?" if patient_name else "."
            greeting = f"Hi, this is {c_name} calling{name_part} Is this a good time to chat?"
        else:
            # India / rest of world
            name_part = f", is this {patient_name}?" if patient_name else "."
            greeting = f"Hello, main {c_name} se bol raha hoon. Kya abhi baat karna theek rahega?" if region == "IN" else f"Hello, I'm calling from {c_name}{name_part} Is this a good time to talk?"
    else:
        if clinic_name and clinic_name != "the clinic":
            greeting = f"Hello, thank you for calling {clinic_name}. How may I help you today?"
        else:
            greeting = "Hello, thank you for calling the clinic. How may I help you today?"

    await agent_session.say(greeting)
    log.info("agent_greeted", is_outbound=is_outbound)


# ═══════════════════════════════════════════════════════════════════════════════
# WORKER ENTRY
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
            worker_type=WorkerType.ROOM,
            # Use THREAD executor to fit in 512MB RAM and avoid subprocess startup timeouts on low-spec server
            job_executor_type=JobExecutorType.THREAD,
            # agent_name must match the "dental_agent" value set in the
            # LiveKit outbound dispatch rule (SDR_rnUzPAJXaMio)
            agent_name="dental_agent",
        )
    )
