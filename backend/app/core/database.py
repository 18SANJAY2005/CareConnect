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
            is_postgres = sync_conn.dialect.name.startswith("postgres")

            if is_postgres:
                sync_conn.execute(text('ALTER TABLE elders ADD COLUMN IF NOT EXISTS "phoneNumber" VARCHAR(20)'))
                sync_conn.execute(text('ALTER TABLE elders ADD COLUMN IF NOT EXISTS "isMyself" BOOLEAN DEFAULT FALSE'))
                sync_conn.execute(text('ALTER TABLE elders ADD COLUMN IF NOT EXISTS preferred_hospital_id VARCHAR(36)'))
                sync_conn.execute(text('ALTER TABLE users ADD COLUMN IF NOT EXISTS dob VARCHAR(20)'))
                sync_conn.execute(text('ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20)'))
                sync_conn.execute(text('ALTER TABLE users ADD COLUMN IF NOT EXISTS locality VARCHAR(255)'))
                sync_conn.execute(text('ALTER TABLE users ADD COLUMN IF NOT EXISTS "avatarUrl" VARCHAR(500)'))
                sync_conn.execute(text('ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS dob VARCHAR(20)'))
                sync_conn.execute(text("ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS gender VARCHAR(20) DEFAULT 'FEMALE'"))
                sync_conn.execute(text('ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS phone VARCHAR(30)'))
                sync_conn.execute(text('ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS "avatarUrl" VARCHAR(500)'))
                sync_conn.execute(text('ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS "isBufferPool" BOOLEAN DEFAULT FALSE'))
                sync_conn.execute(text("ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'AVAILABLE'"))
                sync_conn.execute(text('ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS qualifications VARCHAR(500)'))
                sync_conn.execute(text('ALTER TABLE shifts ADD COLUMN IF NOT EXISTS "startOtp" VARCHAR(10)'))
                sync_conn.execute(text('ALTER TABLE shifts ADD COLUMN IF NOT EXISTS "startOtpExpiresAt" TIMESTAMP WITH TIME ZONE'))
                sync_conn.execute(text('ALTER TABLE shifts ADD COLUMN IF NOT EXISTS "startOtpUsed" BOOLEAN DEFAULT FALSE'))
                sync_conn.execute(text('ALTER TABLE shifts ADD COLUMN IF NOT EXISTS "startOtpAttempts" INTEGER DEFAULT 0'))
                sync_conn.execute(text('ALTER TABLE shifts ADD COLUMN IF NOT EXISTS "completionOtp" VARCHAR(10)'))
                sync_conn.execute(text('ALTER TABLE shifts ADD COLUMN IF NOT EXISTS "completionOtpExpiresAt" TIMESTAMP WITH TIME ZONE'))
                sync_conn.execute(text('ALTER TABLE shifts ADD COLUMN IF NOT EXISTS "completionOtpUsed" BOOLEAN DEFAULT FALSE'))
                sync_conn.execute(text('ALTER TABLE shifts ADD COLUMN IF NOT EXISTS "completionOtpAttempts" INTEGER DEFAULT 0'))

                # Caregiver expanded profile columns
                sync_conn.execute(text('ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS educational_qualifications TEXT'))
                sync_conn.execute(text('ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS certifications TEXT'))
                sync_conn.execute(text('ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS previous_experience TEXT'))
                sync_conn.execute(text('ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS preferred_care_types TEXT'))
                sync_conn.execute(text('ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS work_preferences TEXT'))
                sync_conn.execute(text('ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS preferred_hours VARCHAR(100)'))
                sync_conn.execute(text('ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS performance_metrics TEXT'))

                # Caregiver education verification columns (Requirement B)
                sync_conn.execute(text('ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS education_institution VARCHAR(255)'))
                sync_conn.execute(text('ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS education_course VARCHAR(255)'))
                sync_conn.execute(text('ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS education_completion_year INTEGER'))
                sync_conn.execute(text('ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS education_credential_id VARCHAR(100)'))
                sync_conn.execute(text('ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS education_document_url TEXT'))
                sync_conn.execute(text("ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS education_verification_status VARCHAR(50) DEFAULT 'NOT_CHECKED'"))
                sync_conn.execute(text('ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS education_verification_method VARCHAR(50)'))
                sync_conn.execute(text('ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS education_qr_payload TEXT'))
                sync_conn.execute(text('ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS education_verified_at TIMESTAMP WITH TIME ZONE'))
                sync_conn.execute(text('ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS education_rejection_reason TEXT'))

                # CareAssignment deadline columns
                sync_conn.execute(text('ALTER TABLE care_assignments ADD COLUMN IF NOT EXISTS "responseDeadline" TIMESTAMP WITH TIME ZONE'))
                sync_conn.execute(text('ALTER TABLE care_assignments ADD COLUMN IF NOT EXISTS "declinedReason" TEXT'))
                sync_conn.execute(text('ALTER TABLE care_assignments ADD COLUMN IF NOT EXISTS "declinedAt" TIMESTAMP WITH TIME ZONE'))
                sync_conn.execute(text('ALTER TABLE care_assignments ADD COLUMN IF NOT EXISTS "expiredAt" TIMESTAMP WITH TIME ZONE'))

                # CareTask supervisor correction columns
                sync_conn.execute(text('ALTER TABLE care_tasks ADD COLUMN IF NOT EXISTS "isSupervisorCorrection" BOOLEAN DEFAULT FALSE'))
                sync_conn.execute(text('ALTER TABLE care_tasks ADD COLUMN IF NOT EXISTS "correctionReason" TEXT'))
                sync_conn.execute(text('ALTER TABLE care_tasks ADD COLUMN IF NOT EXISTS "correctedByUserId" VARCHAR(36)'))
                sync_conn.execute(text('ALTER TABLE care_tasks ADD COLUMN IF NOT EXISTS "correctedAt" TIMESTAMP WITH TIME ZONE'))
                sync_conn.execute(text('ALTER TABLE care_tasks ADD COLUMN IF NOT EXISTS "originalStatus" VARCHAR(50)'))

                # Indices and foreign key constraints
                sync_conn.execute(text('CREATE INDEX IF NOT EXISTS ix_elders_preferred_hospital_id ON elders (preferred_hospital_id)'))
                sync_conn.execute(text('CREATE INDEX IF NOT EXISTS ix_caregivers_education_verification_status ON caregivers (education_verification_status)'))
                sync_conn.execute(text("""
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM pg_constraint WHERE conname = 'fk_elders_preferred_hospital'
                        ) THEN
                            ALTER TABLE elders 
                            ADD CONSTRAINT fk_elders_preferred_hospital 
                            FOREIGN KEY (preferred_hospital_id) 
                            REFERENCES hospitals(id) 
                            ON DELETE SET NULL;
                        END IF;
                    END $$;
                """))
            else:
                inspector = inspect(sync_conn)
                table_names = inspector.get_table_names()

                if "elders" in table_names:
                    elder_cols = {c["name"] for c in inspector.get_columns("elders")}
                    if "phoneNumber" not in elder_cols:
                        sync_conn.execute(text('ALTER TABLE elders ADD COLUMN "phoneNumber" VARCHAR(20)'))
                    if "isMyself" not in elder_cols:
                        sync_conn.execute(text('ALTER TABLE elders ADD COLUMN "isMyself" BOOLEAN DEFAULT 0'))
                    if "preferred_hospital_id" not in elder_cols:
                        sync_conn.execute(text('ALTER TABLE elders ADD COLUMN preferred_hospital_id VARCHAR(36)'))

                if "users" in table_names:
                    user_cols = {c["name"] for c in inspector.get_columns("users")}
                    if "dob" not in user_cols:
                        sync_conn.execute(text("ALTER TABLE users ADD COLUMN dob VARCHAR(20)"))
                    if "gender" not in user_cols:
                        sync_conn.execute(text("ALTER TABLE users ADD COLUMN gender VARCHAR(20)"))
                    if "locality" not in user_cols:
                        sync_conn.execute(text("ALTER TABLE users ADD COLUMN locality VARCHAR(255)"))
                    if "avatarUrl" not in user_cols:
                        sync_conn.execute(text('ALTER TABLE users ADD COLUMN "avatarUrl" VARCHAR(500)'))

                if "caregivers" in table_names:
                    cg_cols = {c["name"] for c in inspector.get_columns("caregivers")}
                    if "dob" not in cg_cols:
                        sync_conn.execute(text("ALTER TABLE caregivers ADD COLUMN dob VARCHAR(20)"))
                    if "gender" not in cg_cols:
                        sync_conn.execute(text("ALTER TABLE caregivers ADD COLUMN gender VARCHAR(20) DEFAULT 'FEMALE'"))
                    if "phone" not in cg_cols:
                        sync_conn.execute(text("ALTER TABLE caregivers ADD COLUMN phone VARCHAR(30)"))
                    if "avatarUrl" not in cg_cols:
                        sync_conn.execute(text('ALTER TABLE caregivers ADD COLUMN "avatarUrl" VARCHAR(500)'))
                    if "isBufferPool" not in cg_cols:
                        sync_conn.execute(text('ALTER TABLE caregivers ADD COLUMN "isBufferPool" BOOLEAN DEFAULT 0'))
                    if "status" not in cg_cols:
                        sync_conn.execute(text("ALTER TABLE caregivers ADD COLUMN status VARCHAR(50) DEFAULT 'AVAILABLE'"))
                    if "qualifications" not in cg_cols:
                        sync_conn.execute(text("ALTER TABLE caregivers ADD COLUMN qualifications VARCHAR(500)"))
                    if "educational_qualifications" not in cg_cols:
                        sync_conn.execute(text("ALTER TABLE caregivers ADD COLUMN educational_qualifications TEXT"))
                    if "certifications" not in cg_cols:
                        sync_conn.execute(text("ALTER TABLE caregivers ADD COLUMN certifications TEXT"))
                    if "previous_experience" not in cg_cols:
                        sync_conn.execute(text("ALTER TABLE caregivers ADD COLUMN previous_experience TEXT"))
                    if "preferred_care_types" not in cg_cols:
                        sync_conn.execute(text("ALTER TABLE caregivers ADD COLUMN preferred_care_types TEXT"))
                    if "work_preferences" not in cg_cols:
                        sync_conn.execute(text("ALTER TABLE caregivers ADD COLUMN work_preferences TEXT"))
                    if "preferred_hours" not in cg_cols:
                        sync_conn.execute(text("ALTER TABLE caregivers ADD COLUMN preferred_hours VARCHAR(100)"))
                    if "performance_metrics" not in cg_cols:
                        sync_conn.execute(text("ALTER TABLE caregivers ADD COLUMN performance_metrics TEXT"))
                    if "education_institution" not in cg_cols:
                        sync_conn.execute(text("ALTER TABLE caregivers ADD COLUMN education_institution VARCHAR(255)"))
                    if "education_course" not in cg_cols:
                        sync_conn.execute(text("ALTER TABLE caregivers ADD COLUMN education_course VARCHAR(255)"))
                    if "education_completion_year" not in cg_cols:
                        sync_conn.execute(text("ALTER TABLE caregivers ADD COLUMN education_completion_year INTEGER"))
                    if "education_credential_id" not in cg_cols:
                        sync_conn.execute(text("ALTER TABLE caregivers ADD COLUMN education_credential_id VARCHAR(100)"))
                    if "education_document_url" not in cg_cols:
                        sync_conn.execute(text("ALTER TABLE caregivers ADD COLUMN education_document_url TEXT"))
                    if "education_verification_status" not in cg_cols:
                        sync_conn.execute(text("ALTER TABLE caregivers ADD COLUMN education_verification_status VARCHAR(50) DEFAULT 'NOT_CHECKED'"))
                    if "education_verification_method" not in cg_cols:
                        sync_conn.execute(text("ALTER TABLE caregivers ADD COLUMN education_verification_method VARCHAR(50)"))
                    if "education_qr_payload" not in cg_cols:
                        sync_conn.execute(text("ALTER TABLE caregivers ADD COLUMN education_qr_payload TEXT"))
                    if "education_verified_at" not in cg_cols:
                        sync_conn.execute(text("ALTER TABLE caregivers ADD COLUMN education_verified_at TIMESTAMP"))
                    if "education_rejection_reason" not in cg_cols:
                        sync_conn.execute(text("ALTER TABLE caregivers ADD COLUMN education_rejection_reason TEXT"))

                if "care_assignments" in table_names:
                    asg_cols = {c["name"] for c in inspector.get_columns("care_assignments")}
                    if "responseDeadline" not in asg_cols:
                        sync_conn.execute(text('ALTER TABLE care_assignments ADD COLUMN "responseDeadline" TIMESTAMP'))
                    if "declinedReason" not in asg_cols:
                        sync_conn.execute(text('ALTER TABLE care_assignments ADD COLUMN "declinedReason" TEXT'))
                    if "declinedAt" not in asg_cols:
                        sync_conn.execute(text('ALTER TABLE care_assignments ADD COLUMN "declinedAt" TIMESTAMP'))
                    if "expiredAt" not in asg_cols:
                        sync_conn.execute(text('ALTER TABLE care_assignments ADD COLUMN "expiredAt" TIMESTAMP'))

                if "care_tasks" in table_names:
                    task_cols = {c["name"] for c in inspector.get_columns("care_tasks")}
                    if "isSupervisorCorrection" not in task_cols:
                        sync_conn.execute(text('ALTER TABLE care_tasks ADD COLUMN "isSupervisorCorrection" BOOLEAN DEFAULT 0'))
                    if "correctionReason" not in task_cols:
                        sync_conn.execute(text('ALTER TABLE care_tasks ADD COLUMN "correctionReason" TEXT'))
                    if "correctedByUserId" not in task_cols:
                        sync_conn.execute(text('ALTER TABLE care_tasks ADD COLUMN "correctedByUserId" VARCHAR(36)'))
                    if "correctedAt" not in task_cols:
                        sync_conn.execute(text('ALTER TABLE care_tasks ADD COLUMN "correctedAt" TIMESTAMP'))
                    if "originalStatus" not in task_cols:
                        sync_conn.execute(text('ALTER TABLE care_tasks ADD COLUMN "originalStatus" VARCHAR(50)'))

                if "shifts" in table_names:
                    shift_cols = {c["name"] for c in inspector.get_columns("shifts")}
                    otp_cols = [
                        ('startOtp', 'VARCHAR(10)'),
                        ('startOtpExpiresAt', 'TIMESTAMP'),
                        ('startOtpUsed', 'BOOLEAN DEFAULT 0'),
                        ('startOtpAttempts', 'INTEGER DEFAULT 0'),
                        ('completionOtp', 'VARCHAR(10)'),
                        ('completionOtpExpiresAt', 'TIMESTAMP'),
                        ('completionOtpUsed', 'BOOLEAN DEFAULT 0'),
                        ('completionOtpAttempts', 'INTEGER DEFAULT 0'),
                    ]
                    for col_name, col_type in otp_cols:
                        if col_name not in shift_cols:
                            sync_conn.execute(text(f'ALTER TABLE shifts ADD COLUMN "{col_name}" {col_type}'))

                # SQLite indices
                if "elders" in table_names:
                    sync_conn.execute(text('CREATE INDEX IF NOT EXISTS ix_elders_preferred_hospital_id ON elders (preferred_hospital_id)'))
                if "caregivers" in table_names:
                    sync_conn.execute(text('CREATE INDEX IF NOT EXISTS ix_caregivers_education_verification_status ON caregivers (education_verification_status)'))

        await conn.run_sync(sync_migrations)