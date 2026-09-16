import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.elder import Elder
from app.models.shift import CareAssignment
from app.models.user import User

@pytest.fixture
async def setup_care_environment(test_db: AsyncSession, sponsor_user: User, caregiver_user: User):
    now = datetime.now(timezone.utc)
    elder = Elder(familyId=sponsor_user.id, name="Kalyani Ammal", age=74, gender="FEMALE")
    test_db.add(elder)
    await test_db.flush()

    shift = CareAssignment(
        elderId=elder.id,
        caregiverId=caregiver_user.id,
        status="ACTIVE",
        scheduledStart=now,
        scheduledEnd=now + timedelta(hours=8)
    )
    test_db.add(shift)
    await test_db.commit()
    await test_db.refresh(elder)
    await test_db.refresh(shift)
    return {"elder": elder, "shift": shift}

@pytest.mark.asyncio
async def test_care_tasks_flow(
    client: AsyncClient,
    caregiver_headers: dict,
    setup_care_environment: dict
):
    """Test retrieving checklist, completing a task, and checking family care timeline."""
    shift = setup_care_environment["shift"]
    elder = setup_care_environment["elder"]

    # Retrieve shift tasks
    res = await client.get(f"/api/v1/care-tasks/shift/{shift.id}")
    assert res.status_code == 200
    tasks = res.json()
    # At least morning/afternoon/evening/night activities created or empty before ensure
    if not tasks:
        # Trigger current shift endpoint to populate tasks
        await client.get("/api/v1/shifts/current", headers=caregiver_headers)
        res = await client.get(f"/api/v1/care-tasks/shift/{shift.id}")
        tasks = res.json()

    assert len(tasks) > 0
    first_task = tasks[0]

    # Update first task to COMPLETED with details
    update_res = await client.patch(
        f"/api/v1/care-tasks/{first_task['id']}",
        json={
            "status": "COMPLETED",
            "details": {"waterMl": 300, "taken": True},
            "notes": "Elder drank full glass of warm water.",
            "idempotencyKey": "test-key-1"
        },
        headers=caregiver_headers
    )
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "COMPLETED"

    # Family timeline check
    timeline_res = await client.get(f"/api/v1/care-tasks/elder/{elder.id}/timeline")
    assert timeline_res.status_code == 200
    timeline = timeline_res.json()
    assert len(timeline) >= 1
    assert timeline[0]["taskName"] == first_task["taskName"]

@pytest.mark.asyncio
async def test_vitals_normal_and_trends(
    client: AsyncClient,
    caregiver_headers: dict,
    setup_care_environment: dict
):
    """Test recording normal vitals and retrieving chart trends."""
    elder = setup_care_environment["elder"]
    shift = setup_care_environment["shift"]

    payload = {
        "elderId": elder.id,
        "shiftId": shift.id,
        "systolicBp": 120,
        "diastolicBp": 80,
        "pulse": 72,
        "bloodGlucose": 105.0,
        "glucoseContext": "FASTING",
        "temperatureCelsius": 36.8,
        "source": "MANUAL",
        "notes": "Elder was calm and seated for 5 minutes prior."
    }

    res = await client.post("/api/v1/vitals/", json=payload, headers=caregiver_headers)
    assert res.status_code == 201
    vital = res.json()
    assert vital["isAbnormal"] is False
    assert vital["alertSeverity"] == "NORMAL"

    # Fetch trends
    trend_res = await client.get(f"/api/v1/vitals/elder/{elder.id}/trends")
    assert trend_res.status_code == 200
    trend_data = trend_res.json()
    assert len(trend_data["bpTrend"]) >= 1
    assert trend_data["latestReading"]["systolicBp"] == 120

@pytest.mark.asyncio
async def test_vitals_abnormal_operational_alert(
    client: AsyncClient,
    caregiver_headers: dict,
    ops_headers: dict,
    setup_care_environment: dict
):
    """Test elevated BP generates operational warning alert without diagnostic claims."""
    elder = setup_care_environment["elder"]

    payload = {
        "elderId": elder.id,
        "systolicBp": 165,
        "diastolicBp": 102,
        "pulse": 98,
        "notes": "Elder reported feeling slightly tired."
    }

    res = await client.post("/api/v1/vitals/", json=payload, headers=caregiver_headers)
    assert res.status_code == 201
    vital = res.json()
    assert vital["isAbnormal"] is True
    assert vital["alertSeverity"] in ["WARNING", "CRITICAL"]

    # Operations alerts queue
    alerts_res = await client.get("/api/v1/vitals/alerts")
    assert alerts_res.status_code == 200
    alerts = alerts_res.json()
    assert any(a["id"] == vital["id"] for a in alerts)

    # Acknowledge alert
    ack_res = await client.post(f"/api/v1/vitals/alerts/{vital['id']}/acknowledge", headers=ops_headers)
    assert ack_res.status_code == 200
    assert ack_res.json()["success"] is True

@pytest.mark.asyncio
async def test_vitals_invalid_physiological_bounds(
    client: AsyncClient,
    caregiver_headers: dict,
    setup_care_environment: dict
):
    """Test rejecting physiologically impossible readings safely."""
    elder = setup_care_environment["elder"]

    # Systolic cannot be <= Diastolic
    res = await client.post(
        "/api/v1/vitals/",
        json={"elderId": elder.id, "systolicBp": 80, "diastolicBp": 120},
        headers=caregiver_headers
    )
    assert res.status_code == 400
    assert "greater than" in res.json()["detail"]

    # Impossible pulse
    res2 = await client.post(
        "/api/v1/vitals/",
        json={"elderId": elder.id, "pulse": 350},
        headers=caregiver_headers
    )
    assert res2.status_code == 400

@pytest.mark.asyncio
async def test_sos_and_incident_desk_lifecycle(
    client: AsyncClient,
    caregiver_headers: dict,
    ops_headers: dict,
    setup_care_environment: dict
):
    """Test complete P1 SOS lifecycle: Trigger -> Acknowledge -> Escalate -> Resolve."""
    elder = setup_care_environment["elder"]
    shift = setup_care_environment["shift"]

    # 1. Caregiver triggers SOS
    sos_payload = {
        "elderId": elder.id,
        "shiftId": shift.id,
        "latitude": 13.0012,
        "longitude": 80.2565,
        "notes": "Elder experienced sudden dizziness and loss of balance."
    }
    sos_res = await client.post("/api/v1/incidents/sos", json=sos_payload, headers=caregiver_headers)
    assert sos_res.status_code == 201
    incident = sos_res.json()
    assert incident["priority"] == "P1"
    assert incident["status"] == "OPEN"
    assert len(incident["timeline"]) >= 1

    # 2. Operations Incident Desk
    desk_res = await client.get("/api/v1/incidents/desk")
    assert desk_res.status_code == 200
    assert any(i["id"] == incident["id"] for i in desk_res.json())

    # 3. Operations acknowledges
    ack_res = await client.post(f"/api/v1/incidents/{incident['id']}/acknowledge", headers=ops_headers)
    assert ack_res.status_code == 200
    assert ack_res.json()["status"] == "ACKNOWLEDGED"

    # 4. Operations escalates
    esc_res = await client.post(
        f"/api/v1/incidents/{incident['id']}/escalate",
        json={"actionTaken": "Contacted Apollo Telehealth physician and alerted primary sponsor Suresh Kumar."},
        headers=ops_headers
    )
    assert esc_res.status_code == 200
    assert esc_res.json()["status"] == "ESCALATING"

    # 5. Operations resolves
    res_res = await client.post(
        f"/api/v1/incidents/{incident['id']}/resolve",
        json={"resolutionNotes": "Physician evaluated vitals via video. Elder rested, blood sugar normalized, sponsor present."},
        headers=ops_headers
    )
    assert res_res.status_code == 200
    resolved_inc = res_res.json()
    assert resolved_inc["status"] == "RESOLVED"
    assert len(resolved_inc["timeline"]) == 4

@pytest.mark.asyncio
async def test_coordinator_chat_and_media(
    client: AsyncClient,
    caregiver_headers: dict,
    auth_headers: dict,
    setup_care_environment: dict
):
    """Test coordinator messaging and daily care media updates."""
    elder = setup_care_environment["elder"]

    # Send chat message from family sponsor
    msg_res = await client.post(
        "/api/v1/chat/send",
        json={
            "elderId": elder.id,
            "channel": "FAMILY_COORDINATOR",
            "content": "Hello coordinator, please confirm if today's physiotherapy walk was completed."
        },
        headers=auth_headers
    )
    assert msg_res.status_code == 201
    assert "completed" in msg_res.json()["content"]

    # Retrieve messages
    list_res = await client.get(f"/api/v1/chat/messages?elder_id={elder.id}&channel=FAMILY_COORDINATOR")
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

    # Upload daily media
    media_res = await client.post(
        "/api/v1/media/upload",
        json={
            "elderId": elder.id,
            "mediaUrl": "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289",
            "mediaType": "PHOTO",
            "category": "MEAL",
            "caption": "Kalyani Ammal enjoying morning idlis and hot rasam."
        },
        headers=caregiver_headers
    )
    assert media_res.status_code == 201
    assert media_res.json()["category"] == "MEAL"

    # Family views media
    media_list = await client.get(f"/api/v1/media/elder/{elder.id}")
    assert media_list.status_code == 200
    assert len(media_list.json()) >= 1

