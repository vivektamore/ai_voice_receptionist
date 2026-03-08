import os
from dotenv import load_dotenv
from livekit import api

load_dotenv()

# Generate a testing token for the browser client to join 'test-room'
token = (
    api.AccessToken(
        os.getenv('LIVEKIT_API_KEY'), 
        os.getenv('LIVEKIT_API_SECRET')
    )
    .with_identity('caller_test')
    .with_name('Test Caller')
    .with_grants(api.VideoGrants(room_join=True, room='test-room'))
    .to_jwt()
)

print("\n--- TEST TOKEN FOR MEET.LIVEKIT.IO ---")
print("URL:   " + os.getenv("LIVEKIT_URL"))
print("TOKEN: " + token)
print("--------------------------------------\n")
