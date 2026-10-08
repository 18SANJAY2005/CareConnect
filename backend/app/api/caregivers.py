import re
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from datetime import datetime, timezone
from app.core.database import get_db
from app.core.security import require_role, get_current_user
from app.core.phone_validator import validate_and_normalize_phone
from app.models.caregiver import Caregiver
from app.models.caregiver_kyc import CaregiverKYC
from app.models.user import User
from app.models.elder import Elder
from app.models.location import ElderLocation
from app.models.assignment import CareAssignment
from app.models.shift import CareShift
from app.services.attendance_service import AttendanceService
from app.services.care_task_service import CareTaskService
from app.schemas.auth import UserResponse, UpdateProfileRequest
from app.schemas.caregiver import (
    CaregiverResponse,
    CuratedMatchesResponse,
    CaregiverEligibilityResponse,
    CaregiverAvailabilityRequest,
    AvailableJobItem,
    AcceptJobResponse,
    WorkHistoryResponse,
    CompletedShiftItem,
    EarningsSummary,
)
from app.schemas.kyc import (
    KycSubmitRequest,
    KycStatusUpdateRequest,
    KycResponse,
    mask_document_number,
)
from app.services.matching_service import (
    get_curated_caregivers_for_elder,
    seed_initial_data_if_empty,
)

router = APIRouter(
    prefix="/caregivers",
    tags=["Caregivers & Matching"],
)


class CaregiverProvisionRequest(BaseModel):
    fullName: str
    phone: str
    email: Optional[str] = None
    countryCode: Optional[str] = "+91"
    documentType: Optional[str] = None
    documentNumber: Optional[str] = None
    documentStorageReference: Optional[str] = None


@router.get("/matches", response_model=CuratedMatchesResponse)
async def get_curated_matches(
    elder_id: str = Query(
        ...,
        description="Elder persona ID to match against",
    ),
    db: AsyncSession = Depends(get_db),
):
    """Returns 2-3 curated, vetted caregiver candidates."""
    try:
        return await get_curated_caregivers_for_elder(db, elder_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))



def validate_kyc_document_format(doc_type: str, doc_number: str):
    dtype = (doc_type or "").upper()
    cleaned = re.sub(r"[\s\-]", "", doc_number)
    if dtype == "AADHAAR":
        if not re.match(r"^\d{12}$", cleaned):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Aadhaar number must be exactly 12 numeric digits.",
            )
    elif dtype == "PAN":
        if not re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]$", cleaned.upper()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="PAN number must be 10 characters in format ABCDE1234F.",
            )
    elif dtype == "PASSPORT":
        if not re.match(r"^[A-Z0-9]{6,12}$", cleaned.upper()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Passport number must be 6 to 12 alphanumeric characters.",
            )
    elif dtype == "DRIVING_LICENCE":
        if len(cleaned) < 8 or len(cleaned) > 20:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Driving Licence number must be between 8 and 20 characters.",
            )
    elif dtype == "VOTER_ID":
        if len(cleaned) < 8 or len(cleaned) > 16:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Voter ID number must be between 8 and 16 alphanumeric characters.",
            )
    elif len(cleaned) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document number must have at least 4 characters.",
        )


def validate_document_storage_reference(ref: Optional[str]):
    if not ref:
        return
    if ref.startswith("data:"):
        match = re.match(r"^data:(image/(?:jpeg|png|webp)|application/pdf);base64,", ref)
        if not match:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file format. Allowed types: JPEG, PNG, WebP, PDF.",
            )
        if len(ref) > 7_000_000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Document file size exceeds 5MB limit.",
            )


@router.get("/kyc/me", response_model=KycResponse)
async def get_my_kyc(
    current_user: User = Depends(require_role(["CAREGIVER"])),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve the logged-in caregiver's KYC record with masked document number."""
    result = await db.execute(
        select(CaregiverKYC).where(CaregiverKYC.caregiver_id == current_user.id)
    )
    kyc = result.scalars().first()
    if not kyc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No KYC verification record found for this caregiver.",
        )

    return KycResponse(
        id=kyc.id,
        caregiver_id=kyc.caregiver_id,
        document_type=kyc.document_type,
        masked_document_number=mask_document_number(kyc.document_type, kyc.document_number),
        document_storage_reference=kyc.document_storage_reference,
        verification_status=kyc.verification_status,
        rejection_reason=kyc.rejection_reason,
        created_at=kyc.created_at,
        updated_at=kyc.updated_at,
    )


@router.post("/kyc/me", response_model=KycResponse, status_code=status.HTTP_201_CREATED)
async def submit_my_kyc(
    payload: KycSubmitRequest,
    current_user: User = Depends(require_role(["CAREGIVER"])),
    db: AsyncSession = Depends(get_db),
):
    """Submit or re-submit KYC verification document for the logged-in caregiver."""
    validate_kyc_document_format(payload.document_type, payload.document_number)
    validate_document_storage_reference(payload.document_storage_reference)

    result = await db.execute(
        select(CaregiverKYC).where(CaregiverKYC.caregiver_id == current_user.id)
    )
    kyc = result.scalars().first()

    if kyc:
        kyc.document_type = payload.document_type.upper()
        kyc.document_number = payload.document_number.strip()
        if payload.document_storage_reference:
            kyc.document_storage_reference = payload.document_storage_reference
        kyc.verification_status = "PENDING"
        kyc.rejection_reason = None
    else:
        kyc = CaregiverKYC(
            caregiver_id=current_user.id,
            document_type=payload.document_type.upper(),
            document_number=payload.document_number.strip(),
            document_storage_reference=payload.document_storage_reference,
            verification_status="PENDING",
        )
        db.add(kyc)

    await db.commit()
    await db.refresh(kyc)

    return KycResponse(
        id=kyc.id,
        caregiver_id=kyc.caregiver_id,
        document_type=kyc.document_type,
        masked_document_number=mask_document_number(kyc.document_type, kyc.document_number),
        document_storage_reference=kyc.document_storage_reference,
        verification_status=kyc.verification_status,
        rejection_reason=kyc.rejection_reason,
        created_at=kyc.created_at,
        updated_at=kyc.updated_at,
    )


@router.get("/admin/all")
async def list_admin_caregivers(
    current_user: User = Depends(require_role(["ADMIN", "OPS_MANAGER"])),
    db: AsyncSession = Depends(get_db),
):
    """
    List all caregivers with their KYC verification records and work details for the Admin Portal.
    """
    await seed_initial_data_if_empty(db)

    # Ensure all registered CAREGIVER users have a directory record
    cg_users_res = await db.execute(
        select(User).where(User.role == "CAREGIVER")
    )
    cg_users = cg_users_res.scalars().all()
    for u in cg_users:
        if u.phone or u.fullName:
            await _get_or_create_caregiver_record(db, u)

    # Query all Caregivers
    cgs_res = await db.execute(
        select(Caregiver).order_by(Caregiver.id.desc())
    )
    cgs = cgs_res.scalars().all()

    # Query all KYC records
    kycs_res = await db.execute(select(CaregiverKYC))
    kycs = kycs_res.scalars().all()
    kyc_by_user_id = {k.caregiver_id: k for k in kycs}

    users_by_phone = {u.phone: u for u in cg_users if u.phone}

    output = []
    for cg in cgs:
        u = users_by_phone.get(cg.phone)
        kyc = kyc_by_user_id.get(u.id) if u else None

        if kyc:
            kyc_status = kyc.verification_status
            doc_type = kyc.document_type
            masked_num = mask_document_number(kyc.document_type, kyc.document_number)
            doc_ref = kyc.document_storage_reference
            rejection_reason = kyc.rejection_reason
            created_at = kyc.created_at.isoformat() if kyc.created_at else None
            updated_at = kyc.updated_at.isoformat() if kyc.updated_at else None
        else:
            kyc_status = "VERIFIED" if cg.is_identity_verified else "NOT_SUBMITTED"
            doc_type = "AADHAAR" if cg.is_identity_verified else None
            masked_num = "XXXX-XXXX-****" if cg.is_identity_verified else None
            doc_ref = None
            rejection_reason = None
            created_at = None
            updated_at = None

        skills_list = [s.strip() for s in (cg.skills or "").split(",") if s.strip()]
        if not skills_list:
            skills_list = ["Elder Care", "Patient Care Assistance"]

        languages_list = [l.strip() for l in (cg.languages or "").split(",") if l.strip()]
        if not languages_list:
            languages_list = [cg.primary_language or "Tamil"]

        specializations_list = [s.strip() for s in (cg.specializations or "").split(",") if s.strip()]
        if not specializations_list:
            specializations_list = ["Geriatric Care"]

        output.append({
            "id": str(cg.id),
            "userId": u.id if u else str(cg.id),
            "fullName": cg.full_name or (u.fullName if u else "Caregiver"),
            "phone": cg.phone or (u.phone if u else "+91 98402 11223"),
            "gender": cg.gender or (u.gender if u else "Female"),
            "rating": float(cg.rating or 4.8),
            "experienceYears": int(cg.experience_years or 3),
            "locality": cg.locality or "Adyar",
            "primaryLanguage": cg.primary_language or "Tamil",
            "languages": languages_list,
            "skills": skills_list,
            "specializations": specializations_list,
            "isBufferPool": bool(getattr(cg, "isBufferPool", False)),
            "isPoliceVerified": bool(getattr(cg, "is_police_verified", False)),
            "isClinicalCertified": bool(getattr(cg, "is_clinical_certified", False)),
            "isIdentityVerified": bool(getattr(cg, "is_identity_verified", False) or kyc_status == "VERIFIED"),
            "status": cg.status or "AVAILABLE",
            "hourlyRate": float(cg.hourly_rate or 150),
            "dailyRate": float(cg.daily_rate or 1400),
            "isProfileComplete": bool(u.isProfileComplete) if u else True,
            "kycStatus": kyc_status,
            "documentType": doc_type,
            "maskedDocumentNumber": masked_num,
            "documentStorageReference": doc_ref,
            "rejectionReason": rejection_reason,
            "kycCreatedAt": created_at,
            "kycUpdatedAt": updated_at,
        })

    return output


@router.get("/kyc/{caregiver_id}", response_model=KycResponse)
async def get_caregiver_kyc_by_id(
    caregiver_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve KYC record by caregiver ID (supports User.id or directory Caregiver.id).
    Enforces authorization:
    - Admin / Operations can view any caregiver's KYC.
    - A Caregiver can ONLY view their own KYC.
    - Other users receive 403 Forbidden.
    """
    if current_user.role not in ["ADMIN", "OPS_MANAGER"]:
        if current_user.role == "CAREGIVER" and current_user.id == caregiver_id:
            pass  # Allowed own profile
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized access to caregiver KYC records.",
            )

    # 1. Look up directly by User.id
    result = await db.execute(
        select(CaregiverKYC).where(CaregiverKYC.caregiver_id == caregiver_id)
    )
    kyc = result.scalars().first()

    # 2. Look up through Caregiver directory by ID or phone if needed
    if not kyc:
        cg_match = None
        if caregiver_id.isdigit():
            cg_res = await db.execute(select(Caregiver).where(Caregiver.id == int(caregiver_id)))
            cg_match = cg_res.scalars().first()
        if not cg_match:
            cg_res = await db.execute(select(Caregiver).where(Caregiver.phone == caregiver_id))
            cg_match = cg_res.scalars().first()

        if cg_match and cg_match.phone:
            u_res = await db.execute(select(User).where(User.phone == cg_match.phone))
            u_match = u_res.scalars().first()
            if u_match:
                kyc_res = await db.execute(
                    select(CaregiverKYC).where(CaregiverKYC.caregiver_id == u_match.id)
                )
                kyc = kyc_res.scalars().first()

    if not kyc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Caregiver KYC record not found.",
        )

    return KycResponse(
        id=kyc.id,
        caregiver_id=kyc.caregiver_id,
        document_type=kyc.document_type,
        masked_document_number=mask_document_number(kyc.document_type, kyc.document_number),
        document_storage_reference=kyc.document_storage_reference,
        verification_status=kyc.verification_status,
        rejection_reason=kyc.rejection_reason,
        created_at=kyc.created_at,
        updated_at=kyc.updated_at,
    )


@router.patch("/kyc/{caregiver_id}/status", response_model=KycResponse)
async def update_caregiver_kyc_status(
    caregiver_id: str,
    payload: KycStatusUpdateRequest,
    current_user: User = Depends(require_role(["ADMIN", "OPS_MANAGER"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Authorize or reject caregiver KYC status by Admin/Operations.
    Supports caregiver_id as User.id (UUID) or directory Caregiver.id.
    """
    # 1. Lookup by User.id
    result = await db.execute(
        select(CaregiverKYC).where(CaregiverKYC.caregiver_id == caregiver_id)
    )
    kyc = result.scalars().first()

    target_user = None
    target_cg = None

    if kyc:
        user_res = await db.execute(select(User).where(User.id == kyc.caregiver_id))
        target_user = user_res.scalars().first()
    else:
        # 2. Try looking up through Caregiver directory by ID or phone
        if caregiver_id.isdigit():
            cg_res = await db.execute(select(Caregiver).where(Caregiver.id == int(caregiver_id)))
            target_cg = cg_res.scalars().first()
        if not target_cg:
            cg_res = await db.execute(select(Caregiver).where(Caregiver.phone == caregiver_id))
            target_cg = cg_res.scalars().first()

        if target_cg and target_cg.phone:
            u_res = await db.execute(select(User).where(User.phone == target_cg.phone))
            target_user = u_res.scalars().first()
            if target_user:
                kyc_res = await db.execute(
                    select(CaregiverKYC).where(CaregiverKYC.caregiver_id == target_user.id)
                )
                kyc = kyc_res.scalars().first()
                if not kyc and payload.verification_status.upper() == "VERIFIED":
                    kyc = CaregiverKYC(
                        caregiver_id=target_user.id,
                        document_type="AADHAAR",
                        document_number="XXXXXXXXXXXX",
                        verification_status="VERIFIED",
                    )
                    db.add(kyc)
                    await db.flush()

    if not kyc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Caregiver KYC record not found.",
        )

    new_status = payload.verification_status.upper()
    kyc.verification_status = new_status
    kyc.rejection_reason = (
        payload.rejection_reason if new_status == "REJECTED" else None
    )
    kyc.verified_by_id = current_user.id
    kyc.verified_at = func.now()

    # Sync is_identity_verified flag on Caregiver profile
    if not target_cg and target_user and target_user.phone:
        cg_res = await db.execute(
            select(Caregiver).where(Caregiver.phone == target_user.phone)
        )
        target_cg = cg_res.scalars().first()

    if target_cg:
        target_cg.is_identity_verified = (new_status == "VERIFIED")

    # If user exists and verified, ensure user is active
    if target_user and new_status == "VERIFIED":
        target_user.is_active = True

    await db.commit()
    await db.refresh(kyc)

    return KycResponse(
        id=kyc.id,
        caregiver_id=kyc.caregiver_id,
        document_type=kyc.document_type,
        masked_document_number=mask_document_number(kyc.document_type, kyc.document_number),
        document_storage_reference=kyc.document_storage_reference,
        verification_status=kyc.verification_status,
        rejection_reason=kyc.rejection_reason,
        created_at=kyc.created_at,
        updated_at=kyc.updated_at,
    )



@router.patch("/me/profile", response_model=UserResponse)
async def update_my_caregiver_profile(
    payload: UpdateProfileRequest,
    current_user: User = Depends(require_role(["CAREGIVER"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Update caregiver profile details for the authenticated caregiver only.
    Enforces that caregivers cannot update another user's profile.
    """
    from app.api.me import update_my_profile
    return await update_my_profile(payload=payload, current_user=current_user, db=db)


# ==============================================================================
# CAREGIVER WORKER EXPERIENCE & KYC-GATED OPPORTUNITIES (RAPIDO CAPTAIN STYLE)
# ==============================================================================

async def _get_or_create_caregiver_record(db: AsyncSession, user: User) -> Caregiver:
    """Find or provision directory Caregiver record for the authenticated user."""
    cg = None
    if user.phone:
        res = await db.execute(select(Caregiver).where(Caregiver.phone == user.phone))
        cg = res.scalars().first()
    if not cg and user.fullName:
        res = await db.execute(select(Caregiver).where(Caregiver.full_name == user.fullName))
        cg = res.scalars().first()
    if not cg:
        cg = Caregiver(
            full_name=user.fullName,
            headline="CareConnect Certified Attendant",
            phone=user.phone,
            gender=user.gender or "FEMALE",
            dob=user.dob,
            locality=user.locality or "Adyar, Chennai",
            experience_years=3,
            service_radius_km=15.0,
            primary_language="Tamil",
            languages="Tamil, English",
            skills="Mobility Assistance, Vitals Monitoring, Medication Management",
            specializations="Elder Companion Care",
            shift_types="Day 10-Hour, Night 12-Hour",
            hourly_rate=250.0,
            daily_rate=2000.0,
            rating=4.9,
            review_count=12,
            is_police_verified=True,
            is_clinical_certified=True,
            is_identity_verified=False,
            is_active=True,
            status="AVAILABLE",
            avatarUrl=user.avatarUrl,
            photo_url=user.avatarUrl,
        )
        db.add(cg)
        await db.commit()
        await db.refresh(cg)
    return cg


async def _evaluate_caregiver_eligibility(
    db: AsyncSession, user: User
) -> CaregiverEligibilityResponse:
    """
    Evaluates worker eligibility based on Profile, KYC status, and Active state.
    States:
      - PROFILE_INCOMPLETE
      - KYC_REQUIRED
      - KYC_PENDING
      - KYC_REJECTED
      - ELIGIBLE_FOR_WORK (KYC_VERIFIED + isProfileComplete + is_active)
      - INACTIVE
    """
    is_profile_complete = bool(user.isProfileComplete)

    if not is_profile_complete:
        eligibility_state = "PROFILE_INCOMPLETE"
        kyc_status = "NOT_SUBMITTED"
        rejection_reason = None
        is_eligible = False
        message = "Complete your personal profile before accepting care assignments."
    else:
        kyc_res = await db.execute(
            select(CaregiverKYC).where(CaregiverKYC.caregiver_id == user.id)
        )
        kyc = kyc_res.scalars().first()

        if not kyc:
            kyc_status = "NOT_SUBMITTED"
            rejection_reason = None
            eligibility_state = "KYC_REQUIRED"
            is_eligible = False
            message = "Identity verification required. Complete your KYC to become eligible for care assignments."
        else:
            kyc_status = str(kyc.verification_status).upper()
            rejection_reason = kyc.rejection_reason

            if kyc_status == "PENDING":
                eligibility_state = "KYC_PENDING"
                is_eligible = False
                message = "KYC verification pending. Your documents are being reviewed. You will be able to accept care assignments after verification."
            elif kyc_status == "REJECTED":
                eligibility_state = "KYC_REJECTED"
                is_eligible = False
                reason_detail = f": {rejection_reason}" if rejection_reason else "."
                message = f"KYC verification required. Your identity verification was not approved{reason_detail}"
            elif kyc_status == "VERIFIED":
                if not user.is_active:
                    eligibility_state = "INACTIVE"
                    is_eligible = False
                    message = "Caregiver account is currently inactive. Contact operations."
                else:
                    eligibility_state = "ELIGIBLE_FOR_WORK"
                    is_eligible = True
                    message = "✓ KYC Verified. You are eligible to accept care assignments."
            else:
                eligibility_state = "KYC_REQUIRED"
                is_eligible = False
                message = "Identity verification required before accepting care assignments."

    cg = await _get_or_create_caregiver_record(db, user)
    cg_status = getattr(cg, "status", "AVAILABLE") or "AVAILABLE"
    is_available = (cg_status == "AVAILABLE") and is_eligible

    return CaregiverEligibilityResponse(
        isProfileComplete=is_profile_complete,
        kycStatus=kyc_status,
        rejectionReason=rejection_reason,
        isAvailable=is_available,
        caregiverStatus=cg_status,
        isEligibleForWork=is_eligible,
        eligibilityState=eligibility_state,
        message=message,
    )


async def _ensure_sample_care_opportunities(db: AsyncSession):
    """Seed realistic Chennai elder care opportunities if none exist."""
    sp_res = await db.execute(select(User).where(User.role == "FAMILY_SPONSOR").limit(1))
    sponsor = sp_res.scalars().first()
    if not sponsor:
        sponsor = User(
            fullName="Ramesh Krishnan",
            email="ramesh.krishnan@careconnect.in",
            phone="+919840123456",
            role="FAMILY_SPONSOR",
            authProvider="PHONE_OTP",
        )
        db.add(sponsor)
        await db.flush()

    samples = [
        {
            "name": "Kalyani Ammal",
            "age": 78,
            "gender": "FEMALE",
            "locality": "Adyar, Chennai",
            "address": "14/2, 2nd Main Road, Gandhi Nagar, Adyar, Chennai - 600020",
            "shiftPreference": "TWELVE_HOUR_DAY",
            "care_tier_needed": "12-Hour Assisted Care",
            "mobilityLevel": "ASSISTED_WALKER",
            "careRequirements": ["Mobility assistance", "Medication reminders", "Daily routine support"],
            "lat": 13.0012,
            "lng": 80.2565,
        },
        {
            "name": "Natarajan Ramaswamy",
            "age": 82,
            "gender": "MALE",
            "locality": "R.A. Puram, Chennai",
            "address": "Old #14, 4th Cross Street, R.A. Puram, Chennai - 600028",
            "shiftPreference": "TWELVE_HOUR_DAY",
            "care_tier_needed": "12-Hour Dementia Care",
            "mobilityLevel": "CANE_ASSISTED",
            "careRequirements": ["Dementia care", "Fall prevention", "Nutritious meal assistance"],
            "lat": 13.0270,
            "lng": 80.2580,
        },
        {
            "name": "Lakshmi Narayanan",
            "age": 75,
            "gender": "FEMALE",
            "locality": "Besant Nagar, Chennai",
            "address": "22, 4th Avenue, Besant Nagar, Chennai - 600090",
            "shiftPreference": "EIGHT_HOUR_DAY",
            "care_tier_needed": "8-Hour Companion Care",
            "mobilityLevel": "INDEPENDENT",
            "careRequirements": ["Companionship", "Vitals monitoring", "Walk assistance"],
            "lat": 12.9982,
            "lng": 80.2668,
        },
    ]

    for s in samples:
        e_chk = await db.execute(select(Elder).where(Elder.name == s["name"]))
        existing_e = e_chk.scalars().first()
        if not existing_e:
            e = Elder(
                familyId=sponsor.id,
                sponsor_id=sponsor.id,
                name=s["name"],
                full_name=s["name"],
                age=s["age"],
                gender=s["gender"],
                locality=s["locality"],
                address=s["address"],
                shiftPreference=s["shiftPreference"],
                care_tier_needed=s["care_tier_needed"],
                mobilityLevel=s["mobilityLevel"],
                careRequirements=s["careRequirements"],
                personaStatus="SAVED",
            )
            db.add(e)
            await db.flush()
            loc = ElderLocation(
                elderId=e.id,
                addressLine1=s["address"],
                locality=s["locality"],
                city="Chennai",
                state="Tamil Nadu",
                postalCode="600020",
                latitude=s["lat"],
                longitude=s["lng"],
                serviceable=True,
                verificationStatus="VERIFIED",
            )
            db.add(loc)
    await db.commit()


@router.get("/me/eligibility", response_model=CaregiverEligibilityResponse)
async def get_my_worker_eligibility(
    current_user: User = Depends(require_role(["CAREGIVER", "OPS_MANAGER", "ADMIN"])),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve the logged-in caregiver's work eligibility, KYC status, and availability."""
    return await _evaluate_caregiver_eligibility(db, current_user)


@router.patch("/me/availability", response_model=CaregiverEligibilityResponse)
async def set_my_worker_availability(
    payload: CaregiverAvailabilityRequest,
    current_user: User = Depends(require_role(["CAREGIVER"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Toggle caregiver worker availability (ON / OFF).
    HARD GATE: Caregiver MUST have verified KYC and a complete profile.
    """
    eligibility = await _evaluate_caregiver_eligibility(db, current_user)
    if not eligibility.isEligibleForWork:
        if eligibility.eligibilityState == "PROFILE_INCOMPLETE":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Profile completion is required before becoming available for care work.",
            )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="KYC verification is required before becoming available for care work.",
        )

    cg = await _get_or_create_caregiver_record(db, current_user)
    if payload.isAvailable:
        cg.status = "AVAILABLE"
    else:
        cg.status = "OFF_DUTY"
    await db.commit()
    await db.refresh(cg)

    return await _evaluate_caregiver_eligibility(db, current_user)


@router.get("/available-jobs", response_model=List[AvailableJobItem])
async def list_available_care_jobs(
    current_user: User = Depends(require_role(["CAREGIVER", "OPS_MANAGER", "ADMIN"])),
    db: AsyncSession = Depends(get_db),
):
    """
    List elder-care work opportunities nearby in Chennai.
    HARD GATE: Caregiver KYC MUST be VERIFIED and Profile must be complete.
    """
    if current_user.role == "CAREGIVER":
        eligibility = await _evaluate_caregiver_eligibility(db, current_user)
        if not eligibility.isEligibleForWork:
            if eligibility.eligibilityState == "PROFILE_INCOMPLETE":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Profile completion is required before viewing and accepting care assignments.",
                )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="KYC verification is required before accepting care assignments.",
            )

        # If caregiver has toggled availability OFF, return empty list
        cg = await _get_or_create_caregiver_record(db, current_user)
        if cg.status == "OFF_DUTY":
            return []

    # Query elders that do NOT currently have active assignments or active shifts
    assigned_elder_ids_q = select(CareAssignment.elder_id).where(
        CareAssignment.status.in_(["ACTIVE", "SERVICE_CONFIRMED", "CAREGIVER_SELECTED"])
    )
    assigned_res = await db.execute(assigned_elder_ids_q)
    assigned_elder_ids = set(assigned_res.scalars().all())

    elders_q = select(Elder).where(Elder.id.not_in(assigned_elder_ids))
    elders_res = await db.execute(elders_q)
    available_elders = elders_res.scalars().all()

    valid_elders = [
        e for e in available_elders
        if e.name and e.name.strip().lower() not in ["test", "is", "xyz", "rang", "test 2", "test 3"]
    ]

    if not valid_elders:
        await _ensure_sample_care_opportunities(db)
        elders_res = await db.execute(
            select(Elder).where(Elder.id.not_in(assigned_elder_ids))
        )
        valid_elders = [
            e for e in elders_res.scalars().all()
            if e.name and e.name.strip().lower() not in ["test", "is", "xyz", "rang", "test 2", "test 3"]
        ]

    job_items: List[AvailableJobItem] = []
    daily_rate = 2000.0
    if current_user.role == "CAREGIVER":
        cg = await _get_or_create_caregiver_record(db, current_user)
        daily_rate = getattr(cg, "daily_rate", 2000.0) or 2000.0

    for elder in valid_elders[:6]:
        loc_res = await db.execute(select(ElderLocation).where(ElderLocation.elderId == elder.id))
        elder_loc = loc_res.scalar_one_or_none()
        locality = (
            elder_loc.locality
            if elder_loc and elder_loc.locality
            else (elder.locality or "Adyar, Chennai")
        )

        shift_pref = str(elder.shiftPreference or "TWELVE_HOUR_DAY").upper()
        duration = "12 Hours" if "TWELVE" in shift_pref else ("10 Hours" if "10" in shift_pref else "8 Hours")
        care_type = (
            elder.care_tier_needed
            or ("12-Hour Assisted Care" if "12" in duration else "Day Attendant Care")
        )

        care_needs = []
        if isinstance(elder.careRequirements, list) and elder.careRequirements:
            care_needs = [str(r) for r in elder.careRequirements[:3]]
        else:
            care_needs = ["Mobility assistance", "Medication reminders", "Daily routine support"]

        approx_km = 2.4 if "Adyar" in locality else (3.8 if "Mylapore" in locality else 4.5)

        job_items.append(
            AvailableJobItem(
                id=elder.id,
                title=f"Elder Care – {locality.split(',')[0].strip()}",
                elderName=elder.name,
                careType=care_type,
                shiftDuration=duration,
                starts="Tomorrow, 8:00 AM",
                locality=locality,
                addressSnippet=f"Near {locality.split(',')[0].strip()}",
                approximateDistanceKm=approx_km,
                careNeeds=care_needs,
                specialRequirements=["Punctuality", "Gentle handling", "Non-smoker"],
                compensation=f"₹{int(daily_rate):,} / shift",
                dailyRate=daily_rate,
                status="AVAILABLE",
            )
        )

    return job_items


@router.get("/available-jobs/{elder_id}", response_model=AvailableJobItem)
async def get_available_job_details(
    elder_id: str,
    current_user: User = Depends(require_role(["CAREGIVER", "OPS_MANAGER", "ADMIN"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Get detailed overview of an available care opportunity prior to acceptance.
    HARD GATE: Caregiver KYC MUST be VERIFIED.
    """
    if current_user.role == "CAREGIVER":
        eligibility = await _evaluate_caregiver_eligibility(db, current_user)
        if not eligibility.isEligibleForWork:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="KYC verification is required before accepting care assignments.",
            )

    elder = await db.get(Elder, elder_id)
    if not elder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Elder opportunity with ID {elder_id} not found.",
        )

    existing_asg = await db.execute(
        select(CareAssignment).where(
            CareAssignment.elder_id == elder_id,
            CareAssignment.status.in_(["ACTIVE", "SERVICE_CONFIRMED", "CAREGIVER_SELECTED"]),
        )
    )
    if existing_asg.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This care assignment is no longer available.",
        )

    loc_res = await db.execute(select(ElderLocation).where(ElderLocation.elderId == elder.id))
    elder_loc = loc_res.scalar_one_or_none()
    locality = (
        elder_loc.locality
        if elder_loc and elder_loc.locality
        else (elder.locality or "Adyar, Chennai")
    )
    shift_pref = str(elder.shiftPreference or "TWELVE_HOUR_DAY").upper()
    duration = "12 Hours" if "TWELVE" in shift_pref else ("10 Hours" if "10" in shift_pref else "8 Hours")
    care_type = elder.care_tier_needed or "Assisted Care"

    cg = await _get_or_create_caregiver_record(db, current_user)
    daily_rate = getattr(cg, "daily_rate", 2000.0) or 2000.0

    care_needs = []
    if isinstance(elder.careRequirements, list) and elder.careRequirements:
        care_needs = [str(r) for r in elder.careRequirements[:3]]
    else:
        care_needs = ["Mobility assistance", "Medication reminders", "Daily routine support"]

    return AvailableJobItem(
        id=elder.id,
        title=f"Elder Care – {locality.split(',')[0].strip()}",
        elderName=elder.name,
        careType=care_type,
        shiftDuration=duration,
        starts="Tomorrow, 8:00 AM",
        locality=locality,
        addressSnippet=f"Near {locality.split(',')[0].strip()}",
        approximateDistanceKm=3.2,
        careNeeds=care_needs,
        specialRequirements=["Punctuality", "Non-smoker"],
        compensation=f"₹{int(daily_rate):,} / shift",
        dailyRate=daily_rate,
        status="AVAILABLE",
    )


@router.post("/available-jobs/{elder_id}/accept", response_model=AcceptJobResponse)
async def accept_available_care_job(
    elder_id: str,
    current_user: User = Depends(require_role(["CAREGIVER"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Accept an elder care opportunity.
    HARD GATE:
      - Authenticated CAREGIVER
      - Complete Profile (isProfileComplete == True)
      - KYC VERIFIED
      - Caregiver Active
      - Race-condition / Duplicate assignment protected
    """
    eligibility = await _evaluate_caregiver_eligibility(db, current_user)
    if not eligibility.isEligibleForWork:
        if eligibility.eligibilityState == "PROFILE_INCOMPLETE":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Profile completion is required before accepting care assignments.",
            )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="KYC verification is required before accepting care assignments.",
        )

    # 1. Fetch elder
    elder = await db.get(Elder, elder_id)
    if not elder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Elder opportunity with ID {elder_id} not found.",
        )

    # 2. Race condition & duplicate protection:
    conflict_asg = await db.execute(
        select(CareAssignment).where(
            CareAssignment.elder_id == elder_id,
            CareAssignment.status.in_(["ACTIVE", "SERVICE_CONFIRMED", "CAREGIVER_SELECTED"]),
        )
    )
    if conflict_asg.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This care assignment is no longer available.",
        )

    conflict_shift = await db.execute(
        select(CareShift).where(
            CareShift.elderId == elder_id,
            CareShift.status.in_(["ACTIVE", "CHECKED_IN", "SCHEDULED"]),
        )
    )
    if conflict_shift.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This care assignment is no longer available.",
        )

    # 3. Get or provision Caregiver directory record
    cg = await _get_or_create_caregiver_record(db, current_user)

    # 4. Create CareAssignment with status SERVICE_CONFIRMED
    shift_pref = elder.shiftPreference or "EIGHT_HOUR_DAY"
    assignment = CareAssignment(
        elder_id=elder.id,
        caregiver_id=cg.id,
        sponsor_id=elder.familyId or elder.sponsor_id or current_user.id,
        shift_type=shift_pref,
        start_date=datetime.now(timezone.utc).date().isoformat(),
        status="SERVICE_CONFIRMED",
        monthly_rate=22000.0,
        notes="Accepted directly by verified caregiver via CareConnect Worker Portal.",
    )
    db.add(assignment)
    await db.flush()

    # 5. Create CareShift for today
    daily_routine = elder.dailyRoutine if (elder and isinstance(elder.dailyRoutine, dict)) else {}
    start_time, end_time = AttendanceService._compute_shift_schedule(shift_pref, daily_routine)
    new_shift = CareShift(
        elderId=elder.id,
        caregiverId=current_user.id,
        shiftType=shift_pref,
        status="SCHEDULED",
        scheduledStart=start_time,
        scheduledEnd=end_time,
        geofenceRadiusMeters=200.0,
        supervisorNotes=f"Caregiver accepted assignment #{assignment.id} for {elder.name}.",
    )
    db.add(new_shift)
    await db.flush()

    # Populate daily checklist tasks for this shift
    await CareTaskService.ensure_shift_tasks(db, new_shift.id, elder.id, current_user.id)

    # 6. Update caregiver status to ON_DUTY
    cg.status = "ON_DUTY"
    await db.commit()
    await db.refresh(assignment)
    await db.refresh(new_shift)

    # Fetch elder location
    loc_res = await db.execute(select(ElderLocation).where(ElderLocation.elderId == elder.id))
    elder_loc = loc_res.scalar_one_or_none()

    shift_data = {
        "id": new_shift.id,
        "elderId": new_shift.elderId,
        "caregiverId": new_shift.caregiverId,
        "shiftType": new_shift.shiftType,
        "status": new_shift.status,
        "scheduledStart": new_shift.scheduledStart.isoformat() if new_shift.scheduledStart else None,
        "scheduledEnd": new_shift.scheduledEnd.isoformat() if new_shift.scheduledEnd else None,
        "geofenceRadiusMeters": new_shift.geofenceRadiusMeters,
        "supervisorNotes": new_shift.supervisorNotes,
    }

    elder_data = {
        "id": elder.id,
        "name": elder.name,
        "age": elder.age,
        "gender": elder.gender,
        "mobilityLevel": elder.mobilityLevel,
        "primaryLanguage": elder.primaryLanguage,
        "locality": (elder_loc.locality if elder_loc and elder_loc.locality else (elder.locality or "Adyar")),
        "addressLine1": (elder_loc.addressLine1 if elder_loc and elder_loc.addressLine1 else (elder.address or "Verified Residence")),
        "latitude": elder_loc.latitude if elder_loc and elder_loc.latitude else 13.0012,
        "longitude": elder_loc.longitude if elder_loc and elder_loc.longitude else 80.2565,
    }

    return AcceptJobResponse(
        success=True,
        message=f"Care assignment for {elder.name} accepted successfully! Shift scheduled.",
        assignmentId=assignment.id,
        shiftId=new_shift.id,
        shift=shift_data,
        elder=elder_data,
    )


@router.get("/me/work-history", response_model=WorkHistoryResponse)
async def get_my_work_history(
    current_user: User = Depends(require_role(["CAREGIVER", "OPS_MANAGER", "ADMIN"])),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve the caregiver's active shift, completed shifts, and earnings summary."""
    cg = await _get_or_create_caregiver_record(db, current_user)
    daily_rate = getattr(cg, "daily_rate", 2000.0) or 2000.0

    current_shift = await AttendanceService.get_caregiver_current_shift(db, current_user.id)
    active_shift_dict = None
    if current_shift:
        e_res = await db.execute(select(Elder).where(Elder.id == current_shift.elderId))
        e = e_res.scalar_one_or_none()
        l_res = await db.execute(select(ElderLocation).where(ElderLocation.elderId == current_shift.elderId))
        eloc = l_res.scalar_one_or_none()
        active_shift_dict = {
            "shiftId": current_shift.id,
            "status": current_shift.status,
            "shiftType": current_shift.shiftType,
            "scheduledStart": current_shift.scheduledStart.isoformat() if current_shift.scheduledStart else None,
            "scheduledEnd": current_shift.scheduledEnd.isoformat() if current_shift.scheduledEnd else None,
            "elderName": e.name if e else "Elder Patient",
            "locality": eloc.locality if eloc and eloc.locality else (e.locality if e else "Adyar, Chennai"),
        }

    shifts_res = await db.execute(
        select(CareShift)
        .where(
            CareShift.caregiverId == current_user.id,
            CareShift.status.in_(["CHECKED_OUT", "COMPLETED"]),
        )
        .order_by(CareShift.createdAt.desc())
    )
    completed_shifts = shifts_res.scalars().all()

    completed_items: List[CompletedShiftItem] = []
    for s in completed_shifts:
        e_res = await db.execute(select(Elder).where(Elder.id == s.elderId))
        e = e_res.scalar_one_or_none()
        l_res = await db.execute(select(ElderLocation).where(ElderLocation.elderId == s.elderId))
        eloc = l_res.scalar_one_or_none()
        completed_items.append(
            CompletedShiftItem(
                shiftId=s.id,
                elderName=e.name if e else "Elder Patient",
                date=s.scheduledStart.strftime("%d %b %Y") if s.scheduledStart else "Today",
                hours="12-Hour Care" if "12" in str(s.shiftType) else "8-Hour Care",
                status="Completed ✓",
                earnings=daily_rate,
                locality=eloc.locality if eloc and eloc.locality else (e.locality if e else "Chennai"),
            )
        )

    total_earned = len(completed_items) * daily_rate
    earnings = EarningsSummary(
        totalEarned=total_earned,
        shiftsCompleted=len(completed_items),
        pendingPayout=total_earned,
        dailyRate=daily_rate,
        currency="INR",
    )

    return WorkHistoryResponse(
        activeShift=active_shift_dict,
        completedShifts=completed_items,
        earnings=earnings,
    )



@router.patch("/{caregiver_id}", response_model=UserResponse)
async def update_caregiver_by_id(
    caregiver_id: int,
    payload: UpdateProfileRequest,
    current_user: User = Depends(require_role(["CAREGIVER", "OPS_MANAGER", "ADMIN"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Update caregiver profile by ID.
    Enforces authorization: Caregiver A cannot modify Caregiver B (403 Forbidden).
    """
    target_cg = await db.get(Caregiver, caregiver_id)
    if not target_cg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Caregiver with id {caregiver_id} not found.",
        )

    if current_user.role == "CAREGIVER":
        if not current_user.phone or target_cg.phone != current_user.phone:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized: You cannot modify another caregiver's profile.",
            )

    from app.api.me import update_my_profile
    return await update_my_profile(payload=payload, current_user=current_user, db=db)


@router.get("/{caregiver_id}", response_model=CaregiverResponse)
async def get_caregiver_profile(
    caregiver_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Returns detailed sanitized profile."""
    await seed_initial_data_if_empty(db)

    result = await db.execute(
        select(Caregiver).where(
            Caregiver.id == caregiver_id,
            Caregiver.is_active.is_(True),
        )
    )

    caregiver = result.scalar_one_or_none()

    if not caregiver:
        raise HTTPException(
            status_code=404,
            detail="Caregiver not found",
        )

    return CaregiverResponse.model_validate(caregiver)


@router.get("/", response_model=List[CaregiverResponse])
async def list_caregivers(
    locality: Optional[str] = None,
    language: Optional[str] = None,
    skill: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Returns active caregivers with optional filters."""

    await seed_initial_data_if_empty(db)

    query = select(Caregiver).where(
        Caregiver.is_active.is_(True)
    )

    if locality:
        query = query.where(
            Caregiver.locality.ilike(f"%{locality}%")
        )

    if language:
        query = query.where(
            Caregiver.languages.ilike(f"%{language}%")
        )

    if skill:
        query = query.where(
            Caregiver.skills.ilike(f"%{skill}%")
        )

    result = await db.execute(query)

    caregivers = result.scalars().all()

    return [
        CaregiverResponse.model_validate(caregiver)
        for caregiver in caregivers
    ]


@router.post("/provision", status_code=status.HTTP_201_CREATED)
async def provision_caregiver_account(
    payload: CaregiverProvisionRequest,
    current_user: User = Depends(require_role(["ADMIN", "OPS_MANAGER"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Explicit provisioning of a vetted caregiver account by Admin/Operations.
    Ensures that caregiver accounts cannot be self-assigned via public signup.
    Validates phone number with strict country code rules and supports initial KYC identity info.
    """
    normalized_phone = validate_and_normalize_phone(payload.phone, payload.countryCode)
    result = await db.execute(select(User).where(User.phone == normalized_phone))
    user = result.scalars().first()
    if user:
        user.role = "CAREGIVER"
        user.fullName = payload.fullName
        if payload.email:
            user.email = payload.email
    else:
        user = User(
            role="CAREGIVER",
            fullName=payload.fullName,
            phone=normalized_phone,
            email=payload.email,
            authProvider="PHONE_OTP",
        )
        db.add(user)
    await db.commit()
    await db.refresh(user)

    # If KYC document provided during provisioning, persist it
    if payload.documentType and payload.documentNumber:
        validate_kyc_document_format(payload.documentType, payload.documentNumber)
        kyc_res = await db.execute(
            select(CaregiverKYC).where(CaregiverKYC.caregiver_id == user.id)
        )
        kyc = kyc_res.scalars().first()
        if not kyc:
            kyc = CaregiverKYC(
                caregiver_id=user.id,
                document_type=payload.documentType.upper(),
                document_number=payload.documentNumber.strip(),
                document_storage_reference=payload.documentStorageReference,
                verification_status="PENDING",
            )
            db.add(kyc)
            await db.commit()

    return {
        "success": True,
        "message": f"Caregiver account for {user.fullName} ({user.phone}) provisioned successfully.",
        "userId": user.id,
        "role": user.role,
    }

