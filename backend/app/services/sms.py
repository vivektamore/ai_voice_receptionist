import asyncio
import logging

logger = logging.getLogger(__name__)

async def send_sms(phone_number: str, message: str) -> None:
    """
    Dummy async function to simulate sending an SMS.
    In a real scenario, this would call Twilio/Vonage API.
    """
    try:
        # Simulate network latency
        await asyncio.sleep(2)
        logger.info(f"Successfully sent SMS to {phone_number}: {message}")
        print(f"[SMS Sent] To: {phone_number} | Message: {message}")
    except Exception as e:
        logger.error(f"Failed to send SMS to {phone_number}: {e}")
        print(f"[SMS Failed] {e}")
