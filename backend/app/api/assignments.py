from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.assignment import CareAssignment
from app.models.caregiver import Caregiver
from app.schemas.assignment import (
    AssignmentCreate,
    AssignmentResponse,
    AssignmentStatusUpdate,
)
from app.schemas.caregiver import CaregiverResponse

router = APIRouter(
    prefix="/assignments",
    tags=["Care Assignments"],
)


@router.post("", response_model=AssignmentResponse)
async def create_care_assignment(
    req: AssignmentCreate,
    db: AsyncSession = Depends(get_db),
):
    """Creates a pending selected-caregiver assignment."""

    result = await db.execute(
        select(Caregiver).where(
            Caregiver.id == req.caregiver_id
        )
    )

    caregiver = result.scalar_one_or_none()

    if not caregiver:
        raise HTTPException(
            status_code=404,
            detail="Caregiver not found",
        )

    assignment = CareAssignment(
        elder_id=req.elder_id,
        caregiver_id=req.caregiver_id,
        sponsor_id=req.sponsor_id,
        shift_type=req.shift_type,
        start_date=req.start_date,
        notes=req.notes,
        status="CAREGIVER_SELECTED",
    )

    db.add(assignment)

    await db.commit()
    await db.refresh(assignment)

    response = AssignmentResponse.model_validate(assignment)
    response.caregiver = CaregiverResponse.model_validate(caregiver)

    return response


@router.get("/{assignment_id}", response_model=AssignmentResponse)
async def get_care_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Retrieves care assignment details."""

    result = await db.execute(
        select(CareAssignment).where(
            CareAssignment.id == assignment_id
        )
    )

    assignment = result.scalar_one_or_none()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment not found",
        )

    result = await db.execute(
        select(Caregiver).where(
            Caregiver.id == assignment.caregiver_id
        )
    )

    caregiver = result.scalar_one_or_none()

    response = AssignmentResponse.model_validate(assignment)

    if caregiver:
        response.caregiver = CaregiverResponse.model_validate(
            caregiver
        )

    return response


@router.patch(
    "/{assignment_id}/status",
    response_model=AssignmentResponse,
)
async def update_assignment_status(
    assignment_id: int,
    req: AssignmentStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Updates the status of an ongoing care assignment."""

    result = await db.execute(
        select(CareAssignment).where(
            CareAssignment.id == assignment_id
        )
    )

    assignment = result.scalar_one_or_none()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment not found",
        )

    assignment.status = req.status

    if req.notes:
        assignment.notes = req.notes

    await db.commit()
    await db.refresh(assignment)

    result = await db.execute(
        select(Caregiver).where(
            Caregiver.id == assignment.caregiver_id
        )
    )

    caregiver = result.scalar_one_or_none()

    response = AssignmentResponse.model_validate(assignment)

    if caregiver:
        response.caregiver = CaregiverResponse.model_validate(
            caregiver
        )

    return response
