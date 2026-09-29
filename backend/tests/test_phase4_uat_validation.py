import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.elder import Elder
from app.models.caregiver import Caregiver
from app.models.assignment import CareAssignment
from app.models.shift import CareShift, AttendanceLog
from app.models.location import ElderLocation
from app.core.security import create_access_token


# ============================================================================
# PHASE 1 & 2: CARE DURATION BUSINESS RULE TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_care_duration_8_hours(test_db: AsyncSession, client: AsyncClient, sponsor_user: User, caregiver_user: User, caregiver_headers: dict):
    """Test A: 8 Hours care duration is preserved from elder preference to CareShift."""
    cg = Caregiver(
        id=101,
        full_name=caregiver_user.fullName,
        headline="Experienced Elder Care Attendant",
        locality="Besant Nagar, Chennai",
        phone=caregiver_user.phone,
        status="AVAILABLE"
    )
    elder = Elder(
        id="elder-8h-test",
        familyId=sponsor_user.id,
        name="Lakshmi Ammal",
        shiftPreference="EIGHT_HOUR_DAY",
        dailyRoutine={"wakeTime": "06:00", "bedTime": "21:00", "shiftType": "EIGHT_HOUR_DAY"}
    )
    loc = ElderLocation(
        elderId=elder.id,
        addressLine1="12 Besant Ave",
        locality="Besant Nagar",
        city="Chennai",
        postalCode="600090",
        latitude=13.0001,
        longitude=80.2667
    )
    asg = CareAssignment(
        elder_id=elder.id,
        caregiver_id=cg.id,
        sponsor_id=sponsor_user.id,
        shift_type="EIGHT_HOUR_DAY",
        status="SERVICE_CONFIRMED"
    )
    test_db.add_all([cg, elder, loc, asg])
    await test_db.commit()

    # Caregiver calls /shifts/current
    res = await client.get("/api/shifts/current", headers=caregiver_headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["shift"] is not None
    assert data["shift"]["shiftType"] == "EIGHT_HOUR_DAY"
    
    start = datetime.fromisoformat(data["shift"]["scheduledStart"])
    end = datetime.fromisoformat(data["shift"]["scheduledEnd"])
    duration_hours = (end - start).total_seconds() / 3600.0
    assert duration_hours == 8.0, f"Expected 8 hours, got {duration_hours}"


@pytest.mark.asyncio
async def test_care_duration_12_hours(test_db: AsyncSession, client: AsyncClient, sponsor_user: User, caregiver_user: User, caregiver_headers: dict):
    """Test B: 12 Hours care duration is preserved without silent conversion."""
    cg = Caregiver(
        id=102,
        full_name=caregiver_user.fullName,
        headline="Dementia Care Specialist",
        locality="Adyar, Chennai",
        phone=caregiver_user.phone,
        status="AVAILABLE"
    )
    elder = Elder(
        id="elder-12h-test",
        familyId=sponsor_user.id,
        name="Sundaram Ramaswamy",
        shiftPreference="TWELVE_HOUR_DAY_NIGHT",
        dailyRoutine={"wakeTime": "06:00", "bedTime": "21:00", "shiftType": "TWELVE_HOUR_DAY_NIGHT"}
    )
    loc = ElderLocation(
        elderId=elder.id,
        addressLine1="14 Gandhi Road",
        locality="Adyar",
        city="Chennai",
        postalCode="600020",
        latitude=13.0012,
        longitude=80.2565
    )
    asg = CareAssignment(
        elder_id=elder.id,
        caregiver_id=cg.id,
        sponsor_id=sponsor_user.id,
        shift_type="TWELVE_HOUR_DAY_NIGHT",
        status="SERVICE_CONFIRMED"
    )
    test_db.add_all([cg, elder, loc, asg])
    await test_db.commit()

    res = await client.get("/api/shifts/current", headers=caregiver_headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["shift"] is not None
    assert data["shift"]["shiftType"] == "TWELVE_HOUR_DAY_NIGHT"
    
    start = datetime.fromisoformat(data["shift"]["scheduledStart"])
    end = datetime.fromisoformat(data["shift"]["scheduledEnd"])
    duration_hours = (end - start).total_seconds() / 3600.0
    assert duration_hours == 12.0, f"Expected 12 hours, got {duration_hours}"


@pytest.mark.asyncio
async def test_care_duration_24_hours(test_db: AsyncSession, client: AsyncClient, sponsor_user: User, caregiver_user: User, caregiver_headers: dict):
    """Test C: 24 Hours live-in care duration is preserved correctly."""
    cg = Caregiver(
        id=103,
        full_name=caregiver_user.fullName,
        headline="Palliative Care Attendant",
        locality="Mylapore, Chennai",
        phone=caregiver_user.phone,
        status="AVAILABLE"
    )
    elder = Elder(
        id="elder-24h-test",
        familyId=sponsor_user.id,
        name="Parvathi Ammal",
        shiftPreference="TWENTY_FOUR_HOUR_LIVE_IN",
        dailyRoutine={"wakeTime": "06:00", "bedTime": "21:00", "shiftType": "TWENTY_FOUR_HOUR_LIVE_IN"}
    )
    loc = ElderLocation(
        elderId=elder.id,
        addressLine1="22 South Mada St",
        locality="Mylapore",
        city="Chennai",
        postalCode="600004",
        latitude=13.0333,
        longitude=80.2685
    )
    asg = CareAssignment(
        elder_id=elder.id,
        caregiver_id=cg.id,
        sponsor_id=sponsor_user.id,
        shift_type="TWENTY_FOUR_HOUR_LIVE_IN",
        status="SERVICE_CONFIRMED"
    )
    test_db.add_all([cg, elder, loc, asg])
    await test_db.commit()

    res = await client.get("/api/shifts/current", headers=caregiver_headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["shift"] is not None
    assert data["shift"]["shiftType"] == "TWENTY_FOUR_HOUR_LIVE_IN"
    
    start = datetime.fromisoformat(data["shift"]["scheduledStart"])
    end = datetime.fromisoformat(data["shift"]["scheduledEnd"])
    duration_hours = (end - start).total_seconds() / 3600.0
    assert duration_hours == 24.0, f"Expected 24 hours, got {duration_hours}"


@pytest.mark.asyncio
async def test_care_duration_flexible(test_db: AsyncSession, client: AsyncClient, sponsor_user: User, caregiver_user: User, caregiver_headers: dict):
    """Test D: Flexible shift timing preserves custom From/To hours."""
    cg = Caregiver(
        id=104,
        full_name=caregiver_user.fullName,
        headline="Flexible Hours Attendant",
        locality="RA Puram, Chennai",
        phone=caregiver_user.phone,
        status="AVAILABLE"
    )
    elder = Elder(
        id="elder-flex-test",
        familyId=sponsor_user.id,
        name="Natarajan Swamy",
        shiftPreference="FLEXIBLE",
        dailyRoutine={
            "wakeTime": "07:00",
            "bedTime": "21:00",
            "shiftType": "FLEXIBLE",
            "preferredStartTime": "10:30",
            "preferredEndTime": "16:30"
        }
    )
    loc = ElderLocation(
        elderId=elder.id,
        addressLine1="5 Canal Bank",
        locality="RA Puram",
        city="Chennai",
        postalCode="600028",
        latitude=13.0234,
        longitude=80.2576
    )
    asg = CareAssignment(
        elder_id=elder.id,
        caregiver_id=cg.id,
        sponsor_id=sponsor_user.id,
        shift_type="FLEXIBLE",
        status="SERVICE_CONFIRMED"
    )
    test_db.add_all([cg, elder, loc, asg])
    await test_db.commit()

    res = await client.get("/api/shifts/current", headers=caregiver_headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["shift"] is not None
    assert data["shift"]["shiftType"] == "FLEXIBLE"
    
    start = datetime.fromisoformat(data["shift"]["scheduledStart"])
    end = datetime.fromisoformat(data["shift"]["scheduledEnd"])
    assert start.hour == 10 and start.minute == 30, f"Expected start 10:30, got {start.strftime('%H:%M')}"
    assert end.hour == 16 and end.minute == 30, f"Expected end 16:30, got {end.strftime('%H:%M')}"
    duration_hours = (end - start).total_seconds() / 3600.0
    assert duration_hours == 6.0


# ============================================================================
# PHASE 3: SHIFT AUTO-BRIDGE VALIDATION
# ============================================================================

@pytest.mark.asyncio
async def test_auto_bridge_no_duplicate_shift(test_db: AsyncSession, client: AsyncClient, sponsor_user: User, caregiver_user: User, caregiver_headers: dict):
    """Verify auto-bridge does not create duplicate shifts on repeated calls."""
    cg = Caregiver(
        id=201,
        full_name=caregiver_user.fullName,
        headline="Senior Attendant",
        locality="Adyar, Chennai",
        phone=caregiver_user.phone,
        status="AVAILABLE"
    )
    elder = Elder(
        id="elder-dup-test",
        familyId=sponsor_user.id,
        name="Gomathi Ammal",
        shiftPreference="EIGHT_HOUR_DAY"
    )
    asg = CareAssignment(
        elder_id=elder.id,
        caregiver_id=cg.id,
        sponsor_id=sponsor_user.id,
        shift_type="EIGHT_HOUR_DAY",
        status="SERVICE_CONFIRMED"
    )
    test_db.add_all([cg, elder, asg])
    await test_db.commit()

    # Call 1
    res1 = await client.get("/api/shifts/current", headers=caregiver_headers)
    assert res1.status_code == 200
    shift_id_1 = res1.json()["shift"]["id"]

    # Call 2
    res2 = await client.get("/api/shifts/current", headers=caregiver_headers)
    assert res2.status_code == 200
    shift_id_2 = res2.json()["shift"]["id"]

    assert shift_id_1 == shift_id_2

    # Check total shifts in DB
    shifts_res = await test_db.execute(select(CareShift).where(CareShift.elderId == elder.id))
    all_shifts = shifts_res.scalars().all()
    assert len(all_shifts) == 1


@pytest.mark.asyncio
async def test_auto_bridge_inactive_assignment_ignored(test_db: AsyncSession, client: AsyncClient, sponsor_user: User, caregiver_user: User, caregiver_headers: dict):
    """Verify inactive / cancelled assignment does NOT auto-create shift."""
    cg = Caregiver(
        id=202,
        full_name=caregiver_user.fullName,
        headline="Senior Attendant",
        locality="Adyar, Chennai",
        phone=caregiver_user.phone,
        status="AVAILABLE"
    )
    elder = Elder(
        id="elder-inactive-test",
        familyId=sponsor_user.id,
        name="Radha Raman",
        shiftPreference="EIGHT_HOUR_DAY"
    )
    asg = CareAssignment(
        elder_id=elder.id,
        caregiver_id=cg.id,
        sponsor_id=sponsor_user.id,
        shift_type="EIGHT_HOUR_DAY",
        status="CANCELLED"
    )
    test_db.add_all([cg, elder, asg])
    await test_db.commit()

    res = await client.get("/api/shifts/current", headers=caregiver_headers)
    assert res.status_code == 200
    assert res.json()["shift"] is None


@pytest.mark.asyncio
async def test_auto_bridge_checked_out_shift_preserved(test_db: AsyncSession, client: AsyncClient, sponsor_user: User, caregiver_user: User, caregiver_headers: dict):
    """Verify checked-out shift is preserved and not replaced by a new active shift."""
    cg = Caregiver(
        id=203,
        full_name=caregiver_user.fullName,
        headline="Senior Attendant",
        locality="Adyar, Chennai",
        phone=caregiver_user.phone,
        status="AVAILABLE"
    )
    elder = Elder(
        id="elder-co-test",
        familyId=sponsor_user.id,
        name="Vasudevan Nair",
        shiftPreference="EIGHT_HOUR_DAY"
    )
    asg = CareAssignment(
        elder_id=elder.id,
        caregiver_id=cg.id,
        sponsor_id=sponsor_user.id,
        shift_type="EIGHT_HOUR_DAY",
        status="SERVICE_CONFIRMED"
    )
    now = datetime.now(timezone.utc)
    existing_shift = CareShift(
        id="shift-checked-out-today",
        elderId=elder.id,
        caregiverId=caregiver_user.id,
        shiftType="EIGHT_HOUR_DAY",
        status="CHECKED_OUT",
        scheduledStart=now.replace(hour=8, minute=0, second=0, microsecond=0),
        scheduledEnd=now.replace(hour=16, minute=0, second=0, microsecond=0)
    )
    test_db.add_all([cg, elder, asg, existing_shift])
    await test_db.commit()

    res = await client.get("/api/shifts/current", headers=caregiver_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["shift"]["id"] == "shift-checked-out-today"
    assert data["shift"]["status"] == "CHECKED_OUT"


# ============================================================================
# PHASE 9: NEGATIVE & SECURITY BOUNDARY TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_security_family_user_cannot_access_caregiver_endpoints(client: AsyncClient, auth_headers: dict):
    """Family user (FAMILY_SPONSOR) cannot call caregiver /shifts/current."""
    res = await client.get("/api/shifts/current", headers=auth_headers)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_security_caregiver_cannot_checkin_other_shift(test_db: AsyncSession, client: AsyncClient, caregiver_headers: dict):
    """Caregiver cannot check in to another caregiver's shift."""
    other_cg = User(
        fullName="Other Caregiver",
        phone="+919876500099",
        email="other@careconnect.in",
        role="CAREGIVER",
        authProvider="PHONE_OTP"
    )
    test_db.add(other_cg)
    await test_db.flush()

    now = datetime.now(timezone.utc)
    other_shift = CareShift(
        id="shift-unauthorized-cg",
        elderId="elder-x",
        caregiverId=other_cg.id,
        shiftType="EIGHT_HOUR_DAY",
        status="SCHEDULED",
        scheduledStart=now,
        scheduledEnd=now + timedelta(hours=8)
    )
    test_db.add(other_shift)
    await test_db.commit()

    res = await client.post(
        f"/api/shifts/{other_shift.id}/check-in",
        json={"latitude": 13.0012, "longitude": 80.2565},
        headers=caregiver_headers
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_security_expired_or_invalid_token(client: AsyncClient):
    """Invalid or corrupted token results in 401."""
    res = await client.get("/api/shifts/current", headers={"Authorization": "Bearer invalid.jwt.token"})
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_security_invalid_otp(client: AsyncClient):
    """Invalid OTP submission results in 400 Bad Request."""
    res = await client.post("/api/auth/otp/verify", json={
        "phone": "+919876543210",
        "otp": "000000"
    })
    assert res.status_code == 400


# ============================================================================
# PHASE 4-8: COMPLETE END-TO-END WORKFLOW INTEGRATION TEST
# ============================================================================

@pytest.mark.asyncio
async def test_full_e2e_family_to_caregiver_to_ops(
    test_db: AsyncSession,
    client: AsyncClient,
    sponsor_user: User,
    auth_headers: dict,
    caregiver_user: User,
    caregiver_headers: dict,
    ops_user: User,
    ops_headers: dict
):
    """
    Test entire flow across Family -> Caregiver -> Operations without manual DB intervention.
    """
    # 1. FAMILY: Create elder
    e_res = await client.post("/api/elders", json={
        "name": "Kalyani Ammal",
        "age": 75,
        "gender": "FEMALE",
        "dateOfBirth": "1951-03-15"
    }, headers=auth_headers)
    assert e_res.status_code == 201
    elder_id = e_res.json()["id"]

    # 2. FAMILY: Verify & persist location
    loc_res = await client.patch(f"/api/elders/{elder_id}/location", json={
        "addressLine1": "14 Gandhi Road",
        "locality": "Adyar",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "postalCode": "600020",
        "latitude": 13.0012,
        "longitude": 80.2565
    }, headers=auth_headers)
    assert loc_res.status_code == 200

    # 3. FAMILY: Save preferences with 12-Hour Care
    pref_res = await client.patch(f"/api/elders/{elder_id}", json={
        "mobilityLevel": "ASSISTED_WALKER",
        "careRequirements": ["Medication Observation", "Mobility Assistance"],
        "dietaryPreferences": ["South Indian Vegetarian"],
        "primaryLanguage": "Tamil",
        "languages": ["Tamil", "English"],
        "shiftPreference": "TWELVE_HOUR_DAY_NIGHT",
        "personaStatus": "SAVED"
    }, headers=auth_headers)
    assert pref_res.status_code == 200

    # Ensure caregiver directory record exists for Meenakshi
    cg_dir = Caregiver(
        id=301,
        full_name=caregiver_user.fullName,
        headline="Experienced Elder Care Attendant",
        locality="Adyar, Chennai",
        phone=caregiver_user.phone,
        status="AVAILABLE"
    )
    test_db.add(cg_dir)
    await test_db.commit()

    # 4. FAMILY: Select Caregiver & Confirm Service
    asg_res = await client.post("/api/assignments", json={
        "elder_id": elder_id,
        "caregiver_id": cg_dir.id,
        "sponsor_id": sponsor_user.id,
        "shift_type": "TWELVE_HOUR_DAY_NIGHT"
    })
    assert asg_res.status_code == 200
    assignment_id = asg_res.json()["id"]

    # Update assignment to ACTIVE or SERVICE_CONFIRMED to simulate confirmation
    asg_db = await test_db.get(CareAssignment, assignment_id)
    asg_db.status = "SERVICE_CONFIRMED"
    await test_db.commit()

    # 5. CAREGIVER: Fetch current shift (triggers auto-bridge)
    cg_shift_res = await client.get("/api/shifts/current", headers=caregiver_headers)
    assert cg_shift_res.status_code == 200
    shift_data = cg_shift_res.json()["shift"]
    assert shift_data is not None
    assert shift_data["shiftType"] == "TWELVE_HOUR_DAY_NIGHT"
    shift_id = shift_data["id"]

    # 6. CAREGIVER: Check-in with GPS
    ci_res = await client.post(
        f"/api/shifts/{shift_id}/check-in",
        json={"latitude": 13.0012, "longitude": 80.2565},
        headers=caregiver_headers
    )
    assert ci_res.status_code == 200
    assert ci_res.json()["verificationStatus"] == "VERIFIED"

    # 7. CAREGIVER: Fetch tasks & complete a task
    tasks_res = await client.get(f"/api/care-tasks/shift/{shift_id}", headers=caregiver_headers)
    assert tasks_res.status_code == 200
    tasks = tasks_res.json()
    assert len(tasks) > 0
    first_task = tasks[0]

    update_task_res = await client.patch(
        f"/api/care-tasks/{first_task['id']}",
        json={"status": "COMPLETED", "caregiverNotes": "Completed morning vitals and breakfast."},
        headers=caregiver_headers
    )
    assert update_task_res.status_code == 200
    assert update_task_res.json()["status"] == "COMPLETED"

    # 8. CAREGIVER: Record Vitals
    vitals_res = await client.post(
        "/api/vitals/",
        json={
            "elderId": elder_id,
            "shiftId": shift_id,
            "systolicBp": 120,
            "diastolicBp": 80,
            "pulse": 72,
            "temperatureCelsius": 36.9,
            "bloodGlucose": 110.0,
            "notes": "Normal morning readings"
        },
        headers=caregiver_headers
    )
    assert vitals_res.status_code == 201

    # 9. CAREGIVER: Raise SOS Incident
    sos_res = await client.post(
        "/api/incidents/sos",
        json={
            "elderId": elder_id,
            "shiftId": shift_id,
            "latitude": 13.0012,
            "longitude": 80.2565,
            "notes": "Mild slip near bathroom, elder assisted safely, no visible injuries."
        },
        headers=caregiver_headers
    )
    assert sos_res.status_code == 201
    incident_id = sos_res.json()["id"]

    # 10. OPERATIONS: View Live Shifts & Incidents Desk
    live_res = await client.get("/api/shifts/monitor", headers=ops_headers)
    assert live_res.status_code == 200
    assert len(live_res.json()) >= 1

    ops_incidents_res = await client.get("/api/incidents/desk", headers=ops_headers)
    assert ops_incidents_res.status_code == 200
    incidents = ops_incidents_res.json()
    assert any(inc["id"] == incident_id for inc in incidents)

    # 11. OPERATIONS: Acknowledge & Resolve Incident
    ack_res = await client.post(
        f"/api/incidents/{incident_id}/acknowledge",
        headers=ops_headers
    )
    assert ack_res.status_code == 200
    assert ack_res.json()["status"] == "ACKNOWLEDGED"

    resolve_res = await client.post(
        f"/api/incidents/{incident_id}/resolve",
        json={"resolutionNotes": "Supervisor checked via audio call. Elder resting comfortably."},
        headers=ops_headers
    )
    assert resolve_res.status_code == 200
    assert resolve_res.json()["status"] == "RESOLVED"

    # 12. CAREGIVER: Check-out
    co_res = await client.post(
        f"/api/shifts/{shift_id}/check-out",
        json={
            "latitude": 13.0012,
            "longitude": 80.2565,
            "summary": "Shift completed. All tasks done and evening medicines administered."
        },
        headers=caregiver_headers
    )
    assert co_res.status_code == 200
    assert co_res.json()["status"] == "CHECKED_OUT"

    # 13. FAMILY: View timeline / elder shift status
    fam_status_res = await client.get(f"/api/shifts/elder/{elder_id}", headers=auth_headers)
    assert fam_status_res.status_code == 200
    fam_data = fam_status_res.json()
    assert fam_data["status"] == "CHECKED_OUT"
    assert fam_data["shiftType"] == "TWELVE_HOUR_DAY_NIGHT"

    fam_vitals_res = await client.get(f"/api/vitals/elder/{elder_id}", headers=auth_headers)
    assert fam_vitals_res.status_code == 200
    assert len(fam_vitals_res.json()) >= 1
