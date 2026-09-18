from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.caregiver import Caregiver
from app.schemas.caregiver import CaregiverResponse, CuratedMatchesResponse
from app.services.matching_service import (
    get_curated_caregivers_for_elder,
    seed_initial_data_if_empty,
)

router = APIRouter(
    prefix="/caregivers",
    tags=["Caregivers & Matching"],
)


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
