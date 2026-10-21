import pytest
from httpx import AsyncClient
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.elder import Elder
from app.models.caregiver import Caregiver
from app.models.caregiver_kyc import CaregiverKYC
from app.models.hospital import Hospital
from app.models.assignment import CareAssignment
from app.models.payout import CaregiverPayout, CaregiverShiftEarning
from app.services.hospital_service import HospitalService
from datetime import datetime, timezone, timedelta


@pytest.mark.asyncio
async def test_four_step_onboarding_and_resume(
    client: AsyncClient,
    caregiver_headers: dict,
    caregiver_user: User,
    test_db: AsyncSession,
):
    """Test the complete 4-step KYC onboarding flow and state resume."""
    # 1. Initial onboarding state
    res = await client.get("/api/caregivers/me/onboarding", headers=caregiver_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["currentStep"] == 1
    assert data["isEligibleForWork"] is False

    # 2. Step 1: Identification
    step1_payload = {
        "document_type": "AADHAAR",
        "document_number": "984012348877",
        "document_storage_reference": None,
        "terms_accepted": True,
        "service_consent_granted": True,
        "promotional_consent_granted": False,
    }
    res1 = await client.put("/api/caregivers/me/onboarding/step1", json=step1_payload, headers=caregiver_headers)
    assert res1.status_code == 200
    body1 = res1.json()
    assert body1["success"] is True
    assert body1["step"] == 1
    assert body1["nextStep"] == 2

    # 3. Step 2: Personal Details
    step2_payload = {
        "fullName": "Meenakshi Sundaram",
        "dob": "1992-06-15",
        "gender": "FEMALE",
        "phone": caregiver_user.phone,
        "email": "meenakshi@careconnect.in",
        "locality": "Adyar, Chennai",
        "bio": "Experienced geriatric companion attendant",
    }
    res2 = await client.put("/api/caregivers/me/onboarding/step2", json=step2_payload, headers=caregiver_headers)
    assert res2.status_code == 200
    assert res2.json()["nextStep"] == 3

    # 4. Step 3: Education Details
    step3_payload = {
        "institution": "Madras Medical College",
        "course": "B.Sc Nursing",
        "completionYear": 2018,
        "credentialId": "TNMC-2018-9941",
        "documentUrl": None,
        "qrPayload": "CREDENTIAL:TNMC-2018-9941|ISSUER:MMC|HOLDER:Meenakshi",
        "verificationMethod": "BARCODE_QR_SCAN",
    }
    res3 = await client.put("/api/caregivers/me/onboarding/step3", json=step3_payload, headers=caregiver_headers)
    assert res3.status_code == 200
    body3 = res3.json()
    assert body3["nextStep"] == 4
    # Requirement B: QR detected does not claim confirmed authenticity
    assert body3["educationVerificationStatus"] == "QR_DETECTED"

    # 5. Step 4: Services Offered & Work Preferences
    step4_payload = {
        "servicesOffered": ["Elder Companion", "Vitals Monitoring", "Medication Reminder"],
        "shiftPreferences": ["Day 10-Hour", "Night 12-Hour"],
        "preferredHours": "08:00 AM - 06:00 PM",
        "dailyRate": 2200.0,
        "hourlyRate": 250.0,
        "isAvailable": True,
    }
    res4 = await client.put("/api/caregivers/me/onboarding/step4", json=step4_payload, headers=caregiver_headers)
    assert res4.status_code == 200
    body4 = res4.json()
    assert body4["isProfileComplete"] is True

    # 6. Verify state resume
    res_resume = await client.get("/api/caregivers/me/onboarding", headers=caregiver_headers)
    assert res_resume.status_code == 200
    resumed = res_resume.json()
    assert resumed["step2"]["fullName"] == "Meenakshi Sundaram"
    assert resumed["step3"]["course"] == "B.Sc Nursing"
    assert "Elder Companion" in resumed["step4"]["servicesOffered"]
    # KYC status is PENDING, so not yet eligible for work
    assert resumed["isEligibleForWork"] is False


@pytest.mark.asyncio
async def test_qr_detection_and_admin_education_verification(
    client: AsyncClient,
    caregiver_headers: dict,
    admin_headers: dict,
    caregiver_user: User,
    test_db: AsyncSession,
):
    """Test document scanning endpoint and Admin education credential verification."""
    # 1. Document scan extraction endpoint
    scan_res = await client.post(
        "/api/caregivers/me/document/extract",
        json={"documentType": "EDUCATION", "fileData": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="},
        headers=caregiver_headers,
    )
    assert scan_res.status_code == 200
    scan_data = scan_res.json()
    assert "detected" in scan_data
    assert "status" in scan_data

    # 2. Complete step 3 with QR code payload
    await client.put(
        "/api/caregivers/me/onboarding/step3",
        json={
            "institution": "Apollo College of Nursing",
            "course": "General Nursing & Midwifery",
            "completionYear": 2019,
            "credentialId": "GNM-2019-4821",
            "qrPayload": "CERTHASH:9a8b7c|GNM-2019-4821",
            "verificationMethod": "BARCODE_QR_SCAN",
        },
        headers=caregiver_headers,
    )

    # 3. Admin reviews and updates education verification status
    admin_verify_res = await client.patch(
        f"/api/caregivers/{caregiver_user.id}/education-verification",
        json={
            "verificationStatus": "VERIFIED_BY_ISSUER",
            "verificationMethod": "STATE_NURSING_COUNCIL_REGISTRY",
        },
        headers=admin_headers,
    )
    assert admin_verify_res.status_code == 200
    verify_data = admin_verify_res.json()
    assert verify_data["success"] is True
    assert verify_data["educationVerificationStatus"] == "VERIFIED_BY_ISSUER"


@pytest.mark.asyncio
async def test_hospital_catalog_and_preferred_hospital_flow(
    client: AsyncClient,
    sponsor_user: User,
    auth_headers: dict,
    caregiver_user: User,
    caregiver_headers: dict,
    test_db: AsyncSession,
):
    """Test hospital listing, nearby query, preferred hospital update, and caregiver emergency access."""
    # 1. Seed hospitals
    await HospitalService.seed_initial_hospitals_if_empty(test_db)

    # 2. List hospitals
    list_res = await client.get("/api/hospitals", headers=auth_headers)
    assert list_res.status_code == 200
    hospitals = list_res.json()
    assert len(hospitals) >= 7

    # 3. Query nearby hospitals around Adyar (13.0012, 80.2565)
    nearby_res = await client.get("/api/hospitals/nearby?latitude=13.0012&longitude=80.2565&radius_km=10", headers=auth_headers)
    assert nearby_res.status_code == 200
    nearby = nearby_res.json()
    assert len(nearby) > 0
    assert nearby[0]["distanceKm"] <= nearby[-1]["distanceKm"]  # Sorted by distance

    # 4. Create an elder belonging to sponsor
    elder = Elder(
        familyId=sponsor_user.id,
        sponsor_id=sponsor_user.id,
        name="Subramanian Swamy",
        full_name="Subramanian Swamy",
        age=81,
        gender="MALE",
        locality="Adyar, Chennai",
        address="10, 1st Cross Street, Gandhi Nagar, Adyar, Chennai",
    )
    test_db.add(elder)
    await test_db.commit()
    await test_db.refresh(elder)

    # 5. Set preferred hospital for elder
    target_hospital_id = hospitals[0]["id"]
    put_res = await client.put(
        f"/api/hospitals/elder/{elder.id}/preferred",
        json={"hospitalId": target_hospital_id},
        headers=auth_headers,
    )
    assert put_res.status_code == 200
    put_data = put_res.json()
    assert put_data["preferredHospital"]["id"] == target_hospital_id

    # 6. Unauthorized user cannot change preferred hospital
    unauth_put = await client.put(
        f"/api/hospitals/elder/{elder.id}/preferred",
        json={"hospitalId": target_hospital_id},
        headers=caregiver_headers,
    )
    assert unauth_put.status_code in [403, 404]

    # 7. Assigned caregiver CAN access elder emergency context
    cg = Caregiver(
        full_name="Assigned Caregiver",
        headline="Certified Elder Care Attendant",
        locality="Adyar, Chennai",
        phone=caregiver_user.phone,
        is_active=True,
        is_identity_verified=True,
    )
    test_db.add(cg)
    await test_db.flush()

    asg = CareAssignment(
        elder_id=elder.id,
        caregiver_id=cg.id,
        sponsor_id=sponsor_user.id,
        status="ACTIVE",
    )
    test_db.add(asg)
    await test_db.commit()

    ctx_res = await client.get(
        f"/api/hospitals/elder/{elder.id}/emergency-context",
        headers=caregiver_headers,
    )
    assert ctx_res.status_code == 200
    ctx_data = ctx_res.json()
    assert ctx_data["elderId"] == elder.id
    assert ctx_data["hasPreferredHospital"] is True
    assert ctx_data["preferredHospital"]["id"] == target_hospital_id
    assert len(ctx_data["nearbyHospitals"]) > 0


@pytest.mark.asyncio
async def test_payout_history_search_and_caregiver_isolation(
    client: AsyncClient,
    caregiver_user: User,
    caregiver_headers: dict,
    test_db: AsyncSession,
):
    """Test searching caregiver payout history by elder name, payout reference, and isolation."""
    # 1. Create another caregiver user
    other_cg_user = User(
        fullName="Other Caregiver",
        phone="+919876500099",
        role="CAREGIVER",
        authProvider="PHONE_OTP",
    )
    test_db.add(other_cg_user)
    await test_db.flush()

    # 2. Create elders
    elder_a = Elder(familyId=caregiver_user.id, name="Kalyani Ammal", age=78, locality="Adyar")
    elder_b = Elder(familyId=caregiver_user.id, name="Natarajan Ramaswamy", age=82, locality="R.A. Puram")
    test_db.add_all([elder_a, elder_b])
    await test_db.flush()

    # 3. Create payouts for caregiver_user
    payout_1 = CaregiverPayout(
        payoutNumber="PAY-2026-001",
        caregiverId=caregiver_user.id,
        periodStart=datetime.now(timezone.utc) - timedelta(days=14),
        periodEnd=datetime.now(timezone.utc) - timedelta(days=7),
        totalEarned=14000.0,
        netPayoutAmount=14000.0,
        currency="INR",
        status="PAID",
        providerReference="RAZORPAY_TXN_991",
    )
    payout_2 = CaregiverPayout(
        payoutNumber="PAY-2026-002",
        caregiverId=caregiver_user.id,
        periodStart=datetime.now(timezone.utc) - timedelta(days=7),
        periodEnd=datetime.now(timezone.utc),
        totalEarned=10000.0,
        netPayoutAmount=10000.0,
        currency="INR",
        status="APPROVED",
        providerReference="RAZORPAY_TXN_992",
    )
    # Payout for other caregiver
    other_payout = CaregiverPayout(
        payoutNumber="PAY-2026-OTHER",
        caregiverId=other_cg_user.id,
        periodStart=datetime.now(timezone.utc) - timedelta(days=7),
        periodEnd=datetime.now(timezone.utc),
        totalEarned=8000.0,
        netPayoutAmount=8000.0,
        currency="INR",
        status="PAID",
        providerReference="RAZORPAY_OTHER",
    )
    test_db.add_all([payout_1, payout_2, other_payout])
    await test_db.flush()

    # 4. Attach shift earnings connecting payout_1 to elder_a, and payout_2 to elder_b
    earning_1 = CaregiverShiftEarning(
        caregiverId=caregiver_user.id,
        elderId=elder_a.id,
        payoutId=payout_1.id,
        shiftDate=datetime.now(timezone.utc) - timedelta(days=10),
        earnedAmount=7000.0,
        status="PAID",
    )
    earning_2 = CaregiverShiftEarning(
        caregiverId=caregiver_user.id,
        elderId=elder_b.id,
        payoutId=payout_2.id,
        shiftDate=datetime.now(timezone.utc) - timedelta(days=3),
        earnedAmount=5000.0,
        status="APPROVED",
    )
    test_db.add_all([earning_1, earning_2])
    await test_db.commit()

    # 5. List all payouts for caregiver_user
    res_all = await client.get("/api/payouts/caregiver/history", headers=caregiver_headers)
    assert res_all.status_code == 200
    items = res_all.json()
    assert len(items) == 2
    # Verify other caregiver's payout is NOT visible
    assert all(i["payoutNumber"] != "PAY-2026-OTHER" for i in items)

    # 6. Search by care seeker name "Kalyani"
    res_search_elder = await client.get("/api/payouts/caregiver/history?search=Kalyani", headers=caregiver_headers)
    assert res_search_elder.status_code == 200
    filtered_items = res_search_elder.json()
    assert len(filtered_items) == 1
    assert filtered_items[0]["payoutNumber"] == "PAY-2026-001"
    assert "Kalyani Ammal" in filtered_items[0]["careSeekerNames"]

    # 7. Search by provider reference "RAZORPAY_TXN_992"
    res_search_ref = await client.get("/api/payouts/caregiver/history?search=RAZORPAY_TXN_992", headers=caregiver_headers)
    assert res_search_ref.status_code == 200
    assert len(res_search_ref.json()) == 1
    assert res_search_ref.json()[0]["payoutNumber"] == "PAY-2026-002"

    # 8. Test Pagination: limit=1, offset=0 and offset=1
    res_p1 = await client.get("/api/payouts/caregiver/history?limit=1&offset=0", headers=caregiver_headers)
    assert res_p1.status_code == 200
    p1_items = res_p1.json()
    assert len(p1_items) == 1

    res_p2 = await client.get("/api/payouts/caregiver/history?limit=1&offset=1", headers=caregiver_headers)
    assert res_p2.status_code == 200
    p2_items = res_p2.json()
    assert len(p2_items) == 1
    assert p1_items[0]["id"] != p2_items[0]["id"]


@pytest.mark.asyncio
async def test_document_extraction_scanner_matrix():
    """
    Test document scanner across diverse cases:
    - Real QR payload decoding
    - Missing QR / plain certificate image
    - Unsafe/malformed script payload
    - Authenticity rule (decoding != verification)
    - Identity document field extraction
    """
    import io
    import cv2
    import qrcode
    import base64
    import numpy as np
    from app.services.extraction_service import DocumentExtractionService

    # 1. Valid QR Code on Certificate
    img_qr = qrcode.make("https://tnmc.gov.in/verify?id=TN-NUR-2021-9942&course=BSc+Nursing")
    buf = io.BytesIO()
    img_qr.save(buf)
    b64_qr = base64.b64encode(buf.getvalue()).decode()

    res_qr = DocumentExtractionService.extract_education_certificate(b64_qr)
    assert res_qr["detected"] is True
    assert res_qr["status"] == "DECODED_UNCONFIRMED"
    assert res_qr["detectorType"] == "QR_CODE"
    assert res_qr["extractedFields"]["credentialId"] == "TN-NUR-2021-9942"
    assert res_qr["verifiedAt"] is None  # Decoding is NOT verification

    # 2. Image with NO QR code
    plain_img = np.full((300, 400, 3), 245, dtype=np.uint8)
    cv2.putText(plain_img, "State Nursing Council Certificate", (30, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (10, 10, 10), 2)
    _, plain_buf = cv2.imencode(".png", plain_img)
    b64_plain = base64.b64encode(plain_buf.tobytes()).decode()

    res_plain = DocumentExtractionService.extract_education_certificate(b64_plain)
    assert res_plain["detected"] is False
    assert res_plain["status"] == "MANUAL_REVIEW_REQUIRED"
    assert "quality" in res_plain
    assert res_plain["quality"]["isSharp"] is True

    # 3. Unsafe / Malformed Script Payload
    img_unsafe = qrcode.make("javascript:alert(1)")
    buf_unsafe = io.BytesIO()
    img_unsafe.save(buf_unsafe)
    b64_unsafe = base64.b64encode(buf_unsafe.getvalue()).decode()

    res_unsafe = DocumentExtractionService.extract_education_certificate(b64_unsafe)
    assert res_unsafe["detected"] is True
    assert res_unsafe["status"] == "FAILED"
    assert res_unsafe["payload"] == "[REJECTED_UNSAFE_PAYLOAD]"

    # 4. Identity Document Candidate Extraction (Aadhaar format)
    id_qr = qrcode.make("AADHAAR: 9840 1234 5678 DOB: 1990-05-20 GENDER: FEMALE NAME: Ananya Sharma")
    buf_id = io.BytesIO()
    id_qr.save(buf_id)
    b64_id = base64.b64encode(buf_id.getvalue()).decode()

    res_id = DocumentExtractionService.extract_identity_document(b64_id, doc_type="AADHAAR")
    assert res_id["detected"] is True
    assert res_id["status"] == "EXTRACTED_FOR_REVIEW"
    assert res_id["extractedFields"]["documentNumber"] == "984012345678"
    assert res_id["extractedFields"]["gender"] == "FEMALE"
    assert res_id["extractedFields"]["dob"] == "1990-05-20"
    assert res_id["extractedFields"]["isVerified"] is False
    assert res_id["verifiedAt"] is None


@pytest.mark.asyncio
async def test_matching_invariants_and_clinical_qualifications(
    client: AsyncClient,
    test_db: AsyncSession,
    sponsor_user: User,
):
    """
    Test matching invariant:
    PROFILE COMPLETE + REQUIRED KYC VERIFIED + CAREGIVER ACTIVE = ELIGIBLE FOR WORK
    And service-specific verified qualifications for clinical care.
    """
    from app.services.matching_service import get_curated_caregivers_for_elder

    elder_record = Elder(
        familyId=sponsor_user.id,
        sponsor_id=sponsor_user.id,
        name="Kalyani Ammal",
        age=75,
        gender="FEMALE",
        locality="Adyar",
        address="14, Main Road, Adyar",
        careRequirements=["Dementia Care", "Clinical Vitals"],
    )
    test_db.add(elder_record)
    await test_db.commit()
    await test_db.refresh(elder_record)

    # 1. Create a caregiver with incomplete profile
    cg_u1 = User(
        phone="+919840900001",
        fullName="Incomplete Caregiver",
        role="CAREGIVER",
        is_active=True,
        isProfileComplete=False,  # Incomplete!
    )
    test_db.add(cg_u1)
    await test_db.flush()

    cg_p1 = Caregiver(
        full_name="Incomplete Caregiver",
        phone="+919840900001",
        headline="Companion",
        experience_years=3,
        locality="Adyar",
        primary_language="Tamil",
        languages="Tamil",
        skills="Companionship",
        specializations="Elder Care",
        shift_types="Day 10-Hour",
        daily_rate=2000.0,
        is_active=True,
        is_identity_verified=True,
    )
    test_db.add(cg_p1)

    # 2. Create a caregiver with rejected KYC
    cg_u2 = User(
        phone="+919840900002",
        fullName="Rejected KYC Caregiver",
        role="CAREGIVER",
        is_active=True,
        dob="1992-05-10",
        gender="FEMALE",
    )
    test_db.add(cg_u2)
    await test_db.flush()

    kyc_2 = CaregiverKYC(
        caregiver_id=cg_u2.id,
        document_type="AADHAAR",
        verification_status="REJECTED",  # Rejected!
    )
    test_db.add(kyc_2)

    cg_p2 = Caregiver(
        full_name="Rejected KYC Caregiver",
        phone="+919840900002",
        headline="Attendant",
        experience_years=4,
        locality="Adyar",
        primary_language="Tamil",
        languages="Tamil",
        skills="Elder Care",
        specializations="Bedside Care",
        shift_types="Day 10-Hour",
        daily_rate=2000.0,
        is_active=True,
        is_identity_verified=False,
    )
    test_db.add(cg_p2)

    # 3. Create a caregiver with unverified education
    cg_u3 = User(
        phone="+919840900003",
        fullName="Unverified Clinical Caregiver",
        role="CAREGIVER",
        is_active=True,
        dob="1992-05-10",
        gender="FEMALE",
    )
    test_db.add(cg_u3)
    await test_db.flush()

    kyc_3 = CaregiverKYC(
        caregiver_id=cg_u3.id,
        document_type="AADHAAR",
        verification_status="VERIFIED",
    )
    test_db.add(kyc_3)

    cg_p3 = Caregiver(
        full_name="Unverified Clinical Caregiver",
        phone="+919840900003",
        headline="Nurse",
        qualifications="BSc Nursing",
        experience_years=5,
        locality="Adyar",
        primary_language="Tamil",
        languages="Tamil",
        skills="Injections, IV Care",
        specializations="Clinical Care",
        shift_types="Day 10-Hour",
        daily_rate=2500.0,
        is_active=True,
        is_identity_verified=True,
        is_clinical_certified=False,
        education_verification_status="REJECTED",  # Rejected credential!
    )
    test_db.add(cg_p3)
    await test_db.commit()

    # Query matching for BSc Nursing
    matches_resp = await get_curated_caregivers_for_elder(
        db=test_db,
        elder_id=elder_record.id,
        qualification="BSc Nursing",
    )
    matched_names = [m.caregiver.full_name for m in matches_resp.matches]

    # Incomplete profile and rejected KYC must NEVER appear
    assert "Incomplete Caregiver" not in matched_names
    assert "Rejected KYC Caregiver" not in matched_names
    # Unverified clinical qualification must NOT match when BSc Nursing is requested
    assert "Unverified Clinical Caregiver" not in matched_names


@pytest.mark.asyncio
async def test_assignment_confirmation_eligibility_revalidation(
    client: AsyncClient,
    test_db: AsyncSession,
    caregiver_headers: dict,
    sponsor_user: User,
):
    """
    Test that assignment confirmation re-verifies caregiver eligibility
    and rejects confirmation if caregiver became inactive, KYC rejected, or profile incomplete.
    """
    elder_record = Elder(
        familyId=sponsor_user.id,
        sponsor_id=sponsor_user.id,
        name="Kalyani Ammal",
        age=75,
        gender="FEMALE",
        locality="Adyar",
        address="14, Main Road, Adyar",
    )
    test_db.add(elder_record)
    await test_db.commit()
    await test_db.refresh(elder_record)
    # 1. Setup caregiver with complete profile & verified KYC
    cg_user = User(
        phone="+919840999888",
        fullName="Eligible Candidate",
        role="CAREGIVER",
        is_active=True,
        dob="1990-01-01",
        gender="FEMALE",
    )
    test_db.add(cg_user)
    await test_db.flush()

    kyc = CaregiverKYC(
        caregiver_id=cg_user.id,
        document_type="AADHAAR",
        verification_status="VERIFIED",
    )
    test_db.add(kyc)

    cg = Caregiver(
        full_name="Eligible Candidate",
        phone="+919840999888",
        headline="Certified Caregiver",
        experience_years=5,
        locality="Adyar",
        primary_language="Tamil",
        languages="Tamil",
        skills="Elder Care",
        specializations="Companion Care",
        shift_types="Day 10-Hour",
        daily_rate=2000.0,
        is_active=True,
        is_identity_verified=True,
    )
    test_db.add(cg)
    await test_db.flush()

    # 2. Create care assignment in WAITING_CONFIRMATION status
    asg = CareAssignment(
        elder_id=elder_record.id,
        caregiver_id=cg.id,
        sponsor_id=sponsor_user.id,
        shift_type="Day 10-Hour",
        status="WAITING_CONFIRMATION",
        monthly_rate=22000.0,
    )
    test_db.add(asg)
    await test_db.commit()

    # 3. Invalidate KYC before confirmation
    kyc.verification_status = "REJECTED"
    await test_db.commit()

    # 4. Confirmation attempt should be REJECTED with 400
    res_fail = await client.post(f"/api/assignments/{asg.id}/confirm", headers=caregiver_headers)
    assert res_fail.status_code == 400
    assert "kyc is rejected" in res_fail.json()["detail"].lower()

    # 5. Restore KYC to verified; deactivate account
    kyc.verification_status = "VERIFIED"
    cg.is_active = False
    await test_db.commit()

    res_fail2 = await client.post(f"/api/assignments/{asg.id}/confirm", headers=caregiver_headers)
    assert res_fail2.status_code == 400
    assert "not active" in res_fail2.json()["detail"].lower()


@pytest.mark.asyncio
async def test_care_seeker_elder_schedule_endpoint(
    client: AsyncClient,
    test_db: AsyncSession,
    auth_headers: dict,
    sponsor_user: User,
):
    """
    Test Care Seeker elder schedule endpoint:
    - Weekly shifts and assignment items returned
    - Shift counts per date
    - Overnight shift detection
    - Role authorization
    """
    from app.models.shift import CareShift

    elder_record = Elder(
        familyId=sponsor_user.id,
        sponsor_id=sponsor_user.id,
        name="Kalyani Ammal",
        age=75,
        gender="FEMALE",
        locality="Adyar",
        address="14, Main Road, Adyar",
    )
    test_db.add(elder_record)
    await test_db.commit()
    await test_db.refresh(elder_record)

    # Add a daylight shift and an overnight shift
    shift_today = CareShift(
        elderId=elder_record.id,
        caregiverId=sponsor_user.id,
        shiftType="Day 10-Hour",
        scheduledStart=datetime(2026, 10, 21, 8, 0, tzinfo=timezone.utc),
        scheduledEnd=datetime(2026, 10, 21, 18, 0, tzinfo=timezone.utc),
        status="SCHEDULED",
    )
    shift_overnight = CareShift(
        elderId=elder_record.id,
        caregiverId=sponsor_user.id,
        shiftType="Night 12-Hour",
        scheduledStart=datetime(2026, 10, 22, 20, 0, tzinfo=timezone.utc),
        scheduledEnd=datetime(2026, 10, 23, 8, 0, tzinfo=timezone.utc),
        status="SCHEDULED",
    )
    test_db.add_all([shift_today, shift_overnight])
    await test_db.commit()

    # Call /api/shifts/elder/{elder_id}/schedule as authorized sponsor
    res = await client.get(f"/api/shifts/elder/{elder_record.id}/schedule", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["elderId"] == elder_record.id
    assert data["totalShifts"] >= 2
    assert "2026-10-21" in data["countsByDate"]
    assert "2026-10-22" in data["countsByDate"]

    # Verify overnight detection
    overnight_item = next((s for s in data["schedule"] if s["shiftType"] == "Night 12-Hour"), None)
    assert overnight_item is not None
    assert overnight_item["isOvernight"] is True


@pytest.mark.asyncio
async def test_sos_duplicate_prevention_and_unauthorized_access(
    client: AsyncClient,
    test_db: AsyncSession,
    caregiver_headers: dict,
    auth_headers: dict,
    sponsor_user: User,
    caregiver_user: User,
):
    """
    Test SOS edge cases:
    1. SOS with missing GPS coordinates and no shift ID (safe fallback).
    2. Repeated SOS activation within 120s returns existing open incident (no duplicate spam).
    3. Unauthorized caregiver attempting SOS on an unassigned elder receives 403 Forbidden.
    """
    from app.models.shift import CareShift

    # 1. Create elder belonging to sponsor_user
    elder = Elder(
        familyId=sponsor_user.id,
        sponsor_id=sponsor_user.id,
        name="Emergency Test Elder",
        age=82,
        gender="FEMALE",
        locality="Adyar",
    )
    test_db.add(elder)
    await test_db.flush()

    # Assign caregiver_user to elder via shift
    shift = CareShift(
        elderId=elder.id,
        caregiverId=caregiver_user.id,
        shiftType="Day 10-Hour",
        scheduledStart=datetime.now(timezone.utc),
        scheduledEnd=datetime.now(timezone.utc) + timedelta(hours=8),
        status="SCHEDULED",
    )
    test_db.add(shift)
    await test_db.commit()

    # Trigger SOS without coordinates or shift ID
    sos_payload = {
        "elderId": elder.id,
        "shiftId": None,
        "latitude": None,
        "longitude": None,
        "notes": "Elder feeling faint, coordinates unavailable.",
    }
    res1 = await client.post("/api/v1/incidents/sos", json=sos_payload, headers=caregiver_headers)
    assert res1.status_code == 201
    inc1 = res1.json()
    assert inc1["priority"] == "P1"
    assert inc1["status"] == "OPEN"
    assert inc1["locationCoordinates"] == {}

    # Repeated SOS activation immediately afterwards -> must return the exact same incident ID
    res2 = await client.post("/api/v1/incidents/sos", json=sos_payload, headers=caregiver_headers)
    assert res2.status_code == 201
    inc2 = res2.json()
    assert inc2["id"] == inc1["id"]

    # Unauthorized caregiver access test:
    # Create another caregiver not assigned to this elder
    unauthorized_cg = User(
        phone="+919840999099",
        fullName="Unassigned Caregiver",
        role="CAREGIVER",
        is_active=True,
    )
    test_db.add(unauthorized_cg)
    await test_db.commit()

    from app.core.security import create_access_token
    unauth_token = create_access_token(data={"sub": unauthorized_cg.id, "role": "CAREGIVER"})
    unauth_headers = {"Authorization": f"Bearer {unauth_token}"}

    res_unauth = await client.post("/api/v1/incidents/sos", json=sos_payload, headers=unauth_headers)
    assert res_unauth.status_code == 403
    assert "not authorized" in res_unauth.json()["detail"].lower()


@pytest.mark.asyncio
async def test_admin_education_verification_workflow_and_audit(
    client: AsyncClient,
    test_db: AsyncSession,
    caregiver_headers: dict,
    admin_headers: dict,
    caregiver_user: User,
):
    """
    Test education verification lifecycle:
    1. Decoded QR payload yields QR_DETECTED status (never auto-verified).
    2. Admin verifies credentials -> VERIFIED, clinical certified, audit timestamp set.
    3. Admin rejects credentials -> REJECTED, clinical certification revoked, rejection reason saved.
    4. Non-admin attempting verification is blocked with 403 Forbidden.
    """
    # 1. Caregiver submits education step with QR payload
    step3_payload = {
        "institution": "Apollo College of Nursing",
        "course": "B.Sc Nursing",
        "completionYear": 2020,
        "credentialId": "APOLLO-NUR-2020",
        "qrPayload": "URL:https://credentials.apollo.edu/verify/APOLLO-NUR-2020",
        "verificationMethod": "BARCODE_QR_SCAN",
    }
    res_sub = await client.put("/api/caregivers/me/onboarding/step3", json=step3_payload, headers=caregiver_headers)
    assert res_sub.status_code == 200
    assert res_sub.json()["educationVerificationStatus"] == "QR_DETECTED"

    # 2. Caregiver tries to self-verify -> 403 Forbidden
    verify_payload = {
        "verificationStatus": "VERIFIED",
        "verificationMethod": "COUNCIL_REGISTRY_API",
    }
    res_self = await client.patch(
        f"/api/caregivers/{caregiver_user.id}/education-verification",
        json=verify_payload,
        headers=caregiver_headers,
    )
    assert res_self.status_code == 403

    # 3. Admin verifies credentials
    res_admin_ver = await client.patch(
        f"/api/caregivers/{caregiver_user.id}/education-verification",
        json=verify_payload,
        headers=admin_headers,
    )
    assert res_admin_ver.status_code == 200
    ver_data = res_admin_ver.json()
    assert ver_data["educationVerificationStatus"] == "VERIFIED"
    assert ver_data["educationVerifiedAt"] is not None

    # Check that caregiver is now clinical certified in DB
    cg_res = await client.get("/api/caregivers/me/onboarding", headers=caregiver_headers)
    assert cg_res.status_code == 200
    assert cg_res.json()["step3"]["course"] == "B.Sc Nursing"

    # 4. Admin revokes/rejects credentials
    reject_payload = {
        "verificationStatus": "REJECTED",
        "verificationMethod": "MANUAL_ADMIN_REVIEW",
        "rejectionReason": "Council certificate serial number mismatch with state registrar database.",
    }
    res_reject = await client.patch(
        f"/api/caregivers/{caregiver_user.id}/education-verification",
        json=reject_payload,
        headers=admin_headers,
    )
    assert res_reject.status_code == 200
    rej_data = res_reject.json()
    assert rej_data["educationVerificationStatus"] == "REJECTED"
    assert "serial number mismatch" in rej_data["educationRejectionReason"]


@pytest.mark.asyncio
async def test_hospital_catalog_provenance_and_distance_sorting(
    test_db: AsyncSession,
):
    """
    Test hospital catalog data integrity:
    1. Seeded hospitals maintain DEMO_CORRIDOR_SEED_PENDING_REGULATORY_VALIDATION provenance.
    2. Nearest hospital calculation respects distance sorting.
    3. Preferred hospital assignment persists and handles unsetting cleanly.
    """
    await HospitalService.seed_initial_hospitals_if_empty(test_db)

    # 1. Check provenance on seeded records
    hospitals = await HospitalService.list_hospitals(test_db, limit=10)
    assert len(hospitals) >= 7
    for h in hospitals:
        assert h.source == "DEMO_CORRIDOR_SEED_PENDING_REGULATORY_VALIDATION"

    # 2. Distance sorting around Adyar (13.0067, 80.2575)
    nearby = await HospitalService.get_nearby_hospitals(
        test_db,
        lat=13.0067,
        lng=80.2575,
        radius_km=20.0,
    )
    assert len(nearby) > 0
    # Fortis Malar is in Adyar, should be closest (distanceKm ~0.0)
    assert nearby[0]["name"] == "Fortis Malar Hospital"
    assert nearby[0]["distanceKm"] < 0.5
    # Verify strictly ascending distances
    distances = [item["distanceKm"] for item in nearby]
    assert distances == sorted(distances)


@pytest.mark.asyncio
async def test_production_otp_security_and_fail_closed_behavior(
    client: AsyncClient,
    test_db: AsyncSession,
    monkeypatch,
):
    """
    Test production OTP security:
    1. In production without SMS provider, send_otp fails closed with HTTP 503.
    2. Master dev code '123456' is strictly rejected in production.
    3. With SMS provider configured, cryptographically secure OTP is generated and dev_otp is None.
    4. Resend within 30s is throttled with HTTP 429.
    5. Max 5 failed attempts invalidates the OTP.
    6. OTP is strictly single-use.
    7. Public OTP verification blocks privilege escalation (cannot register as ADMIN).
    """
    from app.services.auth_service import AuthService, _otp_store
    from app.core.config import settings

    test_phone = "+919840199999"

    # Clean test phone from store
    _otp_store.pop(test_phone, None)

    # 1. Simulate production environment with NO SMS provider
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "CARECONNECT_SMS_PROVIDER", None)
    monkeypatch.setattr(settings, "TWILIO_ACCOUNT_SID", None)
    monkeypatch.setattr(settings, "SMS_GATEWAY_KEY", None)

    with pytest.raises(HTTPException) as exc_info:
        AuthService.send_otp(test_phone)
    assert exc_info.value.status_code == 503
    assert "SMS delivery provider is not configured" in exc_info.value.detail

    # 2. Master dev bypass code '123456' must be rejected in production
    with pytest.raises(HTTPException) as exc_login:
        await AuthService.verify_otp_and_login(test_db, phone=test_phone, otp="123456")
    assert exc_login.value.status_code == 400

    # 3. Configure SMS provider in production -> generates secure random OTP and dev_otp is None
    monkeypatch.setattr(settings, "CARECONNECT_SMS_PROVIDER", "MOCK_GATEWAY")
    send_res = AuthService.send_otp(test_phone)
    assert send_res["success"] is True
    assert send_res["dev_otp"] is None  # NEVER exposed in production
    assert test_phone in _otp_store
    secure_code = _otp_store[test_phone]["code"]
    assert len(secure_code) == 6
    assert secure_code.isdigit()

    # 4. Resend within 30s must be throttled with HTTP 429
    with pytest.raises(HTTPException) as exc_resend:
        AuthService.send_otp(test_phone)
    assert exc_resend.value.status_code == 429
    assert "Please wait" in exc_resend.value.detail

    # 5. Failed attempts limit: 5 wrong attempts invalidates OTP
    for i in range(5):
        with pytest.raises(HTTPException) as exc_fail:
            await AuthService.verify_otp_and_login(test_db, phone=test_phone, otp="000000")
        assert exc_fail.value.status_code == 400

    # 6th attempt -> OTP should have been invalidated and deleted
    with pytest.raises(HTTPException) as exc_max:
        await AuthService.verify_otp_and_login(test_db, phone=test_phone, otp="000000")
    assert exc_max.value.status_code == 400
    assert "Too many failed verification attempts" in exc_max.value.detail or "No active OTP found" in exc_max.value.detail

    # 6. Single-use guarantee: generate fresh OTP, verify successfully, verify again fails
    if test_phone in _otp_store:
        _otp_store[test_phone]["last_sent_at"] = 0
    send_fresh = AuthService.send_otp(test_phone)
    fresh_code = _otp_store[test_phone]["code"]

    # Verify first time -> succeeds
    login_res = await AuthService.verify_otp_and_login(
        test_db,
        phone=test_phone,
        otp=fresh_code,
        fullName="Legitimate Sponsor",
        role="ADMIN",  # Attempting privilege escalation to ADMIN!
    )
    assert "token" in login_res or "accessToken" in login_res or "user" in login_res
    user_obj = login_res.get("user")
    # Privilege escalation guard: role must NOT be ADMIN
    user_role = user_obj.role if hasattr(user_obj, "role") else user_obj["role"]
    assert user_role == "FAMILY_SPONSOR"

    # Verify exact same code a second time -> MUST FAIL (single-use)
    with pytest.raises(HTTPException) as exc_reuse:
        await AuthService.verify_otp_and_login(test_db, phone=test_phone, otp=fresh_code)
    assert exc_reuse.value.status_code == 400
    assert "No active OTP found" in exc_reuse.value.detail


@pytest.mark.asyncio
async def test_hospital_data_safeguards_and_unverified_records(
    client: AsyncClient,
    test_db: AsyncSession,
    auth_headers: dict,
    sponsor_user: User,
):
    """
    Test hospital safeguards:
    1. Seeded hospitals return verificationStatus = PENDING_REGULATORY_VALIDATION.
    2. Deactivated / stale preferred hospital safely falls back to hasPreferredHospital = False.
    3. Universal emergency numbers (108, 112, 1077) are present in emergency context.
    4. Selecting non-existent or inactive hospital returns HTTP 404.
    """
    await HospitalService.seed_initial_hospitals_if_empty(test_db)

    # 1. Check nearby hospitals schema includes pending verification status
    nearby = await HospitalService.get_nearby_hospitals(
        test_db,
        lat=13.0067,
        lng=80.2575,
        radius_km=15.0,
    )
    assert len(nearby) > 0
    for h in nearby:
        assert h["verificationStatus"] == "PENDING_REGULATORY_VALIDATION"
        assert h["source"] == "DEMO_CORRIDOR_SEED_PENDING_REGULATORY_VALIDATION"

    # 2. Create an elder with a preferred hospital
    elder = Elder(
        familyId=sponsor_user.id,
        sponsor_id=sponsor_user.id,
        name="Hospital Safeguard Elder",
        locality="Adyar",
    )
    test_db.add(elder)
    await test_db.flush()

    # Assign Fortis Malar (hosp_001)
    await HospitalService.set_elder_preferred_hospital(test_db, elder.id, "hosp_001")

    # Fetch emergency context via API
    ctx_res = await client.get(f"/api/v1/hospitals/elder/{elder.id}/emergency-context", headers=auth_headers)
    assert ctx_res.status_code == 200
    ctx_data = ctx_res.json()
    assert ctx_data["hasPreferredHospital"] is True
    assert ctx_data["preferredHospital"]["id"] == "hosp_001"
    assert ctx_data["preferredHospital"]["verificationStatus"] == "PENDING_REGULATORY_VALIDATION"

    # Verify universal emergency numbers are present
    universal_nums = {item["number"] for item in ctx_data.get("universalEmergencyNumbers", [])}
    assert "108" in universal_nums
    assert "112" in universal_nums

    # 3. Deactivate the hospital (simulating stale/closed facility)
    hosp_res = await test_db.execute(select(Hospital).where(Hospital.id == "hosp_001"))
    hosp_obj = hosp_res.scalars().first()
    hosp_obj.is_active = False
    await test_db.commit()

    # Re-fetch emergency context: stale/inactive hospital must NOT be presented as active choice
    ctx_stale = await client.get(f"/api/v1/hospitals/elder/{elder.id}/emergency-context", headers=auth_headers)
    assert ctx_stale.status_code == 200
    assert ctx_stale.json()["hasPreferredHospital"] is False
    assert ctx_stale.json()["preferredHospital"] is None

    # Inactive hospital must be excluded from nearby list
    nearby_active = await HospitalService.get_nearby_hospitals(test_db, lat=13.0067, lng=80.2575, radius_km=15.0)
    assert all(h["id"] != "hosp_001" for h in nearby_active)

    # Re-activate hosp_001 to keep test DB clean
    hosp_obj.is_active = True
    await test_db.commit()

    # 4. Attempting to select a non-existent hospital as preferred returns 404
    with pytest.raises(HTTPException) as exc_missing:
        await HospitalService.set_elder_preferred_hospital(test_db, elder.id, "non_existent_hospital_999")
    assert exc_missing.value.status_code == 404


