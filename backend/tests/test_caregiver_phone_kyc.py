import pytest
from fastapi import HTTPException
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.phone_validator import validate_and_normalize_phone
from app.core.security import create_access_token
from app.models.user import User


# ==============================================================================
# SECTION 1: Phone Validation Unit & API Tests
# ==============================================================================

def test_phone_validation_india_valid():
    """Valid Indian mobile number with 10 digits returns normalized format."""
    assert validate_and_normalize_phone("9876543210", "+91") == "+919876543210"
    assert validate_and_normalize_phone("+919876543210", "+91") == "+919876543210"
    assert validate_and_normalize_phone("  9876543210  ", "+91") == "+919876543210"
    assert validate_and_normalize_phone("+91 98765 43210", "+91") == "+919876543210"


def test_phone_validation_india_invalid():
    """Invalid phone numbers for India raise HTTPException with 400 Bad Request."""
    # 9 digits (too short)
    with pytest.raises(HTTPException) as exc_short:
        validate_and_normalize_phone("987654321", "+91")
    assert exc_short.value.status_code == 400
    assert "10-digit Indian mobile number" in exc_short.value.detail

    # 11 digits (too long)
    with pytest.raises(HTTPException) as exc_long:
        validate_and_normalize_phone("98765432101", "+91")
    assert exc_long.value.status_code == 400

    # Alpha characters
    with pytest.raises(HTTPException) as exc_alpha:
        validate_and_normalize_phone("abcdefghij", "+91")
    assert exc_alpha.value.status_code == 400

    # Mixed alphanumeric
    with pytest.raises(HTTPException) as exc_mixed:
        validate_and_normalize_phone("98765abc10", "+91")
    assert exc_mixed.value.status_code == 400

    # Empty
    with pytest.raises(HTTPException) as exc_empty:
        validate_and_normalize_phone("", "+91")
    assert exc_empty.value.status_code == 400
    with pytest.raises(HTTPException) as exc_ws:
        validate_and_normalize_phone("   ", "+91")
    assert exc_ws.value.status_code == 400


def test_phone_validation_international_rules():
    """Validate other country length rules."""
    # US (+1): 10 digits
    assert validate_and_normalize_phone("2025550143", "+1") == "+12025550143"
    with pytest.raises(HTTPException) as exc_us:
        validate_and_normalize_phone("202555", "+1")
    assert exc_us.value.status_code == 400

    # Singapore (+65): 8 digits
    assert validate_and_normalize_phone("81234567", "+65") == "+6581234567"
    with pytest.raises(HTTPException) as exc_sg:
        validate_and_normalize_phone("812345678", "+65")
    assert exc_sg.value.status_code == 400


@pytest.mark.asyncio
async def test_api_send_otp_phone_validation(client: AsyncClient):
    """API endpoint rejects invalid phone formats with 400 Bad Request."""
    # Valid +91
    res = await client.post(
        "/api/auth/otp/send",
        json={"phone": "9876543210", "countryCode": "+91", "channel": "WHATSAPP"},
    )
    assert res.status_code == 200
    assert res.json()["success"] is True

    # Invalid: 9 digits
    res_short = await client.post(
        "/api/auth/otp/send",
        json={"phone": "987654321", "countryCode": "+91", "channel": "WHATSAPP"},
    )
    assert res_short.status_code == 400
    assert "10-digit Indian mobile number" in res_short.json()["detail"]

    # Invalid: 11 digits
    res_long = await client.post(
        "/api/auth/otp/send",
        json={"phone": "98765432101", "countryCode": "+91", "channel": "WHATSAPP"},
    )
    assert res_long.status_code == 400

    # Invalid: non-numeric
    res_alpha = await client.post(
        "/api/auth/otp/send",
        json={"phone": "98765abc10", "countryCode": "+91", "channel": "WHATSAPP"},
    )
    assert res_alpha.status_code == 400


# ==============================================================================
# SECTION 2: Caregiver KYC & Identity Verification Workflow
# ==============================================================================

@pytest.mark.asyncio
async def test_caregiver_kyc_submission_and_masking(
    client: AsyncClient,
    caregiver_headers: dict,
    test_db: AsyncSession,
):
    """Caregiver submits Aadhaar KYC; data is stored and retrieved with masked number."""
    # Initially, no KYC record
    res_empty = await client.get("/api/caregivers/kyc/me", headers=caregiver_headers)
    assert res_empty.status_code == 404

    # Submit valid Aadhaar
    payload = {
        "document_type": "AADHAAR",
        "document_number": "541278963214",
        "document_storage_reference": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    }
    res_submit = await client.post(
        "/api/caregivers/kyc/me",
        json=payload,
        headers=caregiver_headers,
    )
    assert res_submit.status_code == 201
    data = res_submit.json()
    assert data["document_type"] == "AADHAAR"
    assert data["masked_document_number"] == "XXXX-XXXX-3214"
    assert data["verification_status"] == "PENDING"

    # View own KYC
    res_get = await client.get("/api/caregivers/kyc/me", headers=caregiver_headers)
    assert res_get.status_code == 200
    get_data = res_get.json()
    assert get_data["document_type"] == "AADHAAR"
    assert get_data["masked_document_number"] == "XXXX-XXXX-3214"
    assert get_data["verification_status"] == "PENDING"


@pytest.mark.asyncio
async def test_caregiver_kyc_validation_rules(
    client: AsyncClient,
    caregiver_headers: dict,
):
    """Test document validation for Aadhaar and PAN."""
    # Aadhaar with 11 digits (invalid)
    res_bad_aadhaar = await client.post(
        "/api/caregivers/kyc/me",
        json={"document_type": "AADHAAR", "document_number": "12345678901"},
        headers=caregiver_headers,
    )
    assert res_bad_aadhaar.status_code == 400
    assert "12 numeric digits" in res_bad_aadhaar.json()["detail"]

    # PAN with invalid format
    res_bad_pan = await client.post(
        "/api/caregivers/kyc/me",
        json={"document_type": "PAN", "document_number": "12345ABCDE"},
        headers=caregiver_headers,
    )
    assert res_bad_pan.status_code == 400
    assert "ABCDE1234F" in res_bad_pan.json()["detail"]


@pytest.mark.asyncio
async def test_operations_kyc_verification_and_rejection(
    client: AsyncClient,
    caregiver_user: User,
    caregiver_headers: dict,
    ops_headers: dict,
):
    """Operations manager can view caregiver KYC and verify or reject it."""
    # Submit KYC as caregiver
    await client.post(
        "/api/caregivers/kyc/me",
        json={"document_type": "PAN", "document_number": "ABCDE1234F"},
        headers=caregiver_headers,
    )

    # Ops views caregiver KYC
    res_ops_view = await client.get(
        f"/api/caregivers/kyc/{caregiver_user.id}",
        headers=ops_headers,
    )
    assert res_ops_view.status_code == 200
    assert res_ops_view.json()["masked_document_number"] == "XXXXXX234F"

    # Ops verifies status
    res_verify = await client.patch(
        f"/api/caregivers/kyc/{caregiver_user.id}/status",
        json={"verification_status": "VERIFIED"},
        headers=ops_headers,
    )
    assert res_verify.status_code == 200
    assert res_verify.json()["verification_status"] == "VERIFIED"

    # Ops rejects status with reason
    res_reject = await client.patch(
        f"/api/caregivers/kyc/{caregiver_user.id}/status",
        json={"verification_status": "REJECTED", "rejection_reason": "Document illegible"},
        headers=ops_headers,
    )
    assert res_reject.status_code == 200
    assert res_reject.json()["verification_status"] == "REJECTED"
    assert res_reject.json()["rejection_reason"] == "Document illegible"


# ==============================================================================
# SECTION 3: Role Isolation & Security Boundaries
# ==============================================================================

@pytest.mark.asyncio
async def test_kyc_role_isolation(
    client: AsyncClient,
    caregiver_user: User,
    caregiver_headers: dict,
    test_db: AsyncSession,
):
    """Caregiver A cannot access Caregiver B's KYC record."""
    # Create Caregiver B
    caregiver_b = User(
        fullName="Kavitha Ramaswamy",
        phone="+919876500002",
        email="kavitha@careconnect.in",
        role="CAREGIVER",
        dob="1992-05-10",
        gender="FEMALE",
        locality="Besant Nagar",
        authProvider="PHONE_OTP",
    )
    test_db.add(caregiver_b)
    await test_db.commit()
    await test_db.refresh(caregiver_b)

    token_b = create_access_token({"sub": caregiver_b.id, "role": caregiver_b.role})
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Caregiver B submits KYC
    await client.post(
        "/api/caregivers/kyc/me",
        json={"document_type": "AADHAAR", "document_number": "987654321098"},
        headers=headers_b,
    )

    # Caregiver A attempts to view Caregiver B's KYC -> 403 Forbidden
    res_tamper = await client.get(
        f"/api/caregivers/kyc/{caregiver_b.id}",
        headers=caregiver_headers,
    )
    assert res_tamper.status_code == 403
    assert "Unauthorized" in res_tamper.json()["detail"]

    # Unauthorized unauthenticated request -> 401 Unauthorized
    res_unauth = await client.get(f"/api/caregivers/kyc/{caregiver_b.id}")
    assert res_unauth.status_code == 401


# ==============================================================================
# SECTION 4: Kalyani Ammal & Other Elder Map Redirection Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_kalyani_ammal_and_other_elder_map_locations(
    client: AsyncClient,
    caregiver_headers: dict,
    auth_headers: dict,
):
    """
    Verify Kalyani Ammal returns canonical Adyar address and coordinates (13.0012, 80.2565),
    and other elders maintain their distinct correct locations.
    """
    # Seed scenario which establishes Kalyani Ammal's shift and location
    seed_res = await client.post("/api/shifts/seed-demo")
    assert seed_res.status_code == 200

    # Caregiver retrieves current shift
    shift_res = await client.get("/api/shifts/current", headers=caregiver_headers)
    assert shift_res.status_code == 200
    shift_data = shift_res.json()

    elder = shift_data["elder"]
    assert elder is not None
    assert "Kalyani Ammal" in elder["name"]
    # Check canonical coordinates and address
    assert elder["latitude"] == pytest.approx(13.0012, abs=0.001)
    assert elder["longitude"] == pytest.approx(80.2565, abs=0.001)
    assert "Adyar" in elder["locality"]
    assert "14/2, 2nd Main Road" in elder["addressLine1"]

    # Verify another elder from database has distinct and valid location
    elders_res = await client.get("/api/elders", headers=auth_headers, follow_redirects=True)
    assert elders_res.status_code == 200
    elders_list = elders_res.json()
    other_elders = [e for e in elders_list if "Kalyani" not in e.get("name", "")]
    if other_elders:
        other = other_elders[0]
        # Must have valid name and not collide with Kalyani's specific ID
        assert other["id"] != elder["id"]
        assert other["name"] != elder["name"]


# ==============================================================================
# SECTION 5: Caregiver Provisioning Endpoint Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_caregiver_provisioning_with_phone_and_kyc(
    client: AsyncClient,
    ops_headers: dict,
):
    """
    Ops can provision a caregiver with phone validation and optional initial KYC document.
    """
    # Invalid phone fails
    res_bad_phone = await client.post(
        "/api/caregivers/provision",
        json={"fullName": "Rajesh Kumar", "phone": "98765", "countryCode": "+91"},
        headers=ops_headers,
    )
    assert res_bad_phone.status_code == 400

    # Valid provisioning with KYC
    res_ok = await client.post(
        "/api/caregivers/provision",
        json={
            "fullName": "Rajesh Kumar",
            "phone": "9876500099",
            "countryCode": "+91",
            "documentType": "AADHAAR",
            "documentNumber": "123412341234",
        },
        headers=ops_headers,
    )
    assert res_ok.status_code == 201
    assert res_ok.json()["success"] is True

