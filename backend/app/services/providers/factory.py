from .base import BaseProvider
from .vobiz import VobizProvider
from .telnyx import TelnyxProvider
from .twilio import TwilioProvider

def get_provider(country: str) -> BaseProvider:
    """
    Factory function to fetch the correct telephony provider explicitly by country.
    Enforces the Provider Abstraction Layer rule.
    """
    country_code = country.upper()
    
    if country_code == "IN":
        return VobizProvider()
    else:
        # All other countries (US, CA, UK, AU, etc.) are handled by Telnyx
        return TelnyxProvider()

def get_provider_by_name(provider_name: str) -> BaseProvider:
    """
    Returns the provider class instance explicitly by its identifier name.
    Supported: 'vobiz', 'telnyx', 'twilio'.
    """
    name = provider_name.lower().strip()
    if name == "vobiz":
        return VobizProvider()
    elif name == "twilio":
        return TwilioProvider()
    elif name == "telnyx":
        return TelnyxProvider()
    else:
        raise ValueError(f"Unknown telephony provider: {provider_name}")
