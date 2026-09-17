from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User
from app.models.renewal import Renewal
from app.models.feedback import OperationsIssue
from app.models.audit import AuditLog, Notification
from app.schemas.phase_d import (
    RenewalResponse,
    RenewalConfirmRequest,
    MandateToggleRequest,
    RenewalChangeRequest
)

router = APIRouter(tags=["Renewals & Auto-Debit (Phase D04)"])

@router.get("/renewals/upcoming", response_model=Optional[RenewalResponse])
async def get_upcoming_renewal(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve the upcoming renewal status and auto-debit authorization for the family sponsor."""
    res = await db.execute(
        select(Renewal)
        .where(Renewal.familyUserId == current_user.id)
        .order_by(desc(Renewal.currentPeriodEnd))
    )
    return res.scalars().first()


@router.post("/renewals/confirm", response_model=RenewalResponse)
async def confirm_renewal(
    payload: RenewalConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Confirm renewal for the upcoming care cycle."""
    res = await db.execute(
        select(Renewal)
        .where(Renewal.familyUserId == current_user.id)
        .order_by(desc(Renewal.currentPeriodEnd))
    )
    renewal = res.scalars().first()
    if not renewal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No renewal found for your active care assignment.")

    old_status = renewal.status
    renewal.status = "CONFIRMED"
    if payload.notes:
        renewal.notes = payload.notes

    db.add(AuditLog(
        actorUserId=current_user.id,
        entityType="RENEWAL",
        entityId=renewal.id,
        action="CONFIRMED",
        oldValue=old_status,
        newValue="CONFIRMED",
        auditMetadata={"notes": payload.notes}
    ))
    db.add(Notification(
        recipientUserId=current_user.id,
        eventType="RENEWAL_DUE",
        referenceType="RENEWAL",
        referenceId=renewal.id,
        title="Renewal Confirmed",
        message="Your elder care service plan has been confirmed for the upcoming month."
    ))

    await db.commit()
    await db.refresh(renewal)
    return renewal


@router.post("/renewals/mandate", response_model=RenewalResponse)
async def toggle_auto_debit_mandate(
    payload: MandateToggleRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Enable or disable Razorpay recurring auto-debit / e-mandate."""
    res = await db.execute(
        select(Renewal)
        .where(Renewal.familyUserId == current_user.id)
        .order_by(desc(Renewal.currentPeriodEnd))
    )
    renewal = res.scalars().first()
    if not renewal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No renewal record found.")

    renewal.autoDebitEnabled = payload.enable
    if payload.enable:
        renewal.autoDebitMandateId = f"mandate_{current_user.id[:8]}_active"
        renewal.mandateStatus = "ACTIVE"
    else:
        renewal.mandateStatus = "NOT_CONFIGURED"

    db.add(AuditLog(
        actorUserId=current_user.id,
        entityType="RENEWAL",
        entityId=renewal.id,
        action="MANDATE_CHANGED",
        oldValue="DISABLED" if payload.enable else "ENABLED",
        newValue="ENABLED" if payload.enable else "DISABLED"
    ))

    await db.commit()
    await db.refresh(renewal)
    return renewal


@router.post("/renewals/request-change", response_model=RenewalResponse)
async def request_renewal_change(
    payload: RenewalChangeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Request plan alteration or cancellation before service renewal date."""
    res = await db.execute(
        select(Renewal)
        .where(Renewal.familyUserId == current_user.id)
        .order_by(desc(Renewal.currentPeriodEnd))
    )
    renewal = res.scalars().first()
    if not renewal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No renewal record found.")

    old_status = renewal.status
    if payload.action == "CANCEL_SERVICE":
        renewal.status = "CANCELLED"
        renewal.notes = f"Cancellation requested: {payload.reason}"
    else:
        renewal.notes = f"Plan change requested to {payload.preferredPlan}: {payload.reason}"

    # Flag an operations issue for follow-up
    db.add(OperationsIssue(
        sourceType="RENEWAL",
        sourceId=renewal.id,
        priority="HIGH" if payload.action == "CANCEL_SERVICE" else "NORMAL",
        status="OPEN",
        summary=f"Renewal Alert: Family requested {payload.action} (Reason: {payload.reason})"
    ))

    db.add(AuditLog(
        actorUserId=current_user.id,
        entityType="RENEWAL",
        entityId=renewal.id,
        action="CHANGE_REQUESTED",
        oldValue=old_status,
        newValue=renewal.status,
        auditMetadata={"action": payload.action, "reason": payload.reason}
    ))

    await db.commit()
    await db.refresh(renewal)
    return renewal


@router.get("/operations/renewals", response_model=List[RenewalResponse])
async def get_operations_renewals(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Operations console endpoint for all upcoming renewals."""
    res = await db.execute(select(Renewal).order_by(desc(Renewal.currentPeriodEnd)))
    return res.scalars().all()

