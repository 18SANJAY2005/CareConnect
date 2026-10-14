import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import create_access_token
from app.models.user import User
from app.models.caregiver import Caregiver
from app.models.caregiver_kyc import CaregiverKYC


@pytest.mark.asyncio
async def test_admin_login_endpoint(client: AsyncClient, test_db: AsyncSession):
    """Test POST /api/auth/admin/login returns a valid JWT token with ADMIN role."""
    res = await client.post(
        "/api/auth/admin/login",
        json={"email": "admin@careconnect.com", "password": "admin123"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["role"] == "ADMIN"


@pytest.mark.asyncio
async def test_admin_can_verify_pending_kyc_and_updates_status(
    client: AsyncClient,
    caregiver_user: User,
    caregiver_headers: dict,
    admin_user: User,
    admin_headers: dict,
    test_db: AsyncSession,
):
    """
    Requirement 1 & 2:
    - Caregiver uploads KYC -> status is PENDING.
    - Admin can verify pending KYC.
    - KYC status changes from PENDING to VERIFIED.
    """
    # 1. Caregiver submits KYC
    kyc_payload = {
        "document_type": "AADHAAR",
        "document_number": "541278963214",
        "document_storage_reference": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    }
    submit_res = await client.post(
        "/api/caregivers/kyc/me",
        json=kyc_payload,
        headers=caregiver_headers,
    )
    assert submit_res.status_code == 201
    assert submit_res.json()["verification_status"] == "PENDING"

    # 2. Admin verifies KYC
    verify_res = await client.patch(
        f"/api/caregivers/kyc/{caregiver_user.id}/status",
        json={"verification_status": "VERIFIED"},
        headers=admin_headers,
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["verification_status"] == "VERIFIED"

    # 3. Verify database state
    kyc_db = (
        await test_db.execute(
            select(CaregiverKYC).where(CaregiverKYC.caregiver_id == caregiver_user.id)
        )
    ).scalars().first()
    assert kyc_db is not None
    assert kyc_db.verification_status == "VERIFIED"
    assert kyc_db.verified_by_id == admin_user.id
    assert kyc_db.verified_at is not None


@pytest.mark.asyncio
async def test_verified_caregiver_becomes_eligible_for_work(
    client: AsyncClient,
    caregiver_user: User,
    caregiver_headers: dict,
    admin_headers: dict,
    test_db: AsyncSession,
):
    """
    Requirement 3 & 4:
    - Pending caregiver remains blocked from work.
    - Verified caregiver becomes ELIGIBLE_FOR_WORK.
    """
    # Submit KYC (PENDING)
    await client.post(
        "/api/caregivers/kyc/me",
        json={"document_type": "AADHAAR", "document_number": "123456789012"},
        headers=caregiver_headers,
    )

    # Check eligibility while PENDING -> MUST BE BLOCKED
    elig_pending = await client.get("/api/caregivers/me/eligibility", headers=caregiver_headers)
    assert elig_pending.status_code == 200
    assert elig_pending.json()["isEligibleForWork"] is False
    assert elig_pending.json()["eligibilityState"] == "KYC_PENDING"

    # Attempt to turn availability ON while pending -> BLOCKED with 403
    avail_blocked = await client.patch(
        "/api/caregivers/me/availability",
        json={"isAvailable": True},
        headers=caregiver_headers,
    )
    assert avail_blocked.status_code == 403

    # Admin verifies KYC
    await client.patch(
        f"/api/caregivers/kyc/{caregiver_user.id}/status",
        json={"verification_status": "VERIFIED"},
        headers=admin_headers,
    )

    # Check eligibility after VERIFICATION -> MUST BE ELIGIBLE_FOR_WORK
    elig_verified = await client.get("/api/caregivers/me/eligibility", headers=caregiver_headers)
    assert elig_verified.status_code == 200
    assert elig_verified.json()["isEligibleForWork"] is True
    assert elig_verified.json()["eligibilityState"] == "ELIGIBLE_FOR_WORK"

    # Attempt to turn availability ON now -> SUCCEEDS
    avail_allowed = await client.patch(
        "/api/caregivers/me/availability",
        json={"isAvailable": True},
        headers=caregiver_headers,
    )
    assert avail_allowed.status_code == 200
    assert avail_allowed.json()["isAvailable"] is True


@pytest.mark.asyncio
async def test_rejected_caregiver_remains_blocked(
    client: AsyncClient,
    caregiver_user: User,
    caregiver_headers: dict,
    ops_headers: dict,
    test_db: AsyncSession,
):
    """
    Requirement 5:
    - Rejected caregiver remains blocked.
    """
    # Submit KYC
    await client.post(
        "/api/caregivers/kyc/me",
        json={"document_type": "PAN", "document_number": "ABCDE1234F"},
        headers=caregiver_headers,
    )

    # Ops rejects KYC with reason
    reject_res = await client.patch(
        f"/api/caregivers/kyc/{caregiver_user.id}/status",
        json={"verification_status": "REJECTED", "rejection_reason": "Document photo blurry"},
        headers=ops_headers,
    )
    assert reject_res.status_code == 200
    assert reject_res.json()["verification_status"] == "REJECTED"
    assert reject_res.json()["rejection_reason"] == "Document photo blurry"

    # Eligibility check -> KYC_REJECTED and isEligibleForWork False
    elig_res = await client.get("/api/caregivers/me/eligibility", headers=caregiver_headers)
    assert elig_res.status_code == 200
    assert elig_res.json()["isEligibleForWork"] is False
    assert elig_res.json()["eligibilityState"] == "KYC_REJECTED"
    assert "Document photo blurry" in elig_res.json()["message"]


@pytest.mark.asyncio
async def test_non_admin_and_self_caregiver_cannot_verify_kyc(
    client: AsyncClient,
    caregiver_user: User,
    caregiver_headers: dict,
    auth_headers: dict,
    test_db: AsyncSession,
):
    """
    Requirement 6 & 7:
    - Non-admin (family user) cannot verify KYC (403 Forbidden).
    - Caregiver cannot verify their own KYC (403 Forbidden).
    """
    # Caregiver submits KYC
    await client.post(
        "/api/caregivers/kyc/me",
        json={"document_type": "AADHAAR", "document_number": "112233445566"},
        headers=caregiver_headers,
    )

    # Caregiver attempts to verify own KYC -> 403 Forbidden
    self_verify = await client.patch(
        f"/api/caregivers/kyc/{caregiver_user.id}/status",
        json={"verification_status": "VERIFIED"},
        headers=caregiver_headers,
    )
    assert self_verify.status_code == 403

    # Family sponsor attempts to verify KYC -> 403 Forbidden
    sponsor_verify = await client.patch(
        f"/api/caregivers/kyc/{caregiver_user.id}/status",
        json={"verification_status": "VERIFIED"},
        headers=auth_headers,
    )
    assert sponsor_verify.status_code == 403

    # Unauthenticated request -> 401 Unauthorized
    unauth_verify = await client.patch(
        f"/api/caregivers/kyc/{caregiver_user.id}/status",
        json={"verification_status": "VERIFIED"},
    )
    assert unauth_verify.status_code == 401


@pytest.mark.asyncio
async def test_verify_operation_updates_correct_caregiver_only(
    client: AsyncClient,
    caregiver_user: User,
    caregiver_headers: dict,
    admin_headers: dict,
    test_db: AsyncSession,
):
    """
    Requirement 8:
    - Verify operation updates the target caregiver only, leaving others unaffected.
    """
    # Create Caregiver 2
    cg2_user = User(
        fullName="Kavitha Ram",
        phone="+919876500099",
        role="CAREGIVER",
        dob="1992-04-12",
        gender="FEMALE",
        locality="Mylapore",
        authProvider="PHONE_OTP",
    )
    test_db.add(cg2_user)
    await test_db.commit()
    await test_db.refresh(cg2_user)
    cg2_token = create_access_token({"sub": cg2_user.id, "role": cg2_user.role})
    cg2_headers = {"Authorization": f"Bearer {cg2_token}"}

    # Both submit KYC
    await client.post(
        "/api/caregivers/kyc/me",
        json={"document_type": "AADHAAR", "document_number": "111122223333"},
        headers=caregiver_headers,
    )
    await client.post(
        "/api/caregivers/kyc/me",
        json={"document_type": "AADHAAR", "document_number": "444455556666"},
        headers=cg2_headers,
    )

    # Admin verifies only Caregiver 1
    res = await client.patch(
        f"/api/caregivers/kyc/{caregiver_user.id}/status",
        json={"verification_status": "VERIFIED"},
        headers=admin_headers,
    )
    assert res.status_code == 200

    # Caregiver 1 is VERIFIED
    kyc1 = (await test_db.execute(select(CaregiverKYC).where(CaregiverKYC.caregiver_id == caregiver_user.id))).scalars().first()
    assert kyc1.verification_status == "VERIFIED"

    # Caregiver 2 is still PENDING
    kyc2 = (await test_db.execute(select(CaregiverKYC).where(CaregiverKYC.caregiver_id == cg2_user.id))).scalars().first()
    assert kyc2.verification_status == "PENDING"


@pytest.mark.asyncio
async def test_duplicate_verification_is_handled_safely(
    client: AsyncClient,
    caregiver_user: User,
    caregiver_headers: dict,
    admin_headers: dict,
    test_db: AsyncSession,
):
    """
    Requirement 9:
    - Duplicate verification click is idempotent and handled safely.
    """
    await client.post(
        "/api/caregivers/kyc/me",
        json={"document_type": "AADHAAR", "document_number": "778899001122"},
        headers=caregiver_headers,
    )

    # First verify
    res1 = await client.patch(
        f"/api/caregivers/kyc/{caregiver_user.id}/status",
        json={"verification_status": "VERIFIED"},
        headers=admin_headers,
    )
    assert res1.status_code == 200
    assert res1.json()["verification_status"] == "VERIFIED"

    # Duplicate verify call
    res2 = await client.patch(
        f"/api/caregivers/kyc/{caregiver_user.id}/status",
        json={"verification_status": "VERIFIED"},
        headers=admin_headers,
    )
    assert res2.status_code == 200
    assert res2.json()["verification_status"] == "VERIFIED"


@pytest.mark.asyncio
async def test_admin_list_caregivers_includes_live_kyc_data(
    client: AsyncClient,
    caregiver_user: User,
    caregiver_headers: dict,
    admin_headers: dict,
    test_db: AsyncSession,
):
    """
    Test GET /api/caregivers/admin/all:
    Returns the caregiver with their live KYC status and masked document number.
    """
    await client.post(
        "/api/caregivers/kyc/me",
        json={"document_type": "AADHAAR", "document_number": "998877665544"},
        headers=caregiver_headers,
    )

    list_res = await client.get("/api/caregivers/admin/all", headers=admin_headers)
    assert list_res.status_code == 200
    data = list_res.json()
    assert isinstance(data, list)
    assert len(data) > 0

    # Find the caregiver in the returned list
    cg_entry = next((c for c in data if c["phone"] == caregiver_user.phone), None)
    assert cg_entry is not None
    assert cg_entry["kycStatus"] == "PENDING"
    assert cg_entry["documentType"] == "AADHAAR"
    assert "XXXX" in cg_entry["maskedDocumentNumber"]


@pytest.mark.asyncio
async def test_caregiver_app_recognizes_verified_state_after_refresh_or_login(
    client: AsyncClient,
    caregiver_user: User,
    caregiver_headers: dict,
    admin_headers: dict,
    test_db: AsyncSession,
):
    """
    Requirement 10:
    - Caregiver app recognizes VERIFIED state after refresh/login.
    - Profile Complete + KYC Verified + Active => ELIGIBLE_FOR_WORK.
    """
    # Caregiver submits KYC
    await client.post(
        "/api/caregivers/kyc/me",
        json={"document_type": "AADHAAR", "document_number": "556677889900"},
        headers=caregiver_headers,
    )

    # Initial check: PENDING
    res_before = await client.get("/api/caregivers/me/eligibility", headers=caregiver_headers)
    assert res_before.status_code == 200
    assert res_before.json()["eligibilityState"] == "KYC_PENDING"
    assert res_before.json()["isEligibleForWork"] is False

    # Admin verifies KYC
    verify_res = await client.patch(
        f"/api/caregivers/kyc/{caregiver_user.id}/status",
        json={"verification_status": "VERIFIED"},
        headers=admin_headers,
    )
    assert verify_res.status_code == 200

    # Simulate fresh login / session reload:
    # 1. Fetch profile
    me_res = await client.get("/api/me", headers=caregiver_headers)
    assert me_res.status_code == 200
    assert me_res.json()["phone"] == caregiver_user.phone

    # 2. Refetch eligibility
    res_after = await client.get("/api/caregivers/me/eligibility", headers=caregiver_headers)
    assert res_after.status_code == 200
    assert res_after.json()["eligibilityState"] == "ELIGIBLE_FOR_WORK"
    assert res_after.json()["isEligibleForWork"] is True
    assert res_after.json()["kycStatus"] == "VERIFIED"
    assert res_after.json()["isProfileComplete"] is True


@pytest.mark.asyncio
async def test_verify_with_invalid_caregiver_id_returns_404(
    client: AsyncClient,
    admin_headers: dict,
):
    """Failure test: Admin verifying non-existent caregiver returns 404."""
    res = await client.patch(
        "/api/caregivers/kyc/non-existent-uuid-99999/status",
        json={"verification_status": "VERIFIED"},
        headers=admin_headers,
    )
    assert res.status_code == 404
    assert "Caregiver KYC record not found." in res.json()["detail"]


@pytest.mark.asyncio
async def test_incomplete_profile_remains_blocked_even_if_kyc_verified(
    client: AsyncClient,
    caregiver_headers: dict,
    admin_headers: dict,
    test_db: AsyncSession,
):
    """
    Security Invariant Test:
    Even if KYC is VERIFIED, if the caregiver's profile is incomplete,
    they must remain blocked with PROFILE_INCOMPLETE.
    """
    # Create caregiver with incomplete profile (missing dob, gender, locality)
    incomplete_cg = User(
        fullName="Incomplete User",
        phone="+919876544321",
        role="CAREGIVER",
        authProvider="PHONE_OTP",
    )
    test_db.add(incomplete_cg)
    await test_db.commit()
    await test_db.refresh(incomplete_cg)

    inc_token = create_access_token({"sub": incomplete_cg.id, "role": incomplete_cg.role})
    inc_headers = {"Authorization": f"Bearer {inc_token}"}

    # Incomplete caregiver submits KYC
    await client.post(
        "/api/caregivers/kyc/me",
        json={"document_type": "AADHAAR", "document_number": "112233445566"},
        headers=inc_headers,
    )

    # Admin verifies their KYC
    await client.patch(
        f"/api/caregivers/kyc/{incomplete_cg.id}/status",
        json={"verification_status": "VERIFIED"},
        headers=admin_headers,
    )

    # Eligibility check MUST STILL BE BLOCKED
    elig_res = await client.get("/api/caregivers/me/eligibility", headers=inc_headers)
    assert elig_res.status_code == 200
    assert elig_res.json()["isEligibleForWork"] is False
    assert elig_res.json()["eligibilityState"] == "PROFILE_INCOMPLETE"


@pytest.mark.asyncio
async def test_inactive_caregiver_remains_blocked_even_if_kyc_verified(
    client: AsyncClient,
    caregiver_user: User,
    caregiver_headers: dict,
    admin_headers: dict,
    test_db: AsyncSession,
):
    """
    Security Invariant Test:
    Even if KYC is VERIFIED and profile is complete, if caregiver is inactive,
    they must remain blocked with INACTIVE.
    """
    # Submit KYC
    await client.post(
        "/api/caregivers/kyc/me",
        json={"document_type": "AADHAAR", "document_number": "112233445566"},
        headers=caregiver_headers,
    )

    # Admin verifies KYC
    await client.patch(
        f"/api/caregivers/kyc/{caregiver_user.id}/status",
        json={"verification_status": "VERIFIED"},
        headers=admin_headers,
    )

    # Deactivate caregiver
    caregiver_user.is_active = False
    await test_db.commit()

    # Eligibility check MUST BE BLOCKED
    elig_res = await client.get("/api/caregivers/me/eligibility", headers=caregiver_headers)
    assert elig_res.status_code == 200
    assert elig_res.json()["isEligibleForWork"] is False
    assert elig_res.json()["eligibilityState"] == "INACTIVE"


@pytest.mark.asyncio
async def test_admin_can_verify_by_directory_caregiver_id(
    client: AsyncClient,
    caregiver_user: User,
    caregiver_headers: dict,
    admin_headers: dict,
    test_db: AsyncSession,
):
    """
    Test verifying KYC using directory Caregiver.id (integer),
    resolving the phone/User mapping correctly.
    """
    # Create directory Caregiver record linked by phone
    cg_dir = Caregiver(
        full_name=caregiver_user.fullName,
        headline="Experienced Nurse",
        phone=caregiver_user.phone,
        locality="Adyar",
        is_identity_verified=False,
    )
    test_db.add(cg_dir)
    await test_db.commit()
    await test_db.refresh(cg_dir)

    # Caregiver submits KYC
    await client.post(
        "/api/caregivers/kyc/me",
        json={"document_type": "AADHAAR", "document_number": "990011223344"},
        headers=caregiver_headers,
    )

    # Admin verifies using directory Caregiver.id (integer string)
    verify_res = await client.patch(
        f"/api/caregivers/kyc/{cg_dir.id}/status",
        json={"verification_status": "VERIFIED"},
        headers=admin_headers,
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["verification_status"] == "VERIFIED"

    # Directory record should have is_identity_verified updated
    await test_db.refresh(cg_dir)
    assert cg_dir.is_identity_verified is True

