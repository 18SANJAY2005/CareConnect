from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db
from app.api import auth, me, elders, locations, assessments
from app.api import auth, me, elders, locations, assessments, shifts, care_tasks, vitals, incidents, media, chat

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schemas on startup
    await init_db()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="CareConnect Elder Care Platform API — Active Care & Remote Monitoring",
    lifespan=lifespan
)

# CORS configuration for Frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(me.router, prefix=settings.API_V1_STR)
app.include_router(elders.router, prefix=settings.API_V1_STR)
app.include_router(locations.router, prefix=settings.API_V1_STR)
app.include_router(assessments.router, prefix=settings.API_V1_STR)
# Mount API Routers under settings.API_V1_STR ("/api") and "/api/v1" for maximum compatibility
for prefix in [settings.API_V1_STR, "/api/v1"]:
    app.include_router(auth.router, prefix=prefix)
    app.include_router(me.router, prefix=prefix)
    app.include_router(elders.router, prefix=prefix)
    app.include_router(locations.router, prefix=prefix)
    app.include_router(assessments.router, prefix=prefix)
    app.include_router(shifts.router, prefix=prefix)
    app.include_router(care_tasks.router, prefix=prefix)
    app.include_router(vitals.router, prefix=prefix)
    app.include_router(incidents.router, prefix=prefix)
    app.include_router(media.router, prefix=prefix)
    app.include_router(chat.router, prefix=prefix)

@app.get("/api/health", tags=["Health"])
async def health_check():
    """Health check probe."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }

