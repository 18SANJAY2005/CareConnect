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
from app.models.feedback import CareFeedback, OperationsIssue
from app.models.audit import AuditLog, Notification
from app.schemas.phase_d import (
    CareFeedbackCreate,
    CareFeedbackResponse,
    OperationsIssueResponse,
    OperationsIssueUpdate
)

router = APIRouter(tags=["Feedback & Quality Assurance (Phase D02)"])

@router.post("/feedback", response_model=CareFeedbackResponse, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    data: CareFeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Family Sponsor submits structured feedback and ratings for an active care assignment."""
    asg_res = await db.execute(
        select(CareAssignment)
        .options(selectinload(CareAssignment.caregiver))
        .where(CareAssignment.id == data.assignmentId)
    )
    assignment = asg_res.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Care assignment not found.")

    if assignment.familyUserId != current_user.id and current_user.role not in ["ADMIN", "OPS_MANAGER"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized to submit feedback for this assignment.")

    # Create feedback record
    feedback = CareFeedback(
        assignmentId=assignment.id,
        familyUserId=current_user.id,
        caregiverId=assignment.caregiverId,
        elderId=assignment.elderId,
        caregiverRating=data.caregiverRating,
        serviceRating=data.serviceRating,
        tags=data.tags,
        comment=data.comment,
        seniorFeedback=data.seniorFeedback,
        visibility=data.visibility
    )
    db.add(feedback)
    await db.flush()

    # If rating <= 2, automatically escalate as an Operations QA Issue
    if data.caregiverRating <= 2 or data.serviceRating <= 2:
        issue = OperationsIssue(
            sourceType="FEEDBACK",
            sourceId=feedback.id,
            priority="HIGH" if (data.caregiverRating == 1 or data.serviceRating == 1) else "NORMAL",
            status="OPEN",
            summary=f"Quality Alert: Rating {data.caregiverRating}★/5★ from family for {assignment.caregiver.fullName}",
            resolutionNotes=None
        )
        db.add(issue)
        
        # Notification to family that Ops is reviewing
        db.add(Notification(
            recipientUserId=current_user.id,
            eventType="ISSUE_RESOLVED",
            referenceType="FEEDBACK",
            referenceId=feedback.id,
            title="Care Quality Review Initiated",
            message="Thank you for your feedback. Our Clinical Care Manager in Chennai has flagged this for supervisory review."
        ))

    db.add(AuditLog(
        actorUserId=current_user.id,
        entityType="FEEDBACK",
        entityId=feedback.id,
        action="CREATED",
        oldValue=None,
        newValue=f"{data.caregiverRating}★",
        auditMetadata={"tags": data.tags, "serviceRating": data.serviceRating}
    ))

    await db.commit()
    await db.refresh(feedback)
    return feedback


@router.get("/feedback", response_model=List[CareFeedbackResponse])
async def list_feedback(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List feedbacks submitted by the family sponsor."""
    res = await db.execute(
        select(CareFeedback)
        .where(CareFeedback.familyUserId == current_user.id)
        .order_by(desc(CareFeedback.createdAt))
    )
    return res.scalars().all()


@router.get("/operations/feedback-queue", response_model=List[OperationsIssueResponse])
async def get_operations_issues_queue(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Operations queue of escalated QA feedback issues."""
    query = select(OperationsIssue).order_by(desc(OperationsIssue.createdAt))
    if status_filter:
        query = query.where(OperationsIssue.status == status_filter)
    res = await db.execute(query)
    return res.scalars().all()


@router.patch("/operations/issues/{id}", response_model=OperationsIssueResponse)
async def update_operations_issue(
    id: str,
    payload: OperationsIssueUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Operations resolves or updates a QA issue."""
    res = await db.execute(select(OperationsIssue).where(OperationsIssue.id == id))
    issue = res.scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Operations issue not found.")

    old_status = issue.status
    issue.status = payload.status
    if payload.resolutionNotes:
        issue.resolutionNotes = payload.resolutionNotes
    if payload.ownerUserId:
        issue.ownerUserId = payload.ownerUserId
    else:
        issue.ownerUserId = current_user.id

    if payload.status in ["RESOLVED", "CLOSED"]:
        issue.resolvedAt = datetime.now(timezone.utc)

    db.add(AuditLog(
        actorUserId=current_user.id,
        entityType="OPERATIONS_ISSUE",
        entityId=issue.id,
        action="STATUS_CHANGED",
        oldValue=old_status,
        newValue=payload.status,
        auditMetadata={"resolutionNotes": payload.resolutionNotes}
    ))

    await db.commit()
    await db.refresh(issue)
    return issue

