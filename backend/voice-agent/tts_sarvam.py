import os
import io
import asyncio
import logging
import base64
import requests
from dotenv import load_dotenv
from livekit.agents.tts import TTS, SynthesizedAudio, SynthesizeStream
from livekit import rtc

load_dotenv()
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")

logger = logging.getLogger("voice-agent")

from livekit.agents import tts

class SarvamTTS(TTS):
    def __init__(self, voice="priya", model="bulbul:v3", *args, **kwargs):
        super().__init__(
            capabilities=tts.TTSCapabilities(streaming=False), 
            sample_rate=24000,
            num_channels=1,
            *args, **kwargs
        )
        self._voice = voice
        self._model = model

    def synthesize(self, text: str, *, conn_options=None, **kwargs) -> "tts.ChunkedStream":
        return SarvamChunkedStream(tts=self, input_text=text, conn_options=conn_options)
        
class SarvamChunkedStream(tts.ChunkedStream):
    def __init__(self, *, tts: SarvamTTS, input_text: str, conn_options=None):
        super().__init__(tts=tts, input_text=input_text, conn_options=conn_options)
        self.tts = tts
        self._task = None

    async def _run(self, output_emitter: tts.AudioEmitter):
        # ── CRITICAL: Always initialize emitter first ──────────────────────
        # LiveKit calls end_input() on it during cleanup regardless of
        # whether the API call succeeds or fails. If not initialized it crashes.
        request_id = "sarvam_" + os.urandom(8).hex()
        output_emitter.initialize(
            request_id=request_id,
            sample_rate=24000,
            num_channels=1,
            mime_type="audio/wav",
        )

        url = "https://api.sarvam.ai/text-to-speech"
        headers = {
            "api-subscription-key": SARVAM_API_KEY,
            "Content-Type": "application/json"
        }
        data = {
            "inputs": [self.input_text],
            "target_language_code": "en-IN",
            "speaker": self.tts._voice,
            "model": self.tts._model
        }

        try:
            response = await asyncio.to_thread(
                requests.post, url, headers=headers, json=data
            )

            if response.status_code == 200:
                response_data = response.json()
                if "audios" in response_data and len(response_data["audios"]) > 0:
                    audio_bytes = base64.b64decode(response_data["audios"][0])
                    output_emitter.push(audio_bytes)
                    output_emitter.flush()
                else:
                    logger.warning("Sarvam TTS: No audios in response")
            else:
                logger.error(f"Sarvam TTS Error {response.status_code}: {response.text}")

        except Exception as e:
            logger.error(f"Sarvam TTS Exception: {e}")
            # Emitter is already initialized above — LiveKit cleanup is safe

