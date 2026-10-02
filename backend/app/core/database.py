import asyncio
from typing import AsyncGenerator

# psycopg async connections require the Selector event loop on Windows.
# This keeps PostgreSQL async connections working when CareConnect
# is run on Windows with Python + SQLAlchemy + psycopg.
if hasattr(asyncio, "WindowsSelectorEventLoopPolicy"):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import declarative_base

from app.core.config import settings


DATABASE_URL = settings.DATABASE_URL

# Normalize generic postgresql:// or postgres:// URLs
# to use the psycopg driver.
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace(
        "postgresql://",
        "postgresql+psycopg://",
        1,
    )
elif DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace(
        "postgres://",
        "postgresql+psycopg://",
        1,
    )

connect_args = {}

engine_kwargs = {
    "echo": False,
    "future": True,
}

# SQLite-specific configuration.
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

# PostgreSQL-specific configuration.
else:
    # Check connections before using them from the pool.
    engine_kwargs["pool_pre_ping"] = True


engine = create_async_engine(
    DATABASE_URL,
    connect_args=connect_args,
    **engine_kwargs,
)


AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for obtaining an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    """Create all registered database tables across all platform phases."""
    # Importing app.models ensures all Phase A, B, C, and D
    # models are registered with Base.metadata.
    import app.models

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Safe idempotent column additions for existing PostgreSQL tables
        try:
            from sqlalchemy import text
            await conn.execute(text('ALTER TABLE elders ADD COLUMN IF NOT EXISTS "phoneNumber" VARCHAR(20);'))
        except Exception:
            pass