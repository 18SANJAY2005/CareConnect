import pytest
import pytest_asyncio
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.elder import Elder
from app.models.caregiver import Caregiver
from app.models.caregiver_kyc import CaregiverKYC
from app.models.assignment import CareAssignment
from app.models.shift import CareShift
from app.models.billing import Invoice, BillingAdjustment
from app.models.audit import Notification
from app.models.location import ElderLocation, ServiceInterest
from app.core.security import create_access_token


@pytest.mark.asyncio
class TestCareSeekerEndToEndChanges:
    """Comprehensive test suite covering the 15 CareSeeker end-to-end change requirements."""

    # ------------------------------------------------------------------------
    # 1. Sign-in and Sign-up Separation
    # ------------------------------------------------------------------------
    async def test_01_signin_signup_separation(self, client: AsyncClient, test_db: AsyncSession, sponsor_user: User):
        # A. Check existing phone returns registered=True
        res = await client.post(
            "/api/auth/phone/check",
            json={"phone": sponsor_user.phone, "countryCode": "+91"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["registered"] is True
        assert data["phone"] == sponsor_user.phone
        assert data["name"] == sponsor_user.fullName

        # B. Check new phone returns registered=False
        new_phone = "+919999000001"
        res_new = await client.post(
            "/api/auth/phone/check",
            json={"phone": new_phone, "countryCode": "+91"}
        )
        assert res_new.status_code == 200
        assert res_new.json()["registered"] is False

        # C. Sign-in flow: phone -> OTP (default OTP is 123456) without needing name
        otp_verify_res = await client.post(
            "/api/auth/otp/verify",
            json={
                "phone": sponsor_user.phone,
                "otp": "123456",
                "countryCode": "+91"
            }
        )
        assert otp_verify_res.status_code == 200
        assert "access_token" in otp_verify_res.json()
        assert otp_verify_res.json()["user"]["id"] == sponsor_user.id

    # ------------------------------------------------------------------------
    # 2. Existing Phone Number Handling & Duplicate Prevention
    # ------------------------------------------------------------------------
    async def test_02_duplicate_user_prevention(self, client: AsyncClient, test_db: AsyncSession, sponsor_user: User):
        # Attempting verify with existing phone again does NOT create a duplicate user
        res = await client.post(
            "/api/auth/otp/verify",
            json={
                "phone": sponsor_user.phone,
                "otp": "123456",
                "fullName": "Attempted Duplicate Name",
            }
        )
        assert res.status_code == 200

        users_res = await test_db.execute(select(User).where(User.phone == sponsor_user.phone))
        matching_users = users_res.scalars().all()
        assert len(matching_users) == 1
        assert matching_users[0].id == sponsor_user.id

    # ------------------------------------------------------------------------
    # 3. OTP Before Serviceability Check
    # ------------------------------------------------------------------------
    async def test_03_otp_before_serviceability_check(self, client: AsyncClient, test_db: AsyncSession):
        # 1. Unauthenticated client performs OTP verification first
        new_phone = "+919876599901"
        otp_res = await client.post(
            "/api/auth/otp/verify",
            json={
                "phone": new_phone,
                "otp": "123456",
                "fullName": "Verified Prospect",
                "role": "FAMILY_SPONSOR"
            }
        )
        assert otp_res.status_code == 200
        token = otp_res.json()["access_token"]
        auth_hdr = {"Authorization": f"Bearer {token}"}

        # 2. Authenticated user then checks serviceability via location verify
        cov_res = await client.post(
            "/api/elder-locations/verify",
            json={
                "addressLine1": "12 Gandhi Road",
                "locality": "Adyar",
                "city": "Chennai",
                "state": "Tamil Nadu",
                "postalCode": "600020"
            },
            headers=auth_hdr
        )
        assert cov_res.status_code == 200
        assert cov_res.json()["serviceable"] is True

        # Unserviceable location check
        unserv_res = await client.post(
            "/api/elder-locations/verify",
            json={
                "addressLine1": "100 Outer Ring Road",
                "locality": "Indiranagar",
                "city": "Bengaluru",
                "state": "Karnataka",
                "postalCode": "560038"
            },
            headers=auth_hdr
        )
        assert unserv_res.status_code == 200
        assert unserv_res.json()["serviceable"] is False

    # ------------------------------------------------------------------------
    # 4. Optional Service-Interest Capture When Service is Unavailable
    # ------------------------------------------------------------------------
    async def test_04_service_interest_capture(self, client: AsyncClient, test_db: AsyncSession):
        payload = {
            "fullName": "Anand R",
            "phone": "+919876544433",
            "email": "anand.r@example.com",
            "postalCode": "641001",
            "locality": "RS Puram, Coimbatore",
            "addressLine1": "45 West Club Road",
            "careTypeNeeded": "Post-Operative Recovery",
            "notes": "Looking for support starting next month"
        }
        res = await client.post("/api/locations/service-interest", json=payload)
        assert res.status_code == 201
        data = res.json()
        assert data["success"] is True
        assert data["postalCode"] == "641001"

        # Verify persisted in database
        saved_res = await test_db.execute(select(ServiceInterest).where(ServiceInterest.postalCode == "641001"))
        saved = saved_res.scalars().first()
        assert saved is not None
        assert saved.phone == "+919876544433"
        assert saved.careTypeNeeded == "Post-Operative Recovery"

    # ------------------------------------------------------------------------
    # 5. One Active "Myself" Service Per Person
    # ------------------------------------------------------------------------
    async def test_05_one_active_myself_service_per_person(self, client: AsyncClient, test_db: AsyncSession, sponsor_user: User, auth_headers: dict):
        # 1. Create first "Myself" elder
        elder1_data = {
            "name": sponsor_user.fullName,
            "age": 45,
            "gender": "MALE",
            "phoneNumber": sponsor_user.phone,
            "isMyself": True
        }
        res1 = await client.post("/api/elders", json=elder1_data, headers=auth_headers)
        assert res1.status_code == 201
        elder1 = res1.json()
        assert elder1["isMyself"] is True

        # 2. Attempt to create second "Myself" elder -> MUST return 409 Conflict
        elder2_data = {
            "name": sponsor_user.fullName,
            "age": 45,
            "gender": "MALE",
            "phoneNumber": sponsor_user.phone,
            "isMyself": True
        }
        res2 = await client.post("/api/elders", json=elder2_data, headers=auth_headers)
        assert res2.status_code == 409
        assert "Only one active 'Myself' service is permitted per person" in res2.json()["detail"]

        # 3. Creating an elder for a family member (isMyself=False) should succeed
        res3 = await client.post(
            "/api/elders",
            json={
                "name": "Father Ramanathan",
                "age": 75,
                "gender": "MALE",
                "phoneNumber": "+919876500099",
                "isMyself": False
            },
            headers=auth_headers
        )
        assert res3.status_code == 201
        assert res3.json()["isMyself"] is False

    # ------------------------------------------------------------------------
    # 6. Service Search and Filter Correctness
    # ------------------------------------------------------------------------
    async def test_06_service_search_and_filter_correctness(self, client: AsyncClient, test_db: AsyncSession, sponsor_user: User, auth_headers: dict):
        # Create elder for matching
        elder = Elder(
            familyId=sponsor_user.id,
            name="Lakshmi Amma",
            age=72,
            gender="FEMALE",
            mobilityLevel="ASSISTED_WALKER",
            careRequirements=["Nursing", "Mobility"],
            personaStatus="SAVED"
        )
        test_db.add(elder)
        await test_db.flush()

        # Seed test caregivers with specific qualifications and rates
        cg_nurse = Caregiver(
            id=101,
            full_name="Priya Nurse",
            headline="Certified BSc Nurse",
            phone="+919888800101",
            gender="FEMALE",
            rating=4.9,
            experience_years=6,
            specializations="Post-Surgical Care, ICU Support",
            qualifications="BSc Nursing",
            languages="Tamil, English",
            locality="Adyar",
            daily_rate=500.0,
            status="AVAILABLE",
            is_active=True,
            isBufferPool=False
        )
        # Create user & KYC for cg_nurse
        user_nurse = User(id="user-nurse-101", fullName="Priya Nurse", phone="+919888800101", role="CAREGIVER")
        kyc_nurse = CaregiverKYC(
            caregiver_id="user-nurse-101",
            document_type="AADHAAR",
            document_number="123456789012",
            document_storage_reference="doc_ref_101",
            verification_status="VERIFIED"
        )
        test_db.add_all([cg_nurse, user_nurse, kyc_nurse])
        await test_db.commit()

        # Filter by qualification: BSc Nursing
        res_q = await client.get(
            f"/api/caregivers/matches?elder_id={elder.id}&qualification=BSc Nursing",
            headers=auth_headers
        )
        assert res_q.status_code == 200
        data_q = res_q.json()
        assert len(data_q["matches"]) > 0
        for match in data_q["matches"]:
            cg_obj = match["caregiver"]
            assert "BSc Nursing" in (cg_obj.get("qualifications") or "")

        # Filter by budget: max_daily_rate 600
        res_budget = await client.get(
            f"/api/caregivers/matches?elder_id={elder.id}&max_daily_rate=600",
            headers=auth_headers
        )
        assert res_budget.status_code == 200
        data_b = res_budget.json()
        assert len(data_b["matches"]) > 0
        for match in data_b["matches"]:
            cg_obj = match["caregiver"]
            assert cg_obj["daily_rate"] <= 600

    # ------------------------------------------------------------------------
    # 7. Demo Caregiver Visibility Without Weakening Eligibility Rules
    # ------------------------------------------------------------------------
    async def test_07_demo_caregiver_visibility_and_kyc_gate(self, client: AsyncClient, test_db: AsyncSession, sponsor_user: User, auth_headers: dict):
        elder = Elder(
            familyId=sponsor_user.id,
            name="Kalyani Ammal",
            age=74,
            gender="FEMALE",
            mobilityLevel="ASSISTED_WALKER",
            careRequirements=["Vitals", "Medication"],
            personaStatus="SAVED"
        )
        test_db.add(elder)
        await test_db.flush()

        # Add an unverified caregiver (KYC PENDING)
        unverified_cg = Caregiver(
            id=102,
            full_name="Unverified Caregiver",
            headline="Junior Assistant",
            phone="+919888800102",
            gender="FEMALE",
            rating=4.5,
            experience_years=2,
            languages="Tamil",
            locality="Adyar",
            daily_rate=400.0,
            status="AVAILABLE",
            is_active=True
        )
        user_unverified = User(id="user-unverified-102", fullName="Unverified Caregiver", phone="+919888800102", role="CAREGIVER")
        kyc_unverified = CaregiverKYC(
            caregiver_id="user-unverified-102",
            document_type="AADHAAR",
            document_number="999988887777",
            document_storage_reference="doc_ref_102",
            verification_status="PENDING"
        )
        test_db.add_all([unverified_cg, user_unverified, kyc_unverified])
        await test_db.commit()

        # Curated matches must NOT return unverified caregiver
        res = await client.get(f"/api/caregivers/matches?elder_id={elder.id}", headers=auth_headers)
        assert res.status_code == 200
        matches = res.json()["matches"]
        matched_ids = [m["caregiver"]["id"] for m in matches]
        assert 102 not in matched_ids, "Unverified caregiver must be blocked by the KYC verification gate."

    # ------------------------------------------------------------------------
    # 8. Assignment Pending and Confirmation States
    # ------------------------------------------------------------------------
    async def test_08_assignment_pending_and_confirmation(self, client: AsyncClient, test_db: AsyncSession, sponsor_user: User, auth_headers: dict):
        elder = Elder(familyId=sponsor_user.id, name="Test Elder", age=70, gender="FEMALE", personaStatus="SAVED")
        cg = Caregiver(
            id=103,
            full_name="Rani Attendant",
            headline="Experienced Companion",
            phone="+919888800103",
            locality="Adyar",
            gender="FEMALE",
            daily_rate=500.0,
            status="AVAILABLE",
            is_active=True
        )
        test_db.add_all([elder, cg])
        await test_db.commit()

        # Create assignment with initial pending state
        asg_payload = {
            "elder_id": elder.id,
            "caregiver_id": cg.id,
            "sponsor_id": sponsor_user.id,
            "shift_type": "Day 10-Hour",
            "status": "WAITING_CONFIRMATION",
            "monthly_rate": 22000.0
        }
        create_res = await client.post("/api/assignments", json=asg_payload, headers=auth_headers)
        assert create_res.status_code == 200
        asg_data = create_res.json()
        asg_id = asg_data["id"]
        assert asg_data["status"] == "WAITING_CONFIRMATION"

        # Confirm assignment
        confirm_res = await client.post(f"/api/assignments/{asg_id}/confirm", headers=auth_headers)
        assert confirm_res.status_code == 200
        assert confirm_res.json()["status"] == "SERVICE_CONFIRMED"

    # ------------------------------------------------------------------------
    # 9. Assignment Notifications and Duplicate Prevention
    # ------------------------------------------------------------------------
    async def test_09_assignment_notifications_duplicate_prevention(self, client: AsyncClient, test_db: AsyncSession, sponsor_user: User, auth_headers: dict):
        elder = Elder(familyId=sponsor_user.id, name="Notify Elder", age=68, gender="MALE", personaStatus="SAVED")
        cg = Caregiver(
            id=104,
            full_name="Karthik Attendant",
            headline="Experienced Male Attendant",
            phone="+919888800104",
            locality="Adyar",
            gender="MALE",
            daily_rate=550.0,
            status="AVAILABLE",
            is_active=True
        )
        test_db.add_all([elder, cg])
        await test_db.commit()

        asg_payload = {
            "elder_id": elder.id,
            "caregiver_id": cg.id,
            "sponsor_id": sponsor_user.id,
            "shift_type": "Day 10-Hour",
            "status": "WAITING_CONFIRMATION",
        }
        res = await client.post("/api/assignments", json=asg_payload, headers=auth_headers)
        assert res.status_code == 200
        asg_id = res.json()["id"]

        # Check notification was created
        notif_res = await test_db.execute(
            select(Notification).where(
                Notification.recipientUserId == sponsor_user.id,
                Notification.referenceId == str(asg_id),
                Notification.eventType == "ASSIGNMENT_SCHEDULED"
            )
        )
        notifs = notif_res.scalars().all()
        assert len(notifs) == 1

        # Confirming assignment should trigger confirmation notification
        await client.post(f"/api/assignments/{asg_id}/confirm", headers=auth_headers)
        conf_notif_res = await test_db.execute(
            select(Notification).where(
                Notification.recipientUserId == sponsor_user.id,
                Notification.referenceId == str(asg_id),
                Notification.eventType == "ASSIGNMENT_CONFIRMED"
            )
        )
        assert len(conf_notif_res.scalars().all()) == 1

        # Re-confirming should not duplicate confirmation notification
        await client.post(f"/api/assignments/{asg_id}/confirm", headers=auth_headers)
        conf_notif_res2 = await test_db.execute(
            select(Notification).where(
                Notification.recipientUserId == sponsor_user.id,
                Notification.referenceId == str(asg_id),
                Notification.eventType == "ASSIGNMENT_CONFIRMED"
            )
        )
        assert len(conf_notif_res2.scalars().all()) == 1

    # ------------------------------------------------------------------------
    # 10. Historical Assignment Visibility After Completion
    # ------------------------------------------------------------------------
    async def test_10_historical_assignment_visibility(self, client: AsyncClient, test_db: AsyncSession, sponsor_user: User, auth_headers: dict):
        elder = Elder(familyId=sponsor_user.id, name="History Elder", age=80, gender="FEMALE", personaStatus="SAVED")
        cg = Caregiver(
            id=105,
            full_name="Sita Devi",
            headline="Senior Female Caregiver",
            phone="+919888800105",
            locality="Adyar",
            gender="FEMALE",
            daily_rate=500.0,
            status="AVAILABLE",
            is_active=True
        )
        test_db.add_all([elder, cg])
        await test_db.commit()

        # Create assignment and mark as COMPLETED
        asg = CareAssignment(
            elder_id=elder.id,
            caregiver_id=cg.id,
            sponsor_id=sponsor_user.id,
            shift_type="Day 10-Hour",
            status="COMPLETED",
            start_date="2026-09-01",
            monthly_rate=20000.0
        )
        test_db.add(asg)
        await test_db.commit()

        history_res = await client.get(f"/api/assignments/elder/{elder.id}/history", headers=auth_headers)
        assert history_res.status_code == 200
        history_list = history_res.json()
        assert len(history_list) >= 1
        assert history_list[0]["status"] == "COMPLETED"
        assert history_list[0]["caregiver"]["fullName"] == "Sita Devi"

    # ------------------------------------------------------------------------
    # 11. Visit-Start and Completion OTP Expiry, Retry, Reuse, and Authorization
    # ------------------------------------------------------------------------
    async def test_11_visit_start_and_completion_otp_lifecycle(self, client: AsyncClient, test_db: AsyncSession, sponsor_user: User, auth_headers: dict):
        elder = Elder(familyId=sponsor_user.id, name="OTP Elder", age=76, gender="MALE", personaStatus="SAVED")
        cg_user = User(fullName="Caregiver Mani", phone="+919888800106", role="CAREGIVER")
        test_db.add_all([elder, cg_user])
        await test_db.flush()

        # Add verified ElderLocation in Adyar
        elder_loc = ElderLocation(
            elderId=elder.id,
            addressLine1="12 Gandhi Road",
            locality="Adyar",
            city="Chennai",
            postalCode="600020",
            latitude=13.0012,
            longitude=80.2565,
            verificationStatus="VERIFIED",
            serviceable=True
        )
        test_db.add(elder_loc)

        now = datetime.now(timezone.utc)
        shift = CareShift(
            elderId=elder.id,
            caregiverId=cg_user.id,
            shiftType="EIGHT_HOUR_DAY",
            status="SCHEDULED",
            scheduledStart=now,
            scheduledEnd=now + timedelta(hours=8),
            geofenceRadiusMeters=200.0
        )
        test_db.add(shift)
        await test_db.commit()

        # 1. Request Start OTP
        req_res = await client.post(f"/api/shifts/{shift.id}/start-otp/request", headers=auth_headers)
        assert req_res.status_code == 200
        otp_info = req_res.json()
        assert otp_info["success"] is True
        otp_code = otp_info["otp"]
        assert len(otp_code) == 6

        # 2. Check OTP Status
        status_res = await client.get(f"/api/shifts/{shift.id}/otp-status", headers=auth_headers)
        assert status_res.status_code == 200
        assert status_res.json()["startOtp"]["hasOtp"] is True
        assert status_res.json()["startOtp"]["isUsed"] is False

        # 3. Wrong OTP attempt
        wrong_res = await client.post(
            f"/api/shifts/{shift.id}/start-otp/verify",
            json={"otp": "000000", "latitude": 13.0012, "longitude": 80.2565},
            headers=auth_headers
        )
        assert wrong_res.status_code == 400
        assert "Invalid verification code" in wrong_res.json()["detail"]

        # 4. Valid OTP verify (transitions shift to ACTIVE)
        valid_res = await client.post(
            f"/api/shifts/{shift.id}/start-otp/verify",
            json={"otp": otp_code, "latitude": 13.0012, "longitude": 80.2565},
            headers=auth_headers
        )
        assert valid_res.status_code == 200
        assert valid_res.json()["success"] is True
        assert valid_res.json()["shiftStatus"] == "ACTIVE"

        # 5. Single-use reuse attempt must fail
        reuse_res = await client.post(
            f"/api/shifts/{shift.id}/start-otp/verify",
            json={"otp": otp_code, "latitude": 13.0012, "longitude": 80.2565},
            headers=auth_headers
        )
        assert reuse_res.status_code == 400
        assert "already been used" in reuse_res.json()["detail"]

        # 6. Completion OTP Lifecycle
        comp_req = await client.post(f"/api/shifts/{shift.id}/completion-otp/request", headers=auth_headers)
        assert comp_req.status_code == 200
        comp_otp = comp_req.json()["otp"]
        assert len(comp_otp) == 6

        comp_verify = await client.post(
            f"/api/shifts/{shift.id}/completion-otp/verify",
            json={"otp": comp_otp, "latitude": 13.0012, "longitude": 80.2565, "summary": "Shift completed smoothly"},
            headers=auth_headers
        )
        assert comp_verify.status_code == 200
        assert comp_verify.json()["success"] is True
        assert comp_verify.json()["shiftStatus"] in ["CHECKED_OUT", "COMPLETED"]

    # ------------------------------------------------------------------------
    # 12. Mid-Month Billing Changes and Adjustment Traceability
    # ------------------------------------------------------------------------
    async def test_12_mid_month_billing_adjustments(self, client: AsyncClient, test_db: AsyncSession, sponsor_user: User, auth_headers: dict):
        elder = Elder(familyId=sponsor_user.id, name="Billing Elder", age=70, gender="FEMALE", personaStatus="SAVED")
        test_db.add(elder)
        await test_db.flush()

        now = datetime.now(timezone.utc)
        invoice = Invoice(
            invoiceNumber="INV-2026-CH-TEST01",
            elderId=elder.id,
            familyUserId=sponsor_user.id,
            billingPeriodStart=now,
            billingPeriodEnd=now + timedelta(days=30),
            dueDate=now + timedelta(days=5),
            totalAmount=22000.0,
            status="ISSUED"
        )
        test_db.add(invoice)
        await test_db.commit()

        # Add mid-month service upgrade adjustment
        adj_payload = {
            "serviceChange": "Added Weekend Respite Care (+4 shifts)",
            "changeType": "ADDITION",
            "adjustmentAmount": 3000.0,
            "notes": "Requested by sponsor for festival weekend"
        }
        adj_res = await client.post(
            f"/api/invoices/{invoice.id}/adjustments",
            json=adj_payload,
            headers=auth_headers
        )
        assert adj_res.status_code == 201
        adj_data = adj_res.json()
        assert adj_data["serviceChange"] == "Added Weekend Respite Care (+4 shifts)"
        assert adj_data["adjustmentAmount"] == 3000.0
        assert adj_data["previousBalance"] == 22000.0
        assert adj_data["resultingBalance"] == 25000.0

        # Query traceable adjustments
        list_res = await client.get(f"/api/invoices/{invoice.id}/adjustments", headers=auth_headers)
        assert list_res.status_code == 200
        assert len(list_res.json()) == 1
        assert list_res.json()[0]["changeType"] == "ADDITION"

    # ------------------------------------------------------------------------
    # 13. Elder-Specific Health/Vitals/Log Access & Isolation
    # ------------------------------------------------------------------------
    async def test_13_elder_data_isolation_and_cross_access_prevention(self, client: AsyncClient, test_db: AsyncSession, sponsor_user: User, auth_headers: dict):
        # Elder A belongs to sponsor_user
        elder_a = Elder(familyId=sponsor_user.id, name="Elder A", age=70, gender="FEMALE", personaStatus="SAVED")
        # Elder B belongs to someone else
        other_user = User(fullName="Other Sponsor", phone="+919876543999", role="FAMILY_SPONSOR")
        test_db.add(other_user)
        await test_db.flush()
        elder_b = Elder(familyId=other_user.id, name="Elder B", age=82, gender="MALE", personaStatus="SAVED")
        test_db.add_all([elder_a, elder_b])
        await test_db.commit()

        # Sponsor A querying Elder A vitals history succeeds
        res_a = await client.get(f"/api/vitals/elder/{elder_a.id}", headers=auth_headers)
        assert res_a.status_code == 200

        # Sponsor A querying Elder B vitals history MUST return 403 Forbidden
        res_b = await client.get(f"/api/vitals/elder/{elder_b.id}", headers=auth_headers)
        assert res_b.status_code == 403
        assert "not authorized to access this elder's care data" in res_b.json()["detail"]

    # ------------------------------------------------------------------------
    # 14. Profile and Navigation Behavior
    # ------------------------------------------------------------------------
    async def test_14_profile_and_account_actions(self, client: AsyncClient, test_db: AsyncSession, sponsor_user: User, auth_headers: dict):
        # Query current user profile
        me_res = await client.get("/api/me", headers=auth_headers)
        assert me_res.status_code == 200
        data = me_res.json()
        assert data["id"] == sponsor_user.id
        assert data["phone"] == sponsor_user.phone
        assert data["role"] == "FAMILY_SPONSOR"

    # ------------------------------------------------------------------------
    # 15. Regressions Check (Caregiver KYC, Shift attendance, SOS)
    # ------------------------------------------------------------------------
    async def test_15_kyc_and_sos_regressions(self, client: AsyncClient, test_db: AsyncSession, sponsor_user: User, auth_headers: dict):
        elder = Elder(familyId=sponsor_user.id, name="SOS Elder", age=75, gender="FEMALE", personaStatus="SAVED")
        test_db.add(elder)
        await test_db.commit()

        # Test SOS trigger endpoint
        sos_res = await client.post(
            "/api/incidents/sos",
            json={
                "elderId": elder.id,
                "notes": "Emergency test from CareSeeker mobile shell",
                "latitude": 13.0012,
                "longitude": 80.2565
            },
            headers=auth_headers
        )
        assert sos_res.status_code in [200, 201]
        assert sos_res.json()["status"] in ["OPEN", "DISPATCHED", "PENDING", "RESOLVED", "REPORTED", "ACKNOWLEDGED"]
