import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from fastapi import HTTPException, status
from app.models.care_log import CareTask
from app.models.shift import CareShift
from app.models.user import User

DEFAULT_CARE_ACTIVITIES = [
    # Morning
    {"timeOfDay": "MORNING", "category": "MEAL", "taskName": "Morning Breakfast & Hydration", "details": {"mealType": "Breakfast", "intakePercent": 100}},
    {"timeOfDay": "MORNING", "category": "MEDICATION_OBSERVATION", "taskName": "Morning Blood Pressure / Diabetes Medication Observation", "details": {"taken": True}},
    {"timeOfDay": "MORNING", "category": "BATHING", "taskName": "Assisted Bathing & Grooming", "details": {"assistanceLevel": "Full"}},
    {"timeOfDay": "MORNING", "category": "WATER_INTAKE", "taskName": "Morning Water Intake (Target 500ml)", "details": {"waterMl": 250}},
    {"timeOfDay": "MORNING", "category": "MOBILITY", "taskName": "Veranda / Indoor Walking Exercise", "details": {"durationMinutes": 15}},

    # Afternoon
    {"timeOfDay": "AFTERNOON", "category": "MEAL", "taskName": "Nutritious Lunch (South Indian Diet)", "details": {"mealType": "Lunch", "intakePercent": 90}},
    {"timeOfDay": "AFTERNOON", "category": "MEDICATION_OBSERVATION", "taskName": "Post-Lunch Medication Observation", "details": {"taken": True}},
    {"timeOfDay": "AFTERNOON", "category": "REPOSITIONING", "taskName": "Afternoon Rest & Posture Repositioning", "details": {"position": "Lateral Right"}},
    {"timeOfDay": "AFTERNOON", "category": "COGNITIVE", "taskName": "Cognitive Activity / Reading / Music", "details": {"activity": "Tamil Devotional Songs / Newspaper"}},
    {"timeOfDay": "AFTERNOON", "category": "BOWEL_MOVEMENT", "taskName": "Bowel Movement & Urination Observation", "details": {"status": "Normal"}},

    # Evening
    {"timeOfDay": "EVENING", "category": "MEAL", "taskName": "Evening Tea & Healthy Snack", "details": {"mealType": "Snack", "intakePercent": 100}},
    {"timeOfDay": "EVENING", "category": "WATER_INTAKE", "taskName": "Evening Hydration (Target 250ml)", "details": {"waterMl": 250}},
    {"timeOfDay": "EVENING", "category": "MOBILITY", "taskName": "Light Evening Assisted Walk", "details": {"durationMinutes": 15}},

    # Night
    {"timeOfDay": "NIGHT", "category": "MEAL", "taskName": "Light Dinner (Idli / Congee)", "details": {"mealType": "Dinner", "intakePercent": 80}},
    {"timeOfDay": "NIGHT", "category": "MEDICATION_OBSERVATION", "taskName": "Bedtime Medication Observation", "details": {"taken": True}},
    {"timeOfDay": "NIGHT", "category": "REPOSITIONING", "taskName": "Nighttime Sleep Preparation & Safety Check", "details": {"bedRailsUp": True}}
]

class CareTaskService:
    @staticmethod
    async def ensure_shift_tasks(db: AsyncSession, shift_id: str, elder_id: str, caregiver_id: str) -> List[CareTask]:
        """Ensure default daily care activities exist for the shift, or return existing."""
        res = await db.execute(select(CareTask).where(CareTask.shiftId == shift_id))
        existing_tasks = res.scalars().all()
        if existing_tasks:
            return existing_tasks

        # Initialize default daily tasks
        new_tasks = []
        for act in DEFAULT_CARE_ACTIVITIES:
            task = CareTask(
                shiftId=shift_id,
                elderId=elder_id,
                caregiverId=caregiver_id,
                timeOfDay=act["timeOfDay"],
                category=act["category"],
                taskName=act["taskName"],
                status="PENDING",
                details=act["details"]
            )
            db.add(task)
            new_tasks.append(task)

        await db.commit()
        for t in new_tasks:
            await db.refresh(t)
        return new_tasks

    @staticmethod
    async def get_shift_tasks(db: AsyncSession, shift_id: str) -> List[CareTask]:
        """Fetch all daily care tasks for a specific shift."""
        res = await db.execute(
            select(CareTask)
            .where(CareTask.shiftId == shift_id)
            .order_by(CareTask.createdAt.asc())
        )
        return res.scalars().all()

    @staticmethod
    async def update_task(
        db: AsyncSession,
        task_id: str,
        caregiver_id: str,
        status_val: str,
        details: Optional[Dict[str, Any]] = None,
        notes: Optional[str] = None,
        idempotency_key: Optional[str] = None,
        user_role: str = "CAREGIVER"
    ) -> CareTask:
        """Update a specific task (complete, skip, or log details). Idempotency protected."""
        # Check idempotency
        if idempotency_key:
            res_idemp = await db.execute(select(CareTask).where(CareTask.idempotencyKey == idempotency_key))
            existing = res_idemp.scalar_one_or_none()
            if existing:
                return existing

        res = await db.execute(select(CareTask).where(CareTask.id == task_id))
        task = res.scalar_one_or_none()
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Care task not found")

        if user_role == "CAREGIVER" and task.caregiverId != caregiver_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to update this care task."
            )

        task.status = status_val
        if details:
            current_details = dict(task.details)
            current_details.update(details)
            task.details = current_details
        if notes is not None:
            task.notes = notes

        task.recordedAt = datetime.now(timezone.utc)
        if idempotency_key:
            task.idempotencyKey = idempotency_key

        await db.commit()
        await db.refresh(task)
        return task

    @staticmethod
    async def batch_sync(
        db: AsyncSession,
        tasks_data: List[Dict[str, Any]],
        caregiver_id: Optional[str] = None,
        user_role: str = "CAREGIVER"
    ) -> Dict[str, Any]:
        """
        Batch synchronize queued tasks from offline caregiver device.
        Guarantees idempotency and prevents unauthorized modifications.
        """
        processed_count = 0
        skipped_count = 0

        for item in tasks_data:
            idempotency_key = item.get("idempotencyKey")
            task_id = item.get("id")

            # Check if already synced via idempotency key
            if idempotency_key:
                res = await db.execute(select(CareTask).where(CareTask.idempotencyKey == idempotency_key))
                if res.scalar_one_or_none():
                    skipped_count += 1
                    continue

            if task_id:
                res = await db.execute(select(CareTask).where(CareTask.id == task_id))
                task = res.scalar_one_or_none()
                if task:
                    # Enforce ownership: caregiver cannot update another caregiver's task
                    if user_role == "CAREGIVER" and caregiver_id and task.caregiverId != caregiver_id:
                        skipped_count += 1
                        continue

                    task.status = item.get("status", "COMPLETED")
                    if "details" in item:
                        task.details = item["details"]
                    if "notes" in item:
                        task.notes = item["notes"]
                    task.recordedAt = datetime.now(timezone.utc)
                    task.idempotencyKey = idempotency_key
                    processed_count += 1

        await db.commit()
        return {
            "success": True,
            "processedCount": processed_count,
            "skippedDuplicateCount": skipped_count,
            "message": f"Successfully synchronized {processed_count} care activities ({skipped_count} duplicates skipped)."
        }

    @staticmethod
    async def get_elder_care_timeline(db: AsyncSession, elder_id: str, limit: int = 30) -> List[Dict[str, Any]]:
        """Fetch completed care timeline for Family view."""
        res = await db.execute(
            select(CareTask)
            .where(CareTask.elderId == elder_id, CareTask.status == "COMPLETED")
            .order_by(desc(CareTask.recordedAt))
            .limit(limit)
        )
        tasks = res.scalars().all()

        timeline = []
        for t in tasks:
            caregiver_name = "Assigned Attendant"
            if t.caregiverId:
                cg_res = await db.execute(select(User).where(User.id == t.caregiverId))
                cg = cg_res.scalar_one_or_none()
                if cg:
                    caregiver_name = cg.fullName

            timeline.append({
                "id": t.id,
                "category": t.category,
                "taskName": t.taskName,
                "timeOfDay": t.timeOfDay,
                "details": t.details,
                "notes": t.notes,
                "recordedAt": t.recordedAt.isoformat() if t.recordedAt else t.createdAt.isoformat(),
                "caregiverName": caregiver_name
            })
        return timeline

