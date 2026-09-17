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

from app.services.matching_service import seed_initial_data_if_empty


# ============================================================
# Application lifecycle
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application startup and shutdown lifecycle.

    Both Phase A and Phase B use the async database layer.
    """

    # Initialize all database tables.
    await init_db()

    # Seed Phase B baseline/demo data using an async session.
    async with AsyncSessionLocal() as db:
        await seed_initial_data_if_empty(db)

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
        "Persona & Assessment, plus Phase B Caregiver Matching, "
        "Intro Calls, Payments and SLA Acceptance."
    ),
    lifespan=lifespan,
)


# ============================================================
# CORS configuration
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
# Phase B is implemented asynchronously.
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