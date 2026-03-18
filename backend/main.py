from fastapi import FastAPI
from app.api.routes import clinics, leads, notifications, voice, agent, payments

app = FastAPI(title="AI Dental Backend API")

app.include_router(clinics.router, prefix="/api/v1/clinics", tags=["clinics"])
app.include_router(leads.router, prefix="/api/v1/leads", tags=["leads"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["notifications"])
app.include_router(voice.router, prefix="/api/v1/voice", tags=["voice"])
app.include_router(agent.router, prefix="/api/v1/agent", tags=["agent-settings"])
app.include_router(payments.router, prefix="/api/v1/payments", tags=["payments"])

@app.get("/health")
def read_health():
    return {"status": "healthy"}
