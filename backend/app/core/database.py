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

        def sync_migrations(sync_conn):
            from sqlalchemy import inspect, text
            inspector = inspect(sync_conn)
            table_names = inspector.get_table_names()

            if "elders" in table_names:
                elder_cols = {c["name"] for c in inspector.get_columns("elders")}
                if "phoneNumber" not in elder_cols:
                    try:
                        sync_conn.execute(text('ALTER TABLE elders ADD COLUMN "phoneNumber" VARCHAR(20)'))
                    except Exception:
                        pass

            if "users" in table_names:
                user_cols = {c["name"] for c in inspector.get_columns("users")}
                if "dob" not in user_cols:
                    try:
                        sync_conn.execute(text("ALTER TABLE users ADD COLUMN dob VARCHAR(20)"))
                    except Exception:
                        pass
                if "gender" not in user_cols:
                    try:
                        sync_conn.execute(text("ALTER TABLE users ADD COLUMN gender VARCHAR(20)"))
                    except Exception:
                        pass
                if "locality" not in user_cols:
                    try:
                        sync_conn.execute(text("ALTER TABLE users ADD COLUMN locality VARCHAR(255)"))
                    except Exception:
                        pass
                if "avatarUrl" not in user_cols:
                    try:
                        sync_conn.execute(text('ALTER TABLE users ADD COLUMN "avatarUrl" VARCHAR(500)'))
                    except Exception:
                        pass

            if "caregivers" in table_names:
                cg_cols = {c["name"] for c in inspector.get_columns("caregivers")}
                if "dob" not in cg_cols:
                    try:
                        sync_conn.execute(text("ALTER TABLE caregivers ADD COLUMN dob VARCHAR(20)"))
                    except Exception:
                        pass
                if "gender" not in cg_cols:
                    try:
                        sync_conn.execute(text("ALTER TABLE caregivers ADD COLUMN gender VARCHAR(20) DEFAULT 'FEMALE'"))
                    except Exception:
                        pass
                if "phone" not in cg_cols:
                    try:
                        sync_conn.execute(text("ALTER TABLE caregivers ADD COLUMN phone VARCHAR(30)"))
                    except Exception:
                        pass
                if "avatarUrl" not in cg_cols:
                    try:
                        sync_conn.execute(text('ALTER TABLE caregivers ADD COLUMN "avatarUrl" VARCHAR(500)'))
                    except Exception:
                        pass
                if "isBufferPool" not in cg_cols:
                    try:
                        sync_conn.execute(text('ALTER TABLE caregivers ADD COLUMN "isBufferPool" BOOLEAN DEFAULT 0'))
                    except Exception:
                        pass
                if "status" not in cg_cols:
                    try:
                        sync_conn.execute(text("ALTER TABLE caregivers ADD COLUMN status VARCHAR(50) DEFAULT 'AVAILABLE'"))
                    except Exception:
                        pass
                if "updated_at" not in cg_cols:
                    try:
                        sync_conn.execute(text("ALTER TABLE caregivers ADD COLUMN updated_at TIMESTAMP"))
                    except Exception:
                        pass

        await conn.run_sync(sync_migrations)