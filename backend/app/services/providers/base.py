from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseProvider(ABC):
    @abstractmethod
    async def search_numbers(self, country: str, area_code: str = None) -> List[Dict[str, Any]]:
        """
        Fetch available numbers from the provider.
        Should return a standard schema: [{"number": "+91885xxxxxxx", "price_monthly": 10.0, "provider": "vobiz"}]
        """
        pass

    @abstractmethod
    async def purchase_number(self, number: str) -> bool:
        """
        Execute the purchase API to acquire the specific E.164 number.
        Returns True if successful, False otherwise.
        """
        pass

    @abstractmethod
    async def configure_sip(self, number: str) -> Dict[str, Any]:
        """
        Hook the purchased number to a SIP trunk or dispatch rule.
        Returns connection metadata if needed.
        """
        pass
