import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.api.routes import clinics, leads, notifications, voice, agent, payments, dashboard, billing, cron, system, bookings, stripe_billing
from app.core.loader import load_settings_from_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load settings from db on startup
    await load_settings_from_db()
    yield

app = FastAPI(title="AI Dental Backend API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(clinics.router, prefix="/api/v1/clinics", tags=["clinics"])
app.include_router(leads.router, prefix="/api/v1/leads", tags=["leads"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["notifications"])
app.include_router(voice.router, prefix="/api/v1/voice", tags=["voice"])
app.include_router(agent.router, prefix="/api/v1/agent", tags=["agent-settings"])
app.include_router(payments.router, prefix="/api/v1/payments", tags=["payments"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["dashboard"])
app.include_router(billing.router, prefix="/api/v1/billing", tags=["billing"])
app.include_router(cron.router, prefix="/api/v1/cron", tags=["cron"])
app.include_router(system.router, prefix="/api/v1/system", tags=["system"])
app.include_router(bookings.router, prefix="/api/v1/bookings", tags=["bookings"])
app.include_router(stripe_billing.router, prefix="/api/v1/stripe", tags=["stripe"])
app.include_router(stripe_billing.webhook_router, prefix="/api/webhooks", tags=["stripe-webhooks"])

@app.get("/health")
def read_health():
    return {"status": "healthy"}
