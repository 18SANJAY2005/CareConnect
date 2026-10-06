import uuid
from datetime import date, timedelta
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.models.caregiver import Caregiver

@pytest.mark.asyncio
async def test_caregiver_onboarding_and_profile_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        unique_digits = str(uuid.uuid4().int)[:8]
        new_phone = f"+9198{unique_digits}"

        # 1. Send OTP
        send_res = await ac.post("/api/auth/otp/send", json={"phone": new_phone, "countryCode": "+91"})
        assert send_res.status_code == 200

        # 2. Verify OTP as CAREGIVER
        verify_res = await ac.post(
            "/api/auth/otp/verify",
            json={"phone": new_phone, "otp": "123456", "countryCode": "+91", "role": "CAREGIVER"}
        )
        assert verify_res.status_code == 200
        data = verify_res.json()
        token = data["access_token"]
        user = data["user"]
        assert user["role"] == "CAREGIVER"
        assert user["isProfileComplete"] is False

        headers = {"Authorization": f"Bearer {token}"}

        # 3. Incomplete profile should be rejected from shift operations (HTTP 403)
        shift_res = await ac.get("/api/shifts/current", headers=headers)
        assert shift_res.status_code == 403
        assert "Profile incomplete" in shift_res.json()["detail"]

        # 4. Partial update (missing dob or gender) leaves profile incomplete
        partial_res = await ac.patch(
            "/api/me",
            json={"fullName": "Priya Sharma", "locality": "Mylapore"},
            headers=headers
        )
        assert partial_res.status_code == 200
        assert partial_res.json()["isProfileComplete"] is False

        # 5. Full update with all required fields
        full_res = await ac.patch(
            "/api/me",
            json={
                "fullName": "Priya Sharma",
                "dob": "1995-04-12",
                "gender": "FEMALE",
                "email": "priya.sharma@example.com",
                "locality": "Mylapore, Chennai"
            },
            headers=headers
        )
        assert full_res.status_code == 200
        updated = full_res.json()
        assert updated["fullName"] == "Priya Sharma"
        assert updated["dob"] == "1995-04-12"
        assert updated["gender"] == "FEMALE"
        assert updated["email"] == "priya.sharma@example.com"
        assert updated["locality"] == "Mylapore, Chennai"
        assert updated["isProfileComplete"] is True

        # 6. Verify via GET /api/me
        me_res = await ac.get("/api/me", headers=headers)
        assert me_res.status_code == 200
        assert me_res.json()["isProfileComplete"] is True
        assert me_res.json()["fullName"] == "Priya Sharma"
        assert me_res.json()["gender"] == "FEMALE"

@pytest.mark.asyncio
async def test_existing_caregiver_complete_bypasses_onboarding():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Seed scenario so Meenakshi Sundaram exists with complete profile
        seed_res = await ac.post("/api/shifts/seed-demo")
        assert seed_res.status_code == 200

        verify_res = await ac.post(
            "/api/auth/otp/verify",
            json={"phone": "+919876500001", "otp": "123456", "countryCode": "+91", "role": "CAREGIVER"}
        )
        assert verify_res.status_code == 200
        user = verify_res.json()["user"]
        assert user["role"] == "CAREGIVER"
        assert user["fullName"] == "Meenakshi Sundaram"
        assert user["isProfileComplete"] is True
        assert user["dob"] is not None
        assert user["gender"] == "FEMALE"

@pytest.mark.asyncio
async def test_existing_incomplete_caregiver_onboarding():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        unique_digits = str(uuid.uuid4().int)[:8]
        cg_phone = f"+9198{unique_digits}"

        # Insert incomplete caregiver in database (has name and phone, but missing dob and gender)
        async with AsyncSessionLocal() as session:
            inc_user = User(
                fullName="Ramanathan Swaminathan",
                phone=cg_phone,
                email="raman@example.com",
                role="CAREGIVER",
                authProvider="PHONE_OTP"
            )
            session.add(inc_user)
            await session.commit()

        # Login
        verify_res = await ac.post(
            "/api/auth/otp/verify",
            json={"phone": cg_phone, "otp": "123456", "countryCode": "+91", "role": "CAREGIVER"}
        )
        assert verify_res.status_code == 200
        data = verify_res.json()
        assert data["user"]["fullName"] == "Ramanathan Swaminathan"
        assert data["user"]["isProfileComplete"] is False
        headers = {"Authorization": f"Bearer {data['access_token']}"}

        # Supply missing DOB and gender
        update_res = await ac.patch(
            "/api/me",
            json={
                "fullName": "Ramanathan Swaminathan",
                "dob": "1988-11-20",
                "gender": "MALE",
                "locality": "Adyar"
            },
            headers=headers
        )
        assert update_res.status_code == 200
        assert update_res.json()["isProfileComplete"] is True

@pytest.mark.asyncio
async def test_field_validation_failures():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        unique_digits = str(uuid.uuid4().int)[:8]
        new_phone = f"+9198{unique_digits}"

        verify_res = await ac.post(
            "/api/auth/otp/verify",
            json={"phone": new_phone, "otp": "123456", "countryCode": "+91", "role": "CAREGIVER"}
        )
        assert verify_res.status_code == 200
        token = verify_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Name < 2 characters
        r1 = await ac.patch("/api/me", json={"fullName": "A"}, headers=headers)
        assert r1.status_code == 400
        assert "at least 2 characters" in r1.json()["detail"]

        # 2. Name with digits
        r2 = await ac.patch("/api/me", json={"fullName": "Priya123"}, headers=headers)
        assert r2.status_code == 400

        # 3. Invalid DOB format
        r3 = await ac.patch("/api/me", json={"fullName": "Priya Sharma", "dob": "12/05/1995"}, headers=headers)
        assert r3.status_code == 400
        assert "YYYY-MM-DD" in r3.json()["detail"]

        # 4. Future DOB
        future_date = (date.today() + timedelta(days=365)).isoformat()
        r4 = await ac.patch("/api/me", json={"fullName": "Priya Sharma", "dob": future_date}, headers=headers)
        assert r4.status_code == 400
        assert "future" in r4.json()["detail"]

        # 5. Underage DOB (< 18 years old)
        underage_date = (date.today() - timedelta(days=365 * 10)).isoformat()
        r5 = await ac.patch("/api/me", json={"fullName": "Priya Sharma", "dob": underage_date}, headers=headers)
        assert r5.status_code == 400
        assert "18 years" in r5.json()["detail"]

        # 6. Invalid gender
        r6 = await ac.patch("/api/me", json={"fullName": "Priya Sharma", "gender": "ALIEN"}, headers=headers)
        assert r6.status_code == 400
        assert "FEMALE, MALE, OTHER" in r6.json()["detail"]

        # 7. Invalid email
        r7 = await ac.patch("/api/me", json={"fullName": "Priya Sharma", "email": "not-an-email"}, headers=headers)
        assert r7.status_code == 400
        assert "valid email" in r7.json()["detail"]

@pytest.mark.asyncio
async def test_verified_phone_cannot_be_changed_via_profile_edit():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        unique_digits = str(uuid.uuid4().int)[:8]
        new_phone = f"+9198{unique_digits}"

        verify_res = await ac.post(
            "/api/auth/otp/verify",
            json={"phone": new_phone, "otp": "123456", "countryCode": "+91", "role": "CAREGIVER"}
        )
        assert verify_res.status_code == 200
        token = verify_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Attempt to change verified phone
        phone_edit_res = await ac.patch(
            "/api/me",
            json={"fullName": "Priya Sharma", "phone": "+919999999999"},
            headers=headers
        )
        assert phone_edit_res.status_code == 400
        assert "Verified phone number cannot be modified" in phone_edit_res.json()["detail"]

@pytest.mark.asyncio
async def test_caregiver_cannot_update_another_caregiver_profile():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        unique_a = str(uuid.uuid4().int)[:8]
        unique_b = str(uuid.uuid4().int)[:8]
        phone_a = f"+9198{unique_a}"
        phone_b = f"+9198{unique_b}"

        # Caregiver A logs in
        res_a = await ac.post(
            "/api/auth/otp/verify",
            json={"phone": phone_a, "otp": "123456", "countryCode": "+91", "role": "CAREGIVER"}
        )
        token_a = res_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # Caregiver B is in the caregivers table
        async with AsyncSessionLocal() as session:
            cg_b = Caregiver(
                full_name="Caregiver B Profile",
                headline="Senior Attendant",
                phone=phone_b,
                locality="Mylapore",
                gender="FEMALE"
            )
            session.add(cg_b)
            await session.commit()
            await session.refresh(cg_b)
            cg_b_id = cg_b.id

        # Caregiver A attempts to update Caregiver B via /api/caregivers/{cg_b_id} -> 403 Forbidden
        tamper_res = await ac.patch(
            f"/api/caregivers/{cg_b_id}",
            json={"fullName": "Hacked Caregiver"},
            headers=headers_a
        )
        assert tamper_res.status_code == 403
        assert "Unauthorized" in tamper_res.json()["detail"]

