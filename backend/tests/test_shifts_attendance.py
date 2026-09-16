import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.elder import Elder
from app.models.location import ElderLocation
from app.models.shift import CareAssignment
from app.models.user import User

@pytest.mark.asyncio
async def test_seed_demo_scenario(client: AsyncClient):
    """Test seeding demo scenario creates elder, caregiver, and active shift."""
    res = await client.post("/api/v1/shifts/seed-demo")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "elderId" in data
    assert "shiftId" in data
    assert data["elderName"] == "Kalyani Ammal"

@pytest.mark.asyncio
async def test_check_in_within_geofence(
    client: AsyncClient,
    test_db: AsyncSession,
    sponsor_user: User,
    caregiver_user: User,
    caregiver_headers: dict
):
    """Test caregiver checking in within 200m geofence results in VERIFIED and ACTIVE shift."""
    now = datetime.now(timezone.utc)
    # Create elder with location in Adyar (13.0012, 80.2565)
    elder = Elder(
        familyId=sponsor_user.id,
        name="Kalyani Ammal",
        age=74,
        gender="FEMALE",
        personaStatus="SAVED"
    )
    test_db.add(elder)
    await test_db.flush()

    loc = ElderLocation(
        elderId=elder.id,
        addressLine1="Plot 12, Gandhi Nagar",
        locality="Adyar",
        city="Chennai",
        state="Tamil Nadu",
        postalCode="600020",
        latitude=13.0012,
        longitude=80.2565,
        verificationStatus="VERIFIED",
        serviceable=True
    )
    test_db.add(loc)
    await test_db.flush()

    shift = CareAssignment(
        elderId=elder.id,
        caregiverId=caregiver_user.id,
        shiftType="EIGHT_HOUR_DAY",
        status="SCHEDULED",
        scheduledStart=now,
        scheduledEnd=now + timedelta(hours=8),
        geofenceRadiusMeters=200.0
    )
    test_db.add(shift)
    await test_db.commit()

    # Check in 15 meters away (13.0013, 80.2566)
    checkin_payload = {
        "latitude": 13.0013,
        "longitude": 80.2566,
        "method": "GPS"
    }
    res = await client.post(
        f"/api/v1/shifts/{shift.id}/check-in",
        json=checkin_payload,
        headers=caregiver_headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["shiftStatus"] == "ACTIVE"
    assert data["verificationStatus"] == "VERIFIED"
    assert data["distanceMeters"] < 50.0

@pytest.mark.asyncio
async def test_check_in_out_of_range(
    client: AsyncClient,
    test_db: AsyncSession,
    sponsor_user: User,
    caregiver_user: User,
    caregiver_headers: dict
):
    """Test caregiver checking in 2km away triggers OUT_OF_RANGE and EXCEPTION status."""
    now = datetime.now(timezone.utc)
    elder = Elder(familyId=sponsor_user.id, name="Test Elder", age=70, gender="FEMALE")
    test_db.add(elder)
    await test_db.flush()

    loc = ElderLocation(
        elderId=elder.id,
        addressLine1="Adyar",
        locality="Adyar",
        postalCode="600020",
        latitude=13.0012,
        longitude=80.2565,
        verificationStatus="VERIFIED"
    )
    test_db.add(loc)
    await test_db.flush()

    shift = CareAssignment(
        elderId=elder.id,
        caregiverId=caregiver_user.id,
        shiftType="EIGHT_HOUR_DAY",
        status="SCHEDULED",
        scheduledStart=now,
        scheduledEnd=now + timedelta(hours=8)
    )
    test_db.add(shift)
    await test_db.commit()

    # Check in from Velachery (~3km away: 12.9759, 80.2212)
    res = await client.post(
        f"/api/v1/shifts/{shift.id}/check-in",
        json={"latitude": 12.9759, "longitude": 80.2212, "method": "GPS"},
        headers=caregiver_headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["verificationStatus"] == "OUT_OF_RANGE"
    assert data["shiftStatus"] == "EXCEPTION"
    assert data["distanceMeters"] > 1000.0

@pytest.mark.asyncio
async def test_check_in_otp_override(
    client: AsyncClient,
    test_db: AsyncSession,
    sponsor_user: User,
    caregiver_user: User,
    caregiver_headers: dict
):
    """Test household OTP override allows valid check-in even when out of GPS range."""
    now = datetime.now(timezone.utc)
    elder = Elder(familyId=sponsor_user.id, name="Test Elder", age=70, gender="FEMALE")
    test_db.add(elder)
    await test_db.flush()

    loc = ElderLocation(
        elderId=elder.id,
        addressLine1="Adyar",
        locality="Adyar",
        postalCode="600020",
        latitude=13.0012,
        longitude=80.2565,
        verificationStatus="VERIFIED"
    )
    test_db.add(loc)
    await test_db.flush()

    shift = CareAssignment(
        elderId=elder.id,
        caregiverId=caregiver_user.id,
        status="SCHEDULED",
        scheduledStart=now,
        scheduledEnd=now + timedelta(hours=8)
    )
    test_db.add(shift)
    await test_db.commit()

    # Check in with household OTP override
    res = await client.post(
        f"/api/v1/shifts/{shift.id}/check-in",
        json={"latitude": 12.9759, "longitude": 80.2212, "overrideCode": "654321"},
        headers=caregiver_headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["verificationStatus"] == "OTP_OVERRIDE"
    assert data["shiftStatus"] == "ACTIVE"

@pytest.mark.asyncio
async def test_check_out_completes_shift(
    client: AsyncClient,
    test_db: AsyncSession,
    sponsor_user: User,
    caregiver_user: User,
    caregiver_headers: dict
):
    """Test checking out marks shift CHECKED_OUT and records summary."""
    now = datetime.now(timezone.utc)
    elder = Elder(familyId=sponsor_user.id, name="Test Elder", age=70, gender="FEMALE")
    test_db.add(elder)
    await test_db.flush()

    shift = CareAssignment(
        elderId=elder.id,
        caregiverId=caregiver_user.id,
        status="ACTIVE",
        scheduledStart=now - timedelta(hours=8),
        scheduledEnd=now
    )
    test_db.add(shift)
    await test_db.commit()

    res = await client.post(
        f"/api/v1/shifts/{shift.id}/check-out",
        json={"summary": "Elder completed morning physiotherapy. Appetite good, vitals stable."},
        headers=caregiver_headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "CHECKED_OUT"
    assert "physiotherapy" in data["summary"]

@pytest.mark.asyncio
async def test_live_monitor(client: AsyncClient, test_db: AsyncSession):
    """Test operations live shift monitor returns formatted items."""
    res = await client.get("/api/v1/shifts/monitor")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)

