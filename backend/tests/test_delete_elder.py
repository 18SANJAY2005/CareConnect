import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import create_access_token
from app.models.user import User
from app.models.assignment import CareAssignment
from app.models.caregiver import Caregiver
from app.models.shift import CareShift

@pytest.mark.asyncio
async def test_delete_elder_requires_auth(client: AsyncClient):
    res = await client.delete("/api/elders/any-elder-id")
    assert res.status_code == 401

@pytest.mark.asyncio
async def test_delete_nonexistent_elder_returns_404(client: AsyncClient, auth_headers: dict):
    res = await client.delete("/api/elders/00000000-0000-0000-0000-000000000000", headers=auth_headers)
    assert res.status_code == 404
    assert res.json()["detail"] == "Elder profile not found"

@pytest.mark.asyncio
async def test_delete_unauthorized_elder_returns_403(client: AsyncClient, auth_headers: dict, test_db: AsyncSession):
    # 1. Sponsor A creates an elder
    create_res = await client.post("/api/elders", headers=auth_headers, json={
        "name": "Elder of Sponsor A",
        "age": 75,
        "gender": "FEMALE"
    })
    elder_id = create_res.json()["id"]

    # 2. Create Sponsor B
    sponsor_b = User(
        fullName="Sponsor B User",
        phone="+919876543999",
        email="sponsor_b_delete@example.com",
        role="FAMILY_SPONSOR"
    )
    test_db.add(sponsor_b)
    await test_db.commit()
    await test_db.refresh(sponsor_b)

    token_b = create_access_token({"sub": sponsor_b.id, "role": sponsor_b.role})
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 3. Sponsor B attempts to delete Sponsor A's elder
    delete_res = await client.delete(f"/api/elders/{elder_id}", headers=headers_b)
    assert delete_res.status_code == 403
    assert "authorization" in delete_res.json()["detail"].lower()

@pytest.mark.asyncio
async def test_delete_elder_blocked_by_active_assignment(client: AsyncClient, auth_headers: dict, test_db: AsyncSession):
    # 1. Create elder
    create_res = await client.post("/api/elders", headers=auth_headers, json={
        "name": "Elder With Active Care",
        "age": 76,
        "gender": "MALE"
    })
    elder_id = create_res.json()["id"]

    # 2. Create caregiver & active assignment
    cg = Caregiver(
        fullName="Kavitha Caregiver",
        headline="Certified Geriatric Care Assistant",
        phone="+919876543111",
        locality="Mylapore",
        status="BUSY"
    )
    test_db.add(cg)
    await test_db.commit()
    await test_db.refresh(cg)

    # Get sponsor id from auth_headers token
    list_res = await client.get("/api/elders", headers=auth_headers)
    sponsor_id = list_res.json()[0]["familyId"]

    assignment = CareAssignment(
        elder_id=elder_id,
        caregiver_id=cg.id,
        sponsor_id=sponsor_id,
        status="ACTIVE"
    )
    test_db.add(assignment)
    await test_db.commit()

    # 3. Attempt deletion
    del_res = await client.delete(f"/api/elders/{elder_id}", headers=auth_headers)
    assert del_res.status_code == 400
    assert del_res.json()["detail"] == "This elder currently has active care services and cannot be deleted from the active profile. Please contact CareConnect support to close the active service first."

@pytest.mark.asyncio
async def test_delete_elder_blocked_by_active_shift(client: AsyncClient, auth_headers: dict, test_db: AsyncSession):
    # 1. Create elder
    create_res = await client.post("/api/elders", headers=auth_headers, json={
        "name": "Elder With Ongoing Shift",
        "age": 80,
        "gender": "FEMALE"
    })
    elder_id = create_res.json()["id"]

    # 2. Create caregiver user & active shift
    cg_user = User(
        fullName="Active Caregiver Worker",
        phone="+919876543222",
        email="cg_active_worker@example.com",
        role="CAREGIVER"
    )
    test_db.add(cg_user)
    await test_db.commit()
    await test_db.refresh(cg_user)

    now = datetime.now(timezone.utc)
    shift = CareShift(
        elderId=elder_id,
        caregiverId=cg_user.id,
        shiftType="EIGHT_HOUR_DAY",
        status="ACTIVE",
        scheduledStart=now - timedelta(hours=2),
        scheduledEnd=now + timedelta(hours=6)
    )
    test_db.add(shift)
    await test_db.commit()

    # 3. Attempt deletion
    del_res = await client.delete(f"/api/elders/{elder_id}", headers=auth_headers)
    assert del_res.status_code == 400
    assert del_res.json()["detail"] == "This elder currently has active care services and cannot be deleted from the active profile. Please contact CareConnect support to close the active service first."

@pytest.mark.asyncio
async def test_delete_elder_success_and_excluded_from_listings(client: AsyncClient, auth_headers: dict):
    # 1. Create an elder
    create_res = await client.post("/api/elders", headers=auth_headers, json={
        "name": "Elder To Delete",
        "age": 72,
        "gender": "FEMALE"
    })
    elder_id = create_res.json()["id"]

    # Verify present in list
    list_res = await client.get("/api/elders", headers=auth_headers)
    assert any(e["id"] == elder_id for e in list_res.json())

    # 2. Delete the elder
    del_res = await client.delete(f"/api/elders/{elder_id}", headers=auth_headers)
    assert del_res.status_code == 200
    assert del_res.json()["id"] == elder_id
    assert "deleted successfully" in del_res.json()["message"]

    # 3. Verify excluded from GET /api/elders
    list_after = await client.get("/api/elders", headers=auth_headers)
    assert not any(e["id"] == elder_id for e in list_after.json())

    # 4. Verify GET /api/elders/{elder_id} returns 404
    get_after = await client.get(f"/api/elders/{elder_id}", headers=auth_headers)
    assert get_after.status_code == 404

    # 5. Subsequent delete returns 404
    second_del = await client.delete(f"/api/elders/{elder_id}", headers=auth_headers)
    assert second_del.status_code == 404

