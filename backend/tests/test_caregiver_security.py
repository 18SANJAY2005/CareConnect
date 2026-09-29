import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.security import create_access_token
from app.models.elder import Elder
from app.models.location import ElderLocation
from app.models.shift import CareShift
from app.models.care_log import CareTask
from app.models.user import User


@pytest.fixture
async def second_caregiver_user(test_db: AsyncSession) -> User:
    """Create a second caregiver user to test cross-caregiver isolation."""
    user = User(
        fullName="Kavitha Murugan",
        phone="+919876500002",
        email="kavitha.care@careconnect.in",
        role="CAREGIVER",
        authProvider="PHONE_OTP",
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)
    return user


@pytest.fixture
async def second_caregiver_headers(second_caregiver_user: User) -> dict:
    token = create_access_token({"sub": second_caregiver_user.id, "role": second_caregiver_user.role})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def second_elder(test_db: AsyncSession, sponsor_user: User) -> Elder:
    """Create a separate elder for isolation testing."""
    elder = Elder(
        familyId=sponsor_user.id,
        name="Ramasamy Iyer",
        age=81,
        gender="MALE",
        personaStatus="SAVED",
    )
    test_db.add(elder)
    await test_db.commit()
    await test_db.refresh(elder)
    return elder


@pytest.mark.asyncio
async def test_shifts_current_requires_caregiver_role_and_no_fallback_leak(
    client: AsyncClient,
    test_db: AsyncSession,
    sponsor_user: User,
    auth_headers: dict,
    caregiver_user: User,
    caregiver_headers: dict,
    second_caregiver_user: User,
    second_caregiver_headers: dict,
):
    """
    Verify:
    1. Unauthenticated request to /shifts/current returns 401.
    2. FAMILY_SPONSOR user returns 403 Forbidden.
    3. Caregiver with NO assigned shift returns 200 with shift: None (NEVER leaks another caregiver's shift).
    """
    now = datetime.now(timezone.utc)

    # 1. Unauthenticated -> 401
    res_unauth = await client.get("/api/v1/shifts/current")
    assert res_unauth.status_code == 401

    # 2. Family sponsor token -> 403
    res_sponsor = await client.get("/api/v1/shifts/current", headers=auth_headers)
    assert res_sponsor.status_code == 403

    # Create an active shift for caregiver_user (Meenakshi)
    elder = Elder(familyId=sponsor_user.id, name="Kalyani Ammal", age=74, gender="FEMALE")
    test_db.add(elder)
    await test_db.flush()

    shift1 = CareShift(
        elderId=elder.id,
        caregiverId=caregiver_user.id,
        shiftType="EIGHT_HOUR_DAY",
        status="ACTIVE",
        scheduledStart=now,
        scheduledEnd=now + timedelta(hours=8),
        geofenceRadiusMeters=200.0,
    )
    test_db.add(shift1)
    await test_db.commit()

    # 3. second_caregiver_user (Kavitha) has NO shift assigned.
    # Must NOT fallback to Meenakshi's shift!
    res_cg2 = await client.get("/api/v1/shifts/current", headers=second_caregiver_headers)
    assert res_cg2.status_code == 200
    cg2_data = res_cg2.json()
    assert cg2_data["shift"] is None
    assert cg2_data["elder"] is None

    # 4. Caregiver 1 (Meenakshi) retrieves only their own shift
    res_cg1 = await client.get("/api/v1/shifts/current", headers=caregiver_headers)
    assert res_cg1.status_code == 200
    cg1_data = res_cg1.json()
    assert cg1_data["shift"] is not None
    assert cg1_data["shift"]["id"] == shift1.id
    assert cg1_data["shift"]["caregiverId"] == caregiver_user.id


@pytest.mark.asyncio
async def test_caregiver_cannot_checkin_or_checkout_another_shift(
    client: AsyncClient,
    test_db: AsyncSession,
    sponsor_user: User,
    caregiver_user: User,
    second_caregiver_headers: dict,
):
    """Verify that a caregiver cannot check into or check out of another caregiver's shift."""
    now = datetime.now(timezone.utc)
    elder = Elder(familyId=sponsor_user.id, name="Kalyani Ammal", age=74, gender="FEMALE")
    test_db.add(elder)
    await test_db.flush()

    shift = CareShift(
        elderId=elder.id,
        caregiverId=caregiver_user.id,
        shiftType="EIGHT_HOUR_DAY",
        status="SCHEDULED",
        scheduledStart=now,
        scheduledEnd=now + timedelta(hours=8),
    )
    test_db.add(shift)
    await test_db.commit()

    # Second caregiver attempts to check in -> 403
    res_checkin = await client.post(
        f"/api/v1/shifts/{shift.id}/check-in",
        json={"latitude": 13.0012, "longitude": 80.2565, "method": "GPS"},
        headers=second_caregiver_headers,
    )
    assert res_checkin.status_code == 403

    # Second caregiver attempts to check out -> 403
    res_checkout = await client.post(
        f"/api/v1/shifts/{shift.id}/check-out",
        json={"summary": "Unauthorized check-out attempt."},
        headers=second_caregiver_headers,
    )
    assert res_checkout.status_code == 403


@pytest.mark.asyncio
async def test_care_tasks_authorization_and_ownership(
    client: AsyncClient,
    test_db: AsyncSession,
    sponsor_user: User,
    caregiver_user: User,
    caregiver_headers: dict,
    second_caregiver_headers: dict,
    auth_headers: dict,
):
    """
    Verify:
    1. Unauthenticated access to /care-tasks/shift/{id} returns 401.
    2. Unauthorized caregiver attempting to access another shift's tasks returns 403.
    3. Unauthorized caregiver attempting to update another caregiver's task returns 403.
    4. Assigned caregiver updating their task succeeds.
    """
    now = datetime.now(timezone.utc)
    elder = Elder(familyId=sponsor_user.id, name="Kalyani Ammal", age=74, gender="FEMALE")
    test_db.add(elder)
    await test_db.flush()

    shift = CareShift(
        elderId=elder.id,
        caregiverId=caregiver_user.id,
        shiftType="EIGHT_HOUR_DAY",
        status="ACTIVE",
        scheduledStart=now,
        scheduledEnd=now + timedelta(hours=8),
    )
    test_db.add(shift)
    await test_db.flush()

    task = CareTask(
        shiftId=shift.id,
        elderId=elder.id,
        caregiverId=caregiver_user.id,
        timeOfDay="MORNING",
        category="MEAL",
        taskName="Morning Breakfast",
        status="PENDING",
    )
    test_db.add(task)
    await test_db.commit()

    # 1. Unauthenticated -> 401
    res_unauth = await client.get(f"/api/v1/care-tasks/shift/{shift.id}")
    assert res_unauth.status_code == 401

    # 2. Unauthorized caregiver access to shift tasks -> 403
    res_cg2_shift = await client.get(f"/api/v1/care-tasks/shift/{shift.id}", headers=second_caregiver_headers)
    assert res_cg2_shift.status_code == 403

    # 3. Unauthorized caregiver patch task -> 403
    res_cg2_patch = await client.patch(
        f"/api/v1/care-tasks/{task.id}",
        json={"status": "COMPLETED", "notes": "Hacked status"},
        headers=second_caregiver_headers,
    )
    assert res_cg2_patch.status_code == 403

    # 4. Assigned caregiver patch task -> 200
    res_cg1_patch = await client.patch(
        f"/api/v1/care-tasks/{task.id}",
        json={"status": "COMPLETED", "notes": "Breakfast completed smoothly."},
        headers=caregiver_headers,
    )
    assert res_cg1_patch.status_code == 200
    assert res_cg1_patch.json()["status"] == "COMPLETED"


@pytest.mark.asyncio
async def test_batch_task_sync_authorization_and_idempotency(
    client: AsyncClient,
    test_db: AsyncSession,
    sponsor_user: User,
    caregiver_user: User,
    caregiver_headers: dict,
    second_caregiver_headers: dict,
    auth_headers: dict,
):
    """
    Verify:
    1. Unauthenticated request to /care-tasks/batch returns 401.
    2. Family sponsor request returns 403.
    3. Caregiver attempting to batch-sync another caregiver's task is skipped/blocked.
    4. Offline queue idempotency ensures duplicated payloads do not duplicate updates.
    """
    now = datetime.now(timezone.utc)
    elder = Elder(familyId=sponsor_user.id, name="Kalyani Ammal", age=74, gender="FEMALE")
    test_db.add(elder)
    await test_db.flush()

    shift = CareShift(
        elderId=elder.id,
        caregiverId=caregiver_user.id,
        status="ACTIVE",
        scheduledStart=now,
        scheduledEnd=now + timedelta(hours=8),
    )
    test_db.add(shift)
    await test_db.flush()

    task = CareTask(
        shiftId=shift.id,
        elderId=elder.id,
        caregiverId=caregiver_user.id,
        timeOfDay="MORNING",
        category="WATER_INTAKE",
        taskName="Morning Water Intake",
        status="PENDING",
    )
    test_db.add(task)
    await test_db.commit()

    # 1. Unauthenticated -> 401
    res_unauth = await client.post("/api/v1/care-tasks/batch", json={"tasks": []})
    assert res_unauth.status_code == 401

    # 2. Family sponsor -> 403
    res_sponsor = await client.post("/api/v1/care-tasks/batch", json={"tasks": []}, headers=auth_headers)
    assert res_sponsor.status_code == 403

    # 3. Caregiver B attempts batch sync modifying Caregiver A's task -> skipped
    res_cg2 = await client.post(
        "/api/v1/care-tasks/batch",
        json={"tasks": [{"id": task.id, "status": "COMPLETED", "idempotencyKey": "cg2-key-1"}]},
        headers=second_caregiver_headers,
    )
    assert res_cg2.status_code == 200
    assert res_cg2.json()["processedCount"] == 0

    # 4. Caregiver A syncs batch -> processed
    res_cg1 = await client.post(
        "/api/v1/care-tasks/batch",
        json={"tasks": [{"id": task.id, "status": "COMPLETED", "details": {"waterMl": 300}, "idempotencyKey": "cg1-key-1"}]},
        headers=caregiver_headers,
    )
    assert res_cg1.status_code == 200
    assert res_cg1.json()["processedCount"] == 1

    # 5. Caregiver A re-sends same batch -> duplicate skipped (idempotency)
    res_cg1_dup = await client.post(
        "/api/v1/care-tasks/batch",
        json={"tasks": [{"id": task.id, "status": "COMPLETED", "details": {"waterMl": 300}, "idempotencyKey": "cg1-key-1"}]},
        headers=caregiver_headers,
    )
    assert res_cg1_dup.status_code == 200
    assert res_cg1_dup.json()["skippedDuplicateCount"] == 1


@pytest.mark.asyncio
async def test_vitals_media_and_sos_authorization_checks(
    client: AsyncClient,
    test_db: AsyncSession,
    sponsor_user: User,
    second_elder: Elder,
    caregiver_user: User,
    caregiver_headers: dict,
):
    """
    Verify:
    1. Caregiver cannot record vitals for an unassigned elder -> 403.
    2. Caregiver cannot upload care media for an unassigned elder -> 403.
    3. Caregiver cannot trigger SOS for an unassigned elder -> 403.
    """
    # Caregiver has NO shift/assignment for second_elder (Ramasamy Iyer)

    # 1. Vitals attempt on unauthorized elder -> 403
    vital_payload = {
        "elderId": second_elder.id,
        "systolicBp": 120,
        "diastolicBp": 80,
        "pulse": 72,
    }
    res_vital = await client.post("/api/v1/vitals/", json=vital_payload, headers=caregiver_headers)
    assert res_vital.status_code == 403

    # 2. Media attempt on unauthorized elder -> 403
    media_payload = {
        "elderId": second_elder.id,
        "mediaUrl": "https://example.com/photo.jpg",
        "mediaType": "PHOTO",
        "category": "MEAL",
    }
    res_media = await client.post("/api/v1/media/upload", json=media_payload, headers=caregiver_headers)
    assert res_media.status_code == 403

    # 3. SOS attempt on unauthorized elder -> 403
    sos_payload = {
        "elderId": second_elder.id,
        "notes": "Unauthorized SOS attempt",
    }
    res_sos = await client.post("/api/v1/incidents/sos", json=sos_payload, headers=caregiver_headers)
    assert res_sos.status_code == 403


@pytest.mark.asyncio
async def test_caregiver_provisioning_flow(
    client: AsyncClient,
    test_db: AsyncSession,
    auth_headers: dict,
    ops_headers: dict,
):
    """
    Verify:
    1. Public / family sponsor cannot access caregiver provisioning -> 403.
    2. Ops manager can provision a new caregiver account -> 201.
    3. Public OTP login with an unknown number defaults to FAMILY_SPONSOR.
    4. OTP login with provisioned caregiver preserves CAREGIVER role.
    """
    # 1. Family sponsor -> 403
    res_sponsor = await client.post(
        "/api/v1/caregivers/provision",
        json={"fullName": "Lakshmi Narayanan", "phone": "+919876500099"},
        headers=auth_headers,
    )
    assert res_sponsor.status_code == 403

    # 2. Ops manager -> 201
    res_ops = await client.post(
        "/api/v1/caregivers/provision",
        json={"fullName": "Lakshmi Narayanan", "phone": "+919876500099", "email": "lakshmi@careconnect.in"},
        headers=ops_headers,
    )
    assert res_ops.status_code == 201
    assert res_ops.json()["role"] == "CAREGIVER"

    # 3. Logging in via OTP with provisioned phone preserves CAREGIVER role
    login_res = await client.post(
        "/api/auth/otp/verify",
        json={"phone": "+919876500099", "otp": "123456"},
    )
    assert login_res.status_code == 200
    assert login_res.json()["user"]["role"] == "CAREGIVER"

    # 4. Public OTP signup with an unprovisioned phone defaults to FAMILY_SPONSOR
    public_res = await client.post(
        "/api/auth/otp/verify",
        json={"phone": "+919999988888", "otp": "123456", "fullName": "New Public User"},
    )
    assert public_res.status_code == 200
    assert public_res.json()["user"]["role"] == "FAMILY_SPONSOR"


@pytest.mark.asyncio
async def test_demo_seed_restricted_in_production(
    client: AsyncClient,
    monkeypatch,
):
    """Verify that /shifts/seed-demo is blocked with 403 when ENVIRONMENT is production."""
    # Under test/development, seed-demo works
    res_dev = await client.post("/api/v1/shifts/seed-demo")
    assert res_dev.status_code == 200

    # In production, seed-demo is blocked
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    res_prod = await client.post("/api/v1/shifts/seed-demo")
    assert res_prod.status_code == 403
    assert "restricted" in res_prod.json()["detail"].lower()
