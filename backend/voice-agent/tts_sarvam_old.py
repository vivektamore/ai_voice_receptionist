import requests
import os

def speak(text):
    SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")

    url = "https://api.sarvam.ai/text-to-speech"

    headers = {
        "api-subscription-key": f"{SARVAM_API_KEY}",
        "Content-Type": "application/json"
    }

    # As instructed by the user's latest message, this is the Correct Request Example formatting:
    data = {
        "inputs": [text],
        "target_language_code": "en-IN",
        "speaker": "anushka",
        "pitch": 0,
        "pace": 1.65,
        "loudness": 1.5,
        "speech_sample_rate": 8000,
        "enable_preprocessing": True,
        "model": "arya"
    }

    response = requests.post(url, headers=headers, json=data)

    with open("output.wav","wb") as f:
        f.write(response.content)

