from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.core.authorization import verify_elder_access
from app.models.user import User
from app.models.shift import CareShift
from app.models.elder import Elder
from app.schemas.care_log import CareTaskUpdate, CareTaskItem, BatchSyncTaskRequest, TimelineItem
from app.services.care_task_service import CareTaskService

router = APIRouter(prefix="/care-tasks", tags=["Daily Care & ADL Logs"])

@router.get("/shift/{shift_id}", status_code=status.HTTP_200_OK)
async def get_shift_tasks(
    shift_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve all daily care and ADL activities for a shift with ownership validation."""
    shift_res = await db.execute(select(CareShift).where(CareShift.id == shift_id))
    shift = shift_res.scalar_one_or_none()
    if not shift:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")

    if current_user.role == "CAREGIVER":
        if shift.caregiverId != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view tasks for this shift."
            )
    elif current_user.role == "FAMILY_SPONSOR":
        elder_res = await db.execute(select(Elder).where(Elder.id == shift.elderId))
        elder = elder_res.scalar_one_or_none()
        if not elder or elder.familyId != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view tasks for this elder."
            )
    elif current_user.role not in ["OPS_MANAGER", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied."
        )

    tasks = await CareTaskService.get_shift_tasks(db, shift_id)
    return [
        {
            "id": t.id,
            "shiftId": t.shiftId,
            "elderId": t.elderId,
            "caregiverId": t.caregiverId,
            "timeOfDay": t.timeOfDay,
            "category": t.category,
            "taskName": t.taskName,
            "status": t.status,
            "details": t.details,
            "notes": t.notes,
            "recordedAt": t.recordedAt.isoformat() if t.recordedAt else None
        }
        for t in tasks
    ]

@router.patch("/{task_id}", status_code=status.HTTP_200_OK)
async def update_care_task(
    task_id: str,
    payload: CareTaskUpdate,
    current_user: User = Depends(require_role(["CAREGIVER", "OPS_MANAGER", "ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """Update care task status (e.g. COMPLETED), details (e.g. water intake), or notes with role & ownership enforcement."""
    task = await CareTaskService.update_task(
        db=db,
        task_id=task_id,
        caregiver_id=current_user.id,
        status_val=payload.status,
        details=payload.details,
        notes=payload.notes,
        idempotency_key=payload.idempotencyKey,
        user_role=current_user.role
    )
    return {
        "id": task.id,
        "status": task.status,
        "details": task.details,
        "notes": task.notes,
        "recordedAt": task.recordedAt.isoformat() if task.recordedAt else None,
        "message": f"Task '{task.taskName}' updated to {task.status}."
    }

@router.post("/{task_id}/supervisor-correction", status_code=status.HTTP_200_OK)
async def supervisor_correct_task(
    task_id: str,
    payload: Dict[str, Any],
    current_user: User = Depends(require_role(["OPS_MANAGER", "ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Restricted supervisor correction workflow for forgotten tasks after shift is closed.
    Records reason, actor, timestamp, and audit trail.
    """
    status_val = payload.get("status", "COMPLETED")
    reason = payload.get("reason") or payload.get("correctionReason")
    if not reason or not reason.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A specific correction reason is required for supervisor task modifications."
        )

    task = await CareTaskService.supervisor_correct_task(
        db=db,
        task_id=task_id,
        supervisor_user_id=current_user.id,
        status_val=status_val,
        correction_reason=reason.strip(),
        details=payload.get("details"),
        notes=payload.get("notes")
    )
    return {
        "success": True,
        "id": task.id,
        "taskName": task.taskName,
        "status": task.status,
        "originalStatus": task.originalStatus,
        "isSupervisorCorrection": task.isSupervisorCorrection,
        "correctionReason": task.correctionReason,
        "correctedByUserId": task.correctedByUserId,
        "correctedAt": task.correctedAt.isoformat() if task.correctedAt else None,
        "message": f"Task '{task.taskName}' corrected by supervisor."
    }

@router.post("/batch", status_code=status.HTTP_200_OK)
async def batch_sync_tasks(
    payload: BatchSyncTaskRequest,
    current_user: User = Depends(require_role(["CAREGIVER", "OPS_MANAGER", "ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """Synchronize offline queued tasks from caregiver device with authentication and idempotency."""
    result = await CareTaskService.batch_sync(
        db=db,
        tasks_data=payload.tasks,
        caregiver_id=current_user.id,
        user_role=current_user.role
    )
    return result

@router.get("/elder/{elder_id}/timeline", status_code=status.HTTP_200_OK)
async def get_elder_care_timeline(
    elder_id: str,
    limit: int = 30,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve chronological care activity feed for authorized Family Sponsor or Caregiver view."""
    await verify_elder_access(db, current_user, elder_id)
    timeline = await CareTaskService.get_elder_care_timeline(db, elder_id, limit)
    return timeline
