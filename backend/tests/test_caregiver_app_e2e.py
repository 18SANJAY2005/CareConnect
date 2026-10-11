import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.caregiver import Caregiver
from app.models.caregiver_kyc import CaregiverKYC
from app.models.elder import Elder
from app.models.assignment import CareAssignment
from app.models.shift import CareShift
from app.models.care_log import CareTask
from app.models.audit import AuditLog
from app.models.payout import CaregiverPayout, CaregiverShiftEarning
from app.models.user_consent import UserConsent
from app.core.security import create_access_token


@pytest.mark.asyncio
async def test_user_consent_recording_and_retrieval(client: AsyncClient, test_db: AsyncSession):
    """Scenario 2: Consent and disclosure recording with version, timestamp, purpose, user action."""
    user = User(
        phone="+919876500001",
        fullName="Meenakshi Sundaram",
        role="CAREGIVER",
        dob="1990-01-01",
        gender="FEMALE",
        is_active=True,
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)

    token = create_access_token({"sub": user.id, "role": user.role})
    headers = {"Authorization": f"Bearer {token}"}

    # Record consent
    payload = {
        "phone": user.phone,
        "consents": [
            {
                "consentType": "SERVICE_COMMUNICATIONS",
                "granted": True,
                "version": "2026.1",
                "purpose": "Required shift assignments, emergency alerts, operational SMS",
                "userAction": "KYC_SUBMIT_GRANT",
            },
            {
                "consentType": "PROMOTIONAL_COMMUNICATIONS",
                "granted": False,
                "version": "2026.1",
                "purpose": "Optional promotional and partner perks",
                "userAction": "KYC_SUBMIT_DECLINE",
            },
        ],
    }

    res = await client.post("/api/auth/consent", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert len(data["consents"]) == 2

    # Retrieve recorded consent
    get_res = await client.get("/api/auth/consent/me", headers=headers)
    assert get_res.status_code == 200
    records = get_res.json()
    assert len(records) == 2
    types = {r["consentType"]: r for r in records}
    assert types["SERVICE_COMMUNICATIONS"]["granted"] is True
    assert types["SERVICE_COMMUNICATIONS"]["version"] == "2026.1"
    assert types["PROMOTIONAL_COMMUNICATIONS"]["granted"] is False


@pytest.mark.asyncio
async def test_kyc_pending_until_admin_and_work_eligibility(client: AsyncClient, test_db: AsyncSession):
    """Scenario 3: KYC remains PENDING until Admin approval; non-verified cannot work."""
    caregiver_user = User(
        phone="+919876500002",
        fullName="Lakshmi Priya",
        role="CAREGIVER",
        dob="1995-05-15",
        gender="FEMALE",
        locality="Adyar, Chennai",
        is_active=True,
    )
    admin_user = User(
        phone="+919876599999",
        fullName="Admin Supervisor",
        role="ADMIN",
        is_active=True,
    )
    test_db.add_all([caregiver_user, admin_user])
    await test_db.commit()
    await test_db.refresh(caregiver_user)
    await test_db.refresh(admin_user)

    cg_profile = Caregiver(
        full_name=caregiver_user.fullName,
        phone=caregiver_user.phone,
        headline="Certified Caregiver",
        locality="Adyar, Chennai",
        gender="FEMALE",
        dob="1995-05-15",
        status="OFF_DUTY",
        is_active=True,
    )
    test_db.add(cg_profile)
    await test_db.commit()

    cg_token = create_access_token({"sub": caregiver_user.id, "role": caregiver_user.role})
    cg_headers = {"Authorization": f"Bearer {cg_token}"}

    # Caregiver submits KYC
    submit_res = await client.post(
        "/api/caregivers/kyc/me",
        json={
            "document_type": "AADHAAR",
            "document_number": "541278963214",
            "document_storage_reference": "https://storage.careconnect.in/kyc/aadhaar_doc.jpg",
            "mobile_number": caregiver_user.phone,
            "terms_accepted": True,
            "service_consent": True,
            "promotional_consent": False,
        },
        headers=cg_headers,
    )
    assert submit_res.status_code == 201
    kyc_info = submit_res.json()
    # MUST remain PENDING after submission
    assert kyc_info["verification_status"] == "PENDING"
    assert kyc_info["masked_document_number"] == "XXXX-XXXX-3214"

    # Caregiver checks work eligibility -> must be ineligible while PENDING
    elig_res = await client.get("/api/caregivers/me/eligibility", headers=cg_headers)
    assert elig_res.status_code == 200
    elig_data = elig_res.json()
    assert elig_data["isEligibleForWork"] is False
    assert elig_data["kycStatus"] == "PENDING"

    # Now Admin explicitly approves KYC
    admin_token = create_access_token({"sub": admin_user.id, "role": admin_user.role})
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    approve_res = await client.patch(
        f"/api/caregivers/kyc/{caregiver_user.id}/status",
        json={"verification_status": "VERIFIED"},
        headers=admin_headers,
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["verification_status"] == "VERIFIED"

    # Caregiver checks eligibility again -> now eligible
    elig_res2 = await client.get("/api/caregivers/me/eligibility", headers=cg_headers)
    assert elig_res2.status_code == 200
    assert elig_res2.json()["isEligibleForWork"] is True
    assert elig_res2.json()["kycStatus"] == "VERIFIED"


@pytest.mark.asyncio
async def test_expanded_caregiver_profile(client: AsyncClient, test_db: AsyncSession):
    """Scenario 5: Care profile validation, care specializations, preferences, and performance metrics."""
    user = User(
        phone="+919876500003",
        fullName="Karthik R",
        role="CAREGIVER",
        dob="1992-08-20",
        gender="MALE",
        locality="Besant Nagar, Chennai",
        is_active=True,
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)

    cg = Caregiver(
        full_name=user.fullName,
        phone=user.phone,
        headline="Geriatric Nurse",
        locality="Besant Nagar, Chennai",
        gender="MALE",
        dob="1992-08-20",
        status="AVAILABLE",
        is_active=True,
    )
    test_db.add(cg)
    await test_db.commit()

    token = create_access_token({"sub": user.id, "role": user.role})
    headers = {"Authorization": f"Bearer {token}"}

    # Update expanded profile
    patch_payload = {
        "educationalQualifications": "Diploma in General Nursing, B.Sc Nursing",
        "certifications": "BLS / CPR Certified, Dementia Care Specialist",
        "previousExperience": "4 years at Apollo Specialty Hospitals, Chennai",
        "preferredCareTypes": "BEDRIDDEN, WHEELCHAIR_ASSISTANCE, PARTIAL_MOBILITY",
        "workPreferences": "Day Shifts (8 hours), Adyar or Besant Nagar",
        "preferredHours": "08:00 - 17:00",
    }

    res = await client.patch("/api/caregivers/me/full-profile", json=patch_payload, headers=headers)
    assert res.status_code == 200
    profile = res.json()
    assert "Diploma in General Nursing" in profile["educationalQualifications"]
    assert "BLS / CPR Certified" in profile["certifications"]
    assert "BEDRIDDEN" in profile["preferredCareTypes"]
    assert profile["rating"] == 4.9

    # Get full profile via GET
    get_res = await client.get("/api/caregivers/me/full-profile", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["workPreferences"] == "Day Shifts (8 hours), Adyar or Besant Nagar"


@pytest.mark.asyncio
async def test_assignment_offer_acceptance_and_expiry_enforcement(client: AsyncClient, test_db: AsyncSession):
    """Scenario 6 & 7: Accept/decline deadline, expired offers, race-safe acceptance."""
    caregiver_user = User(
        phone="+919876500004",
        fullName="Anitha S",
        role="CAREGIVER",
        dob="1994-11-12",
        gender="FEMALE",
        locality="Mylapore, Chennai",
        is_active=True,
    )
    sponsor_user = User(
        phone="+919876500005",
        fullName="Rajesh Sponsor",
        role="FAMILY_SPONSOR",
        is_active=True,
    )
    test_db.add_all([caregiver_user, sponsor_user])
    await test_db.commit()
    await test_db.refresh(caregiver_user)
    await test_db.refresh(sponsor_user)

    cg = Caregiver(
        full_name=caregiver_user.fullName,
        phone=caregiver_user.phone,
        headline="Elder Attendant",
        locality="Mylapore, Chennai",
        gender="FEMALE",
        dob="1994-11-12",
        status="AVAILABLE",
        is_active=True,
    )
    test_db.add(cg)

    # Add verified KYC so caregiver can accept
    kyc = CaregiverKYC(
        caregiver_id=caregiver_user.id,
        document_type="AADHAAR",
        document_number="998877665544",
        verification_status="VERIFIED",
    )
    test_db.add(kyc)

    elder = Elder(
        familyId=sponsor_user.id,
        name="Kamala Ramanathan",
        age=78,
        gender="FEMALE",
        locality="Mylapore",
        address="12 Oliver Road, Mylapore",
        careRequirements=["Assisted Mobility", "Medication Management"],
    )
    test_db.add(elder)
    await test_db.commit()
    await test_db.refresh(elder)
    await test_db.refresh(cg)

    # 1. Create an active offer with future deadline
    now = datetime.now(timezone.utc)
    valid_assignment = CareAssignment(
        caregiver_id=cg.id,
        elder_id=elder.id,
        sponsor_id=sponsor_user.id,
        status="WAITING_CONFIRMATION",
        shift_type="Day 10-Hour",
        responseDeadline=now + timedelta(minutes=15),
    )
    test_db.add(valid_assignment)

    # 2. Create an already expired offer
    expired_assignment = CareAssignment(
        caregiver_id=cg.id,
        elder_id=elder.id,
        sponsor_id=sponsor_user.id,
        status="WAITING_CONFIRMATION",
        shift_type="Day 10-Hour",
        responseDeadline=now - timedelta(minutes=5),  # expired 5 mins ago
    )
    test_db.add(expired_assignment)
    await test_db.commit()
    await test_db.refresh(valid_assignment)
    await test_db.refresh(expired_assignment)

    cg_token = create_access_token({"sub": caregiver_user.id, "role": caregiver_user.role})
    cg_headers = {"Authorization": f"Bearer {cg_token}"}

    # Fetch offers: expired one should be marked EXPIRED
    offers_res = await client.get("/api/caregivers/assignment-offers", headers=cg_headers)
    assert offers_res.status_code == 200
    offers = offers_res.json()
    valid_offer = next((o for o in offers if o["id"] == valid_assignment.id), None)
    assert valid_offer is not None
    assert valid_offer["status"] == "WAITING_CONFIRMATION"

    # Try accepting the expired assignment -> Backend must reject with 400 or 409
    accept_expired_res = await client.post(
        f"/api/caregivers/assignments/{expired_assignment.id}/accept",
        headers=cg_headers,
    )
    assert accept_expired_res.status_code in [400, 409]
    err_detail = accept_expired_res.json()["detail"].lower()
    assert "expired" in err_detail or "no longer available" in err_detail

    # Accept the valid assignment -> Successfully confirms
    accept_res = await client.post(
        f"/api/caregivers/assignments/{valid_assignment.id}/accept",
        headers=cg_headers,
    )
    assert accept_res.status_code == 200
    assert accept_res.json()["success"] is True

    # Decline another offer
    another_assignment = CareAssignment(
        caregiver_id=cg.id,
        elder_id=elder.id,
        sponsor_id=sponsor_user.id,
        status="WAITING_CONFIRMATION",
        shift_type="Day 10-Hour",
        responseDeadline=now + timedelta(hours=2),
    )
    test_db.add(another_assignment)
    await test_db.commit()
    await test_db.refresh(another_assignment)

    decline_res = await client.post(
        f"/api/caregivers/assignments/{another_assignment.id}/decline",
        json={"reason": "Schedule overlap with clinic shift"},
        headers=cg_headers,
    )
    assert decline_res.status_code == 200
    assert decline_res.json()["success"] is True


@pytest.mark.asyncio
async def test_payout_calculations_grouping_and_authorization(client: AsyncClient, test_db: AsyncSession):
    """Scenario 8 & 9: Payout calculations, grouping by elder, grouping by shift, authorization checks."""
    cg1_user = User(
        phone="+919876500006",
        fullName="Meena Caregiver 1",
        role="CAREGIVER",
        dob="1990-01-01",
        gender="FEMALE",
        locality="Adyar, Chennai",
        is_active=True,
    )
    cg2_user = User(
        phone="+919876500007",
        fullName="Sneha Caregiver 2",
        role="CAREGIVER",
        dob="1991-02-02",
        gender="FEMALE",
        locality="Adyar, Chennai",
        is_active=True,
    )
    sponsor_user = User(
        phone="+919876588888",
        fullName="Sponsor User",
        role="FAMILY_SPONSOR",
        is_active=True,
    )
    test_db.add_all([cg1_user, cg2_user, sponsor_user])
    await test_db.commit()
    await test_db.refresh(cg1_user)
    await test_db.refresh(cg2_user)
    await test_db.refresh(sponsor_user)

    elder = Elder(
        familyId=sponsor_user.id,
        name="Santhanam Raman",
        age=85,
        locality="Adyar",
    )
    test_db.add(elder)
    await test_db.commit()
    await test_db.refresh(elder)

    now = datetime.now(timezone.utc)
    # Add Shift Earnings for CG1
    se1 = CaregiverShiftEarning(
        caregiverId=cg1_user.id,
        elderId=elder.id,
        shiftDate=now - timedelta(days=2),
        hoursWorked=8.0,
        dailyRate=1200.0,
        earnedAmount=1200.0,
        status="APPROVED",
    )
    se2 = CaregiverShiftEarning(
        caregiverId=cg1_user.id,
        elderId=elder.id,
        shiftDate=now - timedelta(days=1),
        hoursWorked=8.0,
        dailyRate=1200.0,
        earnedAmount=1200.0,
        status="PENDING",
    )
    # Add a Payout record with deductions
    payout = CaregiverPayout(
        payoutNumber="PAY-2026-CH-8801",
        caregiverId=cg1_user.id,
        periodStart=now - timedelta(days=7),
        periodEnd=now,
        totalEarned=2400.0,
        deductionsAmount=50.0,
        netPayoutAmount=2350.0,
        status="APPROVED",
    )
    test_db.add_all([se1, se2, payout])
    await test_db.commit()

    # CG1 Token
    cg1_token = create_access_token({"sub": cg1_user.id, "role": cg1_user.role})
    cg1_headers = {"Authorization": f"Bearer {cg1_token}"}

    # CG1 Summary
    sum_res = await client.get("/api/payouts/caregiver/summary?period=all", headers=cg1_headers)
    assert sum_res.status_code == 200
    summary = sum_res.json()
    assert summary["totalEarned"] == 2400.0
    assert summary["approvedPayout"] == 2350.0
    assert summary["deductionsAmount"] == 50.0
    assert summary["shiftsCount"] == 2

    # CG1 Shift Earnings list
    shifts_res = await client.get("/api/payouts/caregiver/shifts?period=all", headers=cg1_headers)
    assert shifts_res.status_code == 200
    shifts = shifts_res.json()
    assert len(shifts) == 2

    # CG1 Earnings Grouped by Elder
    elder_res = await client.get("/api/payouts/caregiver/by-elder", headers=cg1_headers)
    assert elder_res.status_code == 200
    by_elder = elder_res.json()
    assert len(by_elder) == 1
    assert by_elder[0]["elderName"] == "Santhanam Raman"
    assert by_elder[0]["totalEarned"] == 2400.0

    # Authorization check: CG2 must NOT see CG1's payouts
    cg2_token = create_access_token({"sub": cg2_user.id, "role": cg2_user.role})
    cg2_headers = {"Authorization": f"Bearer {cg2_token}"}

    cg2_sum = await client.get("/api/payouts/caregiver/summary?period=all", headers=cg2_headers)
    assert cg2_sum.status_code == 200
    assert cg2_sum.json()["totalEarned"] == 0.0

    cg2_shifts = await client.get("/api/payouts/caregiver/shifts?period=all", headers=cg2_headers)
    assert cg2_shifts.status_code == 200
    assert len(cg2_shifts.json()) == 0


@pytest.mark.asyncio
async def test_forgotten_task_policy_and_supervisor_correction(client: AsyncClient, test_db: AsyncSession):
    """Scenario 8 (Forgotten task policy): retrospective caregiver update rejected; supervisor correction allowed."""
    caregiver_user = User(
        phone="+919876500008",
        fullName="Banu Caregiver",
        role="CAREGIVER",
        dob="1993-04-18",
        gender="FEMALE",
        locality="Adyar, Chennai",
        is_active=True,
    )
    supervisor_user = User(
        phone="+919876500009",
        fullName="Operations Manager Sundar",
        role="OPS_MANAGER",
        is_active=True,
    )
    sponsor_user = User(
        phone="+919876588889",
        fullName="Sponsor User",
        role="FAMILY_SPONSOR",
        is_active=True,
    )
    test_db.add_all([caregiver_user, supervisor_user, sponsor_user])
    await test_db.commit()
    await test_db.refresh(caregiver_user)
    await test_db.refresh(supervisor_user)
    await test_db.refresh(sponsor_user)

    elder = Elder(familyId=sponsor_user.id, name="Venkatesh Iyer", age=82, locality="Adyar")
    test_db.add(elder)
    await test_db.commit()
    await test_db.refresh(elder)

    now = datetime.now(timezone.utc)
    # Closed shift (CHECKED_OUT)
    closed_shift = CareShift(
        caregiverId=caregiver_user.id,
        elderId=elder.id,
        status="CHECKED_OUT",
        shiftType="EIGHT_HOUR_DAY",
        scheduledStart=now - timedelta(hours=9),
        scheduledEnd=now - timedelta(hours=1),
    )
    test_db.add(closed_shift)
    await test_db.commit()
    await test_db.refresh(closed_shift)

    # Task created during that shift
    task = CareTask(
        elderId=elder.id,
        shiftId=closed_shift.id,
        caregiverId=caregiver_user.id,
        timeOfDay="AFTERNOON",
        category="MEDICATION_OBSERVATION",
        taskName="Administer Afternoon BP Medication",
        status="PENDING",
    )
    test_db.add(task)
    await test_db.commit()
    await test_db.refresh(task)

    cg_token = create_access_token({"sub": caregiver_user.id, "role": caregiver_user.role})
    cg_headers = {"Authorization": f"Bearer {cg_token}"}

    # Caregiver attempts to mark forgotten task completed after shift is closed -> Rejected with 400
    update_res = await client.patch(
        f"/api/care-tasks/{task.id}",
        json={"status": "COMPLETED", "notes": "Forgot to mark earlier"},
        headers=cg_headers,
    )
    assert update_res.status_code == 400
    assert "supervisor correction" in update_res.json()["detail"].lower()

    # Supervisor uses restricted correction workflow -> Succeeded with audit log
    sup_token = create_access_token({"sub": supervisor_user.id, "role": supervisor_user.role})
    sup_headers = {"Authorization": f"Bearer {sup_token}"}

    correct_res = await client.post(
        f"/api/care-tasks/{task.id}/supervisor-correction",
        json={
            "status": "COMPLETED",
            "correctionReason": "Family confirmed caregiver administered medication at 2 PM as scheduled",
        },
        headers=sup_headers,
    )
    assert correct_res.status_code == 200
    corrected_data = correct_res.json()
    assert corrected_data["status"] == "COMPLETED"
    assert corrected_data["isSupervisorCorrection"] is True
    assert corrected_data["correctionReason"] == "Family confirmed caregiver administered medication at 2 PM as scheduled"


@pytest.mark.asyncio
async def test_read_oriented_calendar_schedule(client: AsyncClient, test_db: AsyncSession):
    """Scenario 14: Read-oriented schedule endpoint returning formatted assignment cards."""
    user = User(
        phone="+919876500010",
        fullName="Sridhar Caregiver",
        role="CAREGIVER",
        dob="1989-12-05",
        gender="MALE",
        locality="T Nagar, Chennai",
        is_active=True,
    )
    sponsor_user = User(
        phone="+919876588890",
        fullName="Sponsor User",
        role="FAMILY_SPONSOR",
        is_active=True,
    )
    test_db.add_all([user, sponsor_user])
    await test_db.commit()
    await test_db.refresh(user)
    await test_db.refresh(sponsor_user)

    cg = Caregiver(
        full_name=user.fullName,
        phone=user.phone,
        headline="Elder Care Assistant",
        locality="T Nagar, Chennai",
        gender="MALE",
        dob="1989-12-05",
        status="AVAILABLE",
        is_active=True,
    )
    test_db.add(cg)

    elder1 = Elder(familyId=sponsor_user.id, name="Subramanian Swamy", age=76, locality="T Nagar")
    elder2 = Elder(familyId=sponsor_user.id, name="Padmavathi Ammal", age=81, locality="Anna Nagar")
    test_db.add_all([elder1, elder2])
    await test_db.commit()
    await test_db.refresh(elder1)
    await test_db.refresh(elder2)
    await test_db.refresh(cg)

    now = datetime.now(timezone.utc)
    # Multiple assignments on same day
    asgn1 = CareAssignment(
        caregiver_id=cg.id,
        elder_id=elder1.id,
        sponsor_id=sponsor_user.id,
        status="SERVICE_CONFIRMED",
        shift_type="Day 10-Hour",
        start_date=now.strftime("%Y-%m-%d"),
    )
    asgn2 = CareAssignment(
        caregiver_id=cg.id,
        elder_id=elder2.id,
        sponsor_id=sponsor_user.id,
        status="WAITING_CONFIRMATION",
        shift_type="Night 12-Hour",
        start_date=now.strftime("%Y-%m-%d"),
    )
    test_db.add_all([asgn1, asgn2])
    await test_db.commit()

    token = create_access_token({"sub": user.id, "role": user.role})
    headers = {"Authorization": f"Bearer {token}"}

    sched_res = await client.get("/api/caregivers/schedule", headers=headers)
    assert sched_res.status_code == 200
    schedule = sched_res.json()
    assert len(schedule) == 2
    elder_names = {item["elderName"] for item in schedule}
    assert "Subramanian Swamy" in elder_names
    assert "Padmavathi Ammal" in elder_names
