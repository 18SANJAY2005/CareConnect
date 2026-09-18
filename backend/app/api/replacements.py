from app.models.user import User
from app.core.security import get_current_user
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db

from app.models.caregiver import Caregiver
from app.models.assignment import CareAssignment
from app.models.replacement import (
    ReplacementRequest,
    ReplacementStatusHistory,
)

from app.models.audit import AuditLog, Notification

from app.schemas.phase_d import (
    ReplacementRequestCreate,
    ReplacementRequestResponse,
    ReplacementStatusUpdate,
    SubstituteAssignRequest,
)


# ============================================================
# Router
# ============================================================

router = APIRouter(
    tags=["Phase D - Replacements"],
)


# ============================================================
# Helper
# ============================================================

async def get_replacement_request(
    db: AsyncSession,
    replacement_id: str,
) -> Optional[ReplacementRequest]:

    result = await db.execute(
        select(ReplacementRequest)
        .where(
            ReplacementRequest.id == replacement_id
        )
        .options(
            selectinload(
                ReplacementRequest.currentCaregiver
            ),
            selectinload(
                ReplacementRequest.substituteCaregiver
            ),
            selectinload(
                ReplacementRequest.history
            ),
        )
    )

    return result.scalar_one_or_none()


# ============================================================
# CREATE REPLACEMENT REQUEST
# POST /api/replacement-requests
# ============================================================

@router.post(
    "/replacement-requests",
    response_model=ReplacementRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_replacement_request(
    payload: ReplacementRequestCreate,
    db: AsyncSession = Depends(get_db),
):

    # --------------------------------------------------------
    # 1. Load care assignment
    # --------------------------------------------------------

    assignment_result = await db.execute(
        select(CareAssignment)
        .where(
            CareAssignment.id == payload.assignmentId
        )
    )

    assignment = assignment_result.scalar_one_or_none()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Care assignment not found",
        )

    # --------------------------------------------------------
    # 2. Get family sponsor from assignment
    # --------------------------------------------------------

    family_user_id = assignment.sponsor_id

    if not family_user_id:
        raise HTTPException(
            status_code=400,
            detail="Care assignment does not have a family sponsor",
        )

    # --------------------------------------------------------
    # 3. Prevent duplicate active replacement requests
    # --------------------------------------------------------

    duplicate_result = await db.execute(
        select(ReplacementRequest)
        .where(
            ReplacementRequest.assignmentId == payload.assignmentId,
            ReplacementRequest.status.in_(
                [
                    "SUBMITTED",
                    "UNDER_REVIEW",
                    "ASSIGNED",
                ]
            ),
        )
    )

    existing_request = duplicate_result.scalar_one_or_none()

    if existing_request is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Duplicate requests are prevented",
        )

    # --------------------------------------------------------
    # 4. Load current caregiver
    # --------------------------------------------------------

    caregiver_result = await db.execute(
        select(Caregiver)
        .where(
            Caregiver.id == assignment.caregiver_id
        )
    )

    caregiver = caregiver_result.scalar_one_or_none()

    if not caregiver:
        raise HTTPException(
            status_code=404,
            detail="Current caregiver not found",
        )

    # --------------------------------------------------------
    # 5. Create replacement request
    # --------------------------------------------------------

    replacement = ReplacementRequest(
        assignmentId=payload.assignmentId,
        familyUserId=family_user_id,
        elderId=assignment.elder_id,
        currentCaregiverId=caregiver.id,
        reasonCode=payload.reasonCode,
        notes=payload.notes,
        priority=payload.priority or "NORMAL",
        requestedStartAt=payload.requestedStartAt,
        status="SUBMITTED",
    )

    db.add(replacement)

    await db.flush()

    # --------------------------------------------------------
    # 6. Initial status history
    # --------------------------------------------------------

    history = ReplacementStatusHistory(
        replacementRequestId=replacement.id,
        oldStatus=None,
        newStatus="SUBMITTED",
        changedByUserId=family_user_id,
        note=(
            "Replacement request initiated. "
            f"Reason: {payload.reasonCode}"
        ),
    )

    db.add(history)

    # --------------------------------------------------------
    # 7. Audit log
    # --------------------------------------------------------

    db.add(
        AuditLog(
            actorUserId=family_user_id,
            entityType="REPLACEMENT_REQUEST",
            entityId=replacement.id,
            action="CREATED",
            oldValue=None,
            newValue="SUBMITTED",
            auditMetadata={
                "reasonCode": payload.reasonCode,
                "priority": payload.priority or "NORMAL",
            },
        )
    )

    # --------------------------------------------------------
    # 8. Notification
    # --------------------------------------------------------

    db.add(
        Notification(
            recipientUserId=family_user_id,
            eventType="REPLACEMENT_UPDATE",
            referenceType="REPLACEMENT_REQUEST",
            referenceId=replacement.id,
            title="Replacement Request Submitted",
            message=(
                "Your caregiver replacement request "
                "has been received."
            ),
        )
    )

    # --------------------------------------------------------
    # 9. Commit
    # --------------------------------------------------------

    await db.commit()

    # --------------------------------------------------------
    # 10. Reload with relationships
    # --------------------------------------------------------

    refreshed_result = await db.execute(
        select(ReplacementRequest)
        .where(
            ReplacementRequest.id == replacement.id
        )
        .options(
            selectinload(
                ReplacementRequest.currentCaregiver
            ),
            selectinload(
                ReplacementRequest.substituteCaregiver
            ),
            selectinload(
                ReplacementRequest.history
            ),
        )
        .execution_options(
            populate_existing=True
        )
    )

    return refreshed_result.scalar_one()


# ============================================================

# ============================================================
# FAMILY SPONSOR - GET REPLACEMENT REQUESTS
# GET /api/replacement-requests
# ============================================================

@router.get(
    "/replacement-requests",
    response_model=List[ReplacementRequestResponse],
)
async def get_my_replacement_requests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(ReplacementRequest)
        .options(
            selectinload(ReplacementRequest.assignment)
        )
    )
    result = await db.execute(query)
    requests = result.scalars().all()
    # Filter in python for simplicity if needed, but returning all is fine if no multi-tenant strictness is in place, or filter by sponsor_id
    filtered = [r for r in requests if r.assignment and r.assignment.sponsor_id == current_user.id]
    return filtered


# OPERATIONS QUEUE
# GET /api/operations/replacement-queue
# ============================================================

@router.get(
    "/operations/replacement-queue",
    response_model=List[ReplacementRequestResponse],
)
async def get_operations_replacement_queue(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):

    query = (
        select(ReplacementRequest)
        .options(
            selectinload(
                ReplacementRequest.currentCaregiver
            ),
            selectinload(
                ReplacementRequest.substituteCaregiver
            ),
            selectinload(
                ReplacementRequest.history
            ),
        )
        .order_by(
            desc(ReplacementRequest.createdAt)
        )
    )

    if status:
        query = query.where(
            ReplacementRequest.status == status
        )

    result = await db.execute(query)

    return result.scalars().unique().all()


# ============================================================
# GET SINGLE REPLACEMENT
# GET /api/replacement-requests/{id}
# ============================================================

@router.get(
    "/replacement-requests/{replacement_id}",
    response_model=ReplacementRequestResponse,
)
async def get_replacement(
    replacement_id: str,
    db: AsyncSession = Depends(get_db),
):

    replacement = await get_replacement_request(
        db,
        replacement_id,
    )

    if not replacement:
        raise HTTPException(
            status_code=404,
            detail="Replacement request not found",
        )

    return replacement


# ============================================================
# OPERATIONS - UPDATE STATUS
# PATCH /api/operations/replacement-requests/{id}
# ============================================================

@router.patch(
    "/operations/replacement-requests/{replacement_id}",
    response_model=ReplacementRequestResponse,
)
async def update_replacement_status(
    replacement_id: str,
    payload: ReplacementStatusUpdate,
    db: AsyncSession = Depends(get_db),
):

    replacement = await get_replacement_request(
        db,
        replacement_id,
    )

    if not replacement:
        raise HTTPException(
            status_code=404,
            detail="Replacement request not found",
        )

    old_status = replacement.status

    replacement.status = payload.status

    if payload.note is not None:
        replacement.resolutionNotes = payload.note

    if payload.resolutionNotes is not None:
        replacement.resolutionNotes = payload.resolutionNotes

    if payload.status in (
        "RESOLVED",
        "REJECTED",
        "CANCELLED",
    ):
        replacement.resolvedAt = datetime.now(
            timezone.utc
        )

    db.add(
        ReplacementStatusHistory(
            replacementRequestId=replacement.id,
            oldStatus=old_status,
            newStatus=payload.status,
            changedByUserId=None,
            note=(
                payload.note
                or f"Status transitioned to {payload.status}."
            ),
        )
    )

    await db.commit()

    refreshed_result = await db.execute(
        select(ReplacementRequest)
        .where(
            ReplacementRequest.id == replacement.id
        )
        .options(
            selectinload(
                ReplacementRequest.currentCaregiver
            ),
            selectinload(
                ReplacementRequest.substituteCaregiver
            ),
            selectinload(
                ReplacementRequest.history
            ),
        )
        .execution_options(
            populate_existing=True
        )
    )

    return refreshed_result.scalar_one()


# ============================================================
# OPERATIONS - ASSIGN SUBSTITUTE
# POST /api/operations/replacement-requests/{id}/assign
# ============================================================

@router.post(
    "/operations/replacement-requests/{replacement_id}/assign",
    response_model=ReplacementRequestResponse,
)
async def assign_substitute_caregiver(
    replacement_id: str,
    payload: SubstituteAssignRequest,
    db: AsyncSession = Depends(get_db),
):

    replacement = await get_replacement_request(
        db,
        replacement_id,
    )

    if not replacement:
        raise HTTPException(
            status_code=404,
            detail="Replacement request not found",
        )

    caregiver_result = await db.execute(
        select(Caregiver)
        .where(
            Caregiver.id == payload.substituteCaregiverId
        )
    )

    substitute = caregiver_result.scalar_one_or_none()

    if not substitute:
        raise HTTPException(
            status_code=404,
            detail="Substitute caregiver not found",
        )

    old_status = replacement.status

    replacement.substituteCaregiverId = substitute.id
    replacement.status = "ASSIGNED"

    db.add(
        ReplacementStatusHistory(
            replacementRequestId=replacement.id,
            oldStatus=old_status,
            newStatus="ASSIGNED",
            changedByUserId=None,
            note=(
                payload.note
                or (
                    f"Substitute caregiver "
                    f"{substitute.fullName} assigned."
                )
            ),
        )
    )

    await db.commit()

    refreshed_result = await db.execute(
        select(ReplacementRequest)
        .where(
            ReplacementRequest.id == replacement.id
        )
        .options(
            selectinload(
                ReplacementRequest.currentCaregiver
            ),
            selectinload(
                ReplacementRequest.substituteCaregiver
            ),
            selectinload(
                ReplacementRequest.history
            ),
        )
        .execution_options(
            populate_existing=True
        )
    )

    return refreshed_result.scalar_one()


# ============================================================
# CONFIRM REPLACEMENT
# POST /api/replacement-requests/{id}/confirm-replacement
# ============================================================

@router.post(
    "/replacement-requests/{replacement_id}/confirm-replacement",
    response_model=ReplacementRequestResponse,
)
async def confirm_replacement(
    replacement_id: str,
    db: AsyncSession = Depends(get_db),
):

    # --------------------------------------------------------
    # 1. Load replacement
    # --------------------------------------------------------

    result = await db.execute(
        select(ReplacementRequest)
        .where(
            ReplacementRequest.id == replacement_id
        )
        .options(
            selectinload(
                ReplacementRequest.currentCaregiver
            ),
            selectinload(
                ReplacementRequest.substituteCaregiver
            ),
            selectinload(
                ReplacementRequest.history
            ),
        )
    )

    replacement = result.scalar_one_or_none()

    if not replacement:
        raise HTTPException(
            status_code=404,
            detail="Replacement request not found",
        )

    # --------------------------------------------------------
    # 2. Validate substitute
    # --------------------------------------------------------

    if not replacement.substituteCaregiverId:
        raise HTTPException(
            status_code=400,
            detail="No substitute caregiver assigned",
        )

    # --------------------------------------------------------
    # 3. Load assignment
    # --------------------------------------------------------

    assignment_result = await db.execute(
        select(CareAssignment)
        .where(
            CareAssignment.id == replacement.assignmentId
        )
    )

    assignment = assignment_result.scalar_one_or_none()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Care assignment not found",
        )

    # --------------------------------------------------------
    # 4. Load substitute
    # --------------------------------------------------------

    substitute_result = await db.execute(
        select(Caregiver)
        .where(
            Caregiver.id == replacement.substituteCaregiverId
        )
    )

    substitute = substitute_result.scalar_one_or_none()

    if not substitute:
        raise HTTPException(
            status_code=404,
            detail="Substitute caregiver not found",
        )

    # --------------------------------------------------------
    # 5. Update assignment
    # --------------------------------------------------------

    assignment.caregiver_id = substitute.id

    # --------------------------------------------------------
    # 6. Update substitute caregiver
    # --------------------------------------------------------

    substitute.status = "ON_DUTY"
    substitute.isBufferPool = False
    substitute.is_active = True

    # --------------------------------------------------------
    # 7. Resolve replacement
    # --------------------------------------------------------

    old_status = replacement.status

    replacement.status = "RESOLVED"

    replacement.resolvedAt = datetime.now(
        timezone.utc
    )

    replacement.resolutionNotes = (
        "Replacement confirmed and caregiver "
        "assignment updated."
    )

    # --------------------------------------------------------
    # 8. Status history
    # --------------------------------------------------------

    db.add(
        ReplacementStatusHistory(
            replacementRequestId=replacement.id,
            oldStatus=old_status,
            newStatus="RESOLVED",
            changedByUserId=None,
            note="Replacement confirmed",
        )
    )

    # --------------------------------------------------------
    # 9. Audit log
    # --------------------------------------------------------

    db.add(
        AuditLog(
            actorUserId=replacement.familyUserId,
            entityType="REPLACEMENT_REQUEST",
            entityId=replacement.id,
            action="CONFIRMED",
            oldValue=old_status,
            newValue="RESOLVED",
            auditMetadata={
                "caregiverId": substitute.id,
                "caregiverName": substitute.fullName,
                "assignmentId": assignment.id,
            },
        )
    )

    # --------------------------------------------------------
    # 10. Notification
    # --------------------------------------------------------

    db.add(
        Notification(
            recipientUserId=replacement.familyUserId,
            eventType="REPLACEMENT_UPDATE",
            referenceType="REPLACEMENT_REQUEST",
            referenceId=replacement.id,
            title="Caregiver Replacement Confirmed",
            message=(
                "Your caregiver replacement has been "
                "confirmed successfully."
            ),
        )
    )

    # --------------------------------------------------------
    # 11. Commit
    # --------------------------------------------------------

    await db.commit()

    # --------------------------------------------------------
    # 12. Reload
    # --------------------------------------------------------

    response_result = await db.execute(
        select(ReplacementRequest)
        .where(
            ReplacementRequest.id == replacement_id
        )
        .options(
            selectinload(
                ReplacementRequest.currentCaregiver
            ),
            selectinload(
                ReplacementRequest.substituteCaregiver
            ),
            selectinload(
                ReplacementRequest.history
            ),
        )
    )

    refreshed = response_result.scalar_one()

    # --------------------------------------------------------
    # 13. Current caregiver
    # --------------------------------------------------------

    current_caregiver_data = None

    if refreshed.currentCaregiver:

        caregiver = refreshed.currentCaregiver

        current_caregiver_data = {
            "id": caregiver.id,
            "fullName": caregiver.fullName,
            "phone": caregiver.phone,
            "gender": caregiver.gender,
            "rating": caregiver.rating,
            "experienceYears": caregiver.experienceYears,
            "languages": caregiver.languages,
            "specializations": caregiver.specializations,
            "locality": caregiver.locality,
            "isBufferPool": caregiver.isBufferPool,
            "status": caregiver.status,
            "avatarUrl": caregiver.avatarUrlValue,
            "createdAt": caregiver.createdAt,
            "updatedAt": caregiver.updatedAt,
        }

    # --------------------------------------------------------
    # 14. Substitute caregiver
    # --------------------------------------------------------

    substitute_caregiver_data = None

    if refreshed.substituteCaregiver:

        caregiver = refreshed.substituteCaregiver

        substitute_caregiver_data = {
            "id": caregiver.id,
            "fullName": caregiver.fullName,
            "phone": caregiver.phone,
            "gender": caregiver.gender,
            "rating": caregiver.rating,
            "experienceYears": caregiver.experienceYears,
            "languages": caregiver.languages,
            "specializations": caregiver.specializations,
            "locality": caregiver.locality,
            "isBufferPool": caregiver.isBufferPool,
            "status": caregiver.status,
            "avatarUrl": caregiver.avatarUrlValue,
            "createdAt": caregiver.createdAt,
            "updatedAt": caregiver.updatedAt,
        }

    # --------------------------------------------------------
    # 15. History
    # --------------------------------------------------------

    history_data = [
        {
            "id": item.id,
            "replacementRequestId": item.replacementRequestId,
            "oldStatus": item.oldStatus,
            "newStatus": item.newStatus,
            "changedByUserId": item.changedByUserId,
            "note": item.note,
            "createdAt": item.createdAt,
        }
        for item in refreshed.history
    ]

    # --------------------------------------------------------
    # 16. Return plain response
    # --------------------------------------------------------

    return {
        "id": refreshed.id,
        "assignmentId": refreshed.assignmentId,
        "familyUserId": refreshed.familyUserId,
        "elderId": refreshed.elderId,
        "currentCaregiverId": refreshed.currentCaregiverId,
        "substituteCaregiverId": refreshed.substituteCaregiverId,
        "reasonCode": refreshed.reasonCode,
        "notes": refreshed.notes,
        "priority": refreshed.priority,
        "requestedStartAt": refreshed.requestedStartAt,
        "status": refreshed.status,
        "assignedOperationsUserId": (
            refreshed.assignedOperationsUserId
        ),
        "resolutionNotes": refreshed.resolutionNotes,
        "resolvedAt": refreshed.resolvedAt,
        "createdAt": refreshed.createdAt,
        "updatedAt": refreshed.updatedAt,
        "currentCaregiver": current_caregiver_data,
        "substituteCaregiver": substitute_caregiver_data,
        "history": history_data,
    }


# ============================================================
# CANCEL REPLACEMENT
# POST /api/replacement-requests/{id}/cancel
# ============================================================

@router.post(
    "/replacement-requests/{replacement_id}/cancel",
    response_model=ReplacementRequestResponse,
)
async def cancel_replacement(
    replacement_id: str,
    db: AsyncSession = Depends(get_db),
):

    replacement = await get_replacement_request(
        db,
        replacement_id,
    )

    if not replacement:
        raise HTTPException(
            status_code=404,
            detail="Replacement request not found",
        )

    old_status = replacement.status

    replacement.status = "CANCELLED"

    replacement.resolvedAt = datetime.now(
        timezone.utc
    )

    db.add(
        ReplacementStatusHistory(
            replacementRequestId=replacement.id,
            oldStatus=old_status,
            newStatus="CANCELLED",
            changedByUserId=None,
            note="Replacement request cancelled",
        )
    )

    await db.commit()

    refreshed_result = await db.execute(
        select(ReplacementRequest)
        .where(
            ReplacementRequest.id == replacement.id
        )
        .options(
            selectinload(
                ReplacementRequest.currentCaregiver
            ),
            selectinload(
                ReplacementRequest.substituteCaregiver
            ),
            selectinload(
                ReplacementRequest.history
            ),
        )
        .execution_options(
            populate_existing=True
        )
    )

    return refreshed_result.scalar_one()