from typing import List, Dict, Any
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.care_log import CareTaskUpdate, CareTaskItem, BatchSyncTaskRequest, TimelineItem
from app.services.care_task_service import CareTaskService

router = APIRouter(prefix="/care-tasks", tags=["Daily Care & ADL Logs"])

@router.get("/shift/{shift_id}", status_code=status.HTTP_200_OK)
async def get_shift_tasks(
    shift_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Retrieve all daily care and ADL activities for a shift."""
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
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update care task status (e.g. COMPLETED), details (e.g. water intake), or notes."""
    task = await CareTaskService.update_task(
        db=db,
        task_id=task_id,
        caregiver_id=current_user.id,
        status_val=payload.status,
        details=payload.details,
        notes=payload.notes,
        idempotency_key=payload.idempotencyKey
    )
    return {
        "id": task.id,
        "status": task.status,
        "details": task.details,
        "notes": task.notes,
        "recordedAt": task.recordedAt.isoformat() if task.recordedAt else None,
        "message": f"Task '{task.taskName}' updated to {task.status}."
    }

@router.post("/batch", status_code=status.HTTP_200_OK)
async def batch_sync_tasks(
    payload: BatchSyncTaskRequest,
    db: AsyncSession = Depends(get_db)
):
    """Synchronize offline queued tasks from caregiver device with idempotency."""
    result = await CareTaskService.batch_sync(db, payload.tasks)
    return result

@router.get("/elder/{elder_id}/timeline", status_code=status.HTTP_200_OK)
async def get_elder_care_timeline(
    elder_id: str,
    limit: int = 30,
    db: AsyncSession = Depends(get_db)
):
    """Retrieve chronological care activity feed for Family Sponsor view."""
    timeline = await CareTaskService.get_elder_care_timeline(db, elder_id, limit)
    return timeline

