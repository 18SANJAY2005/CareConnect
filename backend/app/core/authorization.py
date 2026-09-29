from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.elder import Elder
from app.models.shift import CareShift
from app.models.caregiver import Caregiver
from app.models.assignment import CareAssignment
from app.models.user import User


async def verify_elder_access(db: AsyncSession, user: User, elder_id: str) -> Elder:
    """
    Authoritative authorization verification for elder-related care data.
    - ADMIN / OPS_MANAGER: Permitted access across all elders.
    - FAMILY_SPONSOR: Permitted only for their own elders (elder.familyId == user.id).
    - CAREGIVER: Permitted only if explicitly assigned to this elder via an active/scheduled
      CareShift or an established CareAssignment.
    
    Raises HTTPException 404 if the elder is not found, or 403 if unauthorized.
    """
    elder_res = await db.execute(select(Elder).where(Elder.id == elder_id))
    elder = elder_res.scalar_one_or_none()
    if not elder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Elder not found."
        )

    # Operations & Admins have global operational access
    if user.role in ["ADMIN", "OPS_MANAGER"]:
        return elder

    # Family sponsor authorization check
    if user.role == "FAMILY_SPONSOR":
        if elder.familyId == user.id:
            return elder
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to access this elder's care data."
        )

    # Caregiver authorization check
    if user.role == "CAREGIVER":
        # 1. Direct CareShift assignment check
        shift_res = await db.execute(
            select(CareShift).where(
                CareShift.elderId == elder_id,
                CareShift.caregiverId == user.id
            )
        )
        if shift_res.scalars().first():
            return elder

        # 2. CareAssignment link via Caregiver directory record
        if user.phone:
            cg_res = await db.execute(select(Caregiver).where(Caregiver.phone == user.phone))
            cg = cg_res.scalar_one_or_none()
            if cg:
                assign_res = await db.execute(
                    select(CareAssignment).where(
                        CareAssignment.elder_id == elder_id,
                        CareAssignment.caregiver_id == cg.id
                    )
                )
                if assign_res.scalars().first():
                    return elder

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized as a caregiver for this elder."
        )

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access denied."
    )
