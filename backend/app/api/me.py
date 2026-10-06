import re
from datetime import datetime, date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.security import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.models.caregiver import Caregiver
from app.schemas.auth import UserResponse, UpdateProfileRequest

router = APIRouter(tags=["User Context"])

@router.get("/me", response_model=UserResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve profile and authentication context for current user."""
    # Synchronize any missing profile fields from Caregiver directory record if applicable
    if current_user.role == "CAREGIVER" and current_user.phone:
        cg_res = await db.execute(
            select(Caregiver).where(Caregiver.phone == current_user.phone)
        )
        cg = cg_res.scalars().first()
        if cg:
            changed = False
            if not current_user.locality and cg.locality:
                current_user.locality = cg.locality
                changed = True
            if not current_user.gender and cg.gender:
                current_user.gender = cg.gender
                changed = True
            if not current_user.dob and getattr(cg, "dob", None):
                current_user.dob = cg.dob
                changed = True
            if not current_user.avatarUrl and (cg.avatarUrl or cg.photo_url):
                current_user.avatarUrl = cg.avatarUrl or cg.photo_url
                changed = True
            if changed:
                await db.commit()
                await db.refresh(current_user)

    return current_user

@router.patch("/me", response_model=UserResponse)
async def update_my_profile(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update profile details for the authenticated user only.
    Enforces that users can only update their own profile.
    Verified phone number cannot be modified via standard profile update.
    """
    # 1. Phone Protection: Reject any attempt to change verified phone
    if payload.phone is not None and payload.phone.strip():
        req_phone = payload.phone.strip()
        if current_user.phone and req_phone != current_user.phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verified phone number cannot be modified via profile update. Phone changes require verification.",
            )

    # 2. Full Name validation
    trimmed_name = payload.fullName.strip() if payload.fullName else ""
    if not trimmed_name or len(trimmed_name) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name is required and must have at least 2 characters.",
        )
    if not re.match(r"^[a-zA-Z\s\.\-']+$", trimmed_name):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name should contain letters, spaces, dots, or hyphens only.",
        )

    # 3. Date of Birth validation
    valid_dob: Optional[str] = None
    if payload.dob is not None:
        dob_str = payload.dob.strip()
        if dob_str:
            try:
                dob_date = datetime.strptime(dob_str, "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Date of birth must be a valid date in YYYY-MM-DD format.",
                )
            today = date.today()
            if dob_date > today:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Date of birth cannot be in the future.",
                )
            age = today.year - dob_date.year - ((today.month, today.day) < (dob_date.month, dob_date.day))
            if age < 18:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Caregiver must be at least 18 years of age.",
                )
            if age > 100:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Please provide a valid date of birth.",
                )
            valid_dob = dob_str

    # 4. Gender validation
    valid_gender: Optional[str] = None
    if payload.gender is not None:
        gender_str = payload.gender.strip().upper()
        if gender_str:
            if gender_str not in ["FEMALE", "MALE", "OTHER"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Gender must be one of: FEMALE, MALE, OTHER.",
                )
            valid_gender = gender_str

    # 5. Email validation
    valid_email: Optional[str] = None
    if payload.email is not None:
        email_str = payload.email.strip()
        if email_str:
            if not re.match(r"^[\w\.\+\-]+@[a-zA-Z0-9\-]+(\.[a-zA-Z0-9\-]+)+$", email_str):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Please enter a valid email address.",
                )
            valid_email = email_str

    # 6. Locality / Address
    valid_locality: Optional[str] = None
    if payload.locality is not None:
        loc_str = payload.locality.strip()
        if loc_str:
            valid_locality = loc_str

    # Apply updates to User model
    current_user.fullName = trimmed_name
    current_user.name = trimmed_name
    if valid_dob is not None:
        current_user.dob = valid_dob
    if valid_gender is not None:
        current_user.gender = valid_gender
    if payload.email is not None:
        current_user.email = valid_email
    if payload.locality is not None:
        current_user.locality = valid_locality
    if payload.avatarUrl is not None:
        current_user.avatarUrl = payload.avatarUrl.strip() or None

    # Synchronize with Caregiver model if present
    if current_user.phone:
        cg_res = await db.execute(
            select(Caregiver).where(Caregiver.phone == current_user.phone)
        )
        cg = cg_res.scalars().first()
        if cg:
            cg.full_name = trimmed_name
            if valid_gender is not None:
                cg.gender = valid_gender
            if valid_locality is not None:
                cg.locality = valid_locality
            if valid_dob is not None:
                cg.dob = valid_dob
            if payload.avatarUrl is not None:
                cg.avatarUrl = payload.avatarUrl.strip() or None
                cg.photo_url = payload.avatarUrl.strip() or None

    await db.commit()
    await db.refresh(current_user)
    return current_user

