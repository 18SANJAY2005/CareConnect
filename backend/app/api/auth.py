from typing import Optional
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.auth import (
    SendOtpRequest, SendOtpResponse, VerifyOtpRequest,
    GoogleAuthRequest, TokenResponse, AdminLoginRequest
)

from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])

class PhoneCheckRequest(BaseModel):
    phone: str
    countryCode: Optional[str] = "+91"


@router.post("/phone/check", status_code=status.HTTP_200_OK)
async def check_phone_registered(payload: PhoneCheckRequest, db: AsyncSession = Depends(get_db)):
    """Check if a phone number already has a registered account."""
    from app.core.phone_validator import validate_and_normalize_phone
    from app.models.user import User
    from sqlalchemy import select

    normalized = validate_and_normalize_phone(payload.phone, payload.countryCode)
    res = await db.execute(select(User).where(User.phone == normalized))
    user = res.scalars().first()

    return {
        "registered": bool(user),
        "phone": normalized,
        "role": user.role if user else None,
        "name": user.fullName if user else None,
    }


@router.post("/otp/send", response_model=SendOtpResponse, status_code=status.HTTP_200_OK)
async def send_otp(payload: SendOtpRequest):
    """Dispatch OTP via WhatsApp or SMS to mobile number with strict phone validation."""
    result = AuthService.send_otp(
        phone=payload.phone,
        channel=payload.channel,
        country_code=payload.countryCode
    )
    return result

@router.post("/otp/verify", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def verify_otp(payload: VerifyOtpRequest, db: AsyncSession = Depends(get_db)):
    """Verify submitted OTP and authenticate or register family sponsor/caregiver."""
    result = await AuthService.verify_otp_and_login(
        db=db,
        phone=payload.phone,
        otp=payload.otp,
        fullName=payload.fullName,
        email=payload.email,
        country_code=payload.countryCode,
        role=payload.role,
    )
    return result

@router.post("/google", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def login_google(payload: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate or register sponsor via Google Sign-In."""
    result = await AuthService.login_with_google(
        db=db,
        idToken=payload.idToken,
        fullName=payload.fullName,
        email=payload.email
    )
    return result


@router.post("/admin/login", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def login_admin(payload: AdminLoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate platform administrator and return access token."""
    result = await AuthService.login_admin(
        db=db,
        email=payload.email,
        password=payload.password,
    )
    return result


# ============================================================================
# Mobile Disclosure & Consent Tracking
# ============================================================================

from typing import List
from app.core.security import get_current_user
from app.models.user import User
from app.models.user_consent import UserConsent
from sqlalchemy import select


class ConsentItemPayload(BaseModel):
    consentType: str  # SERVICE_COMMUNICATIONS, PROMOTIONAL_COMMUNICATIONS, TERMS_AND_CONDITIONS, DATA_COLLECTION_DISCLOSURE
    granted: bool
    version: Optional[str] = "1.0"
    purpose: Optional[str] = "Service and security alerts"
    userAction: Optional[str] = "OPT_IN"


class RecordConsentRequest(BaseModel):
    userId: Optional[str] = None
    phone: Optional[str] = None
    consents: List[ConsentItemPayload]


@router.post("/consent", status_code=status.HTTP_200_OK)
async def record_user_consent(
    payload: RecordConsentRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Record explicit mobile number disclosure and user consents.
    Separates required service-related communications from optional promotional consent.
    Tracks consent version, timestamp, purpose, and user action.
    """
    from app.core.phone_validator import validate_and_normalize_phone

    target_user_id = payload.userId
    if not target_user_id and payload.phone:
        normalized = validate_and_normalize_phone(payload.phone)
        u_res = await db.execute(select(User).where(User.phone == normalized))
        u = u_res.scalars().first()
        if u:
            target_user_id = u.id

    if not target_user_id:
        return {"success": True, "message": "Consent recorded anonymously for session."}

    recorded = []
    for item in payload.consents:
        # Check if consent of this type exists
        existing_res = await db.execute(
            select(UserConsent).where(
                UserConsent.userId == target_user_id,
                UserConsent.consentType == item.consentType,
            )
        )
        existing = existing_res.scalars().first()
        if existing:
            existing.granted = item.granted
            existing.version = item.version or "1.0"
            existing.purpose = item.purpose or "Updated consent preference"
            existing.userAction = item.userAction or "PROFILE_UPDATE"
            recorded.append(existing.consentType)
        else:
            new_consent = UserConsent(
                userId=target_user_id,
                consentType=item.consentType,
                granted=item.granted,
                version=item.version or "1.0",
                purpose=item.purpose or "Service and communications disclosure",
                userAction=item.userAction or "OPT_IN",
            )
            db.add(new_consent)
            recorded.append(item.consentType)

    await db.commit()
    return {
        "success": True,
        "message": f"Successfully recorded {len(recorded)} consent preferences.",
        "consents": recorded,
    }


@router.get("/consent/me")
async def get_my_consents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all recorded consents for the current authenticated user."""
    res = await db.execute(
        select(UserConsent).where(UserConsent.userId == current_user.id)
    )
    consents = res.scalars().all()
    return [
        {
            "consentType": c.consentType,
            "granted": c.granted,
            "version": c.version,
            "purpose": c.purpose,
            "userAction": c.userAction,
            "createdAt": c.createdAt.isoformat() if c.createdAt else None,
            "updatedAt": c.updatedAt.isoformat() if c.updatedAt else None,
        }
        for c in consents
    ]



