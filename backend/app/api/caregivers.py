import re
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_role, get_current_user
from app.core.phone_validator import validate_and_normalize_phone
from app.models.caregiver import Caregiver
from app.models.caregiver_kyc import CaregiverKYC
from app.models.user import User
from app.schemas.caregiver import CaregiverResponse, CuratedMatchesResponse
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


@router.get("/kyc/{caregiver_id}", response_model=KycResponse)
async def get_caregiver_kyc_by_id(
    caregiver_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve KYC record by caregiver ID.
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

    result = await db.execute(
        select(CaregiverKYC).where(CaregiverKYC.caregiver_id == caregiver_id)
    )
    kyc = result.scalars().first()
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
    """
    result = await db.execute(
        select(CaregiverKYC).where(CaregiverKYC.caregiver_id == caregiver_id)
    )
    kyc = result.scalars().first()
    if not kyc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Caregiver KYC record not found.",
        )

    kyc.verification_status = payload.verification_status.upper()
    kyc.rejection_reason = (
        payload.rejection_reason if kyc.verification_status == "REJECTED" else None
    )
    kyc.verified_by_id = current_user.id
    kyc.verified_at = func.now()

    # Safely query user phone to sync is_identity_verified flag on Phase B Caregiver profile
    user_res = await db.execute(select(User).where(User.id == kyc.caregiver_id))
    u = user_res.scalars().first()
    if u and u.phone:
        cg_res = await db.execute(
            select(Caregiver).where(Caregiver.phone == u.phone)
        )
        cg = cg_res.scalars().first()
        if cg and kyc.verification_status == "VERIFIED":
            cg.is_identity_verified = True

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

