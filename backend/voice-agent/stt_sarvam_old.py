import requests
import os

SARVAM_KEY = os.getenv("SARVAM_API_KEY")

def transcribe(audio):

    url = "https://api.sarvam.ai/speech-to-text"

    headers = {
        "api-subscription-key": f"{SARVAM_KEY}"
    }

    files = {
        "file": ("audio.wav", open(audio,"rb"), "audio/wav")
    }

    r = requests.post(url, headers=headers, files=files)

    return r.json().get("transcript", "")
