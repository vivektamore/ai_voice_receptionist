from fastapi import FastAPI
from app.api.routes import clinics, leads, notifications, voice

app = FastAPI(title="AI Dental Backend API")

app.include_router(clinics.router, prefix="/api/v1/clinics", tags=["clinics"])
app.include_router(leads.router, prefix="/api/v1/leads", tags=["leads"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["notifications"])
app.include_router(voice.router, prefix="/api/v1/voice", tags=["voice"])

@app.get("/health")
def read_health():
    return {"status": "healthy"}
