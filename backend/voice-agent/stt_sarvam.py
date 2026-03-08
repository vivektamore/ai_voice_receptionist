import os
import asyncio
import logging
import io
import wave
import requests
from dotenv import load_dotenv

from livekit.agents import stt
from livekit.agents.stt import STT, SpeechData, SpeechEvent, SpeechEventType
from livekit import rtc

load_dotenv()
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")

logger = logging.getLogger("voice-agent")


class SarvamSTT(STT):
    def __init__(self, model="saaras:v1"):
        super().__init__(
            capabilities=stt.STTCapabilities(streaming=False, interim_results=False),
        )
        self._model = model

    async def _recognize_impl(self, buffer, **kwargs) -> SpeechEvent:
        # Normalize: buffer can be a single AudioFrame OR a list[AudioFrame]
        if isinstance(buffer, rtc.AudioFrame):
            frames = [buffer]
        elif not buffer:
            return SpeechEvent(
                type=SpeechEventType.FINAL_TRANSCRIPT,
                alternatives=[SpeechData(language="en", text="")]
            )
        else:
            frames = list(buffer)

        # Combine all raw PCM bytes from the frames
        combined_data = b"".join(f.data.tobytes() for f in frames)

        # Write to an in-memory WAV file for the Sarvam API
        wav_buffer = io.BytesIO()
        with wave.open(wav_buffer, 'wb') as wav_file:
            wav_file.setnchannels(frames[0].num_channels)
            wav_file.setsampwidth(2)  # 16-bit PCM = 2 bytes
            wav_file.setframerate(frames[0].sample_rate)
            wav_file.writeframes(combined_data)

        wav_buffer.seek(0)
        url = "https://api.sarvam.ai/speech-to-text"
        headers = {"api-subscription-key": SARVAM_API_KEY}

        try:
            files = {"file": ("audio.wav", wav_buffer, "audio/wav")}
            response = await asyncio.to_thread(requests.post, url, headers=headers, files=files)

            if response.status_code == 200:
                transcript = response.json().get("transcript", "")
                if transcript:
                    logger.info(f"Sarvam STT Heard: {transcript}")
                    return SpeechEvent(
                        type=SpeechEventType.FINAL_TRANSCRIPT,
                        alternatives=[SpeechData(language="en", text=transcript)]
                    )
            else:
                logger.error(f"Sarvam STT Error: {response.text}")

        except Exception as e:
            logger.error(f"Sarvam STT Exception: {e}")

        return SpeechEvent(
            type=SpeechEventType.FINAL_TRANSCRIPT,
            alternatives=[SpeechData(language="en", text="")]
        )
