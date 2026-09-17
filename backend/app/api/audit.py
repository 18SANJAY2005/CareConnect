from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User
from app.models.audit import AuditLog, Notification
from app.schemas.phase_d import AuditLogResponse, NotificationResponse

router = APIRouter(tags=["Audit Logs & Notifications"])

@router.get("/notifications", response_model=List[NotificationResponse])
async def list_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve notifications for the authenticated user."""
    res = await db.execute(
        select(Notification)
        .where(Notification.recipientUserId == current_user.id)
        .order_by(desc(Notification.createdAt))
    )
    return res.scalars().all()


@router.patch("/notifications/{id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark a notification as read."""
    res = await db.execute(select(Notification).where(Notification.id == id))
    notif = res.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")

    if notif.recipientUserId != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    notif.readAt = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(notif)
    return notif


@router.get("/operations/audit", response_model=List[AuditLogResponse])
async def get_audit_trail(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Operations console endpoint for system audit trails."""
    res = await db.execute(select(AuditLog).order_by(desc(AuditLog.createdAt)).limit(100))
    return res.scalars().all()

