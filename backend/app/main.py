from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.services.matching_service import seed_initial_data_if_empty

# Import models so metadata knows all tables
import app.models

# Import API routers
from app.api.caregivers import router as caregivers_router
from app.api.assignments import router as assignments_router
from app.api.calls import router as calls_router
from app.api.payments import router as payments_router
from app.api.sla import router as sla_router

# Create tables on startup
Base.metadata.create_all(bind=engine)

# Seed baseline data if empty
db = SessionLocal()
try:
    seed_initial_data_if_empty(db)
finally:
    db.close()

app = FastAPI(
    title=f"{settings.PROJECT_NAME} Phase B API",
    version="1.0.0",
    description="CareConnect Phase B: Matching, 10-Minute Jitsi Intro Calls, Razorpay Advance Deposits, and DPDP 2023 SLA Acceptance."
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For flexible local dev and staging access
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(caregivers_router, prefix=settings.API_V1_STR)
app.include_router(assignments_router, prefix=settings.API_V1_STR)
app.include_router(calls_router, prefix=settings.API_V1_STR)
app.include_router(payments_router, prefix=settings.API_V1_STR)
app.include_router(sla_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {
        "platform": settings.PROJECT_NAME,
        "phase": "Phase B — Matching, Trial & Confirmation",
        "status": "online",
        "docs_url": "/docs",
        "compliance": "India DPDP Act 2023 Compliant"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "careconnect-phaseb-backend"}

