import os
import logging
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel
from app.core.database import supabase
from app.core.loader import load_settings_from_db

logger = logging.getLogger("admin-routes")
router = APIRouter()

def verify_admin_key(x_admin_api_key: str = Header(None, alias="X-Admin-Api-Key")):
    expected_key = os.getenv("ADMIN_API_KEY")
    if not expected_key:
        raise HTTPException(status_code=500, detail="ADMIN_API_KEY not configured on server")
    if x_admin_api_key != expected_key:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid Admin API Key")
    return True

# 1. Get all clinics with stats
@router.get("/clinics", dependencies=[Depends(verify_admin_key)])
async def list_all_clinics():
    """List all registered clinics with subscription, trial, and usage metrics."""
    try:
        clinics_res = supabase.table("clinics").select("*").order("created_at", desc=True).execute()
        return {"status": "success", "clinics": clinics_res.data or []}
    except Exception as e:
        logger.error(f"Error fetching clinics for admin: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 2. Get Revenue & System Stats
@router.get("/revenue", dependencies=[Depends(verify_admin_key)])
async def get_revenue_stats():
    """Fetch MRR, ARR, active subscribers, trial user count, and total calls."""
    try:
        clinics = supabase.table("clinics").select("subscription_status, wallet_balance").execute().data or []
        leads = supabase.table("leads").select("id", count="exact").execute()
        
        total_clinics = len(clinics)
        active_subscribers = sum(1 for c in clinics if c.get("subscription_status") == "active")
        trial_users = sum(1 for c in clinics if c.get("subscription_status") in ("trial", None))
        total_wallet_float = sum(float(c.get("wallet_balance") or 0) for c in clinics)

        # Rough MRR estimation ($70/growth avg)
        mrr_usd = active_subscribers * 70
        arr_usd = mrr_usd * 12

        return {
            "status": "success",
            "total_clinics": total_clinics,
            "active_subscribers": active_subscribers,
            "trial_users": trial_users,
            "total_leads_count": leads.count or 0,
            "estimated_mrr_usd": mrr_usd,
            "estimated_arr_usd": arr_usd,
            "total_wallet_balance": total_wallet_float,
        }
    except Exception as e:
        logger.error(f"Error fetching revenue stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 3. Force-Activate Clinic
@router.post("/clinics/{clinic_id}/activate", dependencies=[Depends(verify_admin_key)])
async def activate_clinic(clinic_id: str):
    try:
        res = supabase.table("clinics").update({"subscription_status": "active"}).eq("id", clinic_id).execute()
        return {"status": "success", "clinic": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 4. Suspend Clinic
@router.post("/clinics/{clinic_id}/suspend", dependencies=[Depends(verify_admin_key)])
async def suspend_clinic(clinic_id: str):
    try:
        res = supabase.table("clinics").update({"subscription_status": "inactive"}).eq("id", clinic_id).execute()
        return {"status": "success", "clinic": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 5. Credit Wallet
class CreditWalletRequest(BaseModel):
    amount: float

@router.post("/clinics/{clinic_id}/credit-wallet", dependencies=[Depends(verify_admin_key)])
async def credit_wallet(clinic_id: str, req: CreditWalletRequest):
    try:
        clinic = supabase.table("clinics").select("wallet_balance").eq("id", clinic_id).single().execute()
        current_bal = float(clinic.data.get("wallet_balance") or 0)
        new_bal = current_bal + req.amount
        res = supabase.table("clinics").update({"wallet_balance": new_bal}).eq("id", clinic_id).execute()
        return {"status": "success", "new_balance": new_bal, "clinic": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 6. Global API Key Manager
@router.get("/api-keys", dependencies=[Depends(verify_admin_key)])
async def get_system_api_keys():
    try:
        res = supabase.table("system_settings").select("*").execute()
        return {"status": "success", "settings": res.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class SystemSettingItem(BaseModel):
    key: str
    value: str
    description: str = ""

@router.post("/api-keys", dependencies=[Depends(verify_admin_key)])
async def update_system_api_key(item: SystemSettingItem):
    try:
        res = supabase.table("system_settings").upsert({
            "key": item.key,
            "value": item.value,
            "description": item.description,
        }).execute()
        # Hot reload settings into process env
        await load_settings_from_db()
        return {"status": "success", "setting": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 7. List all Phone Numbers
@router.get("/phone-numbers", dependencies=[Depends(verify_admin_key)])
async def list_all_phone_numbers():
    try:
        res = supabase.table("phone_numbers").select("*").execute()
        return {"status": "success", "phone_numbers": res.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 8. List all Transactions
@router.get("/transactions", dependencies=[Depends(verify_admin_key)])
async def list_all_transactions():
    try:
        res = supabase.table("transactions").select("*").order("created_at", desc=True).limit(100).execute()
        return {"status": "success", "transactions": res.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
