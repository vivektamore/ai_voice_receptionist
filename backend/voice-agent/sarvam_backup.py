import requests
import os

SARVAM_KEY = os.getenv("SARVAM_API_KEY")

def speak(text):

    url = "https://api.sarvam.ai/text-to-speech"

    headers = {
        "api-subscription-key": f"{SARVAM_KEY}",
        "Content-Type": "application/json"
    }

    data = {
        "inputs": [text],
        "target_language_code": "hi-IN",
        "speaker": "meera",
        "pitch": 0,
        "pace": 1.65,
        "loudness": 1.5,
        "speech_sample_rate": 8000,
        "enable_preprocessing": True,
        "model": "max"
    }

    r = requests.post(url, headers=headers, json=data)

    print(f"[TTS DEBUG] Status Code: {r.status_code}")
    if r.status_code == 200:
        import base64
        response_json = r.json()
        audio_base64 = response_json.get("audios", [""])[0]
        if audio_base64:
            with open("output.wav", "wb") as f:
                f.write(base64.b64decode(audio_base64))
            print("Successfully saved output.wav from Sarvam!")
        else:
            print("No audio content in response.")
    else:
        print(f"Error {r.status_code}: {r.text}")
