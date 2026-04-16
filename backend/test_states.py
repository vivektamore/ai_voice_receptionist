import asyncio
import os
import sys
from dotenv import load_dotenv

# Ensure we load env vars
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
from app.core.database import supabase

# The target user from notes_debugging.txt
USER_ID = "6051b51e-7080-442c-bf0e-dd61572c1764"
CLINIC_ID = "68caea3f-5389-4d70-89d8-d0df3c2362e5"

async def toggle_subscription(status: str):
    res = supabase.table("clinics").update({"subscription_status": status}).eq("id", CLINIC_ID).execute()
    print(f"✅ Subscription status set to: {status}")
    print("👉 Reload your browser on the Numbers page to see the Add Number / Lock behavior change!")

async def trigger_provisioning_success():
    # Inserts a success job to trigger the beautiful onboarding UI animations instantly
    supabase.table("provisioning_jobs").insert({
        "user_id": USER_ID,
        "number": "+19876543210",
        "status": "success",
        "step": "success"
    }).execute()
    print("✅ Inserted a 'success' row in provisioning_jobs.")
    print("👉 If you are on localhost:3000/onboarding/setup right now, you should see the 'System Activated' screen instantly!")

if __name__ == "__main__":
    print("\n--- VOICERCP PRE-LAUNCH DEBUG TOOL ---")
    print("What do you want to test?")
    print("1: Simulate Active Subscription (Unlocks Number Purchases on Dashboard)")
    print("2: Simulate Cancelled Subscription (Locks Number Purchases on Dashboard)")
    print("3: Simulate Webhook Success (Triggers the Onboarding Polling Animation)")
    
    try:
        choice = input("Enter choice (1/2/3): ").strip()
        if choice == '1':
            asyncio.run(toggle_subscription('active'))
        elif choice == '2':
            asyncio.run(toggle_subscription('cancelled'))
        elif choice == '3':
            asyncio.run(trigger_provisioning_success())
        else:
            print("Invalid choice.")
    except Exception as e:
         print("Error:", e)
    print("--------------------------------------\n")
