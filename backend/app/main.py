import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db, AsyncSessionLocal

# ============================================================
# Phase A routers
# ============================================================

from app.api import (
    auth,
    me,
    elders,
    locations,
    assessments,
)

# ============================================================
# Phase B routers
# ============================================================

from app.api.caregivers import router as caregivers_router
from app.api.assignments import router as assignments_router
from app.api.calls import router as calls_router
from app.api.payments import router as payments_router
from app.api.sla import router as sla_router

# ============================================================
# Phase C routers
# ============================================================

from app.api import (
    shifts,
    care_tasks,
    vitals,
    incidents,
    media,
    chat,
)

from app.services.matching_service import seed_initial_data_if_empty

# ============================================================
# Phase D routers
# ============================================================

from app.api import (
    replacements,
    feedback,
    billing,
    renewals,
    audit,
    payouts,
    hospitals,
)


# ============================================================
# Application lifecycle
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application startup and shutdown lifecycle.

    Phase A, Phase B, Phase C and Phase D use the async
    database layer.
    """

    # Initialize all database tables.
    await init_db()

    # Seed Phase B baseline/demo data using an async session.
    async with AsyncSessionLocal() as db:
        await seed_initial_data_if_empty(db)
        from app.services.hospital_service import HospitalService
        await HospitalService.seed_initial_hospitals_if_empty(db)

    yield


# ============================================================
# FastAPI application
# ============================================================

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "CareConnect Elder Care Platform API - "
        "Phase A Family Sponsor Intake, Geographic Verification, "
        "Persona & Assessment, Phase B Caregiver Matching, "
        "Intro Calls, Payments and SLA Acceptance, "
        "Phase C Active Care & Remote Monitoring, "
        "and Phase D Service Management."
    ),
    lifespan=lifespan,
)


# ============================================================
# CORS configuration
# ============================================================

cors_kwargs = {
    "allow_origins": settings.CORS_ORIGINS,
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
if settings.ENVIRONMENT in ["development", "test"]:
    cors_kwargs["allow_origin_regex"] = (
        r"^(https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|.*\.trycloudflare\.com)(:[0-9]+)?)$"
    )

app.add_middleware(
    CORSMiddleware,
    **cors_kwargs
)


# ============================================================
# Basic application endpoints
# ============================================================

@app.get("/")
async def root():
    """
    Root endpoint for basic API verification.
    """
    return {
        "platform": "CareConnect",
        "compliance": "India DPDP Act 2023",
    }


@app.get("/health")
async def health():
    """
    Health-check endpoint.
    """
    return {
        "status": "healthy",
    }


# ============================================================
# Phase A
# Onboarding & Clinical/Lifestyle Intake
# ============================================================

app.include_router(
    auth.router,
    prefix=settings.API_V1_STR,
)

app.include_router(
    me.router,
    prefix=settings.API_V1_STR,
)

app.include_router(
    elders.router,
    prefix=settings.API_V1_STR,
)

app.include_router(
    locations.router,
    prefix=settings.API_V1_STR,
)

app.include_router(
    assessments.router,
    prefix=settings.API_V1_STR,
)


# ============================================================
# Phase B
# Matching, Trial & Confirmation
#
# Phase B remains asynchronous.
# ============================================================

app.include_router(
    caregivers_router,
    prefix=settings.API_V1_STR,
)

app.include_router(
    assignments_router,
    prefix=settings.API_V1_STR,
)

app.include_router(
    calls_router,
    prefix=settings.API_V1_STR,
)

app.include_router(
    payments_router,
    prefix=settings.API_V1_STR,
)

app.include_router(
    sla_router,
    prefix=settings.API_V1_STR,
)


# ============================================================
# Phase C
# Active Care & Remote Monitoring
#
# Primary application prefix remains settings.API_V1_STR.
# Additional /api/v1 compatibility routes are provided because
# the Phase C API contract/tests use /api/v1.
# ============================================================

# ------------------------------------------------------------
# Phase C - Existing application prefix
# ------------------------------------------------------------

app.include_router(
    shifts.router,
    prefix=settings.API_V1_STR,
)

app.include_router(
    care_tasks.router,
    prefix=settings.API_V1_STR,
)

app.include_router(
    vitals.router,
    prefix=settings.API_V1_STR,
)

app.include_router(
    incidents.router,
    prefix=settings.API_V1_STR,
)

app.include_router(
    media.router,
    prefix=settings.API_V1_STR,
)

app.include_router(
    chat.router,
    prefix=settings.API_V1_STR,
)


# ------------------------------------------------------------
# Phase C - /api/v1 compatibility prefix
# ------------------------------------------------------------

app.include_router(
    shifts.router,
    prefix="/api/v1",
)

app.include_router(
    care_tasks.router,
    prefix="/api/v1",
)

app.include_router(
    vitals.router,
    prefix="/api/v1",
)

app.include_router(
    incidents.router,
    prefix="/api/v1",
)

app.include_router(
    media.router,
    prefix="/api/v1",
)

app.include_router(
    chat.router,
    prefix="/api/v1",
)

app.include_router(
    caregivers_router,
    prefix="/api/v1",
)


# ============================================================
# Phase D
# Service Management
# ============================================================

app.include_router(
    replacements.router,
    prefix=settings.API_V1_STR,
)

app.include_router(
    feedback.router,
    prefix=settings.API_V1_STR,
)

app.include_router(
    billing.router,
    prefix=settings.API_V1_STR,
)

app.include_router(
    renewals.router,
    prefix=settings.API_V1_STR,
)

app.include_router(
    audit.router,
    prefix=settings.API_V1_STR,
)

app.include_router(
    payouts.router,
    prefix=settings.API_V1_STR,
)

app.include_router(
    payouts.router,
    prefix="/api/v1",
)

app.include_router(
    hospitals.router,
    prefix=settings.API_V1_STR,
)

app.include_router(
    hospitals.router,
    prefix="/api/v1",
)