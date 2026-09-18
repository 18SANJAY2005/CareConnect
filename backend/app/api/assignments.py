from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user

from app.models.user import User
from app.models.elder import Elder
from app.models.caregiver import Caregiver
from app.models.assignment import CareAssignment
from app.models.billing import Invoice, InvoiceLineItem
from app.models.renewal import Renewal

from app.schemas.phase_d import (
    CareAssignmentResponse,
    CaregiverResponse,
)


# ============================================================================
# Router
# ============================================================================

router = APIRouter(
    tags=["Care Assignments & Buffer Pool"],
)


# ============================================================================
# Caregiver response helper
# ============================================================================

def caregiver_response(
    caregiver: Optional[Caregiver],
) -> Optional[CaregiverResponse]:
    """
    Convert the integrated SQLAlchemy Caregiver model into
    the Phase D CaregiverResponse schema.
    """

    if caregiver is None:
        return None

    return CaregiverResponse(
        id=caregiver.id,
        fullName=caregiver.full_name,
        phone=caregiver.phone,
        gender=caregiver.gender,
        rating=caregiver.rating,
        experienceYears=caregiver.experience_years,
        languages=caregiver.languages,
        specializations=caregiver.specializations,
        locality=caregiver.locality,
        isBufferPool=caregiver.isBufferPool,
        status=caregiver.status,
        avatarUrl=caregiver.avatarUrlValue,
        createdAt=caregiver.created_at,
        updatedAt=caregiver.updated_at,
    )


# ============================================================================
# Assignment response helper
# ============================================================================

def assignment_response(
    assignment: CareAssignment,
) -> CareAssignmentResponse:
    """
    Convert the integrated CareAssignment model into
    the Phase D CareAssignmentResponse schema.

    Some older Phase B integration records may have a NULL
    start_date. The Phase D response requires startDate,
    so use created_at as a safe fallback.
    """

    start_date = assignment.start_date

    if start_date is None:
        if assignment.created_at is not None:
            start_date = assignment.created_at
        else:
            start_date = datetime.now(timezone.utc)

    return CareAssignmentResponse(
        id=assignment.id,
        elderId=assignment.elder_id,
        caregiverId=assignment.caregiver_id,
        familyUserId=assignment.sponsor_id,
        shiftType=assignment.shift_type,
        startDate=start_date,
        status=assignment.status,
        notes=assignment.notes,
        monthlyRate=assignment.monthly_rate,
        createdAt=assignment.created_at,
        updatedAt=assignment.updated_at,
        caregiver=caregiver_response(
            assignment.caregiver
        ),
    )


# ============================================================================


# ============================================================================
# PHASE B - CREATE CARE ASSIGNMENT
# POST /api/assignments
# ============================================================================

@router.post(
    "/assignments",
    response_model=CareAssignmentResponse,
)
async def create_care_assignment(
    payload: dict,
    db: AsyncSession = Depends(get_db),
):
    """
    Phase B caregiver selection endpoint.

    Creates a CareAssignment with the initial state:

        CAREGIVER_SELECTED

    This state is subsequently updated by:
        - payment confirmation
        - SLA acceptance
        - other Phase B lifecycle operations.
    """

    elder_id = payload.get("elder_id")
    caregiver_id = payload.get("caregiver_id")
    sponsor_id = payload.get("sponsor_id")

    if not elder_id:
        raise HTTPException(
            status_code=400,
            detail="elder_id is required",
        )

    if caregiver_id is None:
        raise HTTPException(
            status_code=400,
            detail="caregiver_id is required",
        )

    if not sponsor_id:
        raise HTTPException(
            status_code=400,
            detail="sponsor_id is required",
        )

    # ------------------------------------------------------------------------
    # Validate elder
    # ------------------------------------------------------------------------

    elder_result = await db.execute(
        select(Elder).where(
            Elder.id == elder_id
        )
    )

    elder = elder_result.scalar_one_or_none()

    if not elder:
        raise HTTPException(
            status_code=404,
            detail="Elder not found",
        )

    # ------------------------------------------------------------------------
    # Validate sponsor
    # ------------------------------------------------------------------------

    sponsor_result = await db.execute(
        select(User).where(
            User.id == sponsor_id
        )
    )

    sponsor = sponsor_result.scalar_one_or_none()

    if not sponsor:
        raise HTTPException(
            status_code=404,
            detail="Sponsor not found",
        )

    # ------------------------------------------------------------------------
    # Validate caregiver
    # ------------------------------------------------------------------------

    caregiver_result = await db.execute(
        select(Caregiver).where(
            Caregiver.id == caregiver_id
        )
    )

    caregiver = caregiver_result.scalar_one_or_none()

    if not caregiver:
        raise HTTPException(
            status_code=404,
            detail="Caregiver not found",
        )

    # ------------------------------------------------------------------------
    # Create Phase B assignment
    # ------------------------------------------------------------------------

    assignment = CareAssignment(
        elder_id=elder_id,
        caregiver_id=caregiver_id,
        sponsor_id=sponsor_id,
        shift_type=(
            payload.get("shift_type")
            or "Day 10-Hour"
        ),
        start_date=payload.get("start_date"),
        status="CAREGIVER_SELECTED",
        notes=payload.get("notes"),
        monthly_rate=22000.0,
    )

    db.add(assignment)

    await db.commit()
    await db.refresh(assignment)

    # ------------------------------------------------------------------------
    # Reload caregiver relationship
    # ------------------------------------------------------------------------

    result = await db.execute(
        select(CareAssignment)
        .options(
            selectinload(
                CareAssignment.caregiver
            )
        )
        .where(
            CareAssignment.id == assignment.id
        )
    )

    refreshed_assignment = result.scalar_one()

    return assignment_response(
        refreshed_assignment
    )


# ============================================================================
# PHASE D - GET ACTIVE ASSIGNMENT
#
# IMPORTANT:
# This route MUST appear BEFORE /assignments/{assignment_id}.
#
# Otherwise FastAPI interprets "active" as an integer assignment_id
# and returns HTTP 422.
# ============================================================================

@router.get(
    "/assignments/active",
    response_model=Optional[CareAssignmentResponse],
)
async def get_active_assignment(
    elderId: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve the active caregiver assignment for the family's elder.
    """

    if not elderId:
        elder_result = await db.execute(
            select(Elder).where(Elder.familyId == current_user.id)
        )
        elder = elder_result.scalars().first()
        if not elder:
            return None
        elderId = elder.id

    result = await db.execute(
        select(CareAssignment)
        .options(selectinload(CareAssignment.caregiver))
        .where(
            CareAssignment.elder_id == elderId,
            CareAssignment.status == "ACTIVE"
        )
    )

    assignment = result.scalar_one_or_none()

    if not assignment:
        return None

    return assignment_response(assignment)


# ============================================================================
# PHASE D - GET BUFFER POOL
# GET /api/caregivers/buffer-pool
# ============================================================================

@router.get(
    "/caregivers/buffer-pool",
    response_model=List[CaregiverResponse],
)
async def get_buffer_pool_caregivers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve available substitute caregivers
    in the Chennai buffer pool.
    """

    result = await db.execute(
        select(Caregiver).where(
            Caregiver.isBufferPool == True,
            Caregiver.status == "AVAILABLE",
        )
    )

    caregivers = result.scalars().all()

    return [
        caregiver_response(caregiver)
        for caregiver in caregivers
    ]


# ============================================================================
# PHASE B - GET CARE ASSIGNMENT
#
# IMPORTANT:
# Keep this parameterized route AFTER /assignments/active.
# ============================================================================

@router.get(
    "/assignments/{assignment_id}",
    response_model=CareAssignmentResponse,
)
async def get_care_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve a single care assignment by ID.
    """

    result = await db.execute(
        select(CareAssignment)
        .options(
            selectinload(
                CareAssignment.caregiver
            )
        )
        .where(
            CareAssignment.id == assignment_id
        )
    )

    assignment = result.scalar_one_or_none()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Care assignment not found",
        )

    return assignment_response(
        assignment
    )