import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import create_access_token
from app.models.user import User
from app.models.caregiver import Caregiver
from app.models.caregiver_kyc import CaregiverKYC
from app.models.elder import Elder
from app.models.location import ElderLocation
from app.models.assignment import CareAssignment
from app.models.shift import CareShift


# ==============================================================================
# Helpers for KYC Gate Tests
# ==============================================================================

async def create_test_elder(test_db: AsyncSession, sponsor: User, name: str = "Kalyani Ammal", locality: str = "Adyar") -> Elder:
    elder = Elder(
        familyId=sponsor.id,
        sponsor_id=sponsor.id,
        name=name,
        full_name=name,
        age=76,
        gender="FEMALE",
        locality=locality,
        address=f"14/2, 2nd Main Road, {locality}, Chennai",
        shiftPreference="TWELVE_HOUR_DAY",
        care_tier_needed="12-Hour Assisted Care",
        mobilityLevel="ASSISTED_WALKER",
        careRequirements=["Mobility assistance", "Medication reminders", "Daily routine support"],
        personaStatus="SAVED",
    )
    test_db.add(elder)
    await test_db.flush()

    loc = ElderLocation(
        elderId=elder.id,
        addressLine1=f"14/2, 2nd Main Road, {locality}",
        locality=locality,
        city="Chennai",
        state="Tamil Nadu",
        postalCode="600020",
        latitude=13.0012,
        longitude=80.2565,
        serviceable=True,
        verificationStatus="VERIFIED",
    )
    test_db.add(loc)
    await test_db.commit()
    await test_db.refresh(elder)
    return elder


async def create_second_caregiver(test_db: AsyncSession) -> tuple[User, dict]:
    user = User(
        fullName="Ananya Ramanathan",
        phone="+919876500002",
        email="ananya.care@careconnect.in",
        role="CAREGIVER",
        dob="1992-08-20",
        gender="FEMALE",
        locality="Mylapore",
        authProvider="PHONE_OTP",
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)

    token = create_access_token({"sub": user.id, "role": user.role})
    headers = {"Authorization": f"Bearer {token}"}
    return user, headers


# ==============================================================================
# SECTION 1: KYC PENDING BLOCKED FROM WORK
# ==============================================================================

@pytest.mark.asyncio
async def test_caregiver_with_kyc_pending_cannot_view_or_accept_work(
    client: AsyncClient,
    test_db: AsyncSession,
    caregiver_user: User,
    caregiver_headers: dict,
    sponsor_user: User,
):
    """
    Scenario 1: Caregiver with KYC PENDING cannot view actionable available work
    or accept care opportunities (403 Forbidden).
    """
    elder = await create_test_elder(test_db, sponsor_user)

    # Submit KYC (status defaults to PENDING)
    kyc = CaregiverKYC(
        caregiver_id=caregiver_user.id,
        document_type="AADHAAR",
        document_number="987654321012",
        verification_status="PENDING",
    )
    test_db.add(kyc)
    await test_db.commit()

    # Verify eligibility API reports KYC_PENDING
    elig_res = await client.get("/api/caregivers/me/eligibility", headers=caregiver_headers)
    assert elig_res.status_code == 200
    elig_data = elig_res.json()
    assert elig_data["isEligibleForWork"] is False
    assert elig_data["eligibilityState"] == "KYC_PENDING"
    assert elig_data["kycStatus"] == "PENDING"

    # Cannot turn availability ON
    avail_res = await client.patch(
        "/api/caregivers/me/availability",
        headers=caregiver_headers,
        json={"isAvailable": True},
    )
    assert avail_res.status_code == 403
    assert "KYC verification is required" in avail_res.json()["detail"]

    # Cannot view available jobs
    jobs_res = await client.get("/api/caregivers/available-jobs", headers=caregiver_headers)
    assert jobs_res.status_code == 403
    assert "KYC verification is required" in jobs_res.json()["detail"]

    # Cannot accept job
    accept_res = await client.post(
        f"/api/caregivers/available-jobs/{elder.id}/accept",
        headers=caregiver_headers,
    )
    assert accept_res.status_code == 403
    assert "KYC verification is required before accepting care assignments." in accept_res.json()["detail"]


# ==============================================================================
# SECTION 2: KYC REJECTED BLOCKED FROM WORK
# ==============================================================================

@pytest.mark.asyncio
async def test_caregiver_with_kyc_rejected_cannot_accept_work(
    client: AsyncClient,
    test_db: AsyncSession,
    caregiver_user: User,
    caregiver_headers: dict,
    sponsor_user: User,
):
    """
    Scenario 2: Caregiver with KYC REJECTED cannot accept care assignments.
    Must communicate rejection reason.
    """
    elder = await create_test_elder(test_db, sponsor_user)

    # KYC marked as REJECTED with reason
    kyc = CaregiverKYC(
        caregiver_id=caregiver_user.id,
        document_type="PAN",
        document_number="ABCDE1234F",
        verification_status="REJECTED",
        rejection_reason="Document image is blurry and unreadable. Please upload a clear photo.",
    )
    test_db.add(kyc)
    await test_db.commit()

    # Eligibility reports KYC_REJECTED and rejection reason
    elig_res = await client.get("/api/caregivers/me/eligibility", headers=caregiver_headers)
    assert elig_res.status_code == 200
    elig_data = elig_res.json()
    assert elig_data["isEligibleForWork"] is False
    assert elig_data["eligibilityState"] == "KYC_REJECTED"
    assert "blurry and unreadable" in elig_data["rejectionReason"]

    # Attempt to accept work fails with 403
    accept_res = await client.post(
        f"/api/caregivers/available-jobs/{elder.id}/accept",
        headers=caregiver_headers,
    )
    assert accept_res.status_code == 403
    assert "KYC verification is required before accepting care assignments." in accept_res.json()["detail"]


# ==============================================================================
# SECTION 3: KYC VERIFIED ELIGIBLE FOR WORK
# ==============================================================================

@pytest.mark.asyncio
async def test_caregiver_with_kyc_verified_can_access_work_and_accept(
    client: AsyncClient,
    test_db: AsyncSession,
    caregiver_user: User,
    caregiver_headers: dict,
    sponsor_user: User,
):
    """
    Scenario 3: Caregiver with KYC VERIFIED can access available work and accept care assignments.
    """
    elder = await create_test_elder(test_db, sponsor_user, name="Kalyani Ammal", locality="Adyar")

    # KYC VERIFIED
    kyc = CaregiverKYC(
        caregiver_id=caregiver_user.id,
        document_type="AADHAAR",
        document_number="987654321012",
        verification_status="VERIFIED",
    )
    test_db.add(kyc)
    await test_db.commit()

    # Eligibility reports ELIGIBLE_FOR_WORK
    elig_res = await client.get("/api/caregivers/me/eligibility", headers=caregiver_headers)
    assert elig_res.status_code == 200
    elig_data = elig_res.json()
    assert elig_data["isEligibleForWork"] is True
    assert elig_data["eligibilityState"] == "ELIGIBLE_FOR_WORK"
    assert elig_data["kycStatus"] == "VERIFIED"

    # Toggle availability ON succeeds
    avail_res = await client.patch(
        "/api/caregivers/me/availability",
        headers=caregiver_headers,
        json={"isAvailable": True},
    )
    assert avail_res.status_code == 200
    assert avail_res.json()["isAvailable"] is True

    # Available jobs list succeeds
    jobs_res = await client.get("/api/caregivers/available-jobs", headers=caregiver_headers)
    assert jobs_res.status_code == 200
    jobs = jobs_res.json()
    assert len(jobs) > 0
    assert any(j["id"] == elder.id for j in jobs)

    # Job details succeeds
    job_detail_res = await client.get(f"/api/caregivers/available-jobs/{elder.id}", headers=caregiver_headers)
    assert job_detail_res.status_code == 200
    assert job_detail_res.json()["elderName"] == "Kalyani Ammal"

    # Accept care job succeeds
    accept_res = await client.post(
        f"/api/caregivers/available-jobs/{elder.id}/accept",
        headers=caregiver_headers,
    )
    assert accept_res.status_code == 200
    accept_data = accept_res.json()
    assert accept_data["success"] is True
    assert accept_data["shift"]["status"] == "SCHEDULED"
    assert accept_data["elder"]["name"] == "Kalyani Ammal"


# ==============================================================================
# SECTION 4: INCOMPLETE PROFILE BLOCKED
# ==============================================================================

@pytest.mark.asyncio
async def test_caregiver_with_incomplete_profile_cannot_accept(
    client: AsyncClient,
    test_db: AsyncSession,
    sponsor_user: User,
):
    """
    Scenario 4: Caregiver with incomplete profile (missing DOB, gender, or placeholder name)
    cannot accept assignments.
    """
    elder = await create_test_elder(test_db, sponsor_user)

    # Incomplete user: missing DOB and gender
    incomplete_user = User(
        fullName="New Caregiver",
        phone="+919876588888",
        role="CAREGIVER",
        dob=None,
        gender=None,
        authProvider="PHONE_OTP",
    )
    test_db.add(incomplete_user)
    await test_db.commit()
    await test_db.refresh(incomplete_user)

    token = create_access_token({"sub": incomplete_user.id, "role": incomplete_user.role})
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt to accept work fails with 403 Forbidden
    accept_res = await client.post(
        f"/api/caregivers/available-jobs/{elder.id}/accept",
        headers=headers,
    )
    assert accept_res.status_code == 403
    assert "Profile completion is required" in accept_res.json()["detail"]


# ==============================================================================
# SECTION 5: UNAUTHENTICATED USER BLOCKED
# ==============================================================================

@pytest.mark.asyncio
async def test_unauthenticated_user_cannot_access_caregiver_work_apis(
    client: AsyncClient,
    test_db: AsyncSession,
    sponsor_user: User,
):
    """
    Scenario 5: Unauthenticated requests cannot access caregiver work APIs (401 Unauthorized).
    """
    elder = await create_test_elder(test_db, sponsor_user)

    assert (await client.get("/api/caregivers/me/eligibility")).status_code == 401
    assert (await client.get("/api/caregivers/available-jobs")).status_code == 401
    assert (await client.post(f"/api/caregivers/available-jobs/{elder.id}/accept")).status_code == 401
    assert (await client.get("/api/caregivers/me/work-history")).status_code == 401


# ==============================================================================
# SECTION 6: FAMILY USER BLOCKED
# ==============================================================================

@pytest.mark.asyncio
async def test_family_user_cannot_access_caregiver_work_apis(
    client: AsyncClient,
    test_db: AsyncSession,
    sponsor_user: User,
    auth_headers: dict,
):
    """
    Scenario 6: Family user (role FAMILY_SPONSOR) receives 403 Forbidden on caregiver work endpoints.
    """
    elder = await create_test_elder(test_db, sponsor_user)

    # Family sponsor cannot accept work
    res = await client.post(
        f"/api/caregivers/available-jobs/{elder.id}/accept",
        headers=auth_headers,
    )
    assert res.status_code == 403
    assert "CAREGIVER" in res.json()["detail"]

    # Family sponsor cannot set caregiver availability
    res_avail = await client.patch(
        "/api/caregivers/me/availability",
        headers=auth_headers,
        json={"isAvailable": True},
    )
    assert res_avail.status_code == 403


# ==============================================================================
# SECTION 7: CAREGIVER ISOLATION
# ==============================================================================

@pytest.mark.asyncio
async def test_caregiver_a_cannot_modify_caregiver_b_profile(
    client: AsyncClient,
    test_db: AsyncSession,
    caregiver_user: User,
    caregiver_headers: dict,
):
    """
    Scenario 7: Caregiver A cannot modify Caregiver B's profile.
    """
    cg_b_user, _ = await create_second_caregiver(test_db)
    cg_b_record = Caregiver(
        full_name=cg_b_user.fullName,
        phone=cg_b_user.phone,
        headline="Caregiver B",
        locality="Mylapore",
        gender="FEMALE",
    )
    test_db.add(cg_b_record)
    await test_db.commit()
    await test_db.refresh(cg_b_record)

    # Caregiver A tries to modify Caregiver B by ID
    res = await client.patch(
        f"/api/caregivers/{cg_b_record.id}",
        headers=caregiver_headers,
        json={"fullName": "Hacked Name"},
    )
    assert res.status_code == 403
    assert "Unauthorized" in res.json()["detail"]


# ==============================================================================
# SECTION 8: TWO CAREGIVERS ACCEPTING SAME WORK (RACE CONDITION PROTECTION)
# ==============================================================================

@pytest.mark.asyncio
async def test_two_caregivers_accepting_same_work_only_one_succeeds(
    client: AsyncClient,
    test_db: AsyncSession,
    caregiver_user: User,
    caregiver_headers: dict,
    sponsor_user: User,
):
    """
    Scenario 8: If two caregivers attempt to accept the same elder care opportunity,
    only the first succeeds. The second receives 409 Conflict.
    """
    elder = await create_test_elder(test_db, sponsor_user, name="Kalyani Ammal")

    # Give both caregivers VERIFIED KYC
    kyc_a = CaregiverKYC(
        caregiver_id=caregiver_user.id,
        document_type="AADHAAR",
        document_number="987654321012",
        verification_status="VERIFIED",
    )
    test_db.add(kyc_a)

    cg_b_user, cg_b_headers = await create_second_caregiver(test_db)
    kyc_b = CaregiverKYC(
        caregiver_id=cg_b_user.id,
        document_type="PAN",
        document_number="ABCDE1234F",
        verification_status="VERIFIED",
    )
    test_db.add(kyc_b)
    await test_db.commit()

    # Caregiver A accepts first
    res_a = await client.post(
        f"/api/caregivers/available-jobs/{elder.id}/accept",
        headers=caregiver_headers,
    )
    assert res_a.status_code == 200
    assert res_a.json()["success"] is True

    # Caregiver B tries to accept the same elder immediately after
    res_b = await client.post(
        f"/api/caregivers/available-jobs/{elder.id}/accept",
        headers=cg_b_headers,
    )
    assert res_b.status_code == 409
    assert "This care assignment is no longer available." in res_b.json()["detail"]

    # Verify database has exactly 1 CareAssignment for this elder
    asgs = (await test_db.execute(select(CareAssignment).where(CareAssignment.elder_id == elder.id))).scalars().all()
    assert len(asgs) == 1


# ==============================================================================
# SECTION 9: KYC STATUS TRANSITION: PENDING -> VERIFIED
# ==============================================================================

@pytest.mark.asyncio
async def test_kyc_transition_pending_to_verified_makes_caregiver_eligible(
    client: AsyncClient,
    test_db: AsyncSession,
    caregiver_user: User,
    caregiver_headers: dict,
    ops_headers: dict,
    sponsor_user: User,
):
    """
    Scenario 9: When Operations verifies a PENDING caregiver's KYC,
    the caregiver immediately becomes eligible to accept work.
    """
    elder = await create_test_elder(test_db, sponsor_user)

    # 1. Caregiver submits KYC (status PENDING)
    sub_res = await client.post(
        "/api/caregivers/kyc/me",
        headers=caregiver_headers,
        json={"document_type": "AADHAAR", "document_number": "987654321012"},
    )
    assert sub_res.status_code == 201

    # Work is blocked
    block_res = await client.post(
        f"/api/caregivers/available-jobs/{elder.id}/accept",
        headers=caregiver_headers,
    )
    assert block_res.status_code == 403

    # 2. Operations verifies KYC
    patch_res = await client.patch(
        f"/api/caregivers/kyc/{caregiver_user.id}/status",
        headers=ops_headers,
        json={"verification_status": "VERIFIED"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["verification_status"] == "VERIFIED"

    # 3. Caregiver checks eligibility: now ELIGIBLE_FOR_WORK
    elig_res = await client.get("/api/caregivers/me/eligibility", headers=caregiver_headers)
    assert elig_res.status_code == 200
    assert elig_res.json()["isEligibleForWork"] is True
    assert elig_res.json()["eligibilityState"] == "ELIGIBLE_FOR_WORK"

    # 4. Caregiver can now accept work
    accept_res = await client.post(
        f"/api/caregivers/available-jobs/{elder.id}/accept",
        headers=caregiver_headers,
    )
    assert accept_res.status_code == 200
    assert accept_res.json()["success"] is True


# ==============================================================================
# SECTION 10: KYC STATUS TRANSITION: VERIFIED -> REJECTED
# ==============================================================================

@pytest.mark.asyncio
async def test_kyc_transition_verified_to_rejected_blocks_new_work(
    client: AsyncClient,
    test_db: AsyncSession,
    caregiver_user: User,
    caregiver_headers: dict,
    ops_headers: dict,
    sponsor_user: User,
):
    """
    Scenario 10: If a previously verified caregiver's KYC is revoked/rejected by Ops,
    new work acceptance is immediately blocked.
    """
    elder = await create_test_elder(test_db, sponsor_user)

    # Setup initial VERIFIED KYC
    kyc = CaregiverKYC(
        caregiver_id=caregiver_user.id,
        document_type="PASSPORT",
        document_number="A1234567",
        verification_status="VERIFIED",
    )
    test_db.add(kyc)
    await test_db.commit()

    # Ops revokes / rejects KYC
    patch_res = await client.patch(
        f"/api/caregivers/kyc/{caregiver_user.id}/status",
        headers=ops_headers,
        json={
            "verification_status": "REJECTED",
            "rejection_reason": "Expired passport document. Please submit valid Aadhaar or voter ID.",
        },
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["verification_status"] == "REJECTED"

    # Caregiver acceptance is immediately blocked
    accept_res = await client.post(
        f"/api/caregivers/available-jobs/{elder.id}/accept",
        headers=caregiver_headers,
    )
    assert accept_res.status_code == 403
    assert "KYC verification is required before accepting care assignments." in accept_res.json()["detail"]
