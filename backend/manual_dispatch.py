"""
Manual dispatch script: sends a job to your running agent for a specific room.
Run this WHILE the agent (livekit_agent.py dev) is running in another terminal.
"""
import asyncio
import os
from dotenv import load_dotenv
from livekit import api

load_dotenv()

async def dispatch_agent():
    lkapi = api.LiveKitAPI(
        url=os.getenv("LIVEKIT_URL"),
        api_key=os.getenv("LIVEKIT_API_KEY"),
        api_secret=os.getenv("LIVEKIT_API_SECRET"),
    )
    
    room_name = "test-room"
    
    print(f"Dispatching agent to room: {room_name}")
    
    dispatch = await lkapi.agent_dispatch.create_dispatch(
        api.CreateAgentDispatchRequest(
            agent_name="",   # empty = match any agent worker
            room=room_name,
        )
    )
    
    print(f"Dispatch created: {dispatch}")
    await lkapi.aclose()

if __name__ == "__main__":
    asyncio.run(dispatch_agent())
