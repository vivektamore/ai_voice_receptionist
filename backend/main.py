import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.api.routes import clinics, leads, notifications, voice, agent, payments, dashboard, billing, cron, system, bookings, numbers
from app.core.loader import load_settings_from_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load settings from db on startup
    await load_settings_from_db()
    yield

app = FastAPI(title="AI Dental Backend API", lifespan=lifespan)

# ── CORS ─────────────────────────────────────────────────────────────────────
# Replace localhost:3000 with your production domain before deploying.
# Never use allow_origins=["*"] with allow_credentials=True — it's a security error.
ALLOWED_ORIGINS = [
    "http://localhost:3000",         # local dev
    "https://yourclinic.com",        # TODO: replace with your real domain
    "https://www.yourclinic.com",    # TODO: replace with your real domain
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Cron-Secret"],
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

app.include_router(numbers.router,                   prefix="/api/v1/numbers",    tags=["numbers"])


@app.get("/health")
def read_health():
    return {"status": "healthy"}
