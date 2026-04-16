from typing import Any
from fastapi import APIRouter, HTTPException
from app.core.database import supabase
from datetime import datetime
import logging
from collections import defaultdict

router = APIRouter()
logger = logging.getLogger("dashboard")

@router.get("/overview")
def get_dashboard_overview() -> Any:
    try:
        today = datetime.utcnow().date().isoformat()
        
        # 1. Total Calls
        calls_query = supabase.table("calls").select("id, call_duration", count="exact").execute()
        total_calls = calls_query.count if calls_query.count is not None else len(calls_query.data)
        
        calls_today_query = supabase.table("calls").select("id", count="exact").gte("created_at", today).execute()
        total_calls_today = calls_today_query.count if calls_today_query.count is not None else len(calls_today_query.data)
        
        # Calculate minutes used (call_duration is mostly in seconds if integer, or maybe minutes. Assuming seconds.)
        total_seconds_used = sum(int(c.get("call_duration") or 0) for c in calls_query.data)
        minutes_used = total_seconds_used // 60
        
        # 2. Missed Calls
        missed_query = supabase.table("calls").select("id", count="exact").eq("status", "missed").execute()
        missed_calls = missed_query.count if missed_query.count is not None else len(missed_query.data)
        
        # 3. Appointments (Source of truth: leads table with status 'Booked')
        apt_query = supabase.table("leads").select("id", count="exact").eq("status", "Booked").execute()
        appointments = apt_query.count if apt_query.count is not None else len(apt_query.data)
            
        # 4. Conversion Rate
        conversion = (appointments / total_calls * 100) if total_calls > 0 else 0
        
        # 5. Active Numbers (Source of truth: phone_numbers table with status 'Active')
        try:
            numbers_query = supabase.table("phone_numbers").select("id", count="exact").eq("status", "Active").execute()
            active_numbers = numbers_query.count if numbers_query.count is not None else len(numbers_query.data)
        except Exception:
            active_numbers = 0
            
        # 6. Recent Leads
        leads_query = supabase.table("leads").select("*").order("created_at", desc=True).limit(5).execute()
        leads = leads_query.data
        
        mapped_leads = []
        for l in leads:
            mapped_leads.append({
                "name": l.get("patient_name") or "Unknown",
                "phone": l.get("caller_phone") or "Unknown",
                "status": l.get("status") or "pending",
                "duration": l.get("call_duration") or 0,
                "created_at": l.get("created_at")
            })

        return {
            "missed_calls": missed_calls,
            "total_calls_today": total_calls_today,
            "appointments_booked": appointments,
            "conversion_rate": round(conversion, 2),
            "avg_response_time": 1.8, # Assuming mock for now as requested format
            "minutes_used": minutes_used,
            "active_numbers": active_numbers,
            "recent_leads": mapped_leads
        }
    except Exception as e:
        logger.error(f"Error fetching dashboard overview: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chart")
def get_dashboard_chart() -> Any:
    try:
        calls_query = supabase.table("calls").select("created_at").execute()
        leads_query = supabase.table("leads").select("created_at, status").eq("status", "Booked").execute()
        
        call_counts = defaultdict(int)
        for row in calls_query.data:
            dt_str = row.get("created_at")
            if dt_str:
                try:
                    dt = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
                    call_counts[dt.strftime("%a")] += 1
                except ValueError:
                    continue
        
        booked_counts = defaultdict(int)
        for row in leads_query.data:
            dt_str = row.get("created_at")
            if dt_str:
                try:
                    dt = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
                    booked_counts[dt.strftime("%a")] += 1
                except ValueError:
                    continue

        days_order = {d: i for i, d in enumerate(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"])}
        all_days = set(list(call_counts.keys()) + list(booked_counts.keys()))
        
        result = [{"day": d, "calls": call_counts[d], "booked": booked_counts[d]} for d in all_days]
        result.sort(key=lambda x: days_order.get(x["day"], 0))
        
        if not result:
            return [{"day": d, "calls": 0, "booked": 0} for d in ["Mon", "Tue", "Wed", "Thu", "Fri"]]
            
        return result
    except Exception as e:
        logger.error(f"Error fetching dashboard chart: {e}")
        raise HTTPException(status_code=500, detail=str(e))
