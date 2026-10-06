import pytest
import pytest_asyncio

from typing import AsyncGenerator

from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
)

from app.main import app
from app.core.database import Base, get_db
from app.core.security import create_access_token
from app.models.user import User


TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture(scope="function")
async def test_db() -> AsyncGenerator[AsyncSession, None]:
    """Provide an isolated in-memory SQLite database for each test."""

    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
    )

    async_session = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def client(
    test_db: AsyncSession,
) -> AsyncGenerator[AsyncClient, None]:
    """Provide an AsyncClient wired to the test database."""

    async def override_get_db():
        yield test_db

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="function")
async def sponsor_user(test_db: AsyncSession) -> User:
    """Create a default test sponsor user."""

    user = User(
        fullName="Suresh Kumar",
        phone="+919876543210",
        email="suresh.kumar@example.com",
        role="FAMILY_SPONSOR",
        authProvider="PHONE_OTP",
    )

    test_db.add(user)

    await test_db.commit()
    await test_db.refresh(user)

    return user


@pytest_asyncio.fixture(scope="function")
async def auth_headers(sponsor_user: User) -> dict:
    """Generate auth headers for default test sponsor."""

    token = create_access_token(
        {
            "sub": sponsor_user.id,
            "role": sponsor_user.role,
        }
    )

    return {
        "Authorization": f"Bearer {token}",
    }


# ============================================================
# Phase C — Caregiver Test Fixtures
# ============================================================

@pytest_asyncio.fixture(scope="function")
async def caregiver_user(test_db: AsyncSession) -> User:
    """Create a default test caregiver user."""

    user = User(
        fullName="Meenakshi Sundaram",
        phone="+919876500001",
        email="meenakshi.care@careconnect.in",
        role="CAREGIVER",
        dob="1990-05-15",
        gender="FEMALE",
        locality="Adyar",
        avatarUrl="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400",
        authProvider="PHONE_OTP",
    )

    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)

    return user


@pytest_asyncio.fixture(scope="function")
async def caregiver_headers(caregiver_user: User) -> dict:
    """Generate auth headers for caregiver."""

    token = create_access_token(
        {
            "sub": caregiver_user.id,
            "role": caregiver_user.role,
        }
    )

    return {
        "Authorization": f"Bearer {token}",
    }


# ============================================================
# Phase C — Operations Test Fixtures
# ============================================================

@pytest_asyncio.fixture(scope="function")
async def ops_user(test_db: AsyncSession) -> User:
    """Create a default test operations manager user."""

    user = User(
        fullName="Anand Rangarajan",
        phone="+919876599999",
        email="anand.ops@careconnect.in",
        role="OPS_MANAGER",
        authProvider="PHONE_OTP",
    )

    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)

    return user


@pytest_asyncio.fixture(scope="function")
async def ops_headers(ops_user: User) -> dict:
    """Generate auth headers for operations manager."""

    token = create_access_token(
        {
            "sub": ops_user.id,
            "role": ops_user.role,
        }
    )

    return {
        "Authorization": f"Bearer {token}",
    }