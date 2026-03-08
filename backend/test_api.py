import requests
import os
from dotenv import load_dotenv
load_dotenv()
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")

data = {
    "inputs": ["Hello, how can I help you today?"],
    "target_language_code": "en-IN",
    "speaker": "priya",
    "model": "bulbul:v3"
}
headers = {
    "api-subscription-key": f"{SARVAM_API_KEY}",
    "Content-Type": "application/json"
}

r = requests.post("https://api.sarvam.ai/text-to-speech", headers=headers, json=data)
print("Content-Type:", r.headers.get("Content-Type"))
print("Status:", r.status_code)
# write first 100 bytes to see if it's json or binary
with open("test_output.txt", "w") as f:
    f.write(r.text[:100])
