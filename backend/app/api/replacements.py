from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User
from app.models.caregiver import Caregiver, CareAssignment
from app.models.replacement import ReplacementRequest, ReplacementStatusHistory
from app.models.audit import AuditLog, Notification
from app.schemas.phase_d import (
    ReplacementRequestCreate,
    ReplacementRequestResponse,
    ReplacementStatusUpdate,
    SubstituteAssignRequest
)

router = APIRouter(tags=["Caregiver Replacement (Phase D01)"])

ACTIVE_STATUSES = ["SUBMITTED", "ACKNOWLEDGED", "UNDER_REVIEW", "REPLACEMENT_SEARCH", "ASSIGNED", "SCHEDULED"]

@router.post("/replacement-requests", response_model=ReplacementRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_replacement_request(
    data: ReplacementRequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Family Sponsor creates a caregiver replacement request for an active assignment."""
    # 1. Fetch assignment and verify ownership
    asg_res = await db.execute(
        select(CareAssignment)
        .options(selectinload(CareAssignment.caregiver))
        .where(CareAssignment.id == data.assignmentId)
    )
    assignment = asg_res.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active care assignment not found.")
    
    if assignment.familyUserId != current_user.id and current_user.role not in ["ADMIN", "OPS_MANAGER"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized to modify this assignment.")

    if assignment.status != "ACTIVE":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot request replacement for assignment with status {assignment.status}.")

    # 2. Prevent duplicate open replacement requests
    dup_res = await db.execute(
        select(ReplacementRequest)
        .where(
            ReplacementRequest.assignmentId == data.assignmentId,
            ReplacementRequest.status.in_(ACTIVE_STATUSES)
        )
    )
    existing_request = dup_res.scalar_one_or_none()
    if existing_request:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An active replacement request already exists (Status: {existing_request.status}). Duplicate requests are prevented."
        )

    # 3. Create request
    req = ReplacementRequest(
        assignmentId=data.assignmentId,
        familyUserId=current_user.id,
        elderId=assignment.elderId,
        currentCaregiverId=assignment.caregiverId,
        reasonCode=data.reasonCode,
        notes=data.notes,
        priority=data.priority,
        requestedStartAt=data.requestedStartAt,
        status="SUBMITTED"
    )
    db.add(req)
    await db.flush()

    # 4. Create history log
    history = ReplacementStatusHistory(
        replacementRequestId=req.id,
        oldStatus=None,
        newStatus="SUBMITTED",
        changedByUserId=current_user.id,
        note=f"Replacement request initiated. Reason: {data.reasonCode}"
    )
    db.add(history)

    # 5. Create audit log
    audit = AuditLog(
        actorUserId=current_user.id,
        entityType="REPLACEMENT_REQUEST",
        entityId=req.id,
        action="CREATED",
        oldValue=None,
        newValue="SUBMITTED",
        auditMetadata={"reasonCode": data.reasonCode, "priority": data.priority}
    )
    db.add(audit)

    # 6. Create family confirmation notification
    notif = Notification(
        recipientUserId=current_user.id,
        eventType="REPLACEMENT_UPDATE",
        referenceType="REPLACEMENT_REQUEST",
        referenceId=req.id,
        title="Replacement Request Submitted",
        message=f"Your request to replace attendant for {assignment.caregiver.fullName} has been received by Chennai Care Operations."
    )
    db.add(notif)

    await db.commit()

    # Reload with relationships
    res = await db.execute(
        select(ReplacementRequest)
        .options(
            selectinload(ReplacementRequest.currentCaregiver),
            selectinload(ReplacementRequest.substituteCaregiver),
            selectinload(ReplacementRequest.history)
        )
        .where(ReplacementRequest.id == req.id)
    )
    return res.scalar_one()


@router.get("/replacement-requests", response_model=List[ReplacementRequestResponse])
async def list_replacement_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List replacement requests for the current authenticated family user."""
    res = await db.execute(
        select(ReplacementRequest)
        .options(
            selectinload(ReplacementRequest.currentCaregiver),
            selectinload(ReplacementRequest.substituteCaregiver),
            selectinload(ReplacementRequest.history)
        )
        .where(ReplacementRequest.familyUserId == current_user.id)
        .order_by(desc(ReplacementRequest.createdAt))
    )
    return res.scalars().all()


@router.get("/replacement-requests/{id}", response_model=ReplacementRequestResponse)
async def get_replacement_request(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve details and audit timeline for a specific replacement request."""
    res = await db.execute(
        select(ReplacementRequest)
        .options(
            selectinload(ReplacementRequest.currentCaregiver),
            selectinload(ReplacementRequest.substituteCaregiver),
            selectinload(ReplacementRequest.history)
        )
        .where(ReplacementRequest.id == id)
    )
    req = res.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Replacement request not found.")
    
    if req.familyUserId != current_user.id and current_user.role not in ["ADMIN", "OPS_MANAGER"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this request.")

    return req


@router.post("/replacement-requests/{id}/cancel", response_model=ReplacementRequestResponse)
async def cancel_replacement_request(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Family Sponsor or Operations cancels an open replacement request."""
    res = await db.execute(
        select(ReplacementRequest)
        .options(
            selectinload(ReplacementRequest.currentCaregiver),
            selectinload(ReplacementRequest.substituteCaregiver),
            selectinload(ReplacementRequest.history)
        )
        .where(ReplacementRequest.id == id)
    )
    req = res.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Replacement request not found.")

    if req.familyUserId != current_user.id and current_user.role not in ["ADMIN", "OPS_MANAGER"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if req.status in ["RESOLVED", "CANCELLED", "REJECTED"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot cancel a request that is {req.status}.")

    old_status = req.status
    req.status = "CANCELLED"
    req.resolutionNotes = "Cancelled by user."
    req.resolvedAt = datetime.now(timezone.utc)

    db.add(ReplacementStatusHistory(
        replacementRequestId=req.id,
        oldStatus=old_status,
        newStatus="CANCELLED",
        changedByUserId=current_user.id,
        note="Request cancelled."
    ))
    db.add(AuditLog(
        actorUserId=current_user.id,
        entityType="REPLACEMENT_REQUEST",
        entityId=req.id,
        action="STATUS_CHANGED",
        oldValue=old_status,
        newValue="CANCELLED"
    ))
    await db.commit()
    return req


@router.post("/replacement-requests/{id}/confirm-replacement", response_model=ReplacementRequestResponse)
async def confirm_replacement(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Family confirms the proposed substitute caregiver, transitioning assignment and resolving request."""
    res = await db.execute(
        select(ReplacementRequest)
        .options(
            selectinload(ReplacementRequest.currentCaregiver),
            selectinload(ReplacementRequest.substituteCaregiver),
            selectinload(ReplacementRequest.history)
        )
        .where(ReplacementRequest.id == id)
    )
    req = res.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Replacement request not found.")

    if req.familyUserId != current_user.id and current_user.role not in ["ADMIN", "OPS_MANAGER"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if req.status != "ASSIGNED" or not req.substituteCaregiverId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot confirm replacement until Operations has assigned a substitute caregiver."
        )

    # Transition CareAssignment to new caregiver
    asg_res = await db.execute(select(CareAssignment).where(CareAssignment.id == req.assignmentId))
    assignment = asg_res.scalar_one()
    assignment.caregiverId = req.substituteCaregiverId

    # Update substitute caregiver status
    sub_res = await db.execute(select(Caregiver).where(Caregiver.id == req.substituteCaregiverId))
    sub_cg = sub_res.scalar_one_or_none()
    if sub_cg:
        sub_cg.status = "ON_DUTY"
        sub_cg.isBufferPool = False

    old_status = req.status
    req.status = "RESOLVED"
    req.resolvedAt = datetime.now(timezone.utc)
    req.resolutionNotes = f"Replacement confirmed by family. Substitute {sub_cg.fullName if sub_cg else ''} activated."

    db.add(ReplacementStatusHistory(
        replacementRequestId=req.id,
        oldStatus=old_status,
        newStatus="RESOLVED",
        changedByUserId=current_user.id,
        note="Family confirmed replacement attendant."
    ))
    db.add(AuditLog(
        actorUserId=current_user.id,
        entityType="REPLACEMENT_REQUEST",
        entityId=req.id,
        action="RESOLVED",
        oldValue=old_status,
        newValue="RESOLVED"
    ))
    db.add(Notification(
        recipientUserId=req.familyUserId,
        eventType="REPLACEMENT_UPDATE",
        referenceType="REPLACEMENT_REQUEST",
        referenceId=req.id,
        title="Replacement Confirmed",
        message=f"Attendant {sub_cg.fullName if sub_cg else 'Substitute'} is now assigned to your elder."
    ))

    await db.commit()
    return req


# --- Operations Console Endpoints ---

@router.get("/operations/replacement-queue", response_model=List[ReplacementRequestResponse])
async def get_operations_replacement_queue(
    status_filter: Optional[str] = Query(None, alias="status"),
    priority_filter: Optional[str] = Query(None, alias="priority"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Operations queue of replacement requests with status and priority filtering."""
    query = (
        select(ReplacementRequest)
        .options(
            selectinload(ReplacementRequest.currentCaregiver),
            selectinload(ReplacementRequest.substituteCaregiver),
            selectinload(ReplacementRequest.history)
        )
        .order_by(desc(ReplacementRequest.createdAt))
    )

    if status_filter:
        query = query.where(ReplacementRequest.status == status_filter)
    if priority_filter:
        query = query.where(ReplacementRequest.priority == priority_filter)

    res = await db.execute(query)
    return res.scalars().all()


@router.patch("/operations/replacement-requests/{id}", response_model=ReplacementRequestResponse)
async def update_operations_replacement_request(
    id: str,
    payload: ReplacementStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Operations changes request status (e.g. ACKNOWLEDGED, UNDER_REVIEW, REJECTED) and notes."""
    res = await db.execute(
        select(ReplacementRequest)
        .options(
            selectinload(ReplacementRequest.currentCaregiver),
            selectinload(ReplacementRequest.substituteCaregiver),
            selectinload(ReplacementRequest.history)
        )
        .where(ReplacementRequest.id == id)
    )
    req = res.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Replacement request not found.")

    old_status = req.status
    req.status = payload.status
    req.assignedOperationsUserId = current_user.id
    if payload.resolutionNotes:
        req.resolutionNotes = payload.resolutionNotes

    if payload.status in ["RESOLVED", "REJECTED", "CANCELLED"]:
        req.resolvedAt = datetime.now(timezone.utc)

    db.add(ReplacementStatusHistory(
        replacementRequestId=req.id,
        oldStatus=old_status,
        newStatus=payload.status,
        changedByUserId=current_user.id,
        note=payload.note or f"Status transitioned to {payload.status} by Operations."
    ))
    db.add(AuditLog(
        actorUserId=current_user.id,
        entityType="REPLACEMENT_REQUEST",
        entityId=req.id,
        action="STATUS_CHANGED",
        oldValue=old_status,
        newValue=payload.status,
        auditMetadata={"note": payload.note}
    ))
    db.add(Notification(
        recipientUserId=req.familyUserId,
        eventType="REPLACEMENT_UPDATE",
        referenceType="REPLACEMENT_REQUEST",
        referenceId=req.id,
        title=f"Replacement Status: {payload.status}",
        message=payload.note or f"Your replacement request has been moved to {payload.status}."
    ))

    await db.commit()
    return req


@router.post("/operations/replacement-requests/{id}/assign", response_model=ReplacementRequestResponse)
async def assign_substitute_caregiver(
    id: str,
    payload: SubstituteAssignRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Operations assigns vetted substitute caregiver from Chennai buffer pool."""
    res = await db.execute(
        select(ReplacementRequest)
        .options(
            selectinload(ReplacementRequest.currentCaregiver),
            selectinload(ReplacementRequest.substituteCaregiver),
            selectinload(ReplacementRequest.history)
        )
        .where(ReplacementRequest.id == id)
    )
    req = res.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Replacement request not found.")

    cg_res = await db.execute(select(Caregiver).where(Caregiver.id == payload.substituteCaregiverId))
    substitute = cg_res.scalar_one_or_none()
    if not substitute:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Substitute caregiver not found.")

    old_status = req.status
    req.substituteCaregiverId = substitute.id
    req.status = "ASSIGNED"
    req.assignedOperationsUserId = current_user.id

    db.add(ReplacementStatusHistory(
        replacementRequestId=req.id,
        oldStatus=old_status,
        newStatus="ASSIGNED",
        changedByUserId=current_user.id,
        note=f"Substitute attendant {substitute.fullName} matched from Chennai buffer pool."
    ))
    db.add(AuditLog(
        actorUserId=current_user.id,
        entityType="REPLACEMENT_REQUEST",
        entityId=req.id,
        action="ASSIGNED",
        oldValue=old_status,
        newValue="ASSIGNED",
        auditMetadata={"substituteCaregiverId": substitute.id, "substituteName": substitute.fullName}
    ))
    db.add(Notification(
        recipientUserId=req.familyUserId,
        eventType="REPLACEMENT_UPDATE",
        referenceType="REPLACEMENT_REQUEST",
        referenceId=req.id,
        title="Substitute Attendant Assigned",
        message=f"Operations proposed {substitute.fullName} ({substitute.experienceYears} yrs experience, rating {substitute.rating}★). Please review and confirm."
    ))

    await db.commit()
    return req

