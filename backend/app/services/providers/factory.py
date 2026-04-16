from .base import BaseProvider
from .vobiz import VobizProvider
from .telnyx import TelnyxProvider

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
